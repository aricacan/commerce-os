'use client';

import { useEffect, useState } from 'react';
import { useErpisPlanning } from '@/hooks/erpis/useErpisQuery';
import type { ErpisPlanningItem, ErpisPlanningStatus, ErpisQueryFilter } from '@/lib/api';
import { useErpisFilterState } from './useErpisFilterState';
import { ErpisTable, TablePager, type Column } from './ErpisTable';
import { ItemDrawer } from './ItemDrawer';
import { ExportButton } from './ExportButton';
import { EmptyState, ErrorState, formatNumber } from './shared';

const PAGE_SIZE = 50;

// Planlama — "bu üründen elimde yeter mi".
//
// ÜRÜN bazlı, sipariş bazlı DEĞİL: aynı ürün beş siparişte geçiyorsa beş satır göstermek
// aynı stok rakamını beş kez tekrarlıyor ve "toplam ne kadar söz verdim" sorusunu
// cevapsız bırakıyordu. Bir ürün, bir satır.
//
// Üç sütun:
//   • MEVCUT   — ERP'nin kendi stok kolonu (MEVCUT MİK)
//   • SEVKİYAT — açık siparişlerde çıkmayı bekleyen miktar
//   • FİİLİ    — mevcut − sevkiyat
//
// Depo raporunda 100 adet görünen bir üründen 20'si zaten sipariş edilip çıkmayı
// bekliyorsa gerçekte satılabilir olan 80'dir; sipariş alan kişi 100'e bakıp söz veriyor
// ve stok tutmuyordu.

// Satır durumu — renk YALNIZ buradan geliyor ve üç seviyeden ibaret.
//
// Tablo baştan aşağı renklenirse "hangi satıra bakayım" sorusu cevapsız kalıyor. Tonlar
// SOLUK: satırın kendisi değil, durumu işaretleniyor.
type Status = ErpisPlanningStatus;

const STATUS_STYLE: Record<Status, { row: string; dot: string; label: string }> = {
  short: {
    row: 'bg-[rgba(190,60,60,0.06)]',
    dot: 'rgba(190,60,60,0.85)',
    label: 'Stok yetmiyor',
  },
  tight: {
    row: 'bg-[rgba(180,120,20,0.06)]',
    dot: 'rgba(180,120,20,0.8)',
    label: 'Sınırda (sevkiyat sonrası %10 altı)',
  },
  ok: { row: '', dot: 'rgba(60,150,110,0.75)', label: 'Yeterli' },
  unknown: { row: '', dot: 'var(--border)', label: 'Stok bilinmiyor' },
};

// "Sınırda" eşiği: sevkiyat çıktıktan sonra elde kalan, bekleyen miktarın onda birinden
// azsa bir sonraki siparişte sıkışılacak demektir. Sunucudaki eşikle AYNI olmak zorunda
// (bkz. ErpisQueryService.TightRatio) — yoksa satır ekranda sarı, Excel'de beyaz çıkar.
const TIGHT_RATIO = 0.1;

function statusOf(row: ErpisPlanningItem): Status {
  if (row.stockOnHand == null) return 'unknown';
  if (row.availableQty == null) return 'unknown';
  if (row.availableQty < 0) return 'short';
  if (row.pendingQty > 0 && row.availableQty < row.pendingQty * TIGHT_RATIO) return 'tight';
  return 'ok';
}

export function PlanningTab({ companyId }: { companyId: number | null }) {
  const { filter, activeCount } = useErpisFilterState(companyId);

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  // KPI'ya tıklayınca liste O DURUMA daralıyor. Rakamı görüp "hangileri" diye sormak,
  // kullanıcının listeyi elle taramasına yol açıyordu.
  //
  // Süzme SUNUCUDA: durum sayaçları eskiden yalnız AÇIK SAYFAYI sayıyordu, yani
  // "Stok yetmiyor: 12" aslında "bu 50 satırın 12'si" demekti ve sayfa değişince rakam
  // değişiyordu. Aynı sebeple Excel de aynı süzgeci alıyor.
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);

  const scoped = { ...filter, planningStatus: statusFilter };
  const planning = useErpisPlanning(scoped, { page, pageSize: PAGE_SIZE, sortBy, desc });

  useEffect(() => { setPage(1); }, [filter, statusFilter]);

  function toggleSort(key: string) {
    setPage(1);
    if (sortBy === key) setDesc((d) => !d);
    else {
      setSortBy(key);
      setDesc(true);
    }
  }

  const rows = planning.data?.items ?? [];
  const counts = planning.data?.counts;

  const columns: Column<ErpisPlanningItem>[] = [
    { key: 'status', label: '', width: 26, mobile: 'hidden',
      render: (r) => (
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: STATUS_STYLE[statusOf(r)].dot }}
          title={STATUS_STYLE[statusOf(r)].label}
        />
      ) },
    { key: 'sku', label: 'SKU', sortKey: 'sku', width: 190, mobile: 'subtitle',
      render: (r) => <span className="tabular-nums text-[11px] font-semibold">{r.sku}</span> },
    { key: 'name', label: 'Ürün', mobile: 'title',
      render: (r) => (
        <span className="line-clamp-2 text-[11px] leading-[1.3]" title={r.name ?? undefined}>
          {r.name ?? '—'}
        </span>
      ) },
    { key: 'brand', label: 'Marka', width: 100, mobile: 'subtitle',
      render: (r) => <span className="line-clamp-1">{r.brand ?? '—'}</span> },
    { key: 'model', label: 'Model', width: 112, mobile: 'hidden',
      render: (r) => <span className="line-clamp-1">{r.model ?? '—'}</span> },
    // "5 kalem · 5 sipariş" aynı şeyi iki kez söylüyordu: bir ürün her siparişte bir
    // kalem olduğu için iki sayı hep birbirine yakın çıkıyor. Asıl merak edilen kaç
    // SİPARİŞ etkileniyor ve toplam kaç ADET söz verilmiş.
    { key: 'openLineCount', label: 'Bekleyen', align: 'right', width: 110, mobile: 'meta',
      render: (r) => (
        <span className="tabular-nums text-[var(--fg-muted)]">
          {formatNumber(r.orderCount)} sipariş · {formatNumber(r.pendingQty, 0)} adet
        </span>
      ) },
    { key: 'stockOnHand', label: 'Mevcut', sortKey: 'stockOnHand', align: 'right', width: 88, mobile: 'meta',
      render: (r) => (
        <span className="tabular-nums">
          {r.stockOnHand == null ? '—' : formatNumber(r.stockOnHand, 2)}
        </span>
      ) },
    { key: 'pendingQty', label: 'Sevkiyat', sortKey: 'pendingQty', align: 'right', width: 88, mobile: 'meta',
      render: (r) => (
        <span className="tabular-nums text-[var(--fg-muted)]">{formatNumber(r.pendingQty, 2)}</span>
      ) },
    { key: 'availableQty', label: 'Fiili Stok', align: 'right', width: 92, mobile: 'value',
      render: (r) => {
        const status = statusOf(r);
        return (
          <span
            className="tabular-nums font-extrabold"
            style={{ color: status === 'ok' ? 'var(--fg)' : STATUS_STYLE[status].dot }}
          >
            {r.availableQty == null ? '—' : formatNumber(r.availableQty, 2)}
          </span>
        );
      } },
  ];

  if (planning.isError) return <ErrorState />;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div data-tour="erpis-planning-kpis" className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
        {/* Her kartın kendi Excel'i: "stok yetmiyor" rakamını gören kişinin bir sonraki
            hareketi zaten o listeyi tedarikçiye götürmek. Aradaki adım (kartı seç, yukarı
            çık, dışa aktar) her seferinde tekrarlanıyordu. */}
        <StatusCard
          label="Ürün"
          value={formatNumber(counts?.total)}
          hint="Açık siparişi olan"
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
          exportFilter={{ ...filter, planningStatus: null }}
        />
        <StatusCard
          label="Stok Yetmiyor"
          value={formatNumber(counts?.short)}
          hint="Fiili stok eksi"
          status="short"
          active={statusFilter === 'short'}
          onClick={() => setStatusFilter((s) => (s === 'short' ? null : 'short'))}
          exportFilter={{ ...filter, planningStatus: 'short' }}
        />
        <StatusCard
          label="Sınırda"
          value={formatNumber(counts?.tight)}
          hint="Sevkiyat sonrası azalıyor"
          status="tight"
          active={statusFilter === 'tight'}
          onClick={() => setStatusFilter((s) => (s === 'tight' ? null : 'tight'))}
          exportFilter={{ ...filter, planningStatus: 'tight' }}
        />
        <StatusCard
          label="Stok Bilinmiyor"
          value={formatNumber(counts?.unknown)}
          hint="Mevcut kolonu boş"
          status="unknown"
          active={statusFilter === 'unknown'}
          onClick={() => setStatusFilter((s) => (s === 'unknown' ? null : 'unknown'))}
          exportFilter={{ ...filter, planningStatus: 'unknown' }}
        />
      </div>

      {/* Renk açıklaması: üç ton üç durum. Yazmadan bırakmak, kullanıcıyı tonların ne
          anlama geldiğini tahmin etmeye bırakırdı. */}
      <div data-tour="erpis-planning-legend" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-[var(--fg-muted)]">
        {(['short', 'tight', 'ok', 'unknown'] as Status[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: STATUS_STYLE[status].dot }}
            />
            {STATUS_STYLE[status].label}
          </span>
        ))}
      </div>

      {planning.data && planning.data.total === 0 ? (
        <EmptyState
          title="Planlanacak açık kalem yok"
          hint={activeCount > 0 ? 'Filtreleri temizleyip tekrar deneyin.' : 'Önce bir sipariş raporu yükleyin.'}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Bu durumda ürün yok"
          hint="Seçili durumu kaldırın ya da filtreleri gevşetin."
        />
      ) : (
        <div data-tour="erpis-planning-table" className="flex flex-col gap-2">
          <ErpisTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.itemId}
            sortBy={sortBy}
            desc={desc}
            onSort={toggleSort}
            onRowClick={(r) => setSelected(r.itemId)}
            selectedKey={selected}
            loading={planning.isFetching}
            rowClassName={(r) => STATUS_STYLE[statusOf(r)].row}
          />
          <TablePager page={page} pageSize={PAGE_SIZE} total={planning.data?.total ?? 0} onPage={setPage} />
        </div>
      )}

      {selected != null && <ItemDrawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Tıklanabilir durum kartı — hem rakam, hem filtre, hem kendi Excel'i.
//
// Kartın kendisi <button> DEĞİL: içine ikinci bir düğme (Excel) konamaz — iç içe düğme
// geçersiz HTML ve tıklama hedefi belirsizleşiyor. Gövde tıklanabilir bir div, klavye
// erişimi role/tabIndex ile korunuyor.
function StatusCard({ label, value, hint, status, active, onClick, exportFilter }: {
  label: string;
  value: string;
  hint: string;
  status?: Status;
  active: boolean;
  onClick: () => void;
  exportFilter: ErpisQueryFilter;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={active}
      className={`flex cursor-pointer flex-col gap-0.5 rounded-[5px] border px-3 py-2 text-left transition-colors ${
        active
          ? 'border-[var(--border)] bg-[var(--bg-subtle)]'
          : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
      }`}
    >
      <span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
        {status && (
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: STATUS_STYLE[status].dot }}
          />
        )}
        {label}
        <span className="ml-auto">
          <ExportButton
            filter={exportFilter}
            target="planning"
            iconOnly
            title={`${label} listesini Excel olarak indir`}
          />
        </span>
      </span>
      <span className="text-[17px] font-extrabold leading-tight tabular-nums text-[var(--fg)]">
        {value}
      </span>
      <span className="text-[9px] text-[var(--fg-muted)]">{hint}</span>
    </div>
  );
}
