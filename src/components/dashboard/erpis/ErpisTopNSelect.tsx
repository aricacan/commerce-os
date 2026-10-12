'use client';

import { ERPIS_TOP_N } from '@/lib/api';

// Sıralama kartlarının "İlk N" seçicisi.
//
// Genel müdür ilk 5'i, 10'u, 20'yi kendisi ayarlamak istedi; kartın kaç satır
// göstereceğini koda gömmek o isteği karşılamıyordu.
interface Props {
  value: number;
  onChange: (value: number) => void;
  /** Artan sıra = "en az satanlar". Verilmezse yön düğmesi çıkmaz. */
  ascending?: boolean;
  onAscendingChange?: (ascending: boolean) => void;
}

export function ErpisTopNSelect({ value, onChange, ascending, onAscendingChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      {onAscendingChange && (
        <button
          type="button"
          onClick={() => onAscendingChange(!ascending)}
          aria-pressed={ascending}
          title={ascending ? 'En az satanlar gösteriliyor' : 'En çok satanlar gösteriliyor'}
          className="rounded-[4px] border border-[var(--border-soft)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]"
        >
          {ascending ? 'En az' : 'En çok'}
        </button>
      )}

      <div className="flex rounded-[4px] border border-[var(--border-soft)] p-0.5">
        {ERPIS_TOP_N.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={`rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-extrabold tabular-nums transition-colors ${
              value === n
                ? 'bg-[var(--bg-subtle)] text-[var(--fg)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
