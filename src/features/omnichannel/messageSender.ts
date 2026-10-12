import { CHANNEL_TYPE, MESSAGE_DIRECTION, SENDER_TYPE, type ChannelType, type MessageDto } from '../../lib/api/omnichannel';

// Sohbet balonunda "bu mesajı kim yazdı?" sorusunun tek cevabı. Gelen Kutusu ve Test Alanı
// aynı kuralı kullanır: bot ile temsilci cevabı karışmasın, müşteri hep solda kalsın.
//   platform → panel dışından ELLE yazılan cevap: Facebook/Instagram gelen kutusu, Business Suite
//              ya da işletme telefonu. Panel kullanıcısına bağlı değildir (yankı olarak kaydedilir,
//              SenderUserId boş) — bizim temsilcimizle karışmasın.
//   system   → Meta'nın otomatik cevabı (anında yanıt / karşılama; sunucu yankıyı sistem mesajı yazar, gönderim
//              zamanı Meta'dan gelir) ya da panel notu (ör. "bot önerdiği cevabı gönderdi"; gönderim zamanı yok).
export type SenderKind = 'customer' | 'bot' | 'agent' | 'platform' | 'system';

type SenderFields = Pick<MessageDto, 'direction' | 'senderType' | 'senderUserId' | 'senderUserName'>
  & Partial<Pick<MessageDto, 'sentAt'>>;

export const AGENT_FALLBACK_LABEL = 'Temsilci';
export const OWN_MESSAGE_LABEL = 'Siz';

export const AGENT_LABEL_PREFIX = 'Temsilci · ';
export const META_AUTOMATION_LABEL = 'Otomatik cevap (Meta)';

const FIXED_LABELS: Record<Exclude<SenderKind, 'agent' | 'platform'>, string> = {
  customer: 'Müşteri',
  bot: 'Bot',
  system: 'Sistem',
};

// Gelen kutusunda "bot mu yazdı, Facebook'tan elle mi?" sorusu her balonda cevaplanır (1 Eki 2026).
const PLATFORM_LABELS: Partial<Record<ChannelType, string>> = {
  [CHANNEL_TYPE.Facebook]: "Meta'dan elle",
  [CHANNEL_TYPE.Instagram]: "Meta'dan elle",
  [CHANNEL_TYPE.WhatsApp]: "WhatsApp'tan elle",
  [CHANNEL_TYPE.TikTok]: "TikTok'tan elle",
  [CHANNEL_TYPE.Email]: 'E-postadan elle',
};
export const PLATFORM_FALLBACK_LABEL = 'Panel dışından';

const META_CHANNELS: readonly ChannelType[] = [CHANNEL_TYPE.Facebook, CHANNEL_TYPE.Instagram];

export function senderKindOf(
  message: Pick<MessageDto, 'direction' | 'senderType' | 'senderUserId'>,
): SenderKind {
  if (message.senderType === SENDER_TYPE.System) return 'system';
  if (message.senderType === SENDER_TYPE.Bot) return 'bot';
  if (message.direction === MESSAGE_DIRECTION.Inbound) return 'customer';
  // Giden insan cevabı: panelden yazılanın gönderen kullanıcısı bellidir; boşsa panel dışından.
  return message.senderUserId != null ? 'agent' : 'platform';
}

// Panelden yazan temsilcinin adı. Sunucudan gelmediyse (canlı yayın, pasif kullanıcı) kendi mesajı "Siz",
// ötekiler null (yalnız "Temsilci" yazılır).
export function agentNameOf(message: SenderFields, currentUserId: number | null): string | null {
  const name = message.senderUserName?.trim();
  if (name) return name;
  const isOwn = currentUserId !== null && message.senderUserId === currentUserId;
  return isOwn ? OWN_MESSAGE_LABEL : null;
}

// Balondaki gönderen etiketi: "Bot", "Temsilci · Ayşe", "Meta'dan elle", "Otomatik cevap (Meta)", "Sistem".
// Meta'nın otomatik cevabı sunucuda giden sistem mesajıdır; ayrı alan gerekmez (eski backend'de de çalışır).
export function senderLabelOf(
  message: SenderFields, currentUserId: number | null, channelType?: ChannelType,
): string {
  const kind = senderKindOf(message);
  if (kind === 'platform') return (channelType && PLATFORM_LABELS[channelType]) || PLATFORM_FALLBACK_LABEL;
  if (isMetaAutomation(message, kind, channelType)) return META_AUTOMATION_LABEL;
  if (kind !== 'agent') return FIXED_LABELS[kind];

  const name = agentNameOf(message, currentUserId);
  return name ? AGENT_LABEL_PREFIX + name : AGENT_FALLBACK_LABEL;
}

// Meta'nın otomatik cevabı: Facebook/Instagram'da giden, Meta'dan gönderim zamanı gelmiş sistem mesajı. Panel notunun
// gönderim zamanı yoktur (müşteriye gitmez) — "Sistem" kalır.
function isMetaAutomation(message: SenderFields, kind: SenderKind, channelType?: ChannelType): boolean {
  return kind === 'system' && message.direction === MESSAGE_DIRECTION.Outbound && message.sentAt != null
    && channelType !== undefined && META_CHANNELS.includes(channelType);
}

// Avatar için baş harfler: "Ayşe Kaya" → "AK", tek kelime → ilk harf.
export function senderInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toLocaleUpperCase('tr-TR');
}

export function isOutgoingSender(kind: SenderKind): kind is 'bot' | 'agent' | 'platform' {
  return kind === 'bot' || kind === 'agent' || kind === 'platform';
}
