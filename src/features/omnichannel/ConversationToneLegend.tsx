'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { CONVERSATION_TONE_ORDER, CONVERSATION_TONE_STYLES } from './conversationTone';

// Satır tonlarının açıklaması: sayaç satırında küçük bir "Renkler" düğmesi, tıklayınca açılan
// kart. Liste üstünde kalıcı yer kaplamaz; dokunmayla da açıldığı için mobilde çalışır (hover
// mobilde yoktur). Açıklama (hint) kartta yazılı durur. Boyasız satır = bot yürütüyor.
export function ConversationToneLegend() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="conversation-tone-legend"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold transition-colors hover:bg-bg-subtle hover:text-fg"
      >
        <Palette size={12} aria-hidden /> Renkler
      </button>
      {open && (
        <ul
          id="conversation-tone-legend"
          aria-label="Satır renklerinin anlamı"
          className="absolute right-0 top-full z-20 m-0 mt-1 flex w-64 list-none flex-col gap-2 rounded-xl border border-border-soft bg-card p-3 shadow-lg"
        >
          {CONVERSATION_TONE_ORDER.map((tone) => {
            const style = CONVERSATION_TONE_STYLES[tone];
            return (
              <li key={tone} className="flex items-start gap-2">
                <span aria-hidden className={`mt-1 size-2 shrink-0 rounded-full ${style.dot}`} />
                <span className="flex flex-col">
                  <span className="text-ui-xs font-semibold text-fg">{style.label}</span>
                  <span className="text-ui-2xs text-fg-muted">{style.hint}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
