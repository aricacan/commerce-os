'use client';

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { icon, palette } from '../shared/design';
import { formatNumber } from './shared';

// Siparişler ve Stok Kartları tablolarının ortak parçaları: yapışkan başlık, sıralanabilir
// sütun, sayfalama. İki tablo da aynı davranışı istiyor; ayrı yazılsaydı biri klavye
// erişimini kazanırken diğeri geride kalırdı.

export interface Column<T> {
  key: string;
  label: string;
  /** Sunucunun beyaz listesindeki sıralama anahtarı. Yoksa sütun sıralanamaz. */
  sortKey?: string;
  align?: 'left' | 'right';
  width?: number;
  render: (row: T) => React.ReactNode;
  /**
   * Mobil kartta bu sütunun yeri.
   *   'title'    — kartın başlığı (büyük, kalın)
   *   'subtitle' — başlığın altı (soluk)
   *   'value'    — sağ üstteki vurgulu rakam
   *   'meta'     — alt satırdaki etiketli değerler
   *   'hidden'   — mobilde hiç gösterilmez
   * Belirtilmezse 'meta' varsayılır.
   */
  mobile?: 'title' | 'subtitle' | 'value' | 'meta' | 'hidden';
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => number | string;
  sortBy: string | null;
  desc: boolean;
  onSort: (sortKey: string) => void;
  onRowClick?: (row: T) => void;
  selectedKey?: number | string | null;
  /** İlk yükleme sırasında iskelet yerine düşük opaklık: tablo yerinden oynamaz. */
  loading?: boolean;
  /**
   * Satıra durum rengi verir (planlamada stok yetersizliği gibi). Seçili satır arka
   * planı bunu EZER: seçim geçici bir durum, renk kalıcı bir bilgi.
   */
  rowClassName?: (row: T) => string;
}

export function ErpisTable<T>({
  columns, rows, rowKey, sortBy, desc, onSort, onRowClick, selectedKey, loading, rowClassName,
}: Props<T>) {
  return (
    <>
      {/* MOBİLDE TABLO YOK.
          On bir sütunlu bir tablo 375 piksellik ekranda yatay kaydırmayla bile
          okunmuyordu: SKU üç satıra bölünüyor, cari adı "TCN..." diye kırpılıyor ve
          kullanıcı hangi sütuna baktığını kaybediyordu. Aynı veriyi satır başına bir
          kart olarak vermek hem okunuyor hem tek elle geziliyor. */}
      <div className="flex flex-col gap-2 md:hidden" style={{ opacity: loading ? 0.55 : 1 }}>
        {rows.map((row) => (
          <MobileCard
            key={rowKey(row)}
            row={row}
            columns={columns}
            selected={selectedKey === rowKey(row)}
            onClick={onRowClick}
            className={rowClassName?.(row)}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <TableView
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          sortBy={sortBy}
          desc={desc}
          onSort={onSort}
          onRowClick={onRowClick}
          selectedKey={selectedKey}
          loading={loading}
          rowClassName={rowClassName}
        />
      </div>
    </>
  );
}

function TableView<T>({
  columns, rows, rowKey, sortBy, desc, onSort, onRowClick, selectedKey, loading, rowClassName,
}: Props<T>) {
  return (
    // Geniş tablo KENDİ kabında kayar; sayfa gövdesi yatay kaymaz.
    <div className="overflow-x-auto rounded-[4px] border border-[var(--border-soft)]">
      <table className="w-full border-collapse text-[12px]" style={{ opacity: loading ? 0.55 : 1 }}>
        <thead className="sticky top-0 z-10 bg-[var(--card)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width, textAlign: col.align ?? 'left' }}
                className="border-b border-[var(--border-soft)] px-2.5 py-2 text-[10.5px] font-extrabold uppercase tracking-[0.02em] text-[var(--fg-muted)]"
              >
                {col.sortKey ? (
                  <button
                    type="button"
                    onClick={() => onSort(col.sortKey!)}
                    className="inline-flex items-center gap-1 hover:text-[var(--fg)]"
                    aria-label={`${col.label} sütununa göre sırala`}
                  >
                    {col.label}
                    {sortBy === col.sortKey &&
                      (desc
                        ? <ArrowDown size={icon.sm} strokeWidth={icon.stroke} />
                        : <ArrowUp size={icon.sm} strokeWidth={icon.stroke} />)}
                  </button>
                ) : col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = selectedKey === key;

            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onRowClick(row);
                  }
                }}
                className={`border-b border-[var(--border-soft)] last:border-0 ${
                  rowClassName?.(row) ?? ''
                } ${onRowClick ? 'cursor-pointer hover:bg-[var(--bg-subtle)]' : ''}`}
                style={selected ? { background: palette.chipBg } : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{ textAlign: col.align ?? 'left' }}
                    className="px-2.5 py-1.5 text-[var(--fg)]"
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Mobil satır kartı.
//
// Alan yerleşimi sütunun `mobile` rolünden geliyor; hiçbir tablo kendi mobil düzenini
// yazmıyor. Rol verilmemiş sütunlar altta etiketli değer olarak sıralanıyor — böylece
// yeni bir sütun eklendiğinde mobilde de kendiliğinden görünüyor.
function MobileCard<T>({ row, columns, selected, onClick, className }: {
  row: T;
  columns: Column<T>[];
  selected: boolean;
  onClick?: (row: T) => void;
  className?: string;
}) {
  const pick = (role: Column<T>['mobile']) => columns.filter((c) => c.mobile === role);

  const title = pick('title');
  const subtitle = pick('subtitle');
  const value = pick('value');
  const meta = columns.filter((c) => c.mobile === 'meta' || c.mobile === undefined);

  return (
    <button
      type="button"
      onClick={() => onClick?.(row)}
      disabled={!onClick}
      className={`flex flex-col gap-2.5 rounded-[8px] border p-3.5 text-left transition-all ${
        selected
          ? 'border-[var(--border)] bg-[var(--bg-subtle)] shadow-sm'
          : `border-[var(--border-soft)] ${className || 'bg-[var(--card)]'} hover:border-[var(--border)] shadow-xs`
      }`}
    >
      {/* Üst Satır: Başlık & Değer */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {title.map((col) => (
            <span key={col.key} className="text-[13px] font-bold leading-snug text-[var(--fg)]">
              {col.render(row)}
            </span>
          ))}
          {subtitle.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--fg-muted)] pt-0.5">
              {subtitle.map((col, i) => (
                <span key={col.key} className="flex items-center gap-1.5">
                  {i > 0 && <span className="opacity-40">·</span>}
                  <span>{col.render(row)}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {value.length > 0 && (
          <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
            {value.map((col) => (
              <span key={col.key} className="text-[13.5px] font-extrabold tabular-nums text-[var(--fg)]">
                {col.render(row)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Alt Bölüm: Düzenli Bilgi Kutucukları (Sıkışıklığı tamamen önler) */}
      {meta.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 border-t border-[var(--border-soft)] pt-2">
          {meta.map((col) => (
            <div key={col.key} className="flex flex-col rounded-[4px] bg-[var(--bg-subtle)]/70 px-2 py-1 min-w-0">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] truncate">
                {col.label}
              </span>
              <span className="text-[11.5px] font-semibold text-[var(--fg)] truncate">
                {col.render(row)}
              </span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export function TablePager({ page, pageSize, total, onPage }: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 text-[11.5px] text-[var(--fg-muted)]">
      <span className="tabular-nums">
        {formatNumber(first)}–{formatNumber(last)} / {formatNumber(total)}
      </span>

      <div className="flex items-center gap-1">
        <PagerButton label="Önceki" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={icon.md} strokeWidth={icon.stroke} />
        </PagerButton>
        <span className="px-2 tabular-nums font-semibold text-[var(--fg)]">
          {page} / {lastPage}
        </span>
        <PagerButton label="Sonraki" disabled={page >= lastPage} onClick={() => onPage(page + 1)}>
          <ChevronRight size={icon.md} strokeWidth={icon.stroke} />
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({ label, disabled, onClick, children }: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-[4px] border border-[var(--border-soft)] p-1 text-[var(--fg)] disabled:opacity-35"
    >
      {children}
    </button>
  );
}

// Para birimi tutar rakamının YANINDA durur: aynı tabloda TL, GBP, USD satırları
// karışık geliyor ve birimsiz bir rakam yanlış okunur.
export function Money({ amount, currency }: { amount: number | null; currency: string | null }) {
  if (amount == null) return <span className="text-[var(--fg-muted)]">—</span>;

  return (
    <span className="tabular-nums font-semibold">
      {formatNumber(amount, 2)}
      <span className="ml-1 text-[10.5px] font-bold text-[var(--fg-muted)]">{currency ?? '—'}</span>
    </span>
  );
}
