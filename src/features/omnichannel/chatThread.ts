import type { MessageDto } from '../../lib/api/omnichannel';
import { senderKindOf, type SenderKind } from './messageSender';

// Sohbet akışını görüntüye hazırlar: gün ayraçları ve "aynı gönderenin ardışık mesajlarında
// etiketi bir kez göster". Saf fonksiyon — bileşenler yalnız çizer.

// Akışa zaman sırasıyla giren, yalnız panelde görünen not (ör. "Enes bota talimat verdi: …").
export interface ThreadNote {
  id: number;
  createdAt: string;
  text: string;
}

export type ThreadItem =
  | { type: 'day'; key: string; label: string }
  | { type: 'message'; key: string; message: MessageDto; showSender: boolean }
  | { type: 'note'; key: string; note: ThreadNote };

const MS_PER_DAY = 86_400_000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// "Bugün", "Dün", "14 Tem", (başka yıl) "14 Tem 2025"
export function dayLabel(iso: string, now: Date = new Date()): string {
  const day = startOfDay(new Date(iso));
  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - day.getTime()) / MS_PER_DAY);

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  const sameYear = day.getFullYear() === today.getFullYear();
  return day.toLocaleDateString('tr-TR', sameYear
    ? { day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
}

const dayKey = (iso: string) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

// Müşteri hep solda ve etiketsizdir; giden taraf (bot/temsilci/panel dışı) gönderen değişince etiketlenir.
const isLabelled = (kind: SenderKind) => kind !== 'customer' && kind !== 'system';

type ThreadEntry = { message: MessageDto } | { note: ThreadNote };

const createdAtOf = (entry: ThreadEntry) => ('message' in entry ? entry.message : entry.note).createdAt;

// ISO metinleri kesir hanesi farklı olabilir ("…00Z" / "…00.5Z"): sıralama metinle değil zamanla yapılır.
const timeOf = (iso: string) => new Date(iso).getTime();

// Mesajlar sunucu sırasıyla gelir; notlar zamanına göre araya yerleşir (eşit anda mesaj önce).
function mergeByTime(messages: MessageDto[], notes: ThreadNote[]): ThreadEntry[] {
  const sortedNotes = [...notes].sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt));
  const entries: ThreadEntry[] = [];
  let noteIndex = 0;
  for (const message of messages) {
    while (noteIndex < sortedNotes.length && timeOf(sortedNotes[noteIndex].createdAt) < timeOf(message.createdAt))
      entries.push({ note: sortedNotes[noteIndex++] });
    entries.push({ message });
  }
  return [...entries, ...sortedNotes.slice(noteIndex).map((note) => ({ note }))];
}

export function buildThread(messages: MessageDto[], now: Date = new Date(), notes: ThreadNote[] = []): ThreadItem[] {
  const items: ThreadItem[] = [];
  let previousDay: string | null = null;
  let previousKind: SenderKind | null = null;

  for (const entry of mergeByTime(messages, notes)) {
    const createdAt = createdAtOf(entry);
    const day = dayKey(createdAt);
    const newDay = day !== previousDay;
    if (newDay) items.push({ type: 'day', key: `day-${day}`, label: dayLabel(createdAt, now) });
    previousDay = day;

    // Not gönderen zincirini bozmaz: notun ardındaki aynı gönderenin mesajı yine etiketsiz kalır.
    if ('note' in entry) {
      items.push({ type: 'note', key: `note-${entry.note.id}`, note: entry.note });
      continue;
    }

    const kind = senderKindOf(entry.message);
    items.push({
      type: 'message',
      key: `message-${entry.message.id}`,
      message: entry.message,
      showSender: isLabelled(kind) && (newDay || kind !== previousKind),
    });
    previousKind = kind;
  }
  return items;
}
