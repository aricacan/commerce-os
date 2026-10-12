import { CONVERSATION_TOPIC, CONVERSATION_TOPIC_LABELS, type ConversationTopic } from '../../lib/api/omnichannel';
import { badgeBase } from '../shared/design';
import { TOPIC_TONE } from './topicMeta';

// Konuşma satırındaki konu çipi. Etiketsiz konuşmada hiç gösterilmez — her satırda
// "Etiketsiz" yazması listeyi gürültüye boğardı.
export function TopicChip({ topic }: { topic: ConversationTopic | undefined }) {
  if (topic === undefined || topic === CONVERSATION_TOPIC.None) return null;

  return (
    <span title="Konu" className={`${badgeBase} ${TOPIC_TONE[topic]}`}>
      {CONVERSATION_TOPIC_LABELS[topic]}
    </span>
  );
}
