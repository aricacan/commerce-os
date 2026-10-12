'use client';

import { Ban, KeyRound, Plug, Power, Trash2, type LucideIcon } from 'lucide-react';
import type { PartnerHubClient } from '../../lib/api/partnerhub';
import { useMobile } from '../../hooks/useMobile';

// Client listesi: masaüstünde tablo, telefonda kart. Tablo 760px'e yayılıyor ve 375px'te
// sayfayı yatay kaydırıyordu. Göster/gizle Tailwind breakpoint sınıfıyla DEĞİL useMobile ile:
// bu projede `hidden md:*` sınıfları her yerde üretilmediği için göster/gizle JS ile yapılıyor.

export type ClientRowAction = 'disable' | 'enable' | 'rotate' | 'delete';

interface ClientListProps {
  clients: PartnerHubClient[];
  onAction: (action: ClientRowAction, client: PartnerHubClient) => void;
  /** Bir işlem sürerken satır düğmeleri kilitlenir (çift tıklama iki istek atmasın). */
  busy: boolean;
}

export function ClientList({ clients, onAction, busy }: ClientListProps) {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <ul className="flex flex-col gap-2.5">
        {clients.map((client) => (
          <li
            key={client.clientId}
            className={`flex flex-col gap-2.5 rounded-[4px] border border-border-soft bg-card p-3.5 shadow-xs ${client.isEnabled ? '' : 'opacity-60'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <ClientName client={client} />
              <StatusBadge isEnabled={client.isEnabled} />
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-fg-muted">
              <span>{client.tenantName || `Kiracı #${client.tenantId}`}</span>
              <span className="break-all font-mono">{client.clientId}</span>
            </div>
            <div className="flex justify-end border-t border-border-soft pt-2.5">
              <ClientActions client={client} onAction={onAction} busy={busy} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-[4px] border border-border-soft bg-card shadow-xs">
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-border-soft bg-bg-subtle text-[10.5px] font-semibold uppercase tracking-wider text-fg-muted">
            <th className="w-[28%] px-3.5 py-2.5">Görünen Ad</th>
            <th className="w-[18%] px-3.5 py-2.5">Kiracı</th>
            <th className="px-3.5 py-2.5">Client ID</th>
            <th className="w-[110px] px-3.5 py-2.5">Durum</th>
            <th className="w-[124px] px-3.5 py-2.5 text-right">İşlemler</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-soft">
          {clients.map((client) => (
            <tr key={client.clientId} className={`transition-colors hover:bg-card-hover ${client.isEnabled ? '' : 'opacity-60'}`}>
              <td className="px-3.5 py-2.5"><ClientName client={client} /></td>
              <td className="truncate px-3.5 py-2.5 text-xs text-fg-muted">{client.tenantName || `#${client.tenantId}`}</td>
              <td className="truncate px-3.5 py-2.5 font-mono text-[11px] text-fg-muted" title={client.clientId}>{client.clientId}</td>
              <td className="px-3.5 py-2.5"><StatusBadge isEnabled={client.isEnabled} /></td>
              <td className="px-3.5 py-2.5">
                <ClientActions client={client} onAction={onAction} busy={busy} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientName({ client }: { client: PartnerHubClient }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-border-soft bg-bg-subtle text-fg-muted">
        <Plug size={12} />
      </span>
      <span className="truncate text-xs font-semibold text-fg">{client.displayName || 'İsimsiz'}</span>
    </div>
  );
}

function StatusBadge({ isEnabled }: { isEnabled: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-[10.5px] font-semibold ${
        isEnabled ? 'bg-success-soft text-success' : 'bg-bg-subtle text-fg-muted'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isEnabled ? 'bg-success' : 'bg-fg-subtle'}`} />
      {isEnabled ? 'Aktif' : 'Devre Dışı'}
    </span>
  );
}

interface ActionButtonSpec {
  action: ClientRowAction;
  label: string;
  Icon: LucideIcon;
  danger: boolean;
}

function actionsFor(client: PartnerHubClient): ActionButtonSpec[] {
  const toggle: ActionButtonSpec = client.isEnabled
    ? { action: 'disable', label: 'Devre dışı bırak', Icon: Ban, danger: true }
    : { action: 'enable', label: 'Yeniden etkinleştir', Icon: Power, danger: false };

  return [
    toggle,
    { action: 'rotate', label: "Secret'ı yenile", Icon: KeyRound, danger: false },
    { action: 'delete', label: 'Sil', Icon: Trash2, danger: true },
  ];
}

function ClientActions({ client, onAction, busy }: Omit<ClientListProps, 'clients'> & { client: PartnerHubClient }) {
  const name = client.displayName || client.clientId;
  return (
    <div className="flex items-center justify-end gap-1.5">
      {actionsFor(client).map(({ action, label, Icon, danger }) => (
        <button
          key={action}
          type="button"
          disabled={busy}
          onClick={() => onAction(action, client)}
          title={label}
          aria-label={`${name}: ${label}`}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] border border-border-soft bg-bg-subtle text-fg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            danger ? 'hover:bg-danger-soft hover:text-danger' : 'hover:bg-card-hover hover:text-fg'
          }`}
        >
          <Icon size={12} />
        </button>
      ))}
    </div>
  );
}
