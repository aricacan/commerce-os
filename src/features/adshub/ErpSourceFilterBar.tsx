'use client';

import { Check } from 'lucide-react';
import { ERP_SOURCE_OPTIONS, type ErpSourceCode } from '../../stores/store-selector';

interface Props {
  selected: ErpSourceCode[];
  onChange: (codes: ErpSourceCode[]) => void;
}

export function ErpSourceFilterBar({ selected, onChange }: Props) {
  const toggle = (code: ErpSourceCode) => {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        type="button"
        onClick={() => onChange([])}
        className={`h-7 px-2.5 rounded-[3px] text-xs font-semibold transition cursor-pointer ${
          selected.length === 0
            ? 'border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] font-bold shadow-xs'
            : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        Tümü
      </button>
      {ERP_SOURCE_OPTIONS.map((opt) => {
        const active = selected.includes(opt.code);
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => toggle(opt.code)}
            className={`inline-flex h-7 items-center gap-1 px-2.5 rounded-[3px] text-xs font-semibold transition cursor-pointer ${
              active
                ? 'border border-[var(--fg)] bg-[var(--bg-subtle)] text-[var(--fg)] font-bold shadow-xs'
                : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {active && <Check size={12} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
