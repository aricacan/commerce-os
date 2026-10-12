'use client';

import { MessageSquareText } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import type { CannedReplyPickerState } from './useCannedReplyPicker';

const PREVIEW_LENGTH = 70;
const LISTBOX_ID = 'canned-reply-listbox';

// Sohbetteki hazır cevap seçici (Faz 9). İki yol:
//   • düğme → liste açılır;
//   • yazma alanı "/" ile başlıyorsa liste yazılan kelimeyle süzülerek açılır (↑/↓/Enter ile seçilir).
// Seçilen metin yazma alanına GİRER; temsilci düzenleyip kendisi gönderir.
// Durum useCannedReplyPicker'da — yazma alanı klavye tuşlarını ona iletir.
export function CannedReplyPicker({ picker }: { picker: CannedReplyPickerState }) {
  const { containerRef, replies, matches, visible, activeIndex, toggle, pick } = picker;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button" onClick={toggle}
        className={`inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg md:size-9 ${motionFast} ${focusRing}`}
        aria-label="Hazır cevaplar" title="Hazır cevaplar (ya da / yazın)"
        aria-expanded={visible} aria-controls={visible ? LISTBOX_ID : undefined}
      >
        <MessageSquareText size={16} aria-hidden />
      </button>
      {visible && (
        <div
          id={LISTBOX_ID} role="listbox" aria-label="Hazır cevaplar"
          className="absolute bottom-[110%] left-0 z-[40000] flex max-h-80 w-80 flex-col gap-0.5 overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"
        >
          {replies === null && <span className="p-2.5 text-xs text-[var(--fg-muted)]">Yükleniyor…</span>}
          {replies !== null && matches.length === 0 && (
            <span className="p-2.5 text-xs text-[var(--fg-muted)]">
              {replies.length === 0 ? 'Henüz hazır cevap yok. Menü sekmesinden eklenir.' : 'Eşleşen hazır cevap yok.'}
            </span>
          )}
          {matches.map((r, index) => (
            <button
              key={r.id} type="button" role="option" aria-selected={index === activeIndex}
              onClick={() => pick(r)}
              className={`flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-subtle)] ${
                index === activeIndex ? 'bg-[var(--bg-subtle)]' : ''
              }`}
            >
              <span className="text-[12.5px] font-semibold text-[var(--fg)]">
                {r.title}{r.language ? ` · ${r.language.toUpperCase()}` : ''}
              </span>
              <span className="text-[11.5px] text-[var(--fg-muted)]">
                {r.body.length > PREVIEW_LENGTH ? `${r.body.slice(0, PREVIEW_LENGTH)}…` : r.body}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
