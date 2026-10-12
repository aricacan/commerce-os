'use client';

import { useEffect, useState } from 'react';
import { useErpisItems } from '@/hooks/erpis/useErpisQuery';
import type { ErpisItem } from '@/lib/api';
import { useErpisFilterState } from './useErpisFilterState';
import { ErpisTable, TablePager, type Column } from './ErpisTable';
import { ItemDrawer } from './ItemDrawer';
import { EmptyState, ErrorState, formatNumber } from './shared';
import { palette } from '../shared/design';

const PAGE_SIZE = 50;

// Düşük güvenli ayrıştırma bu eşiğin altında uyarı rengiyle gösterilir — kullanıcı
// hangi kartları elle düzeltmesi gerektiğini listeye bakarak görür.
const LOW_CONFIDENCE = 60;

// Stok kartları — ayrıştırılmış marka/model/yıl alanlarıyla.
export function ItemsTab({ companyId }: { companyId: number | null }) {
  const { filter, activeCount } = useErpisFilterState(companyId);

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | null>('sku');
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const items = useErpisItems(filter, { page, pageSize: PAGE_SIZE, sortBy, desc });

  // Filtre çubuğu workspace kabuğunda (bkz. ErpisWorkspace); değişimi filtrenin
  // kendisini izleyerek yakalıyoruz — daraltılan filtreyle 7. sayfada kalmak "veri yok"
  // gibi görünüyordu.
  useEffect(() => { setPage(1); }, [filter]);

  function toggleSort(key: string) {
    setPage(1);
    if (sortBy === key) setDesc((d) => !d);
    else {
      setSortBy(key);
      setDesc(key === 'confidence');
    }
  }

  const columns: Column<ErpisItem>[] = [
    { key: 'sku', label: 'SKU', sortKey: 'sku', width: 200, mobile: 'subtitle',
      render: (i) => <SkuCell item={i} /> },
    { key: 'name', label: 'Ad', sortKey: 'name', mobile: 'title',
      render: (i) => <span className="line-clamp-2 text-[12.5px] font-bold leading-[1.3]">{i.name ?? '—'}</span> },
    { key: 'brand', label: 'Marka', sortKey: 'brand', width: 110, mobile: 'subtitle',
      render: (i) => i.brand ?? '—' },
    { key: 'model', label: 'Model', sortKey: 'model', width: 150, mobile: 'meta',
      render: (i) => <span className="line-clamp-1">{i.model ?? '—'}</span> },
    { key: 'year', label: 'Yıl', sortKey: 'yearFrom', width: 84, mobile: 'meta',
      render: (i) => <span className="tabular-nums">{i.yearText ?? years(i)}</span> },
    { key: 'productType', label: 'Kategori', sortKey: 'productType', width: 150, mobile: 'meta',
      render: (i) => <span className="line-clamp-1">{i.productType ?? '—'}</span> },
    { key: 'category', label: 'Araç / Grup', width: 140, mobile: 'hidden',
      render: (i) => <span className="line-clamp-1">{i.categoryName ?? '—'}</span> },
    { key: 'confidence', label: 'Güven', sortKey: 'confidence', align: 'right', width: 78, mobile: 'value',
      render: (i) => <Confidence item={i} /> },
  ];

  if (items.isError) return <ErrorState />;

  return (
    <div className="flex flex-col gap-3 p-4">
      {items.data && items.data.total === 0 ? (
        <EmptyState
          title="Bu filtreye uyan ürün yok"
          hint={activeCount > 0 ? 'Filtreleri temizleyip tekrar deneyin.' : 'Önce bir stok kartı dosyası yükleyin.'}
        />
      ) : (
        <div data-tour="erpis-items-table" className="flex flex-col gap-2">
          <ErpisTable
            columns={columns}
            rows={items.data?.items ?? []}
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

function years(item: ErpisItem): string {
  if (item.yearFrom == null) return '—';
  return item.yearTo == null ? `${item.yearFrom}-` : `${item.yearFrom}-${item.yearTo}`;
}

// 8-6-8 SKU'nun üç parçası ayrı gösterilir: segmentler kodlanmış anlam taşıyor ve
// kullanıcı aynı Seg1 altındaki ürünleri gözle gruplayabiliyor.
function SkuCell({ item }: { item: ErpisItem }) {
  if (!item.seg1) return <span className="tabular-nums text-[11px]">{item.sku}</span>;

  return (
    <span className="tabular-nums text-[11px]">
      <span className="font-bold">{item.seg1}</span>
      <span className="text-[var(--fg-muted)]">-{item.seg2}-{item.seg3}</span>
    </span>
  );
}

function Confidence({ item }: { item: ErpisItem }) {
  const manual = item.parseSource === 'Manual';
  const low = item.parseConfidence < LOW_CONFIDENCE;

  return (
    <span
      className="tabular-nums text-[11.5px] font-bold"
      style={{ color: manual ? palette.text : low ? palette.warningText : palette.textMuted }}
      title={manual ? 'Elle düzeltildi — otomatik ayrıştırma bu kartı ezmez' : undefined}
    >
      {manual ? '🔒 ' : ''}{formatNumber(item.parseConfidence)}
    </span>
  );
}
