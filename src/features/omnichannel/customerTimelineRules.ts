import {
  AtSign, Car, CircleCheck, CircleDot, GitMerge, Headset, Info, MessageSquare, PackageSearch, PackageX,
  RefreshCw, SearchX, ShoppingCart, StickyNote, Tag, type LucideIcon,
} from 'lucide-react';
import {
  TIMELINE_EVENT_TYPE, type CustomerTimelineEventDto, type TimelineEventType,
} from '../../lib/api/customer-crm';

// Zaman çizelgesi satırının saf kuralları: olay tipine göre ikon ve tıklanınca açılacak konuşma.
// Özet metni backend'den hazır gelir (Türkçe); burada yalnız görsel eşleme var.

export const TIMELINE_EVENT_ICONS: Record<TimelineEventType, LucideIcon> = {
  [TIMELINE_EVENT_TYPE.ConversationStarted]: MessageSquare,
  [TIMELINE_EVENT_TYPE.ProductAsked]: PackageSearch,
  [TIMELINE_EVENT_TYPE.PriceQuoted]: Tag,
  [TIMELINE_EVENT_TYPE.OutOfStock]: PackageX,
  [TIMELINE_EVENT_TYPE.NotInCatalog]: SearchX,
  [TIMELINE_EVENT_TYPE.OrderPlaced]: ShoppingCart,
  [TIMELINE_EVENT_TYPE.HandoffOpened]: Headset,
  [TIMELINE_EVENT_TYPE.HandoffResolved]: CircleCheck,
  [TIMELINE_EVENT_TYPE.NoteAdded]: StickyNote,
  [TIMELINE_EVENT_TYPE.ProfilesMerged]: GitMerge,
  [TIMELINE_EVENT_TYPE.IdentityAdded]: AtSign,
  [TIMELINE_EVENT_TYPE.VehicleAdded]: Car,
  [TIMELINE_EVENT_TYPE.FactChanged]: Info,
  [TIMELINE_EVENT_TYPE.InterestUpdated]: RefreshCw,
};

// İleride eklenen bir olay tipi çizelgeyi çökertmesin.
export function timelineEventIcon(type: number): LucideIcon {
  return TIMELINE_EVENT_ICONS[type as TimelineEventType] ?? CircleDot;
}

// Sipariş ve devir olayları dikkat çeksin; geri kalanı nötr.
const EMPHASIZED: readonly TimelineEventType[] = [
  TIMELINE_EVENT_TYPE.OrderPlaced, TIMELINE_EVENT_TYPE.HandoffOpened, TIMELINE_EVENT_TYPE.ProfilesMerged,
];

export function isEmphasizedEvent(type: number): boolean {
  return EMPHASIZED.includes(type as TimelineEventType);
}

const CONVERSATION_REF = 'conversation';

// Olay bir konuşmaya bağlıysa (refType=conversation) o konuşmanın kimliği; değilse null.
export function timelineConversationId(event: Pick<CustomerTimelineEventDto, 'refType' | 'refId'>): number | null {
  if (event.refType !== CONVERSATION_REF || !event.refId) return null;
  const id = Number(event.refId);
  return Number.isInteger(id) && id > 0 ? id : null;
}
