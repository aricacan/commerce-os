'use client';

import { useMemo, type ReactNode } from 'react';
import { MessageSquare, Wand2 } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import type { MessageDto } from '../../lib/api/omnichannel';
import { buildThread, type ThreadNote } from './chatThread';

interface Props {
  messages: MessageDto[];
  loading: boolean;
  // Her mesaj için balon; gönderen etiketini gösterip göstermeyeceğini thread söyler.
  renderMessage: (message: MessageDto, showSender: boolean) => ReactNode;
  // Yalnız panelde görünen notlar (ör. bota verilen talimatlar); müşteriye gitmez.
  notes?: ThreadNote[];
}

const NO_NOTES: ThreadNote[] = [];

// Mesajların akışı: gün ayraçları, yüklenirken iskelet, boşken sakin bir ilk mesaj daveti.
export function MessageThread({ messages, loading, renderMessage, notes = NO_NOTES }: Props) {
  const items = useMemo(() => buildThread(messages, new Date(), notes), [messages, notes]);

  if (loading && messages.length === 0) return <ThreadSkeleton />;
  if (messages.length === 0) return <EmptyThread />;

  return (
    <>
      {items.map((item) => {
        if (item.type === 'day') return <DayDivider key={item.key} label={item.label} />;
        if (item.type === 'note') return <ThreadNoteRow key={item.key} text={item.note.text} />;
        return <div key={item.key} className="flex flex-col">{renderMessage(item.message, item.showSender)}</div>;
      })}
    </>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-3 py-2">
      <span className="h-px flex-1 bg-border-soft" />
      <span className="rounded-full bg-bg-subtle px-3 py-1 text-ui-xs font-semibold text-fg-muted">{label}</span>
      <span className="h-px flex-1 bg-border-soft" />
    </div>
  );
}

// Ortalanmış küçük sistem notu: balon değil, müşteriye gitmediği belli olsun.
function ThreadNoteRow({ text }: { text: string }) {
  return (
    <p className="m-0 flex max-w-full items-start gap-1.5 self-center rounded-lg bg-bg-subtle px-3 py-1.5 text-ui-xs text-fg-muted md:max-w-[80%]">
      <Wand2 size={12} className="mt-0.5 shrink-0" aria-hidden />
      <span className="min-w-0 break-words">{text}</span>
      <span className="sr-only">(yalnız panelde görünür)</span>
    </p>
  );
}

function EmptyThread() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-bg-subtle text-fg-muted">
        <MessageSquare size={18} aria-hidden />
      </span>
      <p className="m-0 text-ui-md font-semibold text-fg">Bu konuşmada henüz mesaj yok</p>
      <p className="m-0 text-ui-sm text-fg-muted">Aşağıdan ilk mesajı yazabilirsiniz.</p>
    </div>
  );
}

// Gerçek akışın şekli: solda müşteri, sağda cevap balonları.
function ThreadSkeleton() {
  return (
    <div role="status" aria-label="Mesajlar yükleniyor" className="flex flex-col gap-4 px-2">
      <Skeleton height={44} width="55%" className="rounded-2xl" />
      <Skeleton height={56} width="62%" className="self-end rounded-2xl" />
      <Skeleton height={36} width="40%" className="rounded-2xl" />
    </div>
  );
}
