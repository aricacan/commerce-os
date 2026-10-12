'use client';

import { useState } from 'react';
import { Trash2, Wand2 } from 'lucide-react';
import { INSTRUCTION_MODE, type ConversationInstructionDto } from '../../lib/api/omnichannel-instructions';
import { badgeBase, badgeTone, focusRing, motionFast } from '../shared/design';
import { describeError } from '../../lib/errors';
import { INSTRUCTION_MODE_LABELS, INSTRUCTION_SCOPE_LABELS } from './botInstructionRules';
import { formatPanelDate } from './CustomerPanelParts';
import { INFO_SECTION_CLASS, INFO_SECTION_HEADING_CLASS } from './infoSectionStyle';

interface Props {
  // Yalnız aktif talimatlar; boşsa çağıran bölümü hiç çizmez.
  instructions: ConversationInstructionDto[];
  canWrite: boolean;
  onRemove: (instructionId: number) => Promise<void>;
}

// "Ayrıntılar" panelindeki "Bot talimatları": botun şu an uyguladığı yönergeler ve kaldırma.
export function BotInstructionsSection({ instructions, canWrite, onRemove }: Props) {
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remove = async (id: number) => {
    setRemovingId(id);
    setError(null);
    try {
      await onRemove(id);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section aria-label="Bot talimatları" className={INFO_SECTION_CLASS}>
      <div className={INFO_SECTION_HEADING_CLASS}>
        <Wand2 size={13} className="shrink-0 text-fg-muted" aria-hidden />
        <span className="font-bold text-fg">Bot talimatları</span>
        <span className="text-ui-xs tabular-nums text-fg-muted">{instructions.length}</span>
      </div>
      <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0">
        {instructions.map((instruction) => (
          <li key={instruction.id} className="flex min-w-0 items-start gap-2 rounded-lg bg-bg-subtle px-2.5 py-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={`${badgeBase} ${instruction.mode === INSTRUCTION_MODE.OneShot ? badgeTone.warning : badgeTone.bot} self-start`}>
                {INSTRUCTION_MODE_LABELS[instruction.mode]}
              </span>
              <span className="min-w-0 whitespace-pre-wrap break-words text-ui-sm text-fg">{instruction.text}</span>
              <span className="text-ui-2xs text-fg-subtle">
                {instruction.createdByName ?? 'Temsilci'}
                {instruction.scope && ` · ${INSTRUCTION_SCOPE_LABELS[instruction.scope]}`}
                {instruction.expiresAt && ` · ${formatPanelDate(instruction.expiresAt)} tarihine dek`}
              </span>
            </div>
            {/* Geniş kapsamlı talimat verildiği konuşmadan kaldırılır. */}
            {canWrite && !instruction.inherited && (
              <button
                type="button"
                onClick={() => void remove(instruction.id)}
                disabled={removingId !== null}
                aria-label="Talimatı kaldır"
                className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-fg-muted hover:bg-card hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 ${motionFast} ${focusRing}`}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="m-0 break-words text-ui-xs text-danger">{error}</p>}
    </section>
  );
}
