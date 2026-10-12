'use client';

import { Languages } from 'lucide-react';

interface Props {
  translation: string | null;
  visible: boolean;
  loading: boolean;
  error: string | null;
  onToggle: () => void;
  align: 'start' | 'end';
}

// Balonun ALTINDA Türkçe çeviri (Gelen Kutusu v2 §4). Müşteri, bot ve temsilci mesajında aynı:
// çeviri balonun içine yazılsaydı koyu temsilci balonunda soluk metin okunmazdı.
export function MessageTranslation({ translation, visible, loading, error, onToggle, align }: Props) {
  const alignClass = align === 'end' ? 'self-end text-right' : 'self-start';

  return (
    <>
      {visible && (
        <p
          aria-live="polite"
          className={`max-w-full whitespace-pre-wrap break-words rounded-xl border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-ui-sm italic ${alignClass} ${
            error ? 'text-[var(--danger)]' : 'text-[var(--fg-muted)]'
          }`}
        >
          {loading ? 'Çevriliyor…' : error ?? translation}
        </p>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={loading}
        aria-expanded={visible}
        className={`inline-flex min-h-7 items-center gap-1 rounded-md px-1.5 text-ui-xs font-semibold text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] disabled:opacity-50 ${alignClass}`}
      >
        <Languages size={12} aria-hidden />
        {visible ? 'Çeviriyi gizle' : 'Çevir'}
      </button>
    </>
  );
}
