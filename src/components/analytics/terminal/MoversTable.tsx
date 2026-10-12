'use client';

import { useMemo, useState } from 'react';
import type { MoverRisk, MoverRow } from '../../../types/forecast';
import { compactTry } from './format';

type SortKey = 'units' | 'revenue' | 'deltaPercent' | 'marginPercent' | 'daysOfSupply';

interface Props {
  rows: MoverRow[];
  /** Kategori sekmesinde stok/risk sütunları anlamsız — gizlenir. */
  showStock?: boolean;
  onSelect?: (row: MoverRow) => void;
  emptyText: string;
}

const RISK_LABEL: Record<MoverRisk, { label: string; className: string } | null> = {
  // Zeminler kaldırıldı: uzun bir listede her satırdaki renkli blok, tablonun
  // asıl sayılarını bastırıyordu. Renk artık yalnızca yazıda.
  Stockout: { label: 'stok kritik', className: 'text-danger' },
  Dead: { label: 'ölü stok', className: 'text-warning' },
  // Sağlıklı olan için rozet YOK — her satıra yeşil rozet basmak, gerçekten
  // dikkat isteyen satırların görünürlüğünü düşürür.
  Healthy: null,
  Unknown: { label: 'veri yok', className: 'text-fg-subtle' },
};

/**
 * Faz F3 — TradingView izleme listesinin sıralanabilir karşılığı.
 *
 * SIRALAMA ŞART: sıralanamayan liste, liste değil rapordur. Kullanıcının sorusu
 * "en çok ne sattı" değil, çoğu zaman "hangisinin stoğu bitiyor" ya da "hangisinin
 * marjı düşük" olur — sütun başlığına tıklayarak soruyu değiştirebilmeli.
 *
 * NULL DEĞERLER "—" GÖSTERİLİR, SIFIR DEĞİL: alış fiyatı bilinmeyen üründe marj
 * boştur; sıfır yazmak "marjsız satıyoruz" demek olurdu (bkz. ForecastMoversService).
 */
export function MoversTable({ rows, showStock = true, onSelect, emptyText }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('units');
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Ölçülemeyen değer HER ZAMAN sona gider — yön ne olursa olsun. Aksi halde
      // "marja göre sırala" dendiğinde listenin başı boş satırlarla dolardı.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return asc ? av - bv : bv - av;
    });
    return copy;
  }, [rows, sortKey, asc]);

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  if (rows.length === 0) {
    return <p className="px-3 py-4 m-0 text-[11px] text-fg-muted">{emptyText}</p>;
  }

  return (
    <div>
      {/* table-fixed + ürün sütununa açık genişlik: 336px'lik panelde 6 sütun
          otomatik genişlikle yarışınca ürün adı 3 harfe iniyordu. */}
      <table className="w-full border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-bg-subtle backdrop-blur">
            <Th width={showStock ? '38%' : '46%'}>Ürün</Th>
            <Th sortable active={sortKey === 'units'} asc={asc} onClick={() => toggle('units')} right>
              Adet
            </Th>
            <Th sortable active={sortKey === 'deltaPercent'} asc={asc} onClick={() => toggle('deltaPercent')} right>
              Δ%
            </Th>
            <Th sortable active={sortKey === 'revenue'} asc={asc} onClick={() => toggle('revenue')} right>
              Ciro
            </Th>
            <Th sortable active={sortKey === 'marginPercent'} asc={asc} onClick={() => toggle('marginPercent')} right>
              Marj
            </Th>
            {showStock && (
              <Th sortable active={sortKey === 'daysOfSupply'} asc={asc} onClick={() => toggle('daysOfSupply')} right>
                Stok g.
              </Th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const badge = RISK_LABEL[r.risk];
            return (
              <tr
                key={r.id}
                onClick={() => onSelect?.(r)}
                className={`border-b border-border-soft ${
                  onSelect ? 'cursor-pointer hover:bg-bg-subtle' : ''
                }`}
              >
                <td className="px-1.5 py-1.5 max-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-[11.5px] text-fg">{r.name}</span>
                    {badge && (
                      <span className={`shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded-[3px] ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                </td>
                <Td>{r.units}</Td>
                <Td tone={r.deltaPercent === null ? undefined : r.deltaPercent >= 0 ? 'up' : 'down'}>
                  {r.deltaPercent === null ? 'yeni' : `${r.deltaPercent > 0 ? '+' : ''}${r.deltaPercent.toFixed(0)}`}
                </Td>
                <Td>{compactTry(r.revenue)}</Td>
                <Td tone={r.marginPercent === null ? undefined : r.marginPercent < 0 ? 'down' : undefined}>
                  {r.marginPercent === null ? '—' : `%${r.marginPercent.toFixed(0)}`}
                </Td>
                {showStock && (
                  <Td tone={r.daysOfSupply !== null && r.daysOfSupply < 10 ? 'down' : undefined}>
                    {r.daysOfSupply === null ? '—' : r.daysOfSupply.toFixed(0)}
                  </Td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  sortable,
  active,
  asc,
  onClick,
  right,
  width,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
  asc?: boolean;
  onClick?: () => void;
  right?: boolean;
  width?: string;
}) {
  return (
    <th
      style={width ? { width } : undefined}
      onClick={onClick}
      className={`px-1.5 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider border-b border-border-soft ${
        right ? 'text-right' : 'text-left'
      } ${sortable ? 'cursor-pointer select-none hover:text-fg' : ''} ${
        active ? 'text-fg' : 'text-fg-subtle'
      }`}
    >
      {children}
      {active && <span className="ml-0.5">{asc ? '▲' : '▼'}</span>}
    </th>
  );
}

function Td({ children, tone }: { children: React.ReactNode; tone?: 'up' | 'down' }) {
  const cls =
    tone === 'up'
      ? 'text-success'
      : tone === 'down'
        ? 'text-danger'
        : 'text-fg-muted';
  return <td className={`px-1.5 py-1.5 text-[11px] text-right tabular-nums whitespace-nowrap ${cls}`}>{children}</td>;
}
