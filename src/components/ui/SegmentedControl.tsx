'use client';

export interface SegmentedOption<T extends string | number | boolean> {
  value: T;
  label: string;
  hint?: string;
}

// İki-üç seçenekli, karşılıklı dışlayan seçim. Açılır liste yerine segment kullanılır:
// seçenekler az ve karşılaştırmalı olduğunda ("Detaysız / Detaylı", "KDVsiz / KDV'li")
// kullanıcının iki tıklama yapmadan mevcut durumu görmesi gerekir.
//
// P&L üst çubuğu ve gider modalı AYNI bileşeni kullanır — aynı işi yapan iki kontrolün
// farklı görünmesi (biri segment, biri düz buton) tutarsız duruyordu.
export function SegmentedControl<T extends string | number | boolean>({
  value,
  options,
  onChange,
  size = 'md',
  className = '',
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const outerHeight = size === 'sm' ? 'h-8' : 'h-9';
  const innerHeight = size === 'sm' ? 'h-7' : 'h-8';

  return (
    <div
      role="radiogroup"
      className={`inline-flex ${outerHeight} items-center rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-0.5 ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={`${innerHeight} flex-1 whitespace-nowrap rounded-[4px] px-3 text-xs font-semibold transition ${
              isActive
                ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
