'use client';

import { Paperclip, Send, X } from 'lucide-react';
import { CUSTOMER_LANGUAGE_LABELS } from '../../lib/api/omnichannel';
import type { OutgoingPreview } from './outgoingTranslation';
import { ghostButtonClass, primaryButtonClass } from './CustomerPanelParts';

interface Props {
  preview: OutgoingPreview;
  // Önizleme bir ekin açıklamasıysa ekin adı — onaylanınca ek bu açıklamayla gider.
  attachmentName?: string | null;
  sending: boolean;
  onChange: (translated: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

const PREVIEW_ROWS = 3;

// Çeviri önizlemesi: temsilci müşteriye gidecek metni görür, gerekirse düzeltir; yalnız
// "Çeviriyi gönder" gönderir. Vazgeçince Türkçe taslak yazma alanında kalır.
export function TranslationPreview({ preview, attachmentName = null, sending, onChange, onSend, onCancel }: Props) {
  const languageLabel = CUSTOMER_LANGUAGE_LABELS[preview.targetLanguage];

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)]/40 p-2 text-xs">
      <span className="font-bold text-[var(--fg)]">Çeviri önizlemesi ({languageLabel})</span>
      {attachmentName && (
        <span className="inline-flex items-center gap-1 text-[var(--fg-muted)]">
          <Paperclip size={12} aria-hidden /> Ek açıklaması: {attachmentName}
        </span>
      )}
      <textarea
        value={preview.translated}
        onChange={(e) => onChange(e.target.value)}
        rows={PREVIEW_ROWS}
        aria-label={`${languageLabel} çeviri`}
        className="w-full resize-y rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-[13px] text-[var(--fg)] outline-none focus:border-[var(--fg)]"
      />
      <div className="flex items-center justify-end gap-2">
        <button type="button" className={ghostButtonClass} onClick={onCancel} disabled={sending}>
          <X size={12} aria-hidden /> Vazgeç
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={onSend}
          disabled={sending || !preview.translated.trim()}
        >
          <Send size={12} aria-hidden /> Çeviriyi gönder
        </button>
      </div>
    </div>
  );
}
