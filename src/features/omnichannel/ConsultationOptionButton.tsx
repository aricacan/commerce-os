'use client';

import type { AgentConsultOptionDto } from '../../lib/api/omnichannel-consult';
import { focusRing, motionFast } from '../shared/design';

interface Props {
  option: AgentConsultOptionDto;
  disabled: boolean;
  onPick: (option: AgentConsultOptionDto) => void;
}

// Hazır cevap: başlık temsilcinin dilinde, altında müşteriye tam olarak ne gideceği.
export function ConsultationOptionButton({ option, disabled, onPick }: Props) {
  const showOriginal = option.customerText !== option.customerTextTr;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(option)}
      className={`flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border border-border bg-card px-3 py-1.5 text-left hover:border-fg/40 hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 ${motionFast} ${focusRing}`}
    >
      <span className="text-ui-sm font-semibold text-fg">{option.labelTr}</span>
      <span className="text-ui-xs text-fg-muted">Müşteriye gidecek: {option.customerTextTr}</span>
      {showOriginal && <span className="text-ui-2xs italic text-fg-subtle">{option.customerText}</span>}
    </button>
  );
}
