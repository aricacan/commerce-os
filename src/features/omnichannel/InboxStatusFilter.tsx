'use client';

import { CONVERSATION_FILTER, type ConversationFilter } from '../../lib/api/omnichannel';
import { InboxFilterSelect } from './InboxFilterSelect';
import { STATUS_OPTIONS } from './statusOptions';

interface Props {
  value: ConversationFilter;
  counts: Partial<Record<ConversationFilter, number>>;
  onChange: (value: ConversationFilter) => void;
}

// Durum filtresi (P28). Sayısı sıfır olmayan durumların yanında konuşma sayısı görünür.
export function InboxStatusFilter({ value, counts, onChange }: Props) {
  return (
    <InboxFilterSelect
      ariaLabel="Durum"
      value={value === CONVERSATION_FILTER.All ? '' : String(value)}
      placeholder="Tüm durumlar"
      options={STATUS_OPTIONS.map((option) => ({
        value: String(option.value),
        label: option.label,
        hint: option.hint,
        sublabel: counts[option.value] ? String(counts[option.value]) : undefined,
      }))}
      onChange={(v) => onChange(v === '' ? CONVERSATION_FILTER.All : (Number(v) as ConversationFilter))}
    />
  );
}
