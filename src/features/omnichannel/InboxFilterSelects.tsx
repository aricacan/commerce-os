'use client';

import {
  CONVERSATION_TOPIC_LABELS,
  type ConversationFilter, type ConversationTopic, type InboxChannelDto,
} from '../../lib/api/omnichannel';
import { InboxChannelFilters } from './InboxChannelFilters';
import { InboxDetailFilters } from './InboxDetailFilters';
import { InboxFilterSelect } from './InboxFilterSelect';
import { InboxStageFilter } from './InboxStageFilter';
import { InboxStatusFilter } from './InboxStatusFilter';
import { FILTER_TOPICS } from './topicMeta';
import type { InboxFilters, InboxView } from './inboxFilters';

const TOPIC_OPTIONS = FILTER_TOPICS.map((topic) => ({ value: String(topic), label: CONVERSATION_TOPIC_LABELS[topic] }));

interface Props {
  channels: InboxChannelDto[];
  value: InboxFilters;
  onChange: (value: InboxFilters) => void;
  counts: Partial<Record<ConversationFilter, number>>;
  view: InboxView;
}

// Filtre çubuğundaki bütün açılır menüler tek sırada: kanal → durum → konu → aşama → ülke/etiket.
// Durum ve aşama yalnız listede: pano sütunları zaten aşamadır, ayrıca süzmek kartları
// kaybettirip kafa karıştırıyordu.
export function InboxFilterSelects({ channels, value, onChange, counts, view }: Props) {
  return (
    <>
      <InboxChannelFilters channels={channels} value={value} onChange={onChange} />
      {view === 'list' && (
        <InboxStatusFilter value={value.filter} counts={counts} onChange={(filter) => onChange({ ...value, filter })} />
      )}
      <InboxFilterSelect
        ariaLabel="Konu"
        value={value.topic === null ? '' : String(value.topic)}
        placeholder="Tüm konular"
        options={TOPIC_OPTIONS}
        onChange={(v) => onChange({ ...value, topic: v === '' ? null : (Number(v) as ConversationTopic) })}
      />
      {view === 'list' && <InboxStageFilter value={value.stage} onChange={(stage) => onChange({ ...value, stage })} />}
      <InboxDetailFilters value={value.detail} onChange={(detail) => onChange({ ...value, detail })} />
    </>
  );
}
