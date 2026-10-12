'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';

interface Props {
  open: boolean;
  onToggle: () => void;
  // Hazır cevap seçeneği sayısı (yoksa 0).
  optionCount: number;
  // Seçenekler şu an üretiliyor.
  generating: boolean;
  controlsId?: string;
}

// Üst çubuktaki "Yardımcı" düğmesi: devir sonrası temsilci yardımcısını açar/kapatır. Yardımcı kendiliğinden açılmaz;
// hazır seçenek varsa sayaç gösterir. Açılınca (seçenek yoksa) öneriler üretilir.
export function CopilotToggleButton({ open, onToggle, optionCount, generating, controlsId }: Props) {
  const label = open ? 'Temsilci yardımcısını kapat' : 'Temsilci yardımcısını aç';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={label}
      title={label}
      className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2 text-ui-xs font-semibold hover:bg-bg-subtle hover:text-fg ${
        open ? 'bg-bg-subtle text-fg' : 'bg-card text-fg-muted'
      } ${motionFast} ${focusRing}`}
    >
      {generating
        ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" aria-hidden />
        : <Sparkles size={13} className="text-[var(--bot-accent)]" aria-hidden />}
      <span className="hidden @[520px]:inline">Yardımcı</span>
      {optionCount > 0 && (
        <span className={`min-w-4 rounded-full px-1 text-center text-ui-2xs font-bold tabular-nums leading-4 text-fg ${open ? 'bg-card' : 'bg-bg-subtle'}`}>
          {optionCount}
        </span>
      )}
    </button>
  );
}
