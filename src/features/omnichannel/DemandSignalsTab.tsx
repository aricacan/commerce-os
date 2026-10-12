'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileDown, RefreshCw, TrendingUp } from 'lucide-react';
import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';
import { omnichannelApi } from '../../lib/api/omnichannel';
import {
  demandSignalsApi, type DemandOutcome, type DemandSignalFilter, type DemandSignalReportDto,
} from '../../lib/api/omnichannel-demand';
import { describeError } from '../../lib/errors';
import { downloadExcel } from '../../lib/export';
import { DemandSignalTable } from './DemandSignalTable';
import {
  DEFAULT_DEMAND_FILTER, DEMAND_EXPORT_COLUMNS, DEMAND_OUTCOME_OPTIONS, DEMAND_PERIOD_OPTIONS, toExportRows,
} from './demandSignalRules';
import { secondaryButtonClass } from './formClasses';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

// Ülke ve kanal adları yalnız süzgeç etiketi; yüklenemezse süzgeç boş kalır, rapor yine çalışır.
function useFilterOptions() {
  const [countries, setCountries] = useState<FilterSelectOption[]>([]);
  const [channels, setChannels] = useState<FilterSelectOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    omnichannelApi.getCountries()
      .then((list) => { if (!cancelled) setCountries(list.map((c) => ({ value: c.code, label: `${c.flagEmoji} ${c.name}` }))); })
      .catch(() => { if (!cancelled) setCountries([]); });
    omnichannelApi.getChannels()
      .then((list) => { if (!cancelled) setChannels(list.map((c) => ({ value: String(c.id), label: c.displayName }))); })
      .catch(() => { if (!cancelled) setChannels([]); });
    return () => { cancelled = true; };
  }, []);
  return { countries, channels };
}

// Omnichannel › Talep Sinyalleri (FAZ 5.4): müşterilerin sorduğu ama bizde olmayan ürün/araçlar, satın alma için
// araç + ürün türü bazında. Botun arama sonucundan deterministik yazılır; LLM yok.
export function DemandSignalsTab({ onOpenConversation }: Props) {
  const [filter, setFilter] = useState<DemandSignalFilter>(DEFAULT_DEMAND_FILTER);
  const [report, setReport] = useState<DemandSignalReportDto | null>(null);
  // Sunucu raporu henüz tanımıyor (frontend backend'den önce yayına çıkar).
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const { countries, channels } = useFilterOptions();

  const load = useCallback(async (current: DemandSignalFilter) => {
    setLoading(true);
    setError(null);
    try {
      const result = await demandSignalsApi.get(current);
      setReport(result);
      setUnavailable(result === null);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(filter); }, [filter, version, load]);

  const patch = (change: Partial<DemandSignalFilter>) => setFilter((f) => ({ ...f, ...change }));

  const exportExcel = () => {
    if (!report) return;
    void downloadExcel('talep-sinyalleri.xlsx', toExportRows(report.groups), DEMAND_EXPORT_COLUMNS, 'Talepler');
  };

  return (
    <section className="flex w-full flex-1 flex-col gap-3 p-4 text-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Talep sinyalleri</h2>
            {report && <span className="text-[var(--fg-muted)]">{report.totalSignals}</span>}
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Müşterilerin sorduğu ama katalogda olmayan ürün ve araçlar. Aynı konuşmada tekrar soru bir kez sayılır;
            satın alma listesi için en çok sorulan en üstte.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={!report || report.groups.length === 0} onClick={exportExcel}
            className={secondaryButtonClass}>
            <FileDown size={13} /> Excel
          </button>
          <button type="button" disabled={loading} onClick={() => setVersion((v) => v + 1)}
            className={secondaryButtonClass}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect value={String(filter.days)} options={DEMAND_PERIOD_OPTIONS} placeholder="Dönem" ariaLabel="Dönem"
          minWidth={130} showAllOption={false} onChange={(v) => patch({ days: Number(v) })} />
        <FilterSelect value={filter.country ?? ''} options={countries} placeholder="Tüm ülkeler" ariaLabel="Ülke"
          minWidth={130} onChange={(v) => patch({ country: v === '' ? null : v })} />
        <FilterSelect value={filter.channelId === null ? '' : String(filter.channelId)} options={channels}
          placeholder="Tüm kanallar" ariaLabel="Kanal" minWidth={150}
          onChange={(v) => patch({ channelId: v === '' ? null : Number(v) })} />
        <FilterSelect value={filter.outcome ?? ''} options={DEMAND_OUTCOME_OPTIONS} placeholder="Tüm sonuçlar"
          ariaLabel="Sonuç" minWidth={150} onChange={(v) => patch({ outcome: v === '' ? null : (v as DemandOutcome) })} />
      </div>

      {unavailable && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 text-[var(--fg-muted)]">
          Talep sinyalleri sunucu güncellemesiyle açılacak. Güncelleme yayına çıkınca bot, bizde olmayan ürün sorularını
          buraya yazmaya başlar.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>
      )}
      {loading && !report && !unavailable && (
        <div aria-busy="true" className="h-24 animate-pulse rounded-[4px] bg-[var(--bg-subtle)]" />
      )}
      {report && (
        <>
          {report.truncated && (
            <p className="text-[11px] text-[var(--fg-muted)]">Dönem çok kalabalık; sayım en yeni sinyallerden yapıldı.</p>
          )}
          <DemandSignalTable groups={report.groups} loading={loading} onOpenConversation={onOpenConversation} />
        </>
      )}
    </section>
  );
}
