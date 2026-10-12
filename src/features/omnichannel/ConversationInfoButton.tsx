'use client';

import type { Ref } from 'react';
import { PanelRight } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import { infoButtonLabel, type ConversationInfoSummary, type InfoAlertTone } from './conversationInfoRules';

interface Props {
  summary: ConversationInfoSummary;
  open: boolean;
  onToggle: () => void;
  // Masaüstü çekmecesinin kimliği; telefonda alt sayfa açılınca kurulur, bu yüzden verilmez.
  controlsId?: string;
  isMobile: boolean;
  // Masaüstü üst çubuğunda daha küçük (h-7) çizilir.
  compact?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}

const DOT_TONE: Record<InfoAlertTone, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
};

// Sohbet başlığındaki "Ayrıntılar" düğmesi: dolu bölüm sayısı + kritik durumda küçük renkli nokta.
// Devir, takip, sipariş, özet ve araç bilgisi panelde durur; mesajlar alanı en geniş yer kalır.
export function ConversationInfoButton({ summary, open, onToggle, controlsId, isMobile, compact = false, buttonRef }: Props) {
  const label = infoButtonLabel(summary, open);
  const size = isMobile ? 'h-10 px-2.5' : compact ? 'h-7 px-2' : 'h-8 px-2';

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-haspopup={isMobile ? 'dialog' : undefined}
      aria-label={label}
      title={label}
      className={`relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border font-semibold hover:bg-bg-subtle hover:text-fg ${size} ${compact ? 'text-ui-xs' : 'text-ui-sm'} ${
        open ? 'bg-bg-subtle text-fg' : 'bg-card text-fg-muted'
      } ${motionFast} ${focusRing}`}
    >
      <PanelRight size={isMobile ? 18 : compact ? 13 : 15} aria-hidden />
      {/* Başlık darsa (müşteri paneli açıkken, telefonda) yalnız simge + sayaç kalır. */}
      <span className="hidden @[520px]:inline">Ayrıntılar</span>
      {summary.count > 0 && (
        <span className={`min-w-5 rounded-full px-1.5 text-center text-ui-2xs font-bold tabular-nums leading-5 text-fg ${open ? 'bg-card' : 'bg-bg-subtle'}`}>
          {summary.count}
        </span>
      )}
      {summary.tone && (
        <span aria-hidden className={`absolute -right-1 -top-1 size-2.5 rounded-full ring-2 ring-card ${DOT_TONE[summary.tone]}`} />
      )}
    </button>
  );
}
