'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ExternalLink, Pencil, Trash2, Plug, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { siteHubApi, type SiteDetailDto } from '../../lib/api/sitehub';
import {
  ErrorState, StatusDot, StatusBadge, TypeBadge, formatDateTime,
} from './shared';
import { shortDateLabel } from './charts';
import { SiteFormDialog } from './SiteFormDialog';
import { RequestDetailPanel } from './RequestDetailPanel';
import { useFeedback } from '../shared/Feedback';
import { FilterSelect } from '../../components/ui/FilterSelect';

const CHART_HEIGHT = 220;
const DAY_OPTIONS = [
  { value: '7', label: 'Son 7 Gün' },
  { value: '30', label: 'Son 30 Gün' },
  { value: '90', label: 'Son 90 Gün' },
];

const TOOLTIP_STYLE = {
  borderRadius: 4,
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: 11,
  color: 'var(--fg)',
};
const AXIS_TICK = { fontSize: 10.5, fill: 'var(--fg-muted)' };

interface Props {
  siteId: number;
  onBack: () => void;
  onChanged: () => void;
}

export function SiteDetailPanel({ siteId, onBack, onChanged }: Props) {
  const [days, setDays] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const { notify, confirm } = useFeedback();

  const { data: detail, isLoading: loading, error: queryError, refetch } = useQuery<SiteDetailDto>({
    queryKey: ['sitehub', 'site-detail', siteId, days],
    queryFn: () => siteHubApi.getSiteDetail(siteId, days),
  });
  const error = queryError instanceof Error ? queryError.message : null;
  const site = detail?.site;

  const handleProbe = async () => {
    if (!site) return;
    setBusy(true);
    try {
      const result = await siteHubApi.probeSite(site.id);
      if (result.success) notify.success(`Bağlantı çalışıyor. ${result.pendingCount ?? 0} bekleyen talep.`);
      else notify.error(result.error ?? 'Bağlantı kurulamadı.');
      await refetch();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Bağlantı test edilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    if (!site) return;
    setBusy(true);
    try {
      const run = await siteHubApi.syncSite(site.id);
      if (run.success) notify.success(`${run.importedCount} yeni talep alındı.`);
      else notify.error(run.error ?? 'Senkron başarısız.');
      await refetch();
      onChanged();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Senkron çalıştırılamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!site) return;
    const ok = await confirm({
      title: `"${site.displayName}" bağlantısı silinsin mi?`,
      body: 'Bu siteden yeni talep alınmaz ve API anahtarı kalıcı olarak silinir.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    try {
      await siteHubApi.deleteSite(site.id);
      notify.success('Bağlantı silindi.');
      onChanged();
      onBack();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Bağlantı silinemedi.');
    }
  };

  return (
    <div className="w-full flex-1 flex min-h-0 text-xs">
      <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Sitelere Dön</span>
        </button>

        {error && <ErrorState text={error} />}
        {loading && !detail && <div className="py-8 text-center text-xs text-[var(--fg-muted)]">Site detayları yükleniyor...</div>}

        {detail && site && (
          <>
            {/* Site Header Row */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-soft)] pb-3">
              <div>
                <h2 className="text-base font-bold text-[var(--fg)]">{site.displayName}</h2>
                <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)] font-mono mt-0.5">
                  <span>{site.providerLabel}</span>
                  {site.websiteUrl && (
                    <a
                      href={site.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--fg)] hover:underline"
                    >
                      <ExternalLink size={11} />
                      <span>{site.websiteUrl.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  <StatusDot status={site.status} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleProbe()}
                  disabled={busy}
                  className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                >
                  <Plug size={12} />
                  <span>Test Et</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSync()}
                  disabled={busy}
                  className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                >
                  <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
                  <span>Senkronize Et</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="h-8 px-3 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer flex items-center gap-1"
                >
                  <Pencil size={12} />
                  <span>Düzenle</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="h-8 px-2.5 rounded-[4px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Sil"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Quick KPI Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Toplam Talep</span>
                <div className="font-mono text-lg font-bold text-[var(--fg)] mt-0.5">{detail.totalRequestCount}</div>
              </div>
              <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Teklif / Mesaj</span>
                <div className="font-mono text-lg font-bold text-[var(--fg)] mt-0.5">{detail.offerCount} / {detail.messageCount}</div>
              </div>
              <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Bekleyen Yeni</span>
                <div className="font-mono text-lg font-bold text-emerald-500 mt-0.5">{site.pendingRequestCount}</div>
              </div>
              <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Ack Bekleyen</span>
                <div className="font-mono text-lg font-bold text-[var(--fg)] mt-0.5">{detail.pendingAckCount}</div>
              </div>
            </div>

            {/* Traffic & Requests Chart */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-[var(--fg)]">Zaman İçinde Talep Dağılımı</h3>
                <div className="w-32">
                  <FilterSelect
                    value={String(days)}
                    onChange={(v) => setDays(Number(v))}
                    placeholder="Aralık"
                    height="h-7.5"
                    options={DAY_OPTIONS}
                  />
                </div>
              </div>

              <div style={{ height: CHART_HEIGHT }} className="w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detail.trafficPoints} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" />
                    <XAxis dataKey="date" tick={AXIS_TICK} tickFormatter={shortDateLabel} stroke="var(--border-soft)" />
                    <YAxis tick={AXIS_TICK} allowDecimals={false} stroke="var(--border-soft)" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="offers" name="Teklif" stroke="var(--fg)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="messages" name="Mesaj" stroke="var(--fg-muted)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Requests List */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col">
              <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-4 py-2.5 font-bold text-xs text-[var(--fg)]">
                Son Gelen Talepler
              </div>
              <div className="divide-y divide-[var(--border-soft)] max-h-80 overflow-y-auto">
                {detail.recentRequests.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--fg-muted)]">Bu sitede henüz talep bulunmuyor.</div>
                ) : (
                  detail.recentRequests.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRequestId(r.id)}
                      className="flex items-center justify-between p-3 px-4 hover:bg-[var(--bg-subtle)]/30 transition cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--fg)]">{r.name}</span>
                        <TypeBadge type={r.sourceType} />
                        <StatusBadge status={r.status} />
                      </div>
                      <span className="text-[10.5px] font-mono text-[var(--fg-muted)]">
                        {formatDateTime(r.receivedAt ?? r.importedAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Side Request Drawer */}
      {selectedRequestId !== null && (
        <RequestDetailPanel
          requestId={selectedRequestId}
          onClose={() => setSelectedRequestId(null)}
          onSaved={() => refetch()}
        />
      )}

      {editOpen && site && (
        <SiteFormDialog
          site={site}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await refetch();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
