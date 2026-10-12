'use client';

import { Clock, MessageCircleQuestion } from 'lucide-react';
import type { AgentConsultAnswerBody, AgentConsultationDto } from '../../lib/api/omnichannel-consult';
import { ConsultationAutoReplyNotice } from './ConsultationAutoReplyNotice';
import { ConsultationFreeForm } from './ConsultationFreeForm';
import { ConsultationOptionButton } from './ConsultationOptionButton';
import { consultAutoReplyOf, formatCountdown } from './consultationRules';
import { useConsultCountdown } from './useConsultCountdown';

// Son dakikada sayaç dikkat çeksin.
const URGENT_REMAINING_MS = 60_000;

interface Props {
  consultation: AgentConsultationDto;
  busy: boolean;
  // Kartı açık bırakan hata (güvenli cevap üretilemedi, servis yok…).
  failure: string | null;
  onAnswer: (body: AgentConsultAnswerBody) => void;
}

function CountdownBadge({ remainingMs }: { remainingMs: number }) {
  const tone = remainingMs <= URGENT_REMAINING_MS ? 'text-danger' : 'text-fg-muted';

  return (
    <span
      title="Süre dolunca konuşma normal devir yoluyla temsilciye düşer"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-2 py-0.5 text-ui-xs font-semibold tabular-nums ${tone}`}
    >
      <Clock size={11} aria-hidden />
      {remainingMs === 0 ? 'Süre doldu' : formatCountdown(remainingMs)}
    </span>
  );
}

// Bot çözemediği yerde devretmek yerine temsilciye sorar (Temsilci Danışma). Yazma alanının hemen
// üstünde durur (cevap beklenen tek kart) ama sade: gölgesiz, kısa. Süre dolunca kart
// pasifleşir; konuşmayı sunucu devire çevirir ve kart bir sonraki tazelemede kalkar.
export function ConsultationCard({ consultation, busy, failure, onAnswer }: Props) {
  const remainingMs = useConsultCountdown(consultation.expiresAt);
  const expired = remainingMs === 0;
  const locked = busy || expired;
  const autoReply = consultAutoReplyOf(consultation);

  return (
    <section
      aria-label="Bot sana soruyor"
      className="flex max-h-[38vh] flex-col gap-2 overflow-y-auto rounded-xl border border-warning/30 bg-warning-soft p-3"
    >
      <header className="flex items-center gap-2">
        <MessageCircleQuestion size={14} className="shrink-0 text-warning" aria-hidden />
        <h3 className="min-w-0 flex-1 text-ui-sm font-bold text-fg">Bot sana soruyor</h3>
        <CountdownBadge remainingMs={remainingMs} />
      </header>

      <p className="m-0 whitespace-pre-wrap break-words text-ui-sm font-semibold leading-snug text-fg">{consultation.questionTr}</p>
      {!expired && autoReply && <ConsultationAutoReplyNotice autoReply={autoReply} />}

      {expired ? (
        <p className="text-ui-sm text-fg-muted">Süre doldu; konuşma temsilciye devredilecek.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {consultation.options.map((option) => (
            <ConsultationOptionButton
              key={option.index}
              option={option}
              disabled={locked}
              onPick={(picked) => onAnswer({ optionIndex: picked.index })}
            />
          ))}
          <ConsultationFreeForm disabled={locked} sending={busy} onSubmit={(text) => onAnswer({ text })} />
        </div>
      )}

      {failure && <p role="alert" className="text-ui-sm font-semibold text-danger">{failure}</p>}
    </section>
  );
}
