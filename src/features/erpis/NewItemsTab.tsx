'use client';

import { useMemo, useState } from 'react';
import { useErpisItems } from '@/hooks/erpis/useErpisQuery';
import { useErpisCardMatrix } from '@/hooks/erpis/useErpisCatalog';
import type { ErpisItem, ErpisQueryFilter } from '@/lib/api';
import { isTagActive, toggleTag } from './erpisFilterUtils';
import { ErpisTable, TablePager, type Column } from './ErpisTable';
import { ItemDrawer } from './ItemDrawer';
import { ExportButton } from './ExportButton';
import { EmptyState, ErrorState, KpiCard, formatDate, formatNumber } from './shared';
import { Select } from '../../components/ui/Select';

const PAGE_SIZE = 50;

// Yeni Ürünler — "geçen ay hangi ürünleri açtık".
//
// Tarih ekseni ERP'nin KART KURULUŞ tarihi (kayittarihi_d), sipariş tarihi değil. İkisi
// bambaşka sorular: bir kart bu ay açılmış ama hiç sipariş almamış olabilir; üstteki
// tarih filtresi sipariş eksenine bakıyor ve o kartı hiç göstermezdi.
//
// Gerçek veride bu alan %100 dolu (17.066/17.066), 2021-12-16 ile bugün arasında —
// güvenilir. Değişiklik tarihi kullanılmadı: bir kartın adı düzeltilince "yeni" görünmesi
// listeyi anlamsız kılardı.
const WINDOWS = [
  { key: '1m', label: 'Son 1 Ay', months: 1 },
  { key: '3m', label: 'Son 3 Ay', months: 3 },
  { key: '6m', label: 'Son 6 Ay', months: 6 },
  { key: '9m', label: 'Son 9 Ay', months: 9 },
  { key: '12m', label: 'Son 1 Yıl', months: 12 },
] as const;

export function NewItemsTab({ companyId }: { companyId: number | null }) {
  const [windowKey, setWindowKey] = useState<string>('3m');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  const matrix = useErpisCardMatrix();

  // Kutular ANA FİLTRE ÇUBUĞUYLA AYNI KAYNAKTAN: Firma Kuralları'ndaki kart adları
  // (bkz. ErpisCardTag). Önce bu ekran kendi kutularını kod kalıplarından türetiyordu;
  // aynı üç kutunun iki ayrı tanımı vardı ve biri değişince diğeri sessizce eskiyordu.
  const labels = useMemo(() => {
    const seen = new Set<string>();
    for (const group of matrix.data?.groups ?? []) {
      for (const row of group.rows) {
        if (row.label) seen.add(row.label);
      }
    }
    return [...seen];
  }, [matrix.data]);

  const [cardTags, setCardTags] = useState<string[] | undefined>(undefined);

  function toggle(label: string, checked: boolean) {
    setPage(1);
    setCardTags((current) => toggleTag(label, current, checked));
  }

  // Sıralama YOK SAYILIYORDU: başlıklar tıklanabiliyor ama onSort hiçbir şey yapmıyor,
  // sunucuya her zaman "registeredAt desc" gidiyordu. Kullanıcı Açılış'a basıp hiçbir
  // şeyin değişmediğini görüyordu.
  const [sortBy, setSortBy] = useState<string | null>('registeredAt');
  const [desc, setDesc] = useState(true);

  function toggleSort(key: string) {
    setPage(1);
    if (sortBy === key) setDesc((current) => !current);
    else {
      setSortBy(key);
      // Yeni sütuna geçerken en anlamlı yön: tarihte en yeni, metinde A'dan Z'ye.
      setDesc(key === 'registeredAt');
    }
  }

  const months = WINDOWS.find((w) => w.key === windowKey)?.months ?? 3;

  // Pencere ay takvimine göre geriye sayılıyor: "son 3 ay" 90 gün değil, üç takvim ayı.
  // Kullanıcı ay sonunda bakarken 90 günlük pencere önceki ayın başını kesiyordu.
  const registeredFrom = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }, [months]);

  // Filtre YALNIZ bu ekranda görünen kontrollerden kuruluyor: firma, pencere, DEMO/Diğer.
  //
  // Önceden global filtre (URL'deki marka, cari, arama, kod ailesi…) olduğu gibi
  // uygulanıyordu. Bu sekmede filtre çubuğu GÖSTERİLMİYOR; başka sekmede seçilmiş bir
  // marka burada görünmeden listeyi daraltıyor ve kullanıcı neden az kart gördüğünü
  // anlayamıyordu. Dışa aktarım da aynı nesneyi alıyor.
  const scoped: ErpisQueryFilter = {
    companyId,
    registeredFrom,
    cardTags,
  };

  const items = useErpisItems(scoped, { page, pageSize: PAGE_SIZE, sortBy, desc });

  const rows = items.data?.items ?? [];

  const columns: Column<ErpisItem>[] = [
    { key: 'registeredAt', label: 'Açılış', sortKey: 'registeredAt', width: 92, mobile: 'value',
      render: (i) => <span className="tabular-nums font-semibold">{formatDate(i.registeredAt)}</span> },
    { key: 'sku', label: 'SKU', sortKey: 'sku', width: 190, mobile: 'subtitle',
      render: (i) => <span className="tabular-nums font-mono text-[11px]">{i.sku}</span> },
    { key: 'name', label: 'Ad', sortKey: 'name', mobile: 'title',
      render: (i) => (
        <span className="line-clamp-2 text-[12.5px] font-bold leading-[1.3]" title={i.name ?? undefined}>
          {i.name ?? '—'}
        </span>
      ) },
    { key: 'brand', label: 'Marka', sortKey: 'brand', width: 108, mobile: 'subtitle',
      render: (i) => <span className="line-clamp-1">{i.brand ?? '—'}</span> },
    { key: 'model', label: 'Model', sortKey: 'model', width: 128, mobile: 'hidden',
      render: (i) => <span className="line-clamp-1">{i.model ?? '—'}</span> },
    { key: 'productType', label: 'Kategori', sortKey: 'productType', width: 140, mobile: 'meta',
      render: (i) => <span className="line-clamp-1">{i.productType ?? '—'}</span> },
    { key: 'skuKind', label: 'Kod Türü', width: 104, mobile: 'meta',
      render: (i) => <span className="text-[10.5px] text-[var(--fg-muted)]">{i.skuKind}</span> },
  ];

  if (items.isError) return <ErrorState />;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Mobilde TEK SATIR, masaüstünde geniş kontrol çubuğu */}
      <div data-tour="erpis-newitems-controls" className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar py-0.5">
        {/* Mobilde açılır liste */}
        <div className="flex sm:hidden shrink-0">
          <Select
            size="sm"
            value={windowKey}
            onChange={(v) => { setWindowKey(v); setPage(1); }}
            options={WINDOWS.map((w) => ({ value: w.key, label: w.label }))}
          />
        </div>

        {/* Geniş ekranda buton grubu */}
        <div className="hidden sm:flex shrink-0 rounded-[4px] border border-[var(--border-soft)] p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => { setWindowKey(w.key); setPage(1); }}
              aria-pressed={windowKey === w.key}
              className={`rounded-[3px] px-2.5 py-1 text-[12px] font-bold ${
                windowKey === w.key
                  ? 'bg-[var(--bg-subtle)] text-[var(--fg)]'
                  : 'text-[var(--fg-muted)]'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* Her kart adı için bir kutu — Firma Kuralları'nda ne yazıyorsa o. */}
        {labels.map((label) => (
          <label
            key={label}
            className="flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 sm:px-2.5 text-[11.5px] sm:text-[12px] font-semibold text-[var(--fg)]"
            title={`Yalnız «${label}» kartlarını listele`}
          >
            <input
              type="checkbox"
              checked={isTagActive(label, cardTags)}
              onChange={(e) => toggle(label, e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--fg)]"
            />
            {label}
          </label>
        ))}

        <span className="hidden lg:inline text-[11px] text-[var(--fg-muted)] shrink-0">
          Kart kuruluş tarihine göre · {registeredFrom} sonrası
        </span>

        <span className="ml-auto shrink-0">
          <ExportButton filter={scoped} target="items" />
        </span>
      </div>

      <div data-tour="erpis-newitems-kpis" className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard label="Yeni Ürün" value={formatNumber(items.data?.total)} hint="Seçili dönemde açılan" />
        <KpiCard
          label="Markalı"
          value={formatNumber(rows.filter((r) => r.brand).length)}
          hint="Bu sayfadaki satırlarda"
        />
        <KpiCard
          label="Kategorili"
          value={formatNumber(rows.filter((r) => r.productType).length)}
          hint="Bu sayfadaki satırlarda"
        />
        <KpiCard
          label="Ayrıştırılamayan"
          value={formatNumber(rows.filter((r) => !r.brand && !r.productType).length)}
          hint="Sözlüğe değer eklenmeli"
          warn={rows.some((r) => !r.brand && !r.productType)}
        />
      </div>

      {items.data && items.data.total === 0 ? (
        <EmptyState
          title="Bu dönemde açılan ürün yok"
          hint="Daha geniş bir pencere seçin ya da stok kartı raporu yükleyin."
        />
      ) : (
        <div data-tour="erpis-newitems-table" className="flex flex-col gap-2">
          <ErpisTable
            columns={columns}
            rows={rows}
            rowKey={(i) => i.id}
            sortBy={sortBy}
            desc={desc}
            onSort={toggleSort}
            onRowClick={(i) => setSelected(i.id)}
            selectedKey={selected}
            loading={items.isFetching}
          />
          <TablePager page={page} pageSize={PAGE_SIZE} total={items.data?.total ?? 0} onPage={setPage} />
        </div>
      )}

      {selected != null && <ItemDrawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
