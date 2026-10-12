'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { costSourcesApi, type CostSourcePolicy, type CostSourceSummary } from '../../lib/api/product-cost';
import { pushAlert } from '../../stores/alert-stack';
import { useBackgroundJobs } from '../../stores/background-jobs';
import { FilterSelect } from '../ui/FilterSelect';

const POLICY_OPTIONS: { value: CostSourcePolicy; label: string; hint: string }[] = [
  { value: 'ErpFirst', label: 'ERP baskın', hint: 'Her senkronda ERP alış fiyatı yazılır; kilitli fiyatlar korunur.' },
  { value: 'ExcelFirst', label: 'Excel öncelikli', hint: 'ERP fiyatı yalnızca maliyeti olmayan ürüne yazılır.' },
  { value: 'ManualOnly', label: 'Yalnızca elle', hint: 'ERP fiyatı hiç kullanılmaz.' },
];

const costJobKey = (dataSourceId: number) => `cost-source:${dataSourceId}`;

const percent = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

interface CostSourceStripProps {
  selectedSourceId: number | null;
  onSelect: (dataSourceId: number | null) => void;
}

// ERP kaynağı başına alış maliyeti kapsaması ve politikası. Karta tıklamak listeyi o kaynağın
// ürünlerine süzer. Kaynaklar DataSources'tan gelir: yeni ERP eklendiğinde kod değişmeden görünür.
export function CostSourceStrip({ selectedSourceId, onSelect }: CostSourceStripProps) {
  const queryClient = useQueryClient();
  const sources = useQuery({ queryKey: ['cost-sources'], queryFn: costSourcesApi.list });

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: ['cost-sources'] });
    queryClient.invalidateQueries({ queryKey: ['product-costs'] });
  };
  const onError = (err: unknown) => pushAlert(err instanceof Error ? err.message : 'İşlem başarısız.', 'error', 6000);

  // Politika değişince ERP fiyatları hemen yeni politikaya göre uygulanır — kullanıcı ayrıca
  // bir düğmeye basmak zorunda kalmasın.
  const setPolicy = useMutation({
    mutationFn: async ({ id, policy }: { id: number; policy: CostSourcePolicy }) => {
      await costSourcesApi.setPolicy(id, policy);
      return costSourcesApi.applyErp(id);
    },
    onSuccess: (result) => { pushAlert(`Politika kaydedildi · ${result.updated} ürünün maliyeti güncellendi.`, 'success', 5000); refreshLists(); },
    onError,
  });

  // Yenileme arka planda sürer; durumu store'da tutulur — sayfadan çıkıp dönünce de görünür.
  const runningJobs = useBackgroundJobs((s) => s.running);
  const trackJob = useBackgroundJobs((s) => s.track);
  const refresh = useMutation({
    mutationFn: ({ id }: { id: number; name: string }) => costSourcesApi.refresh(id),
    onSuccess: ({ jobId }, { id, name }) => trackJob({
      key: costJobKey(id), jobId, kind: 'cost-source', label: name, startedAt: Date.now(),
    }),
    onError,
  });

  if (sources.isLoading || !sources.data?.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {sources.data.map((source) => (
        <CostSourceCard
          key={source.dataSourceId}
          source={source}
          selected={selectedSourceId === source.dataSourceId}
          onSelect={() => onSelect(selectedSourceId === source.dataSourceId ? null : source.dataSourceId)}
          savingPolicy={setPolicy.isPending && setPolicy.variables?.id === source.dataSourceId}
          refreshing={(refresh.isPending && refresh.variables?.id === source.dataSourceId) || !!runningJobs[costJobKey(source.dataSourceId)]}
          onPolicyChange={(policy) => setPolicy.mutate({ id: source.dataSourceId, policy })}
          onRefresh={() => refresh.mutate({ id: source.dataSourceId, name: source.displayName })}
        />
      ))}
    </div>
  );
}

interface CostSourceCardProps {
  source: CostSourceSummary;
  selected: boolean;
  onSelect: () => void;
  savingPolicy: boolean;
  refreshing: boolean;
  onPolicyChange: (policy: CostSourcePolicy) => void;
  onRefresh: () => void;
}

function CostSourceCard({ source, selected, onSelect, savingPolicy, refreshing, onPolicyChange, onRefresh }: CostSourceCardProps) {
  const coverage = percent(source.withCost, source.productCount);
  const erpCoverage = percent(source.withErpPrice, source.productCount);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      className={`flex cursor-pointer flex-col gap-3 rounded-[8px] border bg-[var(--card)] p-4 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-[var(--fg)]/20 ${
        selected ? 'border-[var(--fg)] shadow-sm' : 'border-[var(--border-soft)] hover:border-[var(--border)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-[var(--fg)]">
            {selected && <Check size={13} className="shrink-0" />}
            {source.displayName}
          </span>
          <span className="text-[11px] text-[var(--fg-muted)]">{source.country} · {source.erp} · {source.currency}</span>
        </div>
        <span className="shrink-0 text-lg font-semibold tabular-nums text-[var(--fg)]">%{coverage}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${coverage}%` }} />
        </div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[11px] text-[var(--fg-muted)]">
          <span>{source.withCost.toLocaleString('tr-TR')}/{source.productCount.toLocaleString('tr-TR')} maliyetli</span>
          <span title="ERP'nin alış fiyatı bildirdiği ürünler">ERP'de fiyat: %{erpCoverage}</span>
        </div>
        <div className="flex flex-wrap gap-x-3 text-[10.5px] text-[var(--fg-subtle)]">
          <span>ERP {source.fromErp}</span>
          <span>Excel {source.fromExcel}</span>
          <span>Elle {source.fromManual}</span>
          {source.locked > 0 && <span>Kilitli {source.locked}</span>}
        </div>
      </div>

      {/* Kart tıklaması süzgeç; kontroller kendi tıklamasını yukarı taşımasın. */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <FilterSelect
          value={source.policy}
          options={POLICY_OPTIONS.map((o) => ({ value: o.value, label: o.label, hint: o.hint }))}
          placeholder="Politika"
          ariaLabel={`${source.displayName} maliyet politikası`}
          showAllOption={false}
          minWidth={0}
          className="min-w-0 flex-1"
          onChange={(value) => onPolicyChange(value as CostSourcePolicy)}
        />
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || savingPolicy}
          title="Ürünleri ve alış fiyatlarını ERP'den yeniden çek"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-2.5 text-[11px] font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
        >
          {refreshing || savingPolicy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          ERP&apos;den yenile
        </button>
      </div>
    </div>
  );
}
