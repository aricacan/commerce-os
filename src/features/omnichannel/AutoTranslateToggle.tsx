'use client';

import { Languages } from 'lucide-react';
import { CUSTOMER_LANGUAGE_LABELS, type CustomerLanguageCode } from '../../lib/api/omnichannel';

interface Props {
  // null: dil henüz bilinmiyor — anahtar yine görünür, çeviri sunucunun tespit ettiği dile yapılır.
  targetLanguage: CustomerLanguageCode | null;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  // Mobil: yazma alanının yanında tek ikonluk anahtar; etiket yalnız ekran okuyucuya.
  compact?: boolean;
}

// Yazma alanının üstündeki "Otomatik çeviri (Türkçe → Arnavutça)" anahtarı.
export function AutoTranslateToggle({ targetLanguage, enabled, onChange, compact = false }: Props) {
  const targetLabel = targetLanguage ? CUSTOMER_LANGUAGE_LABELS[targetLanguage] : 'müşterinin dili';
  const label = `Otomatik çeviri (Türkçe → ${targetLabel})`;

  if (compact) {
    return (
      <button
        type="button"
        aria-pressed={enabled}
        aria-label={label}
        title={label}
        onClick={() => onChange(!enabled)}
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          enabled
            ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
            : 'border-[var(--border)] text-[var(--fg-muted)]'
        }`}
      >
        <Languages size={17} aria-hidden />
      </button>
    );
  }

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 self-start text-xs text-[var(--fg)]">
      <input
        type="checkbox"
        role="switch"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-4 w-7 shrink-0 rounded-full bg-[var(--border)] transition-colors peer-checked:bg-[var(--fg)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--fg)]/40 after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-[var(--bg)] after:transition-transform peer-checked:after:translate-x-3"
      />
      <Languages size={13} className="text-[var(--fg-muted)]" aria-hidden />
      {label}
    </label>
  );
}
