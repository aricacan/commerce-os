'use client';

import { valueText, type CellMode } from './featureFlagMatrix';

interface Props {
  mode: CellMode;
  /** Bu marka/ülke için bayrağın şu an geçerli değeri (satır ya da Genel'den). */
  effective: boolean;
  busy: boolean;
  onChange: (mode: CellMode) => void;
  /** "Satır yok" seçeneğinin adı; matriste Genel'i izler, Kanal Merkezi'nde üst kapsamı devralır. */
  inheritLabel?: string;
}

const OPTIONS: readonly { mode: CellMode; label: string; title: string }[] = [
  { mode: 'inherit', label: 'Genel', title: "Genel'i izle" },
  { mode: 'on', label: 'Açık', title: 'Bu marka/ülke için aç' },
  { mode: 'off', label: 'Kapalı', title: 'Bu marka/ülke için kapat' },
];

const SELECTED_CLASS: Readonly<Record<CellMode, string>> = {
  inherit: 'bg-[var(--bg-subtle)] text-[var(--fg)] shadow-sm',
  on: 'bg-emerald-500/15 text-emerald-600',
  off: 'bg-rose-500/15 text-rose-600',
};

// Üç durumlu hücre: Genel'i izle / Açık / Kapalı. Seçim hemen kaydedilir; altta etkin değer yazar.
export function FeatureFlagCell({ mode, effective, busy, onChange, inheritLabel }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div role="radiogroup" className="inline-flex rounded-[6px] border border-[var(--border)] bg-[var(--bg)] p-0.5">
        {OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={mode === option.mode}
            title={option.title}
            disabled={busy}
            onClick={() => mode !== option.mode && onChange(option.mode)}
            className={`cursor-pointer rounded-[4px] px-2 py-1 text-[10.5px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
              mode === option.mode ? SELECTED_CLASS[option.mode] : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {option.mode === 'inherit' && inheritLabel ? inheritLabel : option.label}
          </button>
        ))}
      </div>
      <span className={`flex items-center gap-1 text-[10px] ${effective ? 'text-emerald-600' : 'text-[var(--fg-muted)]'}`}>
        <span className={`size-1.5 rounded-full ${effective ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
        Etkin: {valueText(effective)}
      </span>
    </div>
  );
}
