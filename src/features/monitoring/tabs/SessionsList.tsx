'use client';

import type { SessionStatus, UserSessionDto } from '../../../lib/api';
import { formatActiveSeconds, formatStamp } from '../format';
import { Pill, TD_CLASS, TH_CLASS, type PillTone } from '../ui';

const STATUS: Record<SessionStatus, { tone: PillTone; label: string }> = {
  Open: { tone: 'success', label: 'Açık' },
  Logout: { tone: 'neutral', label: 'Çıkış yaptı' },
  Timeout: { tone: 'muted', label: 'Zaman aşımı' },
};

const COLUMNS = ['Kullanıcı', 'Başlangıç', 'Bitiş', 'Durum', 'Aktif süre', 'Sayfa', 'Cihaz', 'IP'];

export function SessionsList({ sessions }: { sessions: UserSessionDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="bg-[var(--bg-subtle)]">
            {COLUMNS.map((column) => <th key={column} className={TH_CLASS}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => <SessionRow key={session.id} session={session} />)}
        </tbody>
      </table>
    </div>
  );
}

function SessionRow({ session }: { session: UserSessionDto }) {
  const status = STATUS[session.status];

  return (
    <tr className="hover:bg-[var(--bg-subtle)]">
      <td className={`${TD_CLASS} font-semibold`}>{session.userName}</td>
      <td className={TD_CLASS}>{formatStamp(session.startedAt)}</td>
      <td className={TD_CLASS}>
        {session.endedAt ? formatStamp(session.endedAt) : <Pill tone="success">Açık</Pill>}
      </td>
      <td className={TD_CLASS}><Pill tone={status.tone}>{status.label}</Pill></td>
      <td className={TD_CLASS}>{formatActiveSeconds(session.activeSeconds)}</td>
      <td className={TD_CLASS}>{session.pageViews}</td>
      <td className={`${TD_CLASS} text-[var(--fg-muted)]`}>{session.device ?? '—'}</td>
      <td className={`${TD_CLASS} font-mono text-[var(--fg-muted)]`}>{session.ipAddress ?? '—'}</td>
    </tr>
  );
}
