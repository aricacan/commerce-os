'use client';

import { useState } from 'react';
import { LogIn, Users, X } from 'lucide-react';
import { useSessions, useUsersActivity } from '../../../hooks/monitoring/useMonitoringUsers';
import { DaysSelector, Pager, Panel, QueryStatus, useNow } from '../ui';
import { SessionsUserTable } from './SessionsUserTable';
import { SessionsList } from './SessionsList';

const PAGE_SIZE = 25;
const DEFAULT_DAYS = 7;

// "Kim ne zaman girdi, ne kadar aktif kaldı." Üstte kişi başına özet, altta oturumlar;
// bir kişiye tıklamak alt listeyi o kişiye daraltır.
export function SessionsTab() {
  const now = useNow();
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [userId, setUserId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const users = useUsersActivity(days);
  const sessions = useSessions({ days, userId: userId ?? undefined, page, pageSize: PAGE_SIZE });

  const selectedUser = users.data?.find((user) => user.userId === userId);
  const onlineCount = users.data?.filter((user) => user.isOnline).length ?? 0;

  const changeDays = (next: number) => { setDays(next); setPage(1); };
  const selectUser = (next: number | null) => { setUserId(next); setPage(1); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--fg-muted)]">
          {users.data ? `Şu an ${onlineCount} kişi çevrimiçi · ${users.data.length} kullanıcı` : 'Kullanıcı oturumları'}
        </p>
        <DaysSelector value={days} onChange={changeDays} />
      </div>

      <Panel title="Kullanıcılar">
        <QueryStatus
          isLoading={users.isLoading}
          isError={users.isError}
          isEmpty={(users.data?.length ?? 0) === 0}
          onRetry={() => users.refetch()}
          emptyIcon={Users}
          emptyTitle="Kullanıcı yok"
          emptyDescription="Bu kiracıda kayıtlı kullanıcı bulunamadı."
        >
          <SessionsUserTable users={users.data ?? []} selectedUserId={userId} onSelect={selectUser} now={now} />
        </QueryStatus>
      </Panel>

      <Panel
        title="Oturumlar"
        action={selectedUser ? (
          <button
            type="button"
            onClick={() => selectUser(null)}
            className="flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-ui-2xs font-semibold text-[var(--fg)]"
          >
            {selectedUser.userName} <X size={11} />
          </button>
        ) : null}
      >
        <QueryStatus
          isLoading={sessions.isLoading}
          isError={sessions.isError}
          isEmpty={(sessions.data?.items.length ?? 0) === 0}
          onRetry={() => sessions.refetch()}
          emptyIcon={LogIn}
          emptyTitle="Bu dönemde oturum yok"
          emptyDescription="Seçili aralıkta kimse giriş yapmamış. Aralığı genişletmeyi deneyin."
        >
          <SessionsList sessions={sessions.data?.items ?? []} />
          <Pager page={page} pageSize={PAGE_SIZE} totalCount={sessions.data?.totalCount ?? 0} onChange={setPage} />
        </QueryStatus>
      </Panel>
    </div>
  );
}
