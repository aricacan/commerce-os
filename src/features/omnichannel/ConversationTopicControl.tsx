'use client';

import { useState } from 'react';
import { Tag } from 'lucide-react';
import { focusRing } from '../shared/design';
import {
  omnichannelApi, CONVERSATION_TOPIC, CONVERSATION_TOPIC_LABELS,
  type ConversationSummaryDto, type ConversationTopic,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { FILTER_TOPICS } from './topicMeta';

// Sohbet başlığındaki konu seçici (Gelen Kutusu v2 §3). Temsilcinin seçimi kalıcıdır —
// AI bir daha değiştirmez. "Otomatik" seçimi kararı AI'ya geri bırakır.
const MANUAL_TOPICS = FILTER_TOPICS.filter((topic) => topic !== CONVERSATION_TOPIC.None);

export function ConversationTopicControl({ conversation, onChanged, onError, large = false, compact = false }: {
  conversation: ConversationSummaryDto;
  onChanged: (conversation: ConversationSummaryDto) => void;
  onError: (message: string) => void;
  // Telefon sayfasında başparmakla seçilebilir yükseklik.
  large?: boolean;
  // Masaüstü üst çubuğunda küçük (h-7).
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const topic = conversation.topic ?? CONVERSATION_TOPIC.None;
  const byAi = topic !== CONVERSATION_TOPIC.None && !conversation.topicSetByUser;

  const change = async (next: ConversationTopic) => {
    setBusy(true);
    try { onChanged(await omnichannelApi.setTopic(conversation.id, next)); }
    catch (e) { onError(describeError(e)); }
    finally { setBusy(false); }
  };

  return (
    <label
      className={`flex shrink-0 items-center gap-1.5 text-fg-muted ${compact ? 'text-ui-xs' : 'text-ui-sm'}`}
      title={byAi ? 'Konu AI tarafından etiketlendi — değiştirirseniz kalıcı olur' : 'Konu etiketi'}
    >
      <Tag size={compact ? 12 : 14} aria-hidden />
      <select
        value={conversation.topicSetByUser ? topic : CONVERSATION_TOPIC.None}
        disabled={busy}
        onChange={(e) => void change(Number(e.target.value) as ConversationTopic)}
        aria-label="Konu etiketi"
        className={`cursor-pointer rounded-lg border border-border-soft bg-bg-subtle text-fg ${focusRing} ${
          large ? 'h-10 max-w-52 px-2 text-ui-md' : compact ? 'h-7 max-w-40 px-1.5 text-ui-xs' : 'h-8 max-w-44 px-2 text-ui-sm'
        }`}
      >
        {/* Otomatik seçenek AI'nın o anki etiketini gösterir: temsilci neyi ezdiğini görsün. */}
        <option value={CONVERSATION_TOPIC.None}>
          {byAi ? `Otomatik: ${CONVERSATION_TOPIC_LABELS[topic]}` : 'Otomatik'}
        </option>
        {MANUAL_TOPICS.map((option) => (
          <option key={option} value={option}>{CONVERSATION_TOPIC_LABELS[option]}</option>
        ))}
      </select>
    </label>
  );
}
