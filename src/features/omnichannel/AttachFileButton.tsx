'use client';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';

// Sunucudaki izin listesiyle aynı (OutboundMediaRules): üç kanalın da kabul ettiği türler.
// Burada yalnız dosya seçicide kolaylık; asıl denetim sunucudadır.
const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.mp4,.3gp,.mp3,.ogg,.m4a,.aac,.amr,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt';

// Sohbete dosya ekleme düğmesi. Seçilen dosya hemen gönderilir; yazma alanındaki metin
// açıklama olarak eşlik eder.
export function AttachFileButton({ disabled, onFileSelected }: {
  disabled: boolean; onFileSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Aynı dosya art arda seçilebilsin diye değer sıfırlanır.
          e.target.value = '';
          if (file) onFileSelected(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={`inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-50 md:size-9 ${motionFast} ${focusRing}`}
        aria-label="Dosya ekle"
        title="Dosya ekle (görsel, video, ses, belge)"
      >
        <Paperclip size={16} aria-hidden />
      </button>
    </>
  );
}
