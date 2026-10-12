'use client';

import type { ConversationStage } from '../../lib/api/omnichannel';
import { InboxFilterSelect } from './InboxFilterSelect';
import { CONVERSATION_STAGE_LABELS, FILTER_STAGES, toConversationStage } from './stageRules';

// Gelen kutusunun aşama filtresi (P22).
export function InboxStageFilter({ value, onChange }: {
  value: ConversationStage | null; onChange: (value: ConversationStage | null) => void;
}) {
  return (
    <InboxFilterSelect
      ariaLabel="Aşama"
      value={value === null ? '' : String(value)}
      placeholder="Tüm aşamalar"
      options={FILTER_STAGES.map((stage) => ({ value: String(stage), label: CONVERSATION_STAGE_LABELS[stage] }))}
      onChange={(v) => onChange(toConversationStage(v))}
    />
  );
}
