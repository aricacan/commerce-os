'use client';

import type { ReactNode } from 'react';
import { Send } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import type { CannedReplyDto } from '../../lib/api/omnichannel';
import { AttachFileButton } from './AttachFileButton';
import { CannedReplyPicker } from './CannedReplyPicker';
import { useCannedReplyPicker } from './useCannedReplyPicker';

interface Props {
  draft: string;
  onDraftChange: (value: string) => void;
  // Hazır cevabın dili taslağın kaynağını belirler (bkz. cannedReplyOrigin).
  onPickCannedReply: (reply: CannedReplyDto) => void;
  onSend: () => void;
  onFileSelected: (file: File) => void;
  sending: boolean;
  translating: boolean;
  // Otomatik çeviri açık: metin Türkçe yazılır, gönderimden önce çevrilip önizlenir.
  translateOnSend: boolean;
  isMobile: boolean;
  // Mobilde yazma alanının yanındaki çeviri anahtarı (masaüstünde üstte, etiketiyle durur).
  leadingControl?: ReactNode;
}

function placeholderOf(translateOnSend: boolean, isMobile: boolean): string {
  if (!translateOnSend) return 'Mesaj yaz…';
  return isMobile ? 'Türkçe yazın…' : 'Türkçe yazın, gönderirken çevrilir…';
}

// Yazma satırı: ek, hazır cevap, (mobilde çeviri anahtarı), metin ve gönder.
export function ComposerInputRow({
  draft, onDraftChange, onPickCannedReply, onSend, onFileSelected, sending, translating, translateOnSend, isMobile,
  leadingControl,
}: Props) {
  const picker = useCannedReplyPicker(draft, onPickCannedReply);
  const canSend = draft.trim() !== '' && !sending && !translating;

  return (
    <div
      className={`flex items-end gap-1 rounded-2xl border border-border bg-bg p-1.5 shadow-[var(--shadow-xs)] focus-within:border-fg/40 focus-within:ring-2 focus-within:ring-fg/10 ${motionFast}`}
    >
      <AttachFileButton disabled={sending || translating} onFileSelected={onFileSelected} />
      <CannedReplyPicker picker={picker} />
      {leadingControl}
      <textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          // Hazır cevap listesi açıksa ↑/↓/Enter/Escape listeye aittir.
          if (picker.handleKeyDown(e)) return;
          // Enter gönderir, Shift+Enter yeni satır — temsilci günde yüzlerce mesaj
          // yazacak, fareye uzanmak zaman kaybı. Telefonda Enter yeni satırdır (gönder düğmesi var).
          // "/" ile başlayan taslak hazır cevap aramasıdır — müşteriye gitmez.
          if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
            e.preventDefault();
            if (!draft.startsWith('/')) onSend();
          }
        }}
        placeholder={placeholderOf(translateOnSend, isMobile)}
        rows={1}
        className="max-h-[120px] min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 font-[inherit] text-base leading-snug text-fg outline-none placeholder:text-fg-subtle md:min-h-9 md:py-2 md:text-ui-md"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!canSend}
        className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-fg text-bg hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 md:size-9 ${motionFast} ${focusRing}`}
        aria-label={translateOnSend ? 'Çevir ve önizle' : 'Gönder'}
      >
        <Send size={16} aria-hidden />
      </button>
    </div>
  );
}
