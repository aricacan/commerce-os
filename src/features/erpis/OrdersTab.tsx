'use client';

import { useEffect, useState } from 'react';
import { useErpisLines, useErpisOrdersSummary } from '@/hooks/erpis/useErpisQuery';
import type { ErpisOrderLine } from '@/lib/api';
import { useErpisFilterState } from './useErpisFilterState';
import { ErpisTable, Money, TablePager, type Column } from './ErpisTable';
import { OrderLineDrawer } from './OrderLineDrawer';
import { EmptyState, ErrorState, KpiCard, formatDate, formatNumber } from './shared';
import { palette } from '../shared/design';

const PAGE_SIZE = 50;

// Sipariş kalemleri — raporun asıl satırı.
//
// Filtre URL'de tutuluyor (bkz. useErpisFilterState): "şu markanın açık siparişleri"
// bağlantı olarak paylaşılabiliyor ve geri tuşu çalışıyor.
export function OrdersTab({ companyId }: { companyId: number | null }) {
  const { filter, activeCount } = useErpisFilterState(companyId);

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | null>('orderDate');
  const [desc, setDesc] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const summary = useErpisOrdersSummary(filter);
  const lines = useErpisLines(filter, { page, pageSize: PAGE_SIZE, sortBy, desc });

  // Filtre değişince ilk sayfaya dönülür: 7. sayfadayken filtre daraltılırsa boş bir
  // tablo görünür ve kullanıcı "veri yok" sanır.
  //
  // Filtre çubuğu artık workspace kabuğunda (bkz. ErpisWorkspace), o yüzden değişimi
  // çağrı anında değil filtrenin KENDİSİNİ izleyerek yakalıyoruz.
  useEffect(() => { setPage(1); }, [filter]);

  function toggleSort(key: string) {
    setPage(1);
    if (sortBy === key) setDesc((d) => !d);
    else {
      setSortBy(key);
      setDesc(true);
    }
  }

  const columns: Column<ErpisOrderLine>[] = [
    { key: 'orderNo', label: 'Sipariş No', sortKey: 'orderNo', width: 96, mobile: 'subtitle',
      render: (l) => <span className="font-bold tabular-nums">{l.orderNo}</span> },
    { key: 'orderDate', label: 'Tarih', sortKey: 'orderDate', width: 88, mobile: 'subtitle',
      render: (l) => <span className="tabular-nums">{formatDate(l.orderDate)}</span> },
    { key: 'party', label: 'Cari', sortKey: 'party', width: 168, mobile: 'title',
      render: (l) => (
        <span className="line-clamp-2 text-[12.5px] font-bold leading-[1.3]" title={l.partyName ?? undefined}>
          {l.partyName ?? '—'}
        </span>
      ) },
    { key: 'sku', label: 'SKU', sortKey: 'sku', width: 190, mobile: 'meta',
      render: (l) => <span className="tabular-nums font-mono text-[11px]">{l.sku ?? '—'}</span> },
    { key: 'itemName', label: 'Ürün', sortKey: 'itemName', mobile: 'meta',
      render: (l) => <span className="line-clamp-1">{l.itemName ?? '—'}</span> },
    { key: 'brand', label: 'Marka', width: 104, mobile: 'meta',
      render: (l) => <span className="line-clamp-1">{l.brand ?? '—'}</span> },
    { key: 'model', label: 'Model', width: 116, mobile: 'hidden',
      render: (l) => <span className="line-clamp-1">{l.model ?? '—'}</span> },
    { key: 'year', label: 'Yıl', align: 'right', width: 78, mobile: 'hidden',
      render: (l) => <span className="tabular-nums">{yearRange(l.yearFrom, l.yearTo)}</span> },
    { key: 'productType', label: 'Kategori', width: 128, mobile: 'hidden',
      render: (l) => <span className="line-clamp-1">{l.productType ?? '—'}</span> },
    { key: 'orderedQty', label: 'Sipariş', sortKey: 'orderedQty', align: 'right', width: 76, mobile: 'meta',
      render: (l) => <span className="tabular-nums font-semibold">{formatNumber(l.orderedQty, 2)}</span> },
    { key: 'remainingQty', label: 'Kalan', sortKey: 'remainingQty', align: 'right', width: 76, mobile: 'meta',
      render: (l) => <span className="tabular-nums font-semibold">{formatNumber(l.remainingQty, 2)}</span> },
    { key: 'unitPrice', label: 'Birim Fiyat', sortKey: 'unitPrice', align: 'right', width: 116, mobile: 'hidden',
      render: (l) => <Money amount={l.unitPrice} currency={l.currency} /> },
    { key: 'netAmount', label: 'Net Tutar', sortKey: 'netAmount', align: 'right', width: 130, mobile: 'value',
      render: (l) => <Money amount={l.netAmount} currency={l.currency} /> },
    { key: 'status', label: 'Durum', width: 74, mobile: 'meta',
      render: (l) => <StatusBadge closed={l.isClosed} /> },
  ];

  if (lines.isError || summary.isError) return <ErrorState />;

  const total = summary.data;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div data-tour="erpis-orders-kpis" className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard label="Sipariş" value={formatNumber(total?.orderCount)}
          hint={`${formatNumber(total?.lineCount)} kalem satırı`} />
        <KpiCard label="Açık Kalem" value={formatNumber(total?.openLineCount)}
          hint={`${formatNumber(total?.closedLineCount)} kapalı`} />
        <KpiCard label="Ürün" value={formatNumber(total?.itemCount)}
          hint={`${formatNumber(total?.partyCount)} cari`} />
        <KpiCard label="Toplam"
          value={total?.totals[0] ? formatNumber(total.totals[0].total, 0) : '—'}
          hint={currencyHint(total?.totals)} />
      </div>

      {lines.data && lines.data.total === 0 ? (
        <EmptyState
          title="Bu filtreye uyan sipariş kalemi yok"
          hint={activeCount > 0 ? 'Filtreleri temizleyip tekrar deneyin.' : 'Önce bir sipariş raporu yükleyin.'}
        />
      ) : (
        <div data-tour="erpis-orders-table" className="flex flex-col gap-2">
          <ErpisTable
            columns={columns}
            rows={lines.data?.items ?? []}
            rowKey={(l) => l.id}
            sortBy={sortBy}
            desc={desc}
            onSort={toggleSort}
            onRowClick={(l) => setSelected(l.id)}
            selectedKey={selected}
            loading={lines.isFetching}
          />
          <TablePager
            page={page}
            pageSize={PAGE_SIZE}
            total={lines.data?.total ?? 0}
            onPage={setPage}
          />
        </div>
      )}

      {selected != null && (
        <OrderLineDrawer id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// Tutarlar para birimi bazında ayrı geliyor (farklı dövizler toplanmaz); ipucu satırı
// hangi birimlerin karıştığını söyler.
function currencyHint(totals: { currency: string; total: number }[] | undefined): string {
  if (!totals || totals.length === 0) return '—';
  if (totals.length === 1) return totals[0].currency;
  return `${totals[0].currency} + ${totals.length - 1} para birimi daha`;
}

function StatusBadge({ closed }: { closed: boolean }) {
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-extrabold"
      style={{
        color: closed ? palette.textMuted : palette.success,
        background: closed ? palette.chipBg : 'rgba(34, 197, 94, 0.12)',
      }}
    >
      {closed ? 'Kapalı' : 'Açık'}
    </span>
  );
}

// "2014-2018", tek yıl ise "2014", açık uçlu ise "2019-". Kart bazında iki ayrı sütun
// göstermek tabloyu şişiriyordu; okunan bilgi zaten aralık.
function yearRange(from: number | null, to: number | null): string {
  if (from == null && to == null) return '—';
  if (from != null && to != null) return from === to ? String(from) : `${from}-${to}`;
  return from != null ? `${from}-` : `-${to}`;
}
