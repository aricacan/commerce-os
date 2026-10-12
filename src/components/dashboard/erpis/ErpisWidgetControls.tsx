'use client';

import { ERPIS_TOP_N, type ErpisBreakdownOrder } from '@/lib/api';
import { Select } from '../../ui/Select';

// Sıralama ölçüsü. "En çok satan" cirodan mı adetten mi sayılacak sorusunun cevabı
// kullanıcıya bırakılıyor: pahalı bir üründen 3 adet ile ucuz bir üründen 900 adet
// satmak farklı sorular ve ikisi de meşru.
const ORDER_OPTIONS: { value: ErpisBreakdownOrder; label: string }[] = [
  { value: 'amount', label: 'Ciro' },
  { value: 'quantity', label: 'Adet' },
  { value: 'orderCount', label: 'Sipariş' },
  { value: 'lineCount', label: 'Kalem' },
];

// Widget başlıklarındaki ortak kontrol çubuğu.
//
// Her kart kendi düğmelerini kurunca yükseklikler ve dolgular tutmuyordu (bir kartta
// "En az" düğmesi 22px, yanındaki 5/10/20/50 seçicisi 20px). Tek bileşen, tek ölçü:
// bütün segment düğmeleri 24px yüksekliğinde ve aynı yazı boyutunda.
const SEGMENT_HEIGHT = 24;

export function ErpisSegment<T extends string | number>({ options, value, onChange, ariaLabel }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex items-center rounded-[5px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-0.5"
      style={{ height: SEGMENT_HEIGHT }}
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-full rounded-[3px] px-2 text-[10.5px] font-bold tabular-nums leading-none transition-colors ${
            value === option.value
              ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Sıralama kartlarının standart kontrolü: yön + derinlik.
//
// Derinlik seçeneği TÜM sıralama kartlarında aynı (5/10/20/50) — genel müdür "kendim
// ayarlayabileyim" dedi ve bunu kart kart farklı yapmak öğrenilmesi gereken ayrı bir
// arayüz olurdu.
export function ErpisRankControls({
  topN, onTopNChange, ascending, onAscendingChange, orderBy, onOrderByChange, extra,
  topNOptions,
}: {
  topN: number;
  onTopNChange: (value: number) => void;
  /** Yön düğmesi yalnız "en çok / en az" anlamlı olan kartlarda çıkar. */
  ascending?: boolean;
  onAscendingChange?: (ascending: boolean) => void;
  /** Sıralama ölçüsü — verilmezse kart ciroya göre sıralar ve seçici çıkmaz. */
  orderBy?: ErpisBreakdownOrder;
  onOrderByChange?: (value: ErpisBreakdownOrder) => void;
  /** Karta özel ek kontrol (boyut seçici gibi) — aynı hizada durur. */
  extra?: React.ReactNode;
  /** İlk N seçenekleri — verilmezse pano genelindeki varsayılan (5/10/20/50) kullanılır. */
  topNOptions?: readonly number[];
}) {
  const nOptions = topNOptions ?? ERPIS_TOP_N;

  return (
    <>
      {/* Mobilde TEK SATIR: Kompakt dropdown ve butonlar ile taşma yapmaz */}
      <div className="flex sm:hidden items-center gap-1 flex-nowrap shrink-0 py-0.5">
        {extra}

        {onAscendingChange && (
          <ErpisSegment
            ariaLabel="Sıralama yönü"
            value={ascending ? 'asc' : 'desc'}
            onChange={(v) => onAscendingChange(v === 'asc')}
            options={[
              { value: 'desc', label: 'Çok' },
              { value: 'asc', label: 'Az' },
            ]}
          />
        )}

        {onOrderByChange && (
          <Select
            size="sm"
            value={orderBy ?? 'amount'}
            onChange={(v) => onOrderByChange(v as ErpisBreakdownOrder)}
            options={ORDER_OPTIONS}
            className="w-auto shrink-0"
          />
        )}

        <Select
          size="sm"
          value={topN}
          onChange={(v) => onTopNChange(Number(v))}
          options={nOptions.map((n) => ({ value: n, label: String(n) }))}
          className="w-auto shrink-0"
        />
      </div>

      {/* Geniş ekranda hızlı segment kontrolü */}
      <div className="hidden sm:flex flex-wrap items-center justify-end gap-1.5">
        {extra}

        {onAscendingChange && (
          <ErpisSegment
            ariaLabel="Sıralama yönü"
            value={ascending ? 'asc' : 'desc'}
            onChange={(v) => onAscendingChange(v === 'asc')}
            options={[
              { value: 'desc', label: 'En çok' },
              { value: 'asc', label: 'En az' },
            ]}
          />
        )}

        {onOrderByChange && (
          <ErpisSegment
            ariaLabel="Sıralama ölçüsü"
            value={orderBy ?? 'amount'}
            onChange={onOrderByChange}
            options={ORDER_OPTIONS}
          />
        )}

        <ErpisSegment
          ariaLabel="Kaç kayıt gösterilsin"
          value={topN}
          onChange={onTopNChange}
          options={nOptions.map((n) => ({ value: n, label: String(n) }))}
        />
      </div>
    </>
  );
}
