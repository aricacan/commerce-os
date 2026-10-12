import type { ChatOrderStatus } from '../../lib/api/omnichannel-chat-orders';
import { CHAT_ORDER_STATUS_CLASSES, CHAT_ORDER_STATUS_LABELS } from './chatOrderRules';

export function ChatOrderStatusBadge({ status }: { status: ChatOrderStatus }) {
  return (
    <span className={`shrink-0 rounded-[3px] px-1.5 py-px text-[10px] font-semibold ${CHAT_ORDER_STATUS_CLASSES[status]}`}>
      {CHAT_ORDER_STATUS_LABELS[status]}
    </span>
  );
}
