'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, History, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { financeApi, settingsApi } from '../../../lib/api';
import type { ShippingPolicyApplyTo } from '../../../lib/api/shipping-policies';
import type { ShippingRate } from '../../../types/api';
import { pushAlert } from '../../../stores/alert-stack';
import { FilterSelect } from '../../ui/FilterSelect';
import { toBandBodies, toBandDrafts, fromExcelRows, type DesiBandDraft } from './desiTariff';
import { downloadTariffExcel, readTariffExcel } from './desiTariffExcel';
import { emptyZonePrices, nextRuleKey } from './policyDraft';
import { ApplyToDialog } from './ApplyToDialog';
import { CollapseButton, SectionCard, ZonePriceInputs } from './ui';
import { zoneColumnLabel } from '../../../lib/shipping-labels';

interface DesiTariffSectionProps {
  region: string;
  zones: string[];
  currency: string;
  title: string;
  /** Kategori yönteminde yedek olarak katlanmış başlar. */
  collapsible?: boolean;
  tour?: string;
}

const NEW_CARRIER = '__new__';
const ARAS_REGION = 'TR';

const outlineButton =
  'inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer';

// Taşıyıcının desi tarifesi: satırlar desi bantları, sütunlar teslimat bölgeleri. Izgara yerelde
// düzenlenir (ekle / düzenle / sil / Excel'den yükle) ve "Tarifeyi kaydet" ile bir kerede yazılır.
// Tarife sürümlü değildir — kargo ayarının sürümünden bağımsız, taşıyıcının güncel fiyatıdır.
export function DesiTariffSection({ region, zones, currency, title, collapsible, tour }: DesiTariffSectionProps) {
  const [open, setOpen] = useState(!collapsible);
  const rates = useQuery({ queryKey: ['shipping-rates', region], queryFn: () => financeApi.shippingRates.list(region) });
  const finance = useQuery({ queryKey: ['finance-settings'], queryFn: settingsApi.getFinance });

  const carriers = useMemo(
    () => Array.from(new Set((rates.data ?? []).map((r) => r.carrierName))).sort((a, b) => a.localeCompare(b, 'tr')),
    [rates.data],
  );
  const defaultCarrier = region === 'UK' ? finance.data?.defaultCargoFirmUK ?? '' : region === ARAS_REGION ? finance.data?.defaultCargoFirm ?? '' : '';

  return (
    <SectionCard
      tour={tour}
      title={title}
      description={rates.data?.length ? `${carriers.length} taşıyıcı${defaultCarrier ? ` · varsayılan ${defaultCarrier}` : ''}` : 'Tarife girilmemiş'}
      actions={collapsible && <CollapseButton open={open} onToggle={() => setOpen((o) => !o)} />}
    >
      {open && (rates.isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-[var(--fg-muted)]" size={18} /></div>
      ) : (
        <CarrierTariff
          region={region}
          zones={zones}
          currency={currency}
          rates={rates.data ?? []}
          carriers={carriers}
          defaultCarrier={defaultCarrier}
        />
      ))}
    </SectionCard>
  );
}

interface CarrierTariffProps {
  region: string;
  zones: string[];
  currency: string;
  rates: ShippingRate[];
  carriers: string[];
  defaultCarrier: string;
}

function CarrierTariff({ region, zones, currency, rates, carriers, defaultCarrier }: CarrierTariffProps) {
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = useState(defaultCarrier || carriers[0] || '');
  const [newCarrier, setNewCarrier] = useState('');
  const isNew = carrier === NEW_CARRIER || carrier === '';
  const carrierName = isNew ? newCarrier.trim() : carrier;

  const saved = useMemo(() => toBandDrafts(rates.filter((r) => r.carrierName === carrier), zones), [rates, carrier, zones]);
  const [drafts, setDrafts] = useState<DesiBandDraft[]>(saved);
  const [loadedFor, setLoadedFor] = useState(saved);
  // Taşıyıcı değişince ya da kayıt yenilenince ızgara sunucudaki tarifeye döner.
  if (loadedFor !== saved) {
    setLoadedFor(saved);
    setDrafts(saved);
  }

  const isDirty = comparable(drafts) !== comparable(saved);
  const [askApplyTo, setAskApplyTo] = useState(false);
  const onError = (err: unknown) => pushAlert(err instanceof Error ? err.message : 'İşlem başarısız.', 'error', 6000);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['shipping-rates', region] });
    queryClient.invalidateQueries({ queryKey: ['shipping-rate-versions', region] });
  };

  const save = useMutation({
    mutationFn: async (applyTo: ShippingPolicyApplyTo) => {
      const result = toBandBodies(drafts, zones);
      if (result.error !== null) throw new Error(result.error);
      await financeApi.shippingRates.saveBands(region, carrierName, result.bands, applyTo);
    },
    onSuccess: () => {
      setAskApplyTo(false);
      pushAlert('Desi tarifesi kaydedildi.', 'success', 4000);
      if (isNew) setCarrier(carrierName);
      refresh();
    },
    onError: (err) => { setAskApplyTo(false); onError(err); },
  });

  // Önce doğrulanır; kayıtlı tarife varsa "hangi siparişlere" sorulur, yeni taşıyıcıda gereksiz.
  const submit = () => {
    if (!carrierName) return onError(new Error('Taşıyıcı adı girin.'));
    const check = toBandBodies(drafts, zones);
    if (check.error !== null) return onError(new Error(check.error));
    if (saved.length > 0) setAskApplyTo(true);
    else save.mutate('AllOrders');
  };

  const setDefault = useMutation({
    mutationFn: async (firm: string) => {
      const current = await settingsApi.getFinance();
      return settingsApi.setFinance(region === 'UK'
        ? { kdvRate: current.kdvRate, defaultCargoFirm: current.defaultCargoFirm, defaultCargoFirmUK: firm }
        : { kdvRate: current.kdvRate, defaultCargoFirm: firm });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-settings'] }),
    onError,
  });

  const importExcel = useMutation({
    mutationFn: readTariffExcel,
    onSuccess: (rows) => {
      const parsed = fromExcelRows(rows, zones);
      if (parsed.error) return onError(new Error(parsed.error));
      setDrafts(parsed.drafts);
      pushAlert(`${parsed.drafts.length} bant yüklendi — kontrol edip "Tarifeyi kaydet"e basın.`, 'success', 6000);
    },
    onError,
  });

  const importAras = useMutation({
    mutationFn: financeApi.shippingRates.importArasPriceList,
    onSuccess: (res) => { pushAlert(res.message || 'Aras fiyat listesi yüklendi.', 'success', 6000); refresh(); },
    onError,
  });

  const addBand = () => {
    const lastMax = Number(drafts.at(-1)?.maxDesi.replace(',', '.'));
    const start = Number.isFinite(lastMax) && drafts.length ? String(lastMax + 1) : '0';
    setDrafts([...drafts, { key: nextRuleKey(), minDesi: start, maxDesi: '', prices: emptyZonePrices(zones) }]);
  };
  const update = (key: string, patch: Partial<DesiBandDraft>) => setDrafts(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  // Varsayılan taşıyıcı ayarı yalnızca TR ve UK için var (bkz. FinanceSettings).
  const canSetDefault = region === ARAS_REGION || region === 'UK';
  const fileName = `desi-tarifesi-${region}-${carrierName || 'yeni'}.xlsx`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={isNew ? NEW_CARRIER : carrier}
          options={[...carriers.map((c) => ({ value: c, label: c, sublabel: c === defaultCarrier ? 'Varsayılan' : undefined })), { value: NEW_CARRIER, label: '+ Yeni taşıyıcı' }]}
          placeholder="Taşıyıcı"
          ariaLabel="Taşıyıcı"
          showAllOption={false}
          variant="trigger"
          minWidth={180}
          onChange={setCarrier}
        />
        {isNew && (
          <input
            value={newCarrier}
            onChange={(e) => setNewCarrier(e.target.value)}
            placeholder="Taşıyıcı adı (ör. Evri)"
            aria-label="Yeni taşıyıcı adı"
            className="h-8 w-44 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        )}
        {canSetDefault && !isNew && carrier !== defaultCarrier && (
          <button type="button" onClick={() => setDefault.mutate(carrier)} disabled={setDefault.isPending} className={outlineButton}>
            Varsayılan yap
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => downloadTariffExcel(fileName, drafts, zones)} className={outlineButton}>
            <Download size={13} /> {drafts.length ? 'Excel indir' : 'Şablon indir'}
          </button>
          <label className={outlineButton}>
            {importExcel.isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Excel yükle
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={importExcel.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importExcel.mutate(file);
                e.target.value = '';
              }}
            />
          </label>
          {region === ARAS_REGION && (
            <label className={outlineButton} title="Aras'ın kendi fiyat listesi dosyası (desi matrisi + ek bedeller)">
              {importAras.isPending ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              Aras listesi
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                disabled={importAras.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importAras.mutate(file);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[6px] border border-[var(--border-soft)]">
        <div className="min-w-fit">
          <div className="flex items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            <span className="w-20 shrink-0">Min desi</span>
            <span className="w-20 shrink-0">Max desi</span>
            <span className="min-w-0 flex-1" />
            {zones.map((zone) => <span key={zone} className="w-28 shrink-0 text-right">{zoneColumnLabel(zone)}</span>)}
            <span className="w-9 shrink-0" />
          </div>
          {drafts.length === 0 ? (
            <p className="m-0 p-6 text-center text-xs text-[var(--fg-muted)]">Bant yok — "Bant ekle" ya da Excel yükleyin.</p>
          ) : (
            <ul className="m-0 flex max-h-[420px] list-none flex-col divide-y divide-[var(--border-soft)] overflow-y-auto p-0">
              {drafts.map((band) => (
                <li key={band.key} className="flex items-center gap-2 px-3 py-2">
                  <DesiInput label="En az desi" value={band.minDesi} onChange={(minDesi) => update(band.key, { minDesi })} />
                  <DesiInput label="En çok desi" value={band.maxDesi} onChange={(maxDesi) => update(band.key, { maxDesi })} />
                  <span className="min-w-0 flex-1" />
                  <ZonePriceInputs
                    zones={zones}
                    prices={band.prices}
                    currency={currency}
                    rowLabel={`${band.minDesi}–${band.maxDesi} desi`}
                    placeholder="0,00"
                    onChange={(zone, value) => update(band.key, { prices: { ...band.prices, [zone]: value } })}
                  />
                  <button
                    type="button"
                    aria-label="Bandı sil"
                    onClick={() => setDrafts(drafts.filter((d) => d.key !== band.key))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-rose-500 transition hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={addBand} className={outlineButton}>
          <Plus size={13} /> Bant ekle
        </button>
        {isDirty && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrafts(saved)}
              className="h-8 rounded-[6px] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={save.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-[var(--fg)] px-4 text-xs font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              {save.isPending && <Loader2 size={12} className="animate-spin" />}
              Tarifeyi kaydet
            </button>
          </div>
        )}
      </div>

      {!isNew && <TariffVersions region={region} carrier={carrier} onChanged={refresh} />}

      {askApplyTo && (
        <ApplyToDialog
          title="Desi tarifesi hangi siparişlere uygulansın?"
          saving={save.isPending}
          onCancel={() => setAskApplyTo(false)}
          onConfirm={(applyTo) => save.mutate(applyTo)}
        />
      )}
    </div>
  );
}

const formatDay = (isoDay: string) => new Date(`${isoDay}T00:00:00`).toLocaleDateString('tr-TR');

// Taşıyıcı tarifesinin tarihli sürümleri; birden fazlaysa gösterilir. En yeni sürümü silmek
// bir önceki fiyata dönmektir.
function TariffVersions({ region, carrier, onChanged }: { region: string; carrier: string; onChanged: () => void }) {
  const versions = useQuery({
    queryKey: ['shipping-rate-versions', region, carrier],
    queryFn: () => financeApi.shippingRates.versions(region, carrier),
  });
  const remove = useMutation({
    mutationFn: (validFrom: string | null) => financeApi.shippingRates.removeVersion(region, carrier, validFrom),
    onSuccess: () => { pushAlert('Tarife sürümü silindi.', 'success', 4000); onChanged(); },
    onError: (err) => pushAlert(err instanceof Error ? err.message : 'Silinemedi.', 'error', 6000),
  });

  if (!versions.data || versions.data.length < 2) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--fg-muted)]">
      <History size={12} />
      <span>Tarife geçmişi:</span>
      {versions.data.map((validFrom, index) => (
        <span key={validFrom ?? 'start'} className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--border-soft)] px-2 py-0.5">
          {validFrom ? `${formatDay(validFrom)} sonrası` : 'Başlangıçtan'}
          {index === 0 && <span className="font-semibold text-emerald-600">güncel</span>}
          <button
            type="button"
            aria-label="Sürümü sil"
            disabled={remove.isPending}
            onClick={() => confirm('Bu tarife sürümü silinsin mi? O tarihteki siparişler bir önceki sürümle hesaplanır.') && remove.mutate(validFrom)}
            className="text-rose-500 hover:opacity-70 disabled:opacity-40 cursor-pointer"
          >
            <Trash2 size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

// Satır anahtarı (key) her yüklemede yenilenir; karşılaştırma yalnızca içeriğe bakar.
const comparable = (drafts: DesiBandDraft[]) => JSON.stringify(drafts.map((d) => [d.minDesi, d.maxDesi, d.prices]));

function DesiInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-20 shrink-0 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-right font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
    />
  );
}
