'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { resolveDatePreset, type DatePreset } from '../../utils/date';
import {
  ERPIS_DATE_FIELDS,
  ERPIS_DATE_FIELD_LABELS,
  ERPIS_SCOPES,
  ERPIS_SCOPE_LABELS,
  type ErpisFilterOption,
  type ErpisFilterOptions,
  type ErpisQueryFilter,
} from '@/lib/api';
import { icon, palette } from '../shared/design';
import { isTagActive, toggleTag } from './erpisFilterUtils';

// Erpis'in TEK filtre çubuğu — workspace kabuğunda bir kez çizilir, sekmeler paylaşır.
//
// Önceden her sekme kendi çubuğunu kuruyordu ve on bir chip masaüstünde üç satır
// kaplıyordu: ekranın üçte biri filtreydi, veri aşağıda kalıyordu. Şimdi tek satır +
// "Filtreler" açılır paneli; seçili olanlar altta çıkarılabilir rozet olarak duruyor.
//
// Durum URL'de (bkz. useErpisFilterState): sekmeler arası geçişte filtre korunuyor ve
// bağlantı paylaşılabiliyor.

interface Props {
  filter: ErpisQueryFilter;
  options?: ErpisFilterOptions;
  activeCount: number;
  onChange: (patch: Partial<ErpisQueryFilter>) => void;
  onReset: () => void;
  exportButton?: React.ReactNode;
}

const CONTROL = 'h-8 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[12px] text-[var(--fg)]';

export function ErpisQueryFilterBar({
  filter, options, activeCount, onChange, onReset, exportButton,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;

    const close = (e: MouseEvent) => {
      // Panel ve düğme artık ayrı düğümler; düğmeye tıklamak da "dışarı" sayılırsa
      // panel açılır açılmaz kapanırdı. Kök kapsayıcı kontrol ediliyor.
      if (!rootRef.current?.contains(e.target as Node)) setPanelOpen(false);
    };
    // Escape paneli kapatır. İçindeki bir açılır menü tuşu zaten işlediyse (kendini kapattı)
    // panel açık kalır — tek Escape'te her şeyin birden kapanması istenmiyor.
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      setPanelOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [panelOpen]);

  // Seçili ön ayar, URL'deki from/to'dan GERİ TÜRETİLİYOR.
  //
  // Ön ayarı ayrıca URL'e yazmak, aynı gerçeği iki yerde saklamak olurdu: kullanıcı
  // bağlantıyı elle düzenlediğinde ikisi ayrışır ve seçicide "Bu Ay" yazarken sorgu
  // başka bir aralığı getirirdi.
  const preset = presetOf(filter.from, filter.to);

  function applyPreset(next: DatePreset) {
    if (next === 'all') {
      onChange({ from: null, to: null });
      return;
    }

    const { from, to } = resolveDatePreset(next);
    onChange({ from, to });
  }

  // Kart kutuları SABİT DEĞİL — kullanıcının yazdığı kurallardan geliyor (bkz.
  // ErpisCardTag). Önce "DEMO Ürünler" ve "Diğer Ürünler" koda gömülüydü ve kodun
  // tanımadığı kartlar (dışardan tedarik edilen ürünler gibi) HİÇBİR kutuda
  // görünmüyordu. Sunucu etiketleri birleştirilmiş ve sayılmış olarak veriyor.
  const cardTags = options?.cardTags ?? [];

  function handleToggleTag(label: string, checked: boolean) {
    onChange({ cardTags: toggleTag(label, filter.cardTags, checked) });
  }

  const chips = dimensionChips(filter, options, onChange);
  const pills = activePills(filter, options, onChange);

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      {/* Çubuk SATIR KIRIYOR, yatay KAYMIYOR.
          Önce `flex-nowrap overflow-x-auto` vardı: dar ekranda aramadan sonraki her şey
          (kart kutuları, Filtreler düğmesi, Temizle) ekranın dışına taşıyordu ve orada
          bir şey olduğuna dair hiçbir işaret yoktu — kaydırma çubuğu da gizliydi. */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 py-0.5">
        {/* TARİH EN SOLDA: Panonun ortak seçicisiyle aynı */}
        <div className="shrink-0">
          <DateRangePicker
            value={preset}
            onChange={(next) => applyPreset(next)}
            customFrom={filter.from ?? ''}
            customTo={filter.to ?? ''}
            onCustomChange={(from, to) => onChange({ from, to })}
            includeAll
          />
        </div>

        {/* Arama: Mobilde esnek tek satır elemanı, masaüstünde 224px sabit */}
        <div className="relative min-w-[120px] flex-1 md:w-56 md:flex-none">
          <Search
            size={icon.md}
            strokeWidth={icon.stroke}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
          />
          <input
            type="search"
            value={filter.search ?? ''}
            onChange={(e) => onChange({ search: e.target.value || null })}
            placeholder="Sipariş no, SKU, ürün, cari…"
            aria-label="Ara"
            maxLength={100}
            className={`${CONTROL} w-full pl-8 pr-2 outline-none focus:border-[var(--border)]`}
          />
        </div>

        {/* İKİNCİL kontroller yalnız GENİŞ ekranda çubukta (xl), altında panelde.
            Eşik md (768px) iken 800-1200px arası ekranlarda dört kontrol daha çubuğa
            giriyor ve asıl kutuları aşağı satıra itiyordu. */}
        <div className="hidden flex-wrap items-center gap-2 xl:flex shrink-0">
        {/* TARİH ALANI: seçilen aralık HANGİ tarihe uygulanıyor — sipariş mi, teslim mi,
            kayıt mı. Çubukta "Sipariş Tarihi" yazan bir kutu vardı ve tek başına ne işe
            yaradığı anlaşılmıyordu; artık tarih seçicinin yanında ve etiketi "…tarihine
            göre" diyerek cümleyi tamamlıyor. */}
        <FilterSelect
          value={filter.dateField ?? 'order'}
          options={ERPIS_DATE_FIELDS.map((f) => ({
            value: f,
            label: ERPIS_DATE_FIELD_LABELS[f],
            sublabel: 'Aralık bu tarihe uygulanır',
          }))}
          placeholder="Tarih alanı"
          onChange={(v) => onChange({ dateField: v as ErpisQueryFilter['dateField'] })}
          minWidth={150}
          // Seçenekler tüm değerleri kapsıyor; listenin başındaki boş "hepsi" satırı
          // tıklandığında hiçbir şey yapmayan ölü bir satır olurdu.
          showAllOption={false}
        />

        <FilterSelect
          value={filter.scope ?? 'all'}
          options={ERPIS_SCOPES.map((s) => ({ value: s, label: ERPIS_SCOPE_LABELS[s] }))}
          placeholder="Pazar"
          onChange={(v) => onChange({ scope: v as ErpisQueryFilter['scope'] })}
          minWidth={124}
          showAllOption={false}
        />

        <label className={`${CONTROL} flex cursor-pointer items-center gap-1.5 px-2.5 font-semibold`}>
          <input
            type="checkbox"
            checked={filter.onlyOpen ?? false}
            onChange={(e) => onChange({ onlyOpen: e.target.checked })}
            className="h-3.5 w-3.5 accent-[var(--fg)]"
          />
          Sadece açık
        </label>

        {/* Erpis raporunda "İhracat Listelemesi" adlı taşıyıcı bir cari var ve gerçek
            dosyada satırların %73'ü onun üstünde (toplam tutarı 2,10 TL). Gerçek sipariş
            olmadıkları için varsayılan olarak sayılmıyorlar; ham dosyayla karşılaştırmak
            isteyen bu kutuyu işaretliyor. */}
        <label
          className={`${CONTROL} flex cursor-pointer items-center gap-1.5 px-2.5 font-semibold`}
          title="Gerçek sipariş olmayan ihracat listeleme kayıtlarını da say"
        >
          <input
            type="checkbox"
            checked={filter.includeInactiveParties ?? false}
            onChange={(e) => onChange({ includeInactiveParties: e.target.checked })}
            className="h-3.5 w-3.5 accent-[var(--fg)]"
          />
          Listeleme kayıtları
        </label>

        </div>

        {/* KART KUTULARI HER GENİŞLİKTE ÇUBUKTA.
            Modülün en çok kullanılan filtresi bu; ikincil kontrollerle birlikte panele
            indirilseydi kullanıcı her seferinde paneli açmak zorunda kalırdı. */}
        {cardTags.map((tag) => (
          <label
            key={tag.value}
            className={`${CONTROL} flex shrink-0 cursor-pointer items-center gap-1.5 px-2.5 font-semibold`}
            title={`${tag.label}: ${tag.count} kart`}
          >
            <input
              type="checkbox"
              checked={isTagActive(tag.value, filter.cardTags)}
              onChange={(e) => handleToggleTag(tag.value, e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--fg)]"
            />
            {tag.label}
          </label>
        ))}

        {/* Düğme HER ZAMAN görünür: mobilde tarih/pazar kontrolleri de panelin içinde,
            boyut chip'i olmasa bile panele ihtiyaç var. */}
        <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            className={`${CONTROL} shrink-0 flex items-center gap-1.5 px-2.5 font-bold ${
              panelOpen ? 'border-[var(--border)]' : ''
            }`}
          >
            <SlidersHorizontal size={icon.sm} strokeWidth={icon.stroke} />
            Filtreler
            {pills.length > 0 && (
              <span
                className="rounded-full px-1.5 text-[10px] font-extrabold tabular-nums"
                style={{ background: palette.chipBg, color: palette.textMuted }}
              >
                {pills.length}
              </span>
            )}
            {panelOpen
              ? <ChevronUp size={icon.sm} strokeWidth={icon.stroke} />
              : <ChevronDown size={icon.sm} strokeWidth={icon.stroke} />}
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className={`${CONTROL} shrink-0 flex items-center gap-1 bg-transparent px-2.5 font-bold`}
          >
            <X size={icon.sm} strokeWidth={icon.stroke} />
            Temizle
            <span
              className="ml-0.5 rounded-full px-1.5 text-[10px] font-extrabold tabular-nums"
              style={{ background: palette.chipBg, color: palette.textMuted }}
            >
              {activeCount}
            </span>
          </button>
        )}

        {exportButton && (
          <div className="ml-auto shrink-0 pl-1">
            {exportButton}
          </div>
        )}
      </div>

      {/* Panel AŞAĞI açılıyor, düzenli ve hizalı CSS Grid ile */}
      {panelOpen && (
        <div className="flex flex-col gap-3 rounded-[8px] border border-[var(--border-soft)] bg-[var(--card)] p-3 sm:p-4 shadow-sm animate-fade-in">
          {/* Masaüstünde çubukta duran kontroller mobilde BURADA. */}
          <div className="flex flex-col gap-2 border-b border-[var(--border-soft)] pb-3 xl:hidden">
            <span className="text-[11px] font-bold text-[var(--fg-muted)]">Tarih ve Kapsam</span>
            <div className="grid grid-cols-2 gap-2">
              <FilterSelect
                value={filter.dateField ?? 'order'}
                options={ERPIS_DATE_FIELDS.map((f) => ({ value: f, label: ERPIS_DATE_FIELD_LABELS[f] }))}
                placeholder="Tarih alanı"
                onChange={(v) => onChange({ dateField: v as ErpisQueryFilter['dateField'] })}
                minWidth={0}
                className="w-full"
                showAllOption={false}
              />
              <FilterSelect
                value={filter.scope ?? 'all'}
                options={ERPIS_SCOPES.map((sc) => ({ value: sc, label: ERPIS_SCOPE_LABELS[sc] }))}
                placeholder="Pazar"
                onChange={(v) => onChange({ scope: v as ErpisQueryFilter['scope'] })}
                minWidth={0}
                className="w-full"
                showAllOption={false}
              />
              <DateInput label="Başlangıç" value={filter.from} onChange={(v) => onChange({ from: v })} />
              <DateInput label="Bitiş" value={filter.to} onChange={(v) => onChange({ to: v })} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className={`${CONTROL} flex cursor-pointer items-center gap-1.5 px-2.5 font-semibold text-[11px]`}>
                <input
                  type="checkbox"
                  checked={filter.onlyOpen ?? false}
                  onChange={(e) => onChange({ onlyOpen: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[var(--fg)]"
                />
                <span className="truncate">Sadece açık</span>
              </label>

              <label className={`${CONTROL} flex cursor-pointer items-center gap-1.5 px-2.5 font-semibold text-[11px]`}>
                <input
                  type="checkbox"
                  checked={filter.includeInactiveParties ?? false}
                  onChange={(e) => onChange({ includeInactiveParties: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[var(--fg)]"
                />
                <span className="truncate">Listeleme kayıtları</span>
              </label>

            </div>
          </div>

          {/* Boyut filtreleri: Düzenli ve responsive CSS Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 w-full">
            {chips}
            <YearInput label="Yıl ≥" value={filter.yearFrom} placeholder={options?.minYear}
              onChange={(v) => onChange({ yearFrom: v })} />
            <YearInput label="Yıl ≤" value={filter.yearTo} placeholder={options?.maxYear}
              onChange={(v) => onChange({ yearTo: v })} />
          </div>

          {/* Panel alt çubuğu: aktif filtre sayısı ve kapatma */}
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-2.5 text-[11px]">
            <span className="text-[var(--fg-muted)]">
              {activeCount > 0 ? `${activeCount} filtre aktif` : 'Tüm veriler gösteriliyor'}
            </span>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="font-medium text-[var(--fg-muted)] hover:text-[var(--fg)] underline underline-offset-2"
                >
                  Filtreleri Temizle
                </button>
              )}
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="h-7 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seçili boyutlar panelin İÇİNDE değil DIŞINDA: panel kapalıyken de hangi
          filtrenin sonucu daralttığı görünmeli, tek tıkla kaldırılabilmeli. */}
      {pills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">{pills}</div>
      )}
    </div>
  );
}

// ── Boyut seçicileri ─────────────────────────────────────────────────────────

function dimensionChips(
  filter: ErpisQueryFilter,
  options: ErpisFilterOptions | undefined,
  onChange: (patch: Partial<ErpisQueryFilter>) => void,
) {
  const chips = [
    <TextChip key="brands" label="Marka" values={filter.brands} items={options?.brands}
      onChange={(v) => onChange({ brands: v })} />,
    <TextChip key="models" label="Model" values={filter.models} items={options?.models}
      onChange={(v) => onChange({ models: v })} />,
    // Etiketler alanların GERÇEK içeriğine göre (bkz. ERPIS_BREAKDOWN_LABELS): Erpis'in
    // "ürün tipi" kolonu ürün kategorilerini, "kategori" kolonu araç ailelerini taşıyor.
    <TextChip key="productTypes" label="Kategori" values={filter.productTypes} items={options?.productTypes}
      onChange={(v) => onChange({ productTypes: v })} />,
    <IdChip key="categoryIds" label="Araç / Grup" values={filter.categoryIds} items={options?.categories}
      onChange={(v) => onChange({ categoryIds: v })} />,
    <IdChip key="partyIds" label="Cari" values={filter.partyIds} items={options?.parties}
      onChange={(v) => onChange({ partyIds: v })} />,
    <TextChip key="currencies" label="Para Birimi" values={filter.currencies} items={options?.currencies}
      onChange={(v) => onChange({ currencies: v })} />,
    <TextChip key="countries" label="Ülke" values={filter.countries} items={options?.countries}
      onChange={(v) => onChange({ countries: v })} />,
    <TextChip key="itemKinds" label="Kart Türü" values={filter.itemKinds} items={options?.itemKinds}
      onChange={(v) => onChange({ itemKinds: v })} />,
    // Kod ailesi — kullanıcının Firma Kuralları'nda adlandırdığı kalıplar. Etiket
    // verilmemişse maskenin kendisi görünür; maske de bir cevap, sadece daha çirkin bir
    // cevap.
    <TextChip key="skuPatterns" label="Kod Ailesi" values={filter.skuPatterns} items={options?.skuPatterns}
      onChange={(v) => onChange({ skuPatterns: v })} />,
    // SKU segmentleri stok kodunun tire ile ayrılmış parçaları ("0161-1120001420-…").
    // Kullanıcı SKU Sözlüğü sekmesinde adlandırana kadar ham sayılar — filtrede
    // "1109904280 (304)" diye bir seçenek kimseye bir şey söylemiyor, o yüzden
    // etiketlenmemiş segmentler hiç gösterilmiyor (bkz. isLabelled).
    <TextChip key="seg1" label="Segment 1" values={filter.seg1} items={labelled(options?.seg1)}
      onChange={(v) => onChange({ seg1: v })} />,
    <TextChip key="seg2" label="Segment 2" values={filter.seg2} items={labelled(options?.seg2)}
      onChange={(v) => onChange({ seg2: v })} />,
    <TextChip key="seg3" label="Segment 3" values={filter.seg3} items={labelled(options?.seg3)}
      onChange={(v) => onChange({ seg3: v })} />,
  ];

  return chips.filter((chip) => chip.props.items?.length);
}

// Adlandırılmış segmentler: sunucu etiketi yoksa değeri döndürüyor, ikisi eşitse
// segment hâlâ ham koddur.
function labelled(items: ErpisFilterOption[] | undefined) {
  return (items ?? []).filter((o) => o.label !== o.value);
}

// ── Seçili filtre rozetleri ──────────────────────────────────────────────────

function activePills(
  filter: ErpisQueryFilter,
  options: ErpisFilterOptions | undefined,
  onChange: (patch: Partial<ErpisQueryFilter>) => void,
) {
  const pills: React.ReactNode[] = [];

  const addText = (
    key: 'brands' | 'models' | 'productTypes' | 'currencies' | 'countries' | 'itemKinds'
      | 'seg1' | 'seg2' | 'seg3',
    label: string,
  ) => {
    for (const value of filter[key] ?? []) {
      pills.push(
        <Pill
          key={`${key}-${value}`}
          text={`${label}: ${value}`}
          onRemove={() => onChange({ [key]: (filter[key] ?? []).filter((v) => v !== value) })}
        />,
      );
    }
  };

  const addId = (
    key: 'categoryIds' | 'partyIds',
    label: string,
    items: ErpisFilterOption[] | undefined,
  ) => {
    for (const value of filter[key] ?? []) {
      const name = items?.find((o) => o.value === String(value))?.label ?? String(value);
      pills.push(
        <Pill
          key={`${key}-${value}`}
          text={`${label}: ${name}`}
          onRemove={() => onChange({ [key]: (filter[key] ?? []).filter((v) => v !== value) })}
        />,
      );
    }
  };

  addText('brands', 'Marka');
  addText('models', 'Model');
  addText('productTypes', 'Kategori');
  addId('categoryIds', 'Araç / Grup', options?.categories);
  addId('partyIds', 'Cari', options?.parties);
  addText('currencies', 'Para Birimi');
  addText('countries', 'Ülke');
  addText('itemKinds', 'Kart Türü');

  for (const value of filter.cardTags ?? []) {
    pills.push(
      <Pill
        key={`cardTags-${value}`}
        text={`Kart: ${value}`}
        onRemove={() => onChange({ cardTags: (filter.cardTags ?? []).filter((v) => v !== value) })}
      />,
    );
  }

  for (const value of filter.skuPatterns ?? []) {
    // Kalıbın etiketi kural tablosundan geliyor; yoksa maskenin kendisi gösteriliyor —
    // maske de bir cevap, sadece daha çirkin bir cevap.
    const friendlyName = options?.skuPatterns?.find((o) => o.value === value)?.label ?? value;
    pills.push(
      <Pill
        key={`skuPatterns-${value}`}
        text={`Kod Ailesi: ${friendlyName}`}
        onRemove={() => onChange({ skuPatterns: (filter.skuPatterns ?? []).filter((v) => v !== value) })}
      />,
    );
  }

  addText('seg1', 'Segment 1');
  addText('seg2', 'Segment 2');
  addText('seg3', 'Segment 3');

  if (filter.yearFrom != null) {
    pills.push(<Pill key="yearFrom" text={`Yıl ≥ ${filter.yearFrom}`} onRemove={() => onChange({ yearFrom: null })} />);
  }
  if (filter.yearTo != null) {
    pills.push(<Pill key="yearTo" text={`Yıl ≤ ${filter.yearTo}`} onRemove={() => onChange({ yearTo: null })} />);
  }

  return pills;
}

function Pill({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      title="Filtreyi kaldır"
      className="flex h-6 items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--bg-subtle)] pl-2.5 pr-1.5 text-[11px] font-semibold text-[var(--fg)] transition-colors hover:border-[var(--border)]"
    >
      {text}
      <X size={10} strokeWidth={2.5} className="text-[var(--fg-muted)]" />
    </button>
  );
}

// Seçenek etiketleri sayıyı da gösterir: "FORD (249)". Kullanıcı hangi filtrenin veri
// getireceğini seçmeden önce görür.
function withCounts(items: ErpisFilterOption[] | undefined) {
  return (items ?? []).map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }));
}

function TextChip({ label, values, items, onChange }: {
  label: string;
  values: string[] | undefined;
  items: ErpisFilterOption[] | undefined;
  onChange: (values: string[]) => void;
}) {
  if ((items?.length ?? 0) === 0) return null;

  return (
    <MultiSelect
      label={label}
      allLabel={`Tüm ${label.toLowerCase()}`}
      options={withCounts(items)}
      selected={values ?? []}
      onChange={(v) => onChange(v.map(String))}
      searchable
      compact
      className="w-full"
    />
  );
}

function IdChip({ label, values, items, onChange }: {
  label: string;
  values: number[] | undefined;
  items: ErpisFilterOption[] | undefined;
  onChange: (values: number[]) => void;
}) {
  if ((items?.length ?? 0) === 0) return null;

  return (
    <MultiSelect
      label={label}
      allLabel={`Tüm ${label.toLowerCase()}`}
      options={withCounts(items)}
      selected={(values ?? []).map(String)}
      onChange={(v) => onChange(v.map(Number))}
      searchable
      compact
      className="w-full"
    />
  );
}

function DateInput({ label, value, onChange }: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      title={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`${CONTROL} w-full px-2 outline-none focus:border-[var(--border)]`}
    />
  );
}

function YearInput({ label, value, placeholder, onChange }: {
  label: string;
  value: number | null | undefined;
  placeholder: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className={`${CONTROL} flex items-center justify-between gap-1.5 px-2.5 text-[11px] font-semibold text-[var(--fg-muted)] w-full`}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        aria-label={`${label} yılı`}
        value={value ?? ''}
        placeholder={placeholder != null ? String(placeholder) : '—'}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-14 bg-transparent text-[12px] tabular-nums text-[var(--fg)] outline-none text-right"
      />
    </label>
  );
}

// URL'deki aralığın hangi ön ayara denk geldiği.
//
// Bilinen ön ayarların ürettiği aralıkla karşılaştırılıyor; hiçbirine uymuyorsa
// "özel". Tarih yoksa "tümü" — Erpis'te tarih filtresi zorunlu değil.
const PRESETS: DatePreset[] = [
  'today', 'yesterday', 'week', 'month', 'lastMonth', '30days', '3month', '6month', '9month',
  '365days', 'year',
];

function presetOf(from?: string | null, to?: string | null): DatePreset {
  if (!from && !to) return 'all';

  for (const candidate of PRESETS) {
    const range = resolveDatePreset(candidate);
    if (range.from === from && range.to === to) return candidate;
  }

  return 'custom';
}
