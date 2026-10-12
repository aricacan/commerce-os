'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface FormSelectOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

// Form içi açılır liste.
//
// FilterSelect'ten AYRI: o bir FİLTRE kontrolü ve her zaman "temizle/placeholder" seçeneği
// gösterir — zorunlu bir form alanında bu seçenek kullanıcıyı geçersiz bir duruma
// sokabiliyordu. Buradaki liste yalnızca gerçek seçenekleri gösterir.
//
// Ham <select> KULLANILMAZ: tarayıcı yerel açılır listesi tema değişkenlerini (--card,
// --border, --fg) yok sayar ve koyu temada beyaz bir kutu olarak açılır — modal içindeki
// "ayarsız dropdown" görüntüsünün sebebi buydu.
export function FormSelect<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = 'Seçiniz',
  disabled = false,
  className = '',
  triggerClassName = '',
  ariaLabel,
}: {
  value: T | null;
  options: FormSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Düğmenin ekran okuyucu adı; görünen metin seçili değer olduğu için alanın ne olduğunu söylemez. */
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-50' : ''} ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] outline-none transition hover:border-[var(--fg-muted)] focus:border-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-50 ${
          triggerClassName || 'h-9 rounded-[6px]'
        }`}
      >
        <span className={`truncate ${selected ? '' : 'font-normal text-[var(--fg-muted)]'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-[var(--fg-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute left-0 right-0 top-[calc(100%+4px)] z-[70] flex max-h-60 flex-col gap-0.5 overflow-y-auto border border-[var(--border)] bg-[var(--card)] p-1 shadow-xl ${
            triggerClassName.includes('rounded-[2px]') ? 'rounded-[2px]' : 'rounded-[6px]'
          }`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition ${
                  triggerClassName.includes('rounded-[2px]') ? 'rounded-[2px]' : 'rounded-[4px]'
                } ${
                  isSelected
                    ? 'bg-[var(--bg-subtle)] font-bold text-[var(--fg)]'
                    : 'font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]'
                }`}
              >
                <span className="min-w-0 truncate">
                  {option.label}
                  {option.hint && (
                    <span className="ml-1.5 font-normal text-ui-xs text-[var(--fg-muted)]">{option.hint}</span>
                  )}
                </span>
                {isSelected && <Check size={12} className="shrink-0 text-[var(--fg)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
