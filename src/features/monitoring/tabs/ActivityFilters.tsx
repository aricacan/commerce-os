'use client';

import { Search } from 'lucide-react';
import type { UserActivitySummaryDto } from '../../../lib/api';
import { DaysSelector } from '../ui';

export interface ActivityFilterValues {
  domain: string;
  userId: number | null;
  search: string;
  days: number;
}

export const ACTIVITY_DAY_OPTIONS = [
  { value: 1, label: '24 saat' },
  { value: 7, label: '7 gün' },
  { value: 30, label: '30 gün' },
  { value: 90, label: '90 gün' },
];

const SELECT_CLASS =
  'h-8 min-w-0 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] outline-none';

interface Props {
  values: ActivityFilterValues;
  domains: string[];
  users: UserActivitySummaryDto[];
  onChange: (patch: Partial<ActivityFilterValues>) => void;
}

export function ActivityFilters({ values, domains, users, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input
          type="search"
          value={values.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Özet ya da hedefte ara (#123, SKU…)"
          aria-label="Aktivitede ara"
          className={`${SELECT_CLASS} w-full pl-8`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex">
        <select
          value={values.domain}
          onChange={(e) => onChange({ domain: e.target.value })}
          aria-label="Alan"
          className={SELECT_CLASS}
        >
          <option value="">Tüm alanlar</option>
          {domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
        </select>

        <select
          value={values.userId ?? ''}
          onChange={(e) => onChange({ userId: e.target.value ? Number(e.target.value) : null })}
          aria-label="Kişi"
          className={SELECT_CLASS}
        >
          <option value="">Tüm kişiler</option>
          {users.map((user) => <option key={user.userId} value={user.userId}>{user.userName}</option>)}
        </select>
      </div>

      <DaysSelector value={values.days} onChange={(days) => onChange({ days })} options={ACTIVITY_DAY_OPTIONS} />
    </div>
  );
}
