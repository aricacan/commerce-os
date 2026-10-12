'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Activity, Wrench, Users2, AlertTriangle } from 'lucide-react';
import { partnerHubApi, PARTNERHUB_ACTIVITY_MAX_DAYS } from '../../lib/api/partnerhub';
import { queryKeys } from '../../lib/query-keys';
import { describeError } from '../../lib/errors';
import { useDateRange } from '../adshub/useDateRange';
import { DateRangeBar } from '../adshub/DateRangeBar';

// "Aktivite" sekmesi — TÜM partner client'ların MCP tool kullanımı (bkz.
// PartnerHubActivityDto, iç ekip için, kiracıya göre kısıtlanmadan). AdsHub'ın
// tarih aralığı seçici + AreaChart deseniyle AYNI (bkz. OverviewTab.tsx orada)
// — ikinci bir versiyon icat etmek yerine aynı küçük bileşenler tekrar kullanıldı.
//
// Günler UTC takvim günüdür (backend öyle gruplar) ve kayıtlar 90 gün saklanır: daha eski
// ya da daha geniş bir aralık backend'de açık bir mesajla reddedilir.

const RANKED_LIST_LIMIT = 8;

function formatCount(value: number): string {
  return value.toLocaleString('tr-TR');
}

interface RankedRow {
  /** Satırın benzersiz anahtarı — iki client aynı görünen adı taşıyabilir. */
  key: string;
  label: string;
  count: number;
}

function RankedList({ rows, emptyText }: { rows: RankedRow[]; emptyText: string }) {
  if (rows.length === 0) {
    return <div className="text-xs text-[var(--fg-muted)] py-4">{emptyText}</div>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="font-semibold text-[var(--fg)] truncate">{row.label}</span>
            <span className="font-mono font-bold text-[var(--fg)]">{formatCount(row.count)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--fg)] opacity-70"
              style={{ width: `${Math.max((row.count / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTab() {
  const range = useDateRange(30);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.system.partnerHubActivity(range.from, range.to),
    queryFn: ({ signal }) => partnerHubApi.getActivity(range.from, range.to, signal),
    staleTime: 30_000,
  });

  const toolRows = (data?.callsByTool ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, RANKED_LIST_LIMIT)
    .map((t) => ({ key: t.toolName, label: t.toolName, count: t.count }));

  const clientRows = (data?.callsByClient ?? [])
    .slice()
    .sort((a, b) => b.count - a.count)
    .slice(0, RANKED_LIST_LIMIT)
    .map((c) => ({ key: c.clientId, label: c.displayName, count: c.count }));

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeBar range={range} />
        <span className="text-[11px] text-[var(--fg-muted)]">
          Günler UTC saatine göre · kayıtlar {PARTNERHUB_ACTIVITY_MAX_DAYS} gün saklanır
        </span>
      </div>

      {isError && (
        <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 text-xs text-[var(--fg-muted)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
          <span>Aktivite verisi yüklenemedi: {describeError(error)}</span>
        </div>
      )}

      {!isError && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[160px] rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[var(--fg-muted)]">
                <span>Toplam Çağrı</span>
                <Activity size={14} className="text-[var(--fg-muted)] opacity-70" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-bold font-mono text-[var(--fg)] tracking-tight">
                {isLoading ? '…' : formatCount(data?.totalCalls ?? 0)}
              </div>
            </div>
          </div>

          {/* Günlük Trend */}
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--fg)]">Günlük Tool Çağrı Trendi</span>
              <span className="text-[11px] text-[var(--fg-muted)]">Seçili aralıkta günlük dağılım</span>
            </div>
            <div className="w-full h-56">
              {(data?.callsByDay ?? []).length === 0 && !isLoading ? (
                <div className="flex h-full items-center justify-center text-xs text-[var(--fg-muted)]">
                  Bu aralıkta MCP çağrısı bulunamadı.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.callsByDay ?? []} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="partnerHubCallsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--fg)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--fg)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 10.5, fill: 'var(--fg-muted)' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value) => [formatCount(Number(value)), 'Çağrı']}
                      labelStyle={{ color: 'var(--fg)', fontWeight: 700, fontSize: 11.5 }}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: 4,
                        fontSize: 12,
                        color: 'var(--fg)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--fg)"
                      strokeWidth={2}
                      fill="url(#partnerHubCallsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* En Çok Kullanılan Tool'lar / Client'lar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Wrench size={14} className="text-[var(--fg-muted)]" />
                <span className="text-xs font-bold text-[var(--fg)]">En Çok Kullanılan Tool&apos;lar</span>
              </div>
              <RankedList rows={toolRows} emptyText="Bu aralıkta tool çağrısı bulunamadı." />
            </div>

            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Users2 size={14} className="text-[var(--fg-muted)]" />
                <span className="text-xs font-bold text-[var(--fg)]">En Aktif Client&apos;lar</span>
              </div>
              <RankedList rows={clientRows} emptyText="Bu aralıkta client aktivitesi bulunamadı." />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
