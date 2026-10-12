'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { categoryApi, erpSourcesApi } from '../../../lib/api';
import {
  shippingPoliciesApi, type ShippingPolicyApplyTo, type ShippingPolicyDto, type ShippingRegionInfo,
} from '../../../lib/api/shipping-policies';
import { REGION_NAMES, currencySymbol } from '../../../lib/shipping-labels';
import { pushAlert } from '../../../stores/alert-stack';
import { FilterSelect } from '../../ui/FilterSelect';
import { ChargeBasisSection } from './ChargeBasisSection';
import { DesiTariffSection } from './DesiTariffSection';
import { ExtraRulesSection } from './ExtraRulesSection';
import { FlatPriceSection } from './FlatPriceSection';
import { PriceListSection, type PriceListItem } from './PriceListSection';
import { PricingMethodSection } from './PricingMethodSection';
import { QuotePreviewSection } from './QuotePreviewSection';
import { ApplyToDialog } from './ApplyToDialog';
import { SaveBar } from './SaveBar';
import { VersionHistory } from './VersionHistory';
import { toDraft, toSaveBody, type ShippingPolicyDraft } from './policyDraft';
import { Segmented } from './ui';

const REGION_DEFAULT = 'default';

// ERP kaynağının ülkesi → kargo bölgesi (backend ShippingRegions.FromCountry ile aynı kural).
const regionOfCountry = (country: string): string => {
  const code = country.trim().toUpperCase();
  if (code === 'GB' || code === 'GBR' || code === 'UK') return 'UK';
  if (code === '' || code === 'TUR' || code === 'TR') return 'TR';
  return code;
};

const regionName = (code: string) => REGION_NAMES[code] ?? code;

// Kargo maliyeti ayarları. Her ülke ayrı sekme (ERP kaynaklarının ülkelerinden gelir); her
// ülkede yöntem → fiyat tablosu (bölge sütunlu) → ödeme şekli → ek ayarlar. Kayıtlar tarihli
// sürümdür: fiyat değişince eski siparişler istenirse eski fiyatında kalır.
export function ShippingWorkspace() {
  const regions = useQuery({ queryKey: ['shipping-regions'], queryFn: shippingPoliciesApi.regions, staleTime: 300_000 });
  const [regionCode, setRegionCode] = useState<string | null>(null);
  const [scope, setScope] = useState(REGION_DEFAULT);

  // İlk yüklemede ilk bölge seçilir; kullanıcı seçtiyse dokunulmaz.
  useEffect(() => {
    if (regionCode === null && regions.data?.length) setRegionCode(regions.data[0].code);
  }, [regions.data, regionCode]);

  const region = regions.data?.find((r) => r.code === regionCode);

  if (regions.isLoading || (regions.data?.length && !region)) {
    return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--fg-muted)]" size={20} /></div>;
  }
  if (!region) {
    return <p className="m-6 text-xs text-[var(--fg-muted)]">Aktif ERP kaynağı yok — kargo ayarı için önce bir ERP bağlayın.</p>;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <RegionScopeBar
          regions={regions.data ?? []}
          region={region}
          scope={scope}
          onRegionChange={(code) => { setRegionCode(code); setScope(REGION_DEFAULT); }}
          onScopeChange={setScope}
        />
        <RegionPolicy key={`${region.code}-${scope}`} region={region} scope={scope} />
      </div>
    </div>
  );
}

interface RegionScopeBarProps {
  regions: ShippingRegionInfo[];
  region: ShippingRegionInfo;
  scope: string;
  onRegionChange: (code: string) => void;
  onScopeChange: (scope: string) => void;
}

function RegionScopeBar({ regions, region, scope, onRegionChange, onScopeChange }: RegionScopeBarProps) {
  const sources = useQuery({ queryKey: ['erp-sources'], queryFn: () => erpSourcesApi.list(), staleTime: 300_000 });
  const policies = useQuery({ queryKey: ['shipping-policies', region.code], queryFn: () => shippingPoliciesApi.list(region.code) });

  const scopeOptions = [
    { value: REGION_DEFAULT, label: `Tüm ${regionName(region.code)}`, sublabel: 'Ülkedeki tüm firmalar' },
    ...(sources.data ?? [])
      .filter((s) => regionOfCountry(s.country) === region.code)
      .map((s) => ({
        value: String(s.id),
        label: s.displayName,
        sublabel: policies.data?.some((p) => p.dataSourceId === s.id) ? `${s.erp} · özel ayar var` : `${s.erp} · ülke ayarını kullanır`,
      })),
  ];

  return (
    <div data-tour="shipping-region" className="flex flex-wrap items-center gap-2">
      <Segmented
        value={region.code}
        options={regions.map((r) => ({ key: r.code, label: `${regionName(r.code)} · ${currencySymbol(r.currency).trim()}` }))}
        onChange={onRegionChange}
      />
      <FilterSelect
        value={scope}
        options={scopeOptions}
        placeholder="Kapsam"
        ariaLabel="Ayarların geçerli olduğu kapsam"
        showAllOption={false}
        variant="trigger"
        minWidth={240}
        onChange={(value) => onScopeChange(value || REGION_DEFAULT)}
      />
    </div>
  );
}

function RegionPolicy({ region, scope }: { region: ShippingRegionInfo; scope: string }) {
  const policies = useQuery({ queryKey: ['shipping-policies', region.code], queryFn: () => shippingPoliciesApi.list(region.code) });
  const dataSourceId = scope === REGION_DEFAULT ? null : Number(scope);
  // Sunucu kapsam içinde en yeni sürümü önce gönderir; ekran onu düzenler.
  const versions = useMemo(() => (policies.data ?? []).filter((p) => p.dataSourceId === dataSourceId), [policies.data, dataSourceId]);
  const latest = versions[0];

  if (policies.isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-[var(--fg-muted)]" size={20} /></div>;
  if (policies.isError) {
    return (
      <div className="flex items-center gap-1.5 rounded-[6px] bg-rose-500/10 p-3 text-xs text-rose-500">
        <AlertCircle size={13} className="shrink-0" /> Kargo ayarları yüklenemedi.
      </div>
    );
  }

  return (
    <>
      {dataSourceId !== null && !latest && (
        <p className="m-0 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-[11px] text-[var(--fg-muted)]">
          Bu firmanın özel ayarı yok — şu an ülke ayarı uygulanıyor. Kaydederseniz yalnızca bu firma için geçerli olur.
        </p>
      )}
      {/* Sunucu kaydı değişince taslak sıfırdan kurulur (key) — eski taslak kaydedileni ezmesin. */}
      <PolicyEditor
        key={latest ? `${latest.id}-${latest.updatedAt}` : 'new'}
        region={region}
        dataSourceId={dataSourceId}
        policy={latest}
        versions={versions}
      />
    </>
  );
}

interface PolicyEditorProps {
  region: ShippingRegionInfo;
  dataSourceId: number | null;
  policy: ShippingPolicyDto | undefined;
  versions: ShippingPolicyDto[];
}

function PolicyEditor({ region, dataSourceId, policy, versions }: PolicyEditorProps) {
  const queryClient = useQueryClient();
  const zones = region.zones;
  const currency = currencySymbol(region.currency).trim();
  // Ayarı olmayan bölge: Türkiye desiyle, diğerleri kategoriyle başlar (en yaygın kullanım).
  const initial = useMemo(() => toDraft(policy, zones, region.code === 'TR' ? 'DesiBand' : 'Category'), [policy, zones, region.code]);
  const [draft, setDraft] = useState<ShippingPolicyDraft>(initial);
  // Kayıtlı ayar değişirken kaydetmeden önce "hangi siparişlere" sorusu açılır.
  const [askApplyTo, setAskApplyTo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ['categories-admin'], queryFn: () => categoryApi.list(), staleTime: 300_000 });
  const categoryItems = useMemo<PriceListItem[]>(
    () => (categories.data ?? []).filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name, detail: `${c.differentProductCount} ürün` })),
    [categories.data],
  );

  const bodyOf = (d: ShippingPolicyDraft) => JSON.stringify(toSaveBody(d, region.code, dataSourceId, zones, 'AllOrders'));
  const isDirty = bodyOf(draft) !== bodyOf(initial) || (!policy && dataSourceId === null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shipping-policies', region.code] });

  const save = useMutation({
    mutationFn: shippingPoliciesApi.save,
    onSuccess: () => { setAskApplyTo(false); pushAlert('Kargo ayarları kaydedildi.', 'success', 4000); refresh(); },
    onError: (err) => { setAskApplyTo(false); setError(err instanceof Error ? err.message : 'Kaydedilemedi.'); },
  });
  const removeScope = useMutation({
    mutationFn: () => shippingPoliciesApi.removeScope(region.code, dataSourceId),
    onSuccess: () => { pushAlert('Firmaya özel ayar silindi.', 'success', 4000); refresh(); },
    onError: (err) => setError(err instanceof Error ? err.message : 'Silinemedi.'),
  });

  const patch = (change: Partial<ShippingPolicyDraft>) => {
    setError(null);
    setDraft((current) => ({ ...current, ...change }));
  };

  const saveWith = (applyTo: ShippingPolicyApplyTo) => {
    const result = toSaveBody(draft, region.code, dataSourceId, zones, applyTo);
    if (result.error !== null) {
      setAskApplyTo(false);
      setError(result.error);
      return;
    }
    save.mutate(result.body);
  };

  // Önce taslak doğrulanır (hata varsa pencere açılmaz); kayıtlı ayar yoksa soru gereksiz.
  const submit = () => {
    const check = toSaveBody(draft, region.code, dataSourceId, zones, 'AllOrders');
    if (check.error !== null) {
      setError(check.error);
      return;
    }
    if (policy) setAskApplyTo(true);
    else saveWith('AllOrders');
  };

  const method = draft.pricingMethod;

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <PricingMethodSection method={method} onChange={(pricingMethod) => patch({ pricingMethod })} />

          {method === 'DesiBand' && (
            <DesiTariffSection tour="shipping-step2" region={region.code} zones={zones} currency={currency} title="2 · Desi tarifesi" />
          )}
          {method === 'Category' && (
            <PriceListSection
              zones={zones}
              currency={currency}
              items={categoryItems}
              prices={draft.categoryPrices}
              defaultPrices={draft.defaultPrices}
              onPricesChange={(categoryPrices) => patch({ categoryPrices })}
              onDefaultChange={(defaultPrices) => patch({ defaultPrices })}
            />
          )}
          {method === 'Flat' && (
            <FlatPriceSection zones={zones} currency={currency} prices={draft.defaultPrices} onChange={(defaultPrices) => patch({ defaultPrices })} />
          )}

          {method !== 'DesiBand' && (
            <ChargeBasisSection value={draft.chargeBasis} onChange={(chargeBasis) => patch({ chargeBasis })} />
          )}

          <ExtraRulesSection step={method === 'DesiBand' ? 3 : 4} draft={draft} zones={zones} currency={currency} onChange={patch} />

          {method === 'Category' && (
            <DesiTariffSection region={region.code} zones={zones} currency={currency} title="Desi tarifesi (yedek)" collapsible />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-4">
          <QuotePreviewSection />
          <VersionHistory region={region.code} versions={versions} />
          {policy && dataSourceId !== null && (
            <button
              type="button"
              onClick={() => confirm('Bu firmaya özel kargo ayarı (tüm sürümleri) silinsin mi? Ülke ayarı uygulanır.') && removeScope.mutate()}
              disabled={removeScope.isPending}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[6px] text-xs font-semibold text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-40 cursor-pointer"
            >
              <Trash2 size={13} /> Firmaya özel ayarı sil
            </button>
          )}
        </div>
      </div>

      {(isDirty || error) && (
        <SaveBar
          error={error}
          hasSavedPolicy={!!policy}
          saving={save.isPending}
          onCancel={() => { setDraft(initial); setError(null); }}
          onSave={submit}
        />
      )}
      {askApplyTo && (
        <ApplyToDialog
          title="Kargo ayarı hangi siparişlere uygulansın?"
          saving={save.isPending}
          onCancel={() => setAskApplyTo(false)}
          onConfirm={saveWith}
        />
      )}
    </>
  );
}
