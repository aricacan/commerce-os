import { CONVERSATION_FILTER, type ConversationFilter } from '../../lib/api/omnichannel';

export interface StatusOption {
  value: ConversationFilter;
  label: string;
  // Seçeneğin üstüne gelince görünen açıklama: durumun tam olarak ne gösterdiği.
  hint: string;
}

// Gelen kutusu durum seçenekleri (P28). Etiketler "sistemin diliyle" değil temsilcinin sorusuyla
// yazıldı: "şu an benden ne bekleniyor?". "Tümü" yok: menünün "Tüm durumlar" satırı o.
// Aşamaya bağlı olanların kapsamı backend InboxViews.StagesFor ile aynıdır.
export const STATUS_OPTIONS: StatusOption[] = [
  {
    value: CONVERSATION_FILTER.WaitingReply, label: 'Cevap bekleyen',
    hint: 'Müşteri yazdı ve bekliyor: temsilci bekleyen ya da devredilmiş konuşmalar.',
  },
  { value: CONVERSATION_FILTER.AssignedToMe, label: 'Bana atanan', hint: 'Sana atanmış konuşmalar.' },
  {
    value: CONVERSATION_FILTER.AwaitingConsultation, label: 'Soru bekliyor',
    hint: 'Bot çözemediği yerde sana soru sordu: cevabını bekliyor.',
  },
  {
    value: CONVERSATION_FILTER.InOrder, label: 'Sipariş alınıyor',
    hint: 'Bot müşteriden sipariş bilgisi topluyor ya da müşterinin onayını bekliyor.',
  },
  {
    value: CONVERSATION_FILTER.AwaitingPayment, label: 'Ödeme bekleyen',
    hint: 'Havale siparişi onaylandı, ödeme henüz gelmedi.',
  },
  {
    value: CONVERSATION_FILTER.BotRunning, label: 'Bot ilgileniyor',
    hint: 'Botun yürüttüğü konuşmalar: temsilci müdahale etmedi.',
  },
  {
    value: CONVERSATION_FILTER.SlaBreached, label: 'Süresi geçen',
    hint: 'İlk yanıt süresi aşılmış ve hâlâ çözülmemiş konuşmalar.',
  },
  { value: CONVERSATION_FILTER.Closed, label: 'Kapanan', hint: 'Çözülen ve uzun süredir yazışılmayan konuşmalar.' },
  { value: CONVERSATION_FILTER.Unread, label: 'Okunmamış', hint: 'Henüz açılıp okunmamış mesajı olanlar.' },
  { value: CONVERSATION_FILTER.Unassigned, label: 'Kimseye atanmamış', hint: 'Sahibi olmayan açık konuşmalar.' },
  { value: CONVERSATION_FILTER.BotHandled, label: 'Son cevabı bot verdi', hint: 'Bot ne demiş diye denetlemek için.' },
];
