'use client';

import { Eye, Wrench } from 'lucide-react';
import { PREVIEW_STATE, type InstructionPreviewDto } from '../../lib/api/omnichannel-instructions';

interface Props {
  preview: InstructionPreviewDto;
  // Gönderilecek metin (önizlemeden gelir, temsilci düzenleyebilir).
  draft: string;
  onDraftChange: (text: string) => void;
}

// Önizleme sonucu: botun bu talimatla müşteriye ne yazacağı (araçlarla — fiyat/stok/link gerçek). Hazırsa metin
// düzenlenebilir; değilse nedeni yazar ve gönderim kapalıdır.
export function InstructionPreviewBox({ preview, draft, onDraftChange }: Props) {
  const ready = preview.state === PREVIEW_STATE.Ready;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-border-soft bg-bg-subtle/60 p-2.5">
      <span className="inline-flex items-center gap-1.5 text-ui-xs font-semibold text-fg">
        <Eye size={13} aria-hidden /> Botun cevabı (henüz gönderilmedi)
      </span>
      {preview.customerMessage && (
        <span className="truncate text-ui-2xs text-fg-muted">Müşteri: {preview.customerMessage}</span>
      )}
      {ready ? (
        <textarea value={draft} onChange={(e) => onDraftChange(e.target.value)} rows={4} aria-label="Gönderilecek cevap"
          className="w-full min-w-0 resize-y rounded-lg border border-border bg-card px-2.5 py-2 text-ui-sm text-fg outline-none focus:border-fg/40 focus:ring-2 focus:ring-fg/10" />
      ) : (
        <p role="status" className="m-0 text-ui-xs text-warning">{preview.detail ?? 'Bu talimatla gönderilebilir bir cevap çıkmadı.'}</p>
      )}
      {preview.toolsUsed.length > 0 && (
        <span className="inline-flex items-center gap-1 text-ui-2xs text-fg-subtle">
          <Wrench size={11} aria-hidden /> Kontrol edilen: {preview.toolsUsed.join(', ')}
        </span>
      )}
    </div>
  );
}
