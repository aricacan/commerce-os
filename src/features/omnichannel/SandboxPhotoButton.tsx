'use client';

import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';

// Sunucudaki fotoğraf kuralıyla aynı (PhotoAttachmentRules): görsel aramanın okuyabildiği biçimler.
const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp';

// Test alanında müşteri gibi ürün fotoğrafı göndermek için düğme. Seçilen fotoğraf hemen gönderilir;
// yazma alanındaki metin ("a keni?") açıklama olarak eşlik eder.
export function SandboxPhotoButton({ disabled, onPhotoSelected }: {
  disabled: boolean; onPhotoSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_PHOTO_TYPES}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Aynı fotoğraf art arda seçilebilsin diye değer sıfırlanır.
          e.target.value = '';
          if (file) onPhotoSelected(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="inline-flex h-10 sm:h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg sm:rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-40"
        aria-label="Fotoğraf gönder"
        title="Müşteri gibi ürün fotoğrafı gönder (yazdığınız metin açıklama olur)"
      >
        <ImagePlus size={13} />
        <span>Fotoğraf gönder</span>
      </button>
    </>
  );
}
