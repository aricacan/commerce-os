'use client';

import { useState } from 'react';
import {
  CATALOG_LINK_MODE, CATALOG_STOCK_MODE, CATALOG_UNLISTED_PRICE_MODE,
  type CatalogLinkMode, type CatalogProfileDto, type CatalogProfileSaveBody, type CatalogSiteSourceDto,
  type CatalogSourceDto, type CatalogStockMode, type CatalogUnlistedPriceMode,
} from '../../lib/api/omnichannel-catalog';
import type { CountryDto } from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { countryLabel } from './useOmnichannelCountries';
import { CatalogProductSourceField, type ProductSourceKind } from './CatalogProductSourceField';
import { labelClass } from './formClasses';
import { CatalogPriceListField } from './CatalogPriceListField';
import {
  ERP_PRICE_PREFIX as ERP_PREFIX, SITE_PRICE_PREFIX as SITE_PREFIX, pruneUnavailableSources, type RemovedSource,
} from './catalogProfileSelection';

interface Props {
  initial: CatalogProfileDto | null;
  countries: CountryDto[];
  sources: CatalogSourceDto[];
  siteSources: CatalogSiteSourceDto[];
  saving: boolean;
  onSave: (body: CatalogProfileSaveBody) => void;
  onCancel: () => void;
}

interface ModeOption<T> { value: T; label: string; hint: string }

const STOCK_OPTIONS: ModeOption<CatalogStockMode>[] = [
  { value: CATALOG_STOCK_MODE.ProductSources, label: 'Ürün kaynaklarından', hint: 'Seçili ürün kaynaklarındaki en yüksek stok. Stok 0 ise bot "yok" der.' },
  { value: CATALOG_STOCK_MODE.Source, label: 'Belirli bir ERP kaynağından', hint: 'Stok yalnız seçilen kaynaktan okunur (SKU ile eşleşir).' },
  { value: CATALOG_STOCK_MODE.SiteSource, label: 'Web sitesinden', hint: 'Sitedeki var/yok bilgisi; bot adet söylemez.' },
  { value: CATALOG_STOCK_MODE.AlwaysInStock, label: 'Stok hep var', hint: 'Bot her ürün için "stokta" der, adet söylemez.' },
];

const LINK_OPTIONS: ModeOption<CatalogLinkMode>[] = [
  { value: CATALOG_LINK_MODE.PriceSource, label: 'Fiyat kaynağından', hint: 'Link, fiyatın okunduğu kaynaktan (site seçildiyse sitedeki ürün sayfası).' },
  { value: CATALOG_LINK_MODE.Source, label: 'Belirli bir ERP kaynağından', hint: 'Link yalnız seçilen kaynaktan okunur.' },
  { value: CATALOG_LINK_MODE.SiteSource, label: 'Web sitesinden', hint: 'Sitedeki ürün sayfası.' },
  { value: CATALOG_LINK_MODE.None, label: 'Link yok', hint: 'Bot ürün linki paylaşmaz.' },
];

// Profil formu. Seçim listeleri yalnız profil ülkesinin AKTİF kaynaklarını gösterir; sunucu
// aynı kuralı ayrıca doğrular (başka ülkenin kaynağı = başka ülkenin fiyatı).
export function CatalogProfileEditor({ initial, countries, sources, siteSources, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [productSourceIds, setProductSourceIds] = useState<number[]>(initial?.productSourceIds ?? []);
  const [productKind, setProductKind] = useState<ProductSourceKind>(initial?.productSiteSourceId != null ? 'site' : 'erp');
  const [productSiteSourceId, setProductSiteSourceId] = useState<number | null>(initial?.productSiteSourceId ?? null);
  const [price, setPrice] = useState(initialPrice(initial));
  const [stockMode, setStockMode] = useState<CatalogStockMode>(initial?.stockMode ?? CATALOG_STOCK_MODE.ProductSources);
  const [stockSourceId, setStockSourceId] = useState<number | null>(initial?.stockSourceId ?? null);
  const [stockSiteSourceId, setStockSiteSourceId] = useState<number | null>(initial?.stockSiteSourceId ?? null);
  const [linkMode, setLinkMode] = useState<CatalogLinkMode>(initial?.linkMode ?? CATALOG_LINK_MODE.PriceSource);
  const [linkSourceId, setLinkSourceId] = useState<number | null>(initial?.linkSourceId ?? null);
  const [linkSiteSourceId, setLinkSiteSourceId] = useState<number | null>(initial?.linkSiteSourceId ?? null);
  const [unlistedPriceMode, setUnlistedPriceMode] = useState<CatalogUnlistedPriceMode>(
    initial?.unlistedPriceMode ?? CATALOG_UNLISTED_PRICE_MODE.UseSourcePrice);

  const sameCountry = (code: string) => code.toUpperCase() === country.toUpperCase();
  const countrySources = sources.filter((s) => s.isActive && sameCountry(s.country));
  const countrySites = siteSources.filter((s) => s.isActive && sameCountry(s.country));
  // Pasife çekilmiş kaynak listede görünmez; seçimde kalırsa kaldırılamaz ve kayıt reddedilir.
  const { selection: selected, removed } = pruneUnavailableSources(
    { productSourceIds, productSiteSourceId, price, stockSourceId, stockSiteSourceId, linkSourceId, linkSiteSourceId },
    new Set(countrySources.map((s) => s.id)),
    new Set(countrySites.map((s) => s.id)),
  );
  const describeRemoved = (r: RemovedSource) => {
    const label = r.kind === 'erp'
      ? sources.find((s) => s.id === r.id)?.displayName
      : siteSources.find((s) => s.id === r.id)?.name;
    return `${r.field}: ${label ?? `#${r.id}`}`;
  };
  const erpOptions = countrySources.map((s) => ({ value: String(s.id), label: `${s.displayName} · ${s.kind}` }));
  const siteOptions = countrySites.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.kind} (site)` }));
  const hasErp = countrySources.length > 0;
  const hasSite = countrySites.length > 0;
  // Ülkede yalnız bir tür kaynak varsa o kullanılır (ör. ERP'si olmayan Kosova → site).
  const kind: ProductSourceKind = hasErp && hasSite ? productKind : hasSite ? 'site' : 'erp';
  // Ülkenin tek sitesi varsa kendiliğinden seçilir.
  const siteId = selected.productSiteSourceId ?? (countrySites.length === 1 ? countrySites[0].id : null);
  const priceOptions = [
    ...countrySources.map((s) => ({ value: `${ERP_PREFIX}${s.id}`, label: `${s.displayName} · ${s.kind}` })),
    ...countrySites.map((s) => ({ value: `${SITE_PREFIX}${s.id}`, label: `${s.name} · ${s.kind} (site)` })),
  ];

  const changeCountry = (next: string) => {
    setCountry(next);
    // Kaynaklar ülkeye bağlı: eski ülkenin seçimleri taşınmaz.
    setProductSourceIds([]);
    setProductSiteSourceId(null);
    setPrice('');
    setStockSourceId(null);
    setStockSiteSourceId(null);
    setLinkSourceId(null);
    setLinkSiteSourceId(null);
  };

  const toggleProductSource = (id: number) => {
    const current = selected.productSourceIds;
    setProductSourceIds(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const sourceMissing = kind === 'site'
    ? [siteId === null && 'ürün sitesi']
    : [
      selected.productSourceIds.length === 0 && 'ürün kaynağı',
      !selected.price && 'fiyat kaynağı',
      stockMode === CATALOG_STOCK_MODE.Source && selected.stockSourceId === null && 'stok kaynağı',
      stockMode === CATALOG_STOCK_MODE.SiteSource && selected.stockSiteSourceId === null && 'stok sitesi',
      linkMode === CATALOG_LINK_MODE.Source && selected.linkSourceId === null && 'link kaynağı',
      linkMode === CATALOG_LINK_MODE.SiteSource && selected.linkSiteSourceId === null && 'link sitesi',
    ];
  const missing = [!name.trim() && 'ad', !country && 'ülke', ...sourceMissing]
    .filter((x): x is string => typeof x === 'string');

  const submit = () => {
    if (missing.length > 0) return;
    if (kind === 'site' && siteId !== null) {
      onSave(siteCatalogBody(name.trim(), country, siteId, unlistedPriceMode));
      return;
    }
    onSave({
      name: name.trim(),
      country,
      productSourceIds: selected.productSourceIds,
      productSiteSourceId: null,
      priceSourceId: priceIdOf(selected.price, ERP_PREFIX),
      priceSiteSourceId: priceIdOf(selected.price, SITE_PREFIX),
      stockMode,
      stockSourceId: stockMode === CATALOG_STOCK_MODE.Source ? selected.stockSourceId : null,
      stockSiteSourceId: stockMode === CATALOG_STOCK_MODE.SiteSource ? selected.stockSiteSourceId : null,
      linkMode,
      linkSourceId: linkMode === CATALOG_LINK_MODE.Source ? selected.linkSourceId : null,
      linkSiteSourceId: linkMode === CATALOG_LINK_MODE.SiteSource ? selected.linkSiteSourceId : null,
      unlistedPriceMode,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="text-[12px] font-bold text-[var(--fg)]">{initial ? `Profili düzenle: ${initial.name}` : 'Yeni kaynak profili'}</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Profil adı *</label>
          <input
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: StoreB TR"
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        </div>
        <div>
          <label className={labelClass}>Ülke *</label>
          <FilterSelect
            value={country}
            onChange={changeCountry}
            placeholder="Ülke seçin"
            height="h-8.5"
            options={countries
              .filter((c) => c.isActive || c.code === initial?.country)
              .map((c) => ({ value: c.code, label: countryLabel(c) }))}
          />
        </div>
      </div>

      {country && !hasErp && !hasSite && (
        <div className="rounded-[4px] border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-[var(--fg)]">
          Bu ülkede aktif ERP ya da web sitesi kaynağı yok. Önce Veri Kaynakları&apos;ndan bir kaynak ekleyin.
        </div>
      )}

      {removed.length > 0 && (
        <div className="rounded-[4px] border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-[var(--fg)]">
          Pasif ya da bu ülkeye ait olmayan kaynaklar seçimden çıkarıldı: {removed.map(describeRemoved).join(', ')}.
          Kaydedince profil güncellenir.
        </div>
      )}

      {(hasErp || hasSite) && (
        <CatalogProductSourceField
          kind={kind}
          showKindChoice={hasErp && hasSite}
          onKindChange={setProductKind}
          erpSources={countrySources}
          selectedErpIds={selected.productSourceIds}
          onToggleErp={toggleProductSource}
          siteOptions={siteOptions}
          siteId={siteId}
          onSiteChange={setProductSiteSourceId}
        />
      )}

      {hasErp && kind === 'erp' && (
        <>
          <div>
            <label className={labelClass}>Fiyat kaynağı * (fiyat yalnız buradan söylenir)</label>
            <FilterSelect value={selected.price} onChange={setPrice} placeholder="Kaynak seçin" height="h-8.5" options={priceOptions} />
            {selected.price.startsWith(SITE_PREFIX) && (
              <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
                Sitedeki fiyat ERP ürünüyle stok koduyla (SKU) eşleşir; sitede olmayan üründe bot fiyat söylemez.
              </div>
            )}
          </div>

          <ModeField
            title="Stok"
            options={STOCK_OPTIONS}
            mode={stockMode}
            onModeChange={setStockMode}
            pickers={[
              { mode: CATALOG_STOCK_MODE.Source, value: selected.stockSourceId, onChange: setStockSourceId, options: erpOptions },
              { mode: CATALOG_STOCK_MODE.SiteSource, value: selected.stockSiteSourceId, onChange: setStockSiteSourceId, options: siteOptions },
            ]}
          />

          <ModeField
            title="Link"
            options={LINK_OPTIONS}
            mode={linkMode}
            onModeChange={setLinkMode}
            pickers={[
              { mode: CATALOG_LINK_MODE.Source, value: selected.linkSourceId, onChange: setLinkSourceId, options: erpOptions },
              { mode: CATALOG_LINK_MODE.SiteSource, value: selected.linkSiteSourceId, onChange: setLinkSiteSourceId, options: siteOptions },
            ]}
          />
        </>
      )}

      {(hasErp || hasSite) && (
        <CatalogPriceListField
          profileId={initial?.id ?? null}
          mode={unlistedPriceMode}
          onModeChange={setUnlistedPriceMode}
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {missing.length > 0 && (
          <span className="mr-auto text-[11px] text-[var(--fg-muted)]">Eksik: {missing.join(', ')}</span>
        )}
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

// Site kataloğu: ürün, fiyat, stok ve link aynı siteden (sunucu da böyle kaydeder).
function siteCatalogBody(
  name: string, country: string, siteId: number, unlistedPriceMode: CatalogUnlistedPriceMode,
): CatalogProfileSaveBody {
  return {
    name,
    country,
    productSourceIds: [],
    productSiteSourceId: siteId,
    priceSourceId: null,
    priceSiteSourceId: siteId,
    stockMode: CATALOG_STOCK_MODE.SiteSource,
    stockSourceId: null,
    stockSiteSourceId: siteId,
    linkMode: CATALOG_LINK_MODE.SiteSource,
    linkSourceId: null,
    linkSiteSourceId: siteId,
    unlistedPriceMode,
  };
}

function priceIdOf(price: string, prefix: string): number | null {
  return price.startsWith(prefix) ? Number(price.slice(prefix.length)) : null;
}

function initialPrice(initial: CatalogProfileDto | null): string {
  if (initial?.priceSiteSourceId != null) return `${SITE_PREFIX}${initial.priceSiteSourceId}`;
  if (initial?.priceSourceId != null) return `${ERP_PREFIX}${initial.priceSourceId}`;
  return '';
}

interface ModePicker<T> {
  mode: T;
  value: number | null;
  onChange: (id: number | null) => void;
  options: { value: string; label: string }[];
}

// Stok ve link için aynı düzen: seçenekler + "belirli kaynak / site" seçiliyse kaynak listesi.
function ModeField<T extends number>({ title, options, mode, onModeChange, pickers }: {
  title: string;
  options: ModeOption<T>[];
  mode: T;
  onModeChange: (mode: T) => void;
  pickers: ModePicker<T>[];
}) {
  const hint = options.find((o) => o.value === mode)?.hint;
  const picker = pickers.find((p) => p.mode === mode);
  return (
    <div>
      <label className={labelClass}>{title}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-2.5 py-1.5">
            <input type="radio" checked={mode === o.value} onChange={() => onModeChange(o.value)} className="h-3.5 w-3.5" />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {hint && <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">{hint}</div>}
      {picker && (
        <div className="mt-2 sm:w-1/2">
          {picker.options.length === 0 ? (
            <div className="text-[11px] text-amber-600">Bu ülkede uygun kaynak yok (Veri Kaynakları&apos;ndan ekleyin).</div>
          ) : (
            <FilterSelect
              value={picker.value === null ? '' : String(picker.value)}
              onChange={(v) => picker.onChange(v === '' ? null : Number(v))}
              placeholder={`${title} kaynağı seçin`}
              height="h-8.5"
              options={picker.options}
            />
          )}
        </div>
      )}
    </div>
  );
}
