'use client';

import { useEffect, useState } from 'react';
import {
  handoffApi, HANDOFF_EVENT_TYPE, HANDOFF_STATUS_LABELS, type HandoffTimelineEventDto,
} from '../../lib/api/handoff';
import { describeError } from '../../lib/errors';
import { formatPanelDate } from './CustomerPanelParts';

interface Props {
  ticketId: number;
}

const SYSTEM_ACTOR = 'Sistem';

// Olayın tek satırlık Türkçe anlatımı.
export function describeTimelineEvent(event: HandoffTimelineEventDto): string {
  const actor = event.actorName ?? SYSTEM_ACTOR;
  switch (event.type) {
    case HANDOFF_EVENT_TYPE.Created: return `Devredildi${event.note ? `: ${event.note}` : ''}`;
    case HANDOFF_EVENT_TYPE.Rehandoff: return `Yeniden devredildi${event.note ? `: ${event.note}` : ''}`;
    case HANDOFF_EVENT_TYPE.Assigned: return `${actor} → ${event.assigneeName ?? 'temsilci'} atandı`;
    case HANDOFF_EVENT_TYPE.Unassigned: return `${actor} atamayı kaldırdı (kuyruğa döndü)`;
    case HANDOFF_EVENT_TYPE.StatusChanged:
      return `${event.toStatus !== null ? HANDOFF_STATUS_LABELS[event.toStatus] : 'Durum değişti'}${event.actorName ? ` · ${event.actorName}` : ''}`;
    case HANDOFF_EVENT_TYPE.Resolved: return `${actor}: ${event.note ?? 'Kapatıldı'}`;
    case HANDOFF_EVENT_TYPE.CustomerNotice: return 'Müşteriye talep no ve beklenen süre bildirildi';
    case HANDOFF_EVENT_TYPE.SlaReminder: return 'SLA: sorumluya hatırlatma';
    case HANDOFF_EVENT_TYPE.SlaOwners: return 'SLA aşıldı: kanal sahiplerine bildirildi';
    case HANDOFF_EVENT_TYPE.SlaAdmins: return 'SLA yükseltildi: yöneticilere bildirildi';
    default: return 'Olay';
  }
}

// Devir kaydının zaman çizelgesi: kim ne zaman ne yaptı (denetim izi). İlk açılışta yüklenir.
export function HandoffTimeline({ ticketId }: Props) {
  const [events, setEvents] = useState<HandoffTimelineEventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    handoffApi.timeline(ticketId)
      .then((list) => { if (!cancelled) setEvents(list); })
      .catch((e: unknown) => { if (!cancelled) setError(describeError(e)); });
    return () => { cancelled = true; };
  }, [ticketId]);

  if (error) return <p className="m-0 text-ui-xs text-danger">{error}</p>;
  if (events === null) return <p className="m-0 text-ui-xs text-fg-muted">Yükleniyor…</p>;
  if (events.length === 0) return <p className="m-0 text-ui-xs text-fg-muted">Kayıtlı olay yok.</p>;

  return (
    <ol className="m-0 flex list-none flex-col gap-1.5 border-l border-border-soft p-0 pl-3">
      {events.map((event) => (
        <li key={event.id} className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-ui-xs">
          <span className="tabular-nums text-fg-subtle">{formatPanelDate(event.at, true)}</span>
          <span className="min-w-0 break-words text-fg">{describeTimelineEvent(event)}</span>
        </li>
      ))}
    </ol>
  );
}
