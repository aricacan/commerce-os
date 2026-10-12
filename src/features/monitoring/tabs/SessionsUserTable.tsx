'use client';

import type { UserActivitySummaryDto } from '../../../lib/api';
import { formatActiveSeconds, formatRelative } from '../format';
import { TD_CLASS, TH_CLASS } from '../ui';

interface Props {
  users: UserActivitySummaryDto[];
  selectedUserId: number | null;
  onSelect: (userId: number | null) => void;
  now: number;
}

// Çevrimiçi olanlar önce, sonra son görülmeye göre; bu dönemde hiç girmeyenler en altta.
function byPresence(a: UserActivitySummaryDto, b: UserActivitySummaryDto): number {
  if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
  if ((a.sessions > 0) !== (b.sessions > 0)) return a.sessions > 0 ? -1 : 1;
  return (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? '');
}

const COLUMNS = ['Kullanıcı', 'Son görülme', 'Oturum', 'Aktif süre', 'Sayfa', 'Eylem', 'İş işlemi'];

export function SessionsUserTable({ users, selectedUserId, onSelect, now }: Props) {
  const sorted = [...users].sort(byPresence);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr className="bg-[var(--bg-subtle)]">
            {COLUMNS.map((column) => <th key={column} className={TH_CLASS}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((user) => (
            <UserRow
              key={user.userId}
              user={user}
              selected={user.userId === selectedUserId}
              onClick={() => onSelect(user.userId === selectedUserId ? null : user.userId)}
              now={now}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({ user, selected, onClick, now }: {
  user: UserActivitySummaryDto;
  selected: boolean;
  onClick: () => void;
  now: number;
}) {
  const inactive = user.sessions === 0;
  const rowTone = selected ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-subtle)]';

  return (
    <tr
      onClick={onClick}
      aria-selected={selected}
      className={`cursor-pointer transition-colors ${rowTone} ${inactive ? 'opacity-60' : ''}`}
    >
      <td className={TD_CLASS}>
        <div className="flex items-center gap-2">
          <span
            aria-label={user.isOnline ? 'Çevrimiçi' : undefined}
            className={`h-2 w-2 shrink-0 rounded-full ${user.isOnline ? 'bg-[var(--success)]' : 'bg-transparent'}`}
          />
          <div className="flex min-w-0 flex-col">
            <span className="font-semibold">{user.userName}</span>
            {user.userEmail ? <span className="text-ui-2xs text-[var(--fg-muted)]">{user.userEmail}</span> : null}
          </div>
        </div>
      </td>
      <td className={`${TD_CLASS} text-[var(--fg-muted)]`}>
        {user.isOnline ? 'Şu an çevrimiçi' : formatRelative(user.lastSeenAt, now)}
      </td>
      {inactive ? (
        <td className={`${TD_CLASS} italic text-[var(--fg-muted)]`} colSpan={5}>Bu dönemde girmedi</td>
      ) : (
        <>
          <td className={TD_CLASS}>{user.sessions}</td>
          <td className={TD_CLASS}>{formatActiveSeconds(user.activeSeconds)}</td>
          <td className={TD_CLASS}>{user.pageViews}</td>
          <td className={TD_CLASS}>{user.actions}</td>
          <td className={TD_CLASS}>{user.businessActions}</td>
        </>
      )}
    </tr>
  );
}
