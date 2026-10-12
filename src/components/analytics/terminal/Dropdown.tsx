'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  /** İkinci satır — seçeneğin ne yaptığını açıklar. Yoksa tek satır çizilir. */
  hint?: string;
}

interface Props<T extends string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Düğmede etiketin önüne yazılan sabit başlık ("Stok", "Maliyet" gibi). */
  label?: string;
  placeholder?: string;
  /** Boş seçime izin ver — "Karşılaştır…" gibi opsiyonel seçiciler için. */
  clearable?: boolean;
  widthClass?: string;
  disabled?: boolean;
}

/**
 * Terminalin tek açılır listesi.
 *
 * NEDEN native `<select>` DEĞİL: native liste kutusu işletim sisteminin
 * kendi çizimini kullanır — koyu temada beyaz açılır, yazı tipi ve satır
 * yüksekliği terminalin geri kalanıyla uyuşmaz, seçeneğe açıklama satırı
 * eklenemez. Terminalde onlarca seçici var; hepsinin AYNI görünmesi
 * tutarlılığın ta kendisi.
 *
 * Erişilebilirlik: klavyeyle gezinme (yön tuşları, Enter, Esc), dışarı
 * tıklayınca kapanma ve `aria-expanded` desteklenir.
 */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = 'Seçiniz…',
  clearable = false,
  widthClass = 'w-full',
  disabled = false,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
  }, [open, options, value]);

  const commit = (next: T | null) => {
    // Boş seçim yalnızca clearable seçicilerde anlamlı; değilse yok sayılır.
    if (next === null && !clearable) return;
    onChange((next ?? '') as T);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return setOpen(false);
    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      return setOpen(true);
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(options.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit(options[cursor]?.value ?? null);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${widthClass}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`flex items-center gap-1.5 w-full h-7 px-2 text-[11px] font-medium rounded-[5px] border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          open
            ? 'border-fg bg-bg-subtle'
            : 'border-border-soft bg-bg-subtle hover:border-border'
        }`}
      >
        {label && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-subtle shrink-0">
            {label}
          </span>
        )}
        <span
          className={`truncate text-left flex-1 ${
            selected ? 'text-fg' : 'text-fg-subtle'
          }`}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-fg-subtle transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute top-full left-0 mt-1 z-40 w-full min-w-[200px] max-h-[280px] overflow-y-auto rounded-[6px] border border-border-soft bg-card shadow-xl py-1"
        >
          {clearable && (
            <Row
              active={!selected}
              focused={false}
              onSelect={() => commit(null)}
              label={placeholder}
              muted
            />
          )}
          {options.map((o, i) => (
            <Row
              key={o.value}
              active={o.value === value}
              focused={i === cursor}
              onSelect={() => commit(o.value)}
              label={o.label}
              hint={o.hint}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  active,
  focused,
  onSelect,
  label,
  hint,
  muted,
}: {
  active: boolean;
  focused: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={`w-full flex items-start gap-2 px-2.5 py-1.5 text-left cursor-pointer transition-colors ${
        focused ? 'bg-bg-subtle' : 'hover:bg-bg-subtle'
      }`}
    >
      <span className="w-3 shrink-0 pt-0.5">
        {active && <Check size={11} className="text-fg" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[11px] ${
            active
              ? 'font-semibold text-fg'
              : muted
                ? 'text-fg-subtle'
                : 'text-fg'
          }`}
        >
          {label}
        </span>
        {hint && <span className="block text-[9.5px] text-fg-subtle truncate">{hint}</span>}
      </span>
    </button>
  );
}
