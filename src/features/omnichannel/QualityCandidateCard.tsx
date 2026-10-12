import { Check, ExternalLink, X } from 'lucide-react';
import { QUALITY_CANDIDATE_STATUS, type QualityCandidateDto } from '../../lib/api/omnichannel-quality';
import { formatTraceTime, tracePathLabel } from './botTraceRules';
import { primaryButtonClass, secondaryButtonClass } from './formClasses';
import { signalChips } from './qualityCenterRules';
import { ToneChip } from './ToneChip';

interface Props {
  candidate: QualityCandidateDto;
  selected: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onOpenConversation: (conversationId: number) => void;
}

// Tek aday: sinyal çipleri, kanal ve zaman, müşteri mesajı, botun cevabı, sebep ve (varsa) temsilcinin gönderdiği
// cevap. Bekleyen aday seçilebilir, onaylanır ya da reddedilir; incelenmişte karar özeti görünür.
export function QualityCandidateCard({ candidate, selected, onToggle, onApprove, onReject, onOpenConversation }: Props) {
  const pending = candidate.status === QUALITY_CANDIDATE_STATUS.Pending;

  return (
    <li className={`flex min-w-0 gap-3 rounded-xl border bg-card p-3 ${selected ? 'border-fg' : 'border-border-soft'}`}>
      {pending && (
        <input
          type="checkbox" checked={selected} onChange={onToggle} aria-label={`Aday ${candidate.id} seç`}
          className="mt-1 shrink-0"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {signalChips(candidate.signals).map((chip) => <ToneChip key={chip.label} chip={chip} />)}
          <span className="truncate text-ui-2xs text-fg-subtle">
            {[candidate.channelName, candidate.country, formatTraceTime(candidate.detectedAt)].filter(Boolean).join(' · ')}
          </span>
        </div>

        <Line label="Müşteri" text={candidate.customerText || '—'} />
        {candidate.botText && <Line label="Bot" text={candidate.botText} />}
        {candidate.suggestedAnswer && <Line label="Temsilci" text={candidate.suggestedAnswer} />}
        {candidate.expectedAnswer && <Line label="Doğru cevap" text={candidate.expectedAnswer} />}
        {(candidate.reason || candidate.decisionPath) && (
          <p className="m-0 text-ui-2xs text-fg-muted">
            {[candidate.decisionPath ? tracePathLabel(candidate.decisionPath) : null, candidate.reason].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {pending && (
            <>
              <button type="button" className={primaryButtonClass} onClick={onApprove}>
                <Check size={13} aria-hidden /> Onayla
              </button>
              <button type="button" className={secondaryButtonClass} onClick={onReject}>
                <X size={13} aria-hidden /> Reddet
              </button>
            </>
          )}
          <button type="button" className={secondaryButtonClass} onClick={() => onOpenConversation(candidate.conversationId)}>
            <ExternalLink size={13} aria-hidden /> Konuşmayı aç
          </button>
          {candidate.scenarioId !== null && (
            <span className="text-ui-2xs text-fg-muted">Senaryo #{candidate.scenarioId}</span>
          )}
        </div>
      </div>
    </li>
  );
}

function Line({ label, text }: { label: string; text: string }) {
  return (
    <p className="m-0 whitespace-pre-wrap break-words text-ui-xs text-fg">
      <span className="font-semibold text-fg-muted">{label}: </span>{text}
    </p>
  );
}
