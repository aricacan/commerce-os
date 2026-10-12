'use client';

import { handoffApi, HANDOFF_REASON_LABELS, HANDOFF_STATUS } from '../../lib/api/handoff';
import { CardLink, ChartCard } from './OverviewCards';
import { SnapshotList, type SnapshotItem } from './SnapshotList';
import { formatRelativeTime } from './relativeTime';
import { useResource } from './useResource';

const VISIBLE_COUNT = 5;

interface Props {
  reloadKey: number;
  onOpenConversation?: (conversationId: number) => void;
  onNavigate: (tab: string) => void;
}

// "Şu an" devir kuyruğu: botun insana bıraktığı, henüz çözülmemiş işler (dönemden bağımsız).
export function OverviewHandoffsWidget({ reloadKey, onOpenConversation, onNavigate }: Props) {
  const tickets = useResource(() => handoffApi.queue(), `handoffs-${reloadKey}`);
  const open = (tickets.data ?? []).filter((t) => t.status !== HANDOFF_STATUS.Resolved);

  const items: SnapshotItem[] = open.slice(0, VISIBLE_COUNT).map((t) => ({
    id: t.id,
    title: t.customerName ?? 'İsimsiz müşteri',
    subtitle: `${t.channelName} · ${HANDOFF_REASON_LABELS[t.reason]}`,
    meta: t.isUrgent ? `Acil · ${formatRelativeTime(t.createdAt)}` : formatRelativeTime(t.createdAt),
    attention: t.isUrgent,
    onOpen: onOpenConversation && (() => onOpenConversation(t.conversationId)),
  }));

  return (
    <ChartCard
      title="Devir kuyruğu" loading={tickets.loading && !tickets.data} error={tickets.error}
      caption={open.length === 0 ? undefined : `${open.length} devir temsilci bekliyor; en üsttekiler önce.`}
      action={<CardLink label="Tümünü gör" onClick={() => onNavigate('handoffs')} />}
    >
      <SnapshotList items={items} ariaLabel="Açık devirler" emptyText="Bekleyen devir yok." />
    </ChartCard>
  );
}
