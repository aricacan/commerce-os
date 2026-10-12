'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  omnichannelCatalogApi, CATALOG_SITE_KIND,
  type CatalogSiteKind, type CatalogSitePreviewDto, type CatalogSiteSourceDto, type CatalogSiteSourceSaveBody,
  type WebsiteScrapeConfig,
} from '../../lib/api/omnichannel-catalog';
import type { CountryDto } from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { describeError } from '../../lib/errors';
import { countryLabel } from './useOmnichannelCountries';
import { formInputClass, labelClass } from './formClasses';

interface Props {
  initial: CatalogSiteSourceDto | null;
  // Yeni kayıtta ön seçili ülke (Kanal Merkezi kanalın ülkesiyle açar). Düzenlemede yok sayılır.
  defaultCountry?: string;
  countries: CountryDto[];
  saving: boolean;
  onSave: (body: CatalogSiteSourceSaveBody) => void;
  onCancel: () => void;
}

const DEFAULT_SYNC_HOURS = 6;
const MIN_SYNC_HOURS = 1;
const MAX_SYNC_HOURS = 168;

// Site kaynağı ekleme/düzenleme: Shopify mağazası ya da genel web sitesi. Adres ve ülke eklendikten sonra değişmez (kalemler o
// siteye, profiller o ülkeye bağlı) — düzenlemede yalnız ad, para birimi, sıklık, aktiflik.
export function SiteSourceEditor({ initial, defaultCountry, countries, saving, onSave, onCancel }: Props) {
  const isEdit = initial !== null;
  const [name, setName] = useState(initial?.name ?? '');
  const [country, setCountry] = useState(initial?.country ?? defaultCountry ?? '');
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '');
  const [currency, setCurrency] = useState(
    initial?.currency ?? countries.find((c) => c.code === defaultCountry)?.currencyCode ?? '');
  const [syncHours, setSyncHours] = useState(String(initial?.syncIntervalHours ?? DEFAULT_SYNC_HOURS));
  const [kind, setKind] = useState<CatalogSiteKind>(
    initial?.kind === CATALOG_SITE_KIND.Website ? CATALOG_SITE_KIND.Website : CATALOG_SITE_KIND.Shopify);
  const [config, setConfig] = useState<WebsiteScrapeConfig>(initial?.scrapeConfig ?? {});
  const isWebsite = kind === CATALOG_SITE_KIND.Website;
  const [useForUnprofiled, setUseForUnprofiled] = useState(initial?.useForUnprofiledChannels ?? false);
  const setConfigField = (field: keyof WebsiteScrapeConfig, value: string) => {
    setConfig((c) => ({ ...c, [field]: value }));
    setPreview(null);
  };
  const [preview, setPreview] = useState<CatalogSitePreviewDto | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const changeCountry = (code: string) => {
    setCountry(code);
    // Para birimi ülkeden önerilir; kullanıcı değiştirebilir (site farklı para biriminde satabilir).
    const found = countries.find((c) => c.code === code);
    if (found) setCurrency(found.currencyCode);
  };

  const runPreview = async () => {
    setPreviewing(true);
    setPreviewError(null);
    setPreview(null);
    try {
      setPreview(await omnichannelCatalogApi.previewSite(baseUrl, kind, isWebsite ? config : null));
    } catch (e) {
      setPreviewError(describeError(e));
    } finally {
      setPreviewing(false);
    }
  };

  const hours = Number(syncHours);
  const missing = [
    !name.trim() && 'ad',
    !country && 'ülke',
    !baseUrl.trim() && 'adres',
    currency.trim().length !== 3 && 'para birimi (3 harf)',
    !(Number.isInteger(hours) && hours >= MIN_SYNC_HOURS && hours <= MAX_SYNC_HOURS) && `sıklık (${MIN_SYNC_HOURS}–${MAX_SYNC_HOURS} saat)`,
  ].filter((x): x is string => typeof x === 'string');

  const submit = () => {
    if (missing.length > 0) return;
    onSave({
      name: name.trim(), country, baseUrl: baseUrl.trim(), currency: currency.trim().toUpperCase(),
      syncIntervalHours: hours, isActive: initial?.isActive ?? true,
      kind, scrapeConfig: isWebsite ? config : null,
      useForUnprofiledChannels: useForUnprofiled,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="text-[12px] font-bold text-[var(--fg)]">
        {isEdit ? `Site kaynağını düzenle: ${initial.name}` : 'Site kaynağı ekle'}
      </div>

      <div>
        <label className={labelClass}>Tür</label>
        <div className="flex flex-wrap gap-2">
          {([
            [CATALOG_SITE_KIND.Shopify, 'Shopify mağazası', 'Hızlı; ürün listesi doğrudan okunur.'],
            [CATALOG_SITE_KIND.Website, 'Web sitesi', 'Shopify değilse: sayfalar tek tek okunur (daha yavaş).'],
          ] as const).map(([value, label, hint]) => (
            <label key={value} title={hint}
              className={`inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-2.5 py-1.5 ${isEdit ? 'opacity-60' : 'cursor-pointer'}`}>
              <input type="radio" disabled={isEdit} checked={kind === value}
                onChange={() => { setKind(value); setPreview(null); }} className="h-3.5 w-3.5" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Ad *</label>
          <input value={name} maxLength={100} onChange={(e) => setName(e.target.value)}
            placeholder="Örn: StoreB UK Shopify" className={formInputClass} />
        </div>
        <div>
          <label className={labelClass}>Ülke *</label>
          {isEdit ? (
            <input value={country} disabled className={formInputClass} />
          ) : (
            <FilterSelect
              value={country}
              onChange={changeCountry}
              placeholder="Ülke seçin"
              height="h-8.5"
              options={countries.filter((c) => c.isActive).map((c) => ({ value: c.code, label: countryLabel(c) }))}
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Mağaza adresi *</label>
        <div className="flex gap-2">
          <input value={baseUrl} onChange={(e) => { setBaseUrl(e.target.value); setPreview(null); }}
            disabled={isEdit} placeholder="https://uk.example.com" className={formInputClass} />
          {!isEdit && (
            <button type="button" onClick={() => void runPreview()} disabled={previewing || !baseUrl.trim()}
              className="inline-flex h-8.5 shrink-0 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-50">
              <Search size={12} /> {previewing ? 'Okunuyor…' : 'Önizle'}
            </button>
          )}
        </div>
        <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
          Mağazanın herkese açık ürün listesi okunur; şifre ya da anahtar gerekmez. Ürünler ERP&apos;deki stok koduyla (SKU) eşleşir.
        </div>
      </div>

      {isWebsite && <ScrapeConfigFields config={config} onChange={setConfigField} />}

      {previewError && (
        <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] text-rose-500">{previewError}</div>
      )}
      {preview && <PreviewTable preview={preview} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Para birimi *</label>
          <input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="GBP" className={formInputClass} />
        </div>
        <div>
          <label className={labelClass}>Kaç saatte bir çekilsin *</label>
          <input type="number" min={MIN_SYNC_HOURS} max={MAX_SYNC_HOURS} value={syncHours}
            onChange={(e) => setSyncHours(e.target.value)} className={formInputClass} />
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2 text-[11px] text-[var(--fg)]">
        <input type="checkbox" checked={useForUnprofiled} onChange={(e) => setUseForUnprofiled(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5" />
        <span>
          Profil seçilmemiş kanallarda da kullan
          <span className="block text-[10.5px] text-[var(--fg-muted)]">
            Bu ülkede kaynak profili seçilmemiş kanallar fiyat ve linki bu siteden söyler; sitede olmayan ürün ERP fiyatıyla kalır. Ülkede tek site işaretli olabilir.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {missing.length > 0 && <span className="mr-auto text-[11px] text-[var(--fg-muted)]">Eksik: {missing.join(', ')}</span>}
        <button type="button" onClick={onCancel} disabled={saving}
          className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)]">
          Vazgeç
        </button>
        <button type="button" onClick={submit} disabled={saving || missing.length > 0}
          className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40">
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

// Web sitesi okuma ayarları. Boş bırakılabilir: site haritası ve sayfadaki yapısal veri
// (JSON-LD) çoğu sitede yeterli; önizleme ürün getirmezse bu alanlar doldurulur.
function ScrapeConfigFields({ config, onChange }: {
  config: WebsiteScrapeConfig;
  onChange: (field: keyof WebsiteScrapeConfig, value: string) => void;
}) {
  const fields: [keyof WebsiteScrapeConfig, string, string][] = [
    ['productUrlPattern', 'Ürün adresi deseni', 'Örn: -P\\d+$ (ürün sayfalarını tanır)'],
    ['skuXPath', 'SKU seçicisi (XPath)', "Örn: //span[@class='sku']"],
    ['priceXPath', 'Fiyat kutusu (XPath)', "Örn: //div[@class='price']"],
    ['nameXPath', 'Ad seçicisi (XPath)', 'Örn: //h1'],
    ['stockXPath', 'Stok alanı (XPath)', "Örn: //div[@class='stock']"],
    ['outOfStockText', 'Stok yok metni', 'Örn: Tükendi'],
  ];
  return (
    <details className="rounded-[4px] border border-[var(--border-soft)] p-3" open={Object.values(config).some(Boolean)}>
      <summary className="cursor-pointer text-[11px] font-semibold text-[var(--fg)]">Gelişmiş okuma ayarları (isteğe bağlı)</summary>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map(([field, label, placeholder]) => (
          <div key={field}>
            <label className={labelClass}>{label}</label>
            <input value={config[field] ?? ''} onChange={(e) => onChange(field, e.target.value)}
              placeholder={placeholder} className={`${formInputClass} font-mono`} />
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10.5px] text-[var(--fg-muted)]">
        Boş alanlar için sayfadaki yapısal ürün verisi kullanılır. Site stok bilgisi vermiyorsa bu kaynağı stok kaynağı olarak seçmeyin.
      </div>
    </details>
  );
}

function PreviewTable({ preview }: { preview: CatalogSitePreviewDto }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] text-[var(--fg-muted)]">
        İlk sayfada {preview.totalOnFirstPage} ürün okundu
        {preview.skippedWithoutSku > 0 && ` · ${preview.skippedWithoutSku} ürünün stok kodu yok (bot eşleyemez)`}
      </div>
      <div className="divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)]">
        {preview.items.map((item) => (
          <div key={item.sku} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[11px]">
            <span className="min-w-0 truncate text-[var(--fg)]" title={item.name}>{item.name}</span>
            <span className="shrink-0 font-mono text-[var(--fg-muted)]">{item.sku}</span>
            <span className="shrink-0 font-mono text-[var(--fg)]">{item.price ?? '—'}</span>
            <span className={`shrink-0 ${item.available ? 'text-emerald-600' : 'text-[var(--fg-muted)]'}`}>
              {item.available ? 'Var' : 'Yok'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
