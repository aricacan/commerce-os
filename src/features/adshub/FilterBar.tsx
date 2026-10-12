'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { ERP_SOURCE_OPTIONS, type ErpSourceCode } from '../../stores/store-selector';
import { AD_PLATFORM, type AdPlatform } from '../../lib/api/adshub';
import { PLATFORM_META } from './shared';

interface Props {
  erpSources: ErpSourceCode[];
  onErpSourcesChange: (codes: ErpSourceCode[]) => void;
  platforms: AdPlatform[];
  onPlatformsChange: (platforms: AdPlatform[]) => void;
}

const PLATFORM_OPTIONS: { value: AdPlatform; label: string; color: string }[] = [
  AD_PLATFORM.Meta, AD_PLATFORM.Google, AD_PLATFORM.TikTok,
].map((value) => ({ value, label: PLATFORM_META[value].label, color: PLATFORM_META[value].color }));

export function FilterBar({ erpSources, onErpSourcesChange, platforms, onPlatformsChange }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <ErpDropdown selected={erpSources} onChange={onErpSourcesChange} />
      <PlatformDropdown selected={platforms} onChange={onPlatformsChange} />
    </div>
  );
}

function useOutsideClick(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);
  return ref;
}

function ErpDropdown({ selected, onChange }: { selected: ErpSourceCode[]; onChange: (codes: ErpSourceCode[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick(open, () => setOpen(false));

  const toggle = (code: ErpSourceCode) => {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  const summary = selected.length === 0
    ? 'Tümü'
    : selected.map((c) => ERP_SOURCE_OPTIONS.find((o) => o.code === c)?.label ?? c).join(', ');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-7.5 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition cursor-pointer ${
          selected.length > 0
            ? 'border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] font-bold shadow-xs'
            : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        <span>ERP: {summary}</span>
        <ChevronDown size={12} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 flex flex-col gap-1 p-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-xl min-w-[200px]">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[3px] text-xs font-semibold text-left transition cursor-pointer ${
              selected.length === 0 ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <span>Tüm ERP Kaynakları</span>
            {selected.length === 0 && <Check size={13} />}
          </button>
          {ERP_SOURCE_OPTIONS.map((opt) => {
            const active = selected.includes(opt.code);
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => toggle(opt.code)}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[3px] text-xs font-semibold text-left transition cursor-pointer ${
                  active ? 'bg-[var(--bg-subtle)] text-[var(--fg)] font-bold' : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]/60'
                }`}
              >
                <span>{opt.label}</span>
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlatformDropdown({ selected, onChange }: { selected: AdPlatform[]; onChange: (platforms: AdPlatform[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick(open, () => setOpen(false));

  const toggle = (value: AdPlatform) => {
    onChange(selected.includes(value) ? selected.filter((p) => p !== value) : [...selected, value]);
  };

  const summary = selected.length === 0
    ? 'Tümü'
    : selected.map((p) => PLATFORM_OPTIONS.find((o) => o.value === p)?.label ?? String(p)).join(', ');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-7.5 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition cursor-pointer ${
          selected.length > 0
            ? 'border border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] font-bold shadow-xs'
            : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
        }`}
      >
        <span>Platform: {summary}</span>
        <ChevronDown size={12} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 flex flex-col gap-1 p-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-xl min-w-[200px]">
          <button
            type="button"
            onClick={() => onChange([])}
            className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[3px] text-xs font-semibold text-left transition cursor-pointer ${
              selected.length === 0 ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <span>Tüm Platformlar</span>
            {selected.length === 0 && <Check size={13} />}
          </button>
          {PLATFORM_OPTIONS.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-[3px] text-xs font-semibold text-left transition cursor-pointer ${
                  active ? 'bg-[var(--bg-subtle)] text-[var(--fg)] font-bold' : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)]/60'
                }`}
              >
                <span>{opt.label}</span>
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
