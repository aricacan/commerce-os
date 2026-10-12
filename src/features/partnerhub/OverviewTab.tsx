'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Activity, HelpCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { partnerHubApi } from '../../lib/api/partnerhub';
import { queryKeys } from '../../lib/query-keys';
import { describeError } from '../../lib/errors';
import { useI18n } from '../../lib/i18n';
import { localDateStr } from '../../utils/date';
import { PARTNER_TOOLS } from './tools';

// "Genel Bakış" sekmesi — iki KPI + yardıma giden yol + açık araçların tablosu.
//
// Modülün NE OLDUĞUNU anlatan uzun metin buradan taşındı: artık sol panelin
// dibindeki "Amaç & Yardım" düğmesinin açtığı rehberde (PartnerHubHelpOverlay).
// O metni ilk açılışta bir kez okursunuz ama her açılışta ekranın yarısını
// kaplıyor ve asıl bilgiyi (kaç client aktif, kaç çağrı geldi) aşağı itiyordu.
//
// Araç tablosu ise BİLEREK iki yerde: günlük başvuru için burada, kurulum
// bağlamı içinde rehberde. Listenin kendisi tek kaynakta (bkz. ./tools.ts).

const ACTIVITY_WINDOW_DAYS = 30;

interface KpiTileProps {
  label: string;
  value: string;
  icon: typeof Users;
  /** Değer alınamadıysa sonsuz "…" yerine okunur hata gösterilir. */
  error?: string;
}

function KpiTile({ label, value, icon: Icon, error }: KpiTileProps) {
  return (
    <div className="flex min-w-[160px] flex-1 flex-col justify-between rounded-[4px] border border-border-soft bg-card p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-fg-muted">
        <span>{label}</span>
        <Icon size={14} className="text-fg-muted opacity-70" />
      </div>
      {error ? (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-warning">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="mt-2 font-mono text-lg font-bold tracking-tight text-fg sm:text-xl">{value}</div>
      )}
    </div>
  );
}

const LOADING_VALUE = '…';

interface OverviewTabProps {
  onOpenHelp: () => void;
  // Aktivite (kiracının MCP çağrıları) yalnızca SuperAdmin'e açık — backend diğer
  // rollere 403 döner, bu yüzden sorgu hiç atılmaz ve KPI "—" gösterir.
  canViewActivity: boolean;
}

export function OverviewTab({ onOpenHelp, canViewActivity }: OverviewTabProps) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';

  const clientsQuery = useQuery({
    queryKey: queryKeys.system.partnerHubClients,
    queryFn: ({ signal }) => partnerHubApi.list(signal),
    staleTime: 30_000,
  });

  const to = localDateStr(new Date());
  const from = (() => {
    const d = new Date();
    d.setDate(d.getDate() - (ACTIVITY_WINDOW_DAYS - 1));
    return localDateStr(d);
  })();

  const activityQuery = useQuery({
    queryKey: queryKeys.system.partnerHubActivity(from, to),
    queryFn: ({ signal }) => partnerHubApi.getActivity(from, to, signal),
    staleTime: 30_000,
    enabled: canViewActivity,
  });

  const activeClientLabel = clientsQuery.data
    ? String(clientsQuery.data.filter((c) => c.isEnabled).length)
    : LOADING_VALUE;
  const callsLabel = !canViewActivity
    ? '—'
    : activityQuery.data
      ? activityQuery.data.totalCalls.toLocaleString('tr-TR')
      : LOADING_VALUE;

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      {/* ── KPI Şeridi ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <KpiTile
          label={isTr ? 'Aktif Client' : 'Active Clients'}
          value={activeClientLabel}
          icon={Users}
          error={clientsQuery.isError ? describeError(clientsQuery.error) : undefined}
        />
        <KpiTile
          label={isTr ? `Son ${ACTIVITY_WINDOW_DAYS} Gün Çağrı` : `Calls (Last ${ACTIVITY_WINDOW_DAYS}d)`}
          value={callsLabel}
          icon={Activity}
          error={activityQuery.isError ? describeError(activityQuery.error) : undefined}
        />
      </div>

      {/* ── Tek cümlelik tanım + rehbere giden yol ───────────────────────── */}
      <button
        type="button"
        onClick={onOpenHelp}
        className="flex cursor-pointer items-center gap-3 rounded-[4px] border border-border-soft bg-card p-4 text-left shadow-xs transition-colors hover:border-border hover:bg-card-hover"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-fg-muted">
          <HelpCircle size={17} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-bold text-fg">
            {isTr ? 'PartnerHub ne işe yarar?' : 'What is PartnerHub for?'}
          </span>
          <span className="text-[11.5px] leading-relaxed text-fg-muted">
            {isTr
              ? 'Dış geliştirici partnerlerin ERP verisine salt-okunur eriştiği entegrasyon katmanı. Amacını, kullanım adımlarını ve açık araçların tam listesini rehberde okuyun.'
              : 'The integration layer that gives external partners read-only access to ERP data. Read the guide for its purpose, the setup steps and the full tool list.'}
          </span>
        </span>
        <ArrowRight size={15} className="ml-auto shrink-0 text-fg-subtle" />
      </button>

      {/* ── Kullanılabilir Araçlar ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[4px] border border-border-soft bg-card shadow-xs">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border-soft px-4 py-2.5">
          <span className="text-xs font-bold text-fg">
            {isTr ? 'Kullanılabilir Araçlar (MCP Tools)' : 'Available Tools (MCP)'}
          </span>
          <span className="text-[11px] text-fg-muted">
            {isTr
              ? 'Partnerlere açık olan araçların tamamı — hepsi salt-okunur.'
              : 'Every tool exposed to partners — all read-only.'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-soft bg-bg-subtle text-[10.5px] font-semibold uppercase tracking-wider text-fg-muted">
                <th className="min-w-[220px] px-3.5 py-2">Tool</th>
                <th className="px-3.5 py-2">{isTr ? 'Ne Döner' : 'Returns'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {PARTNER_TOOLS.map((tool) => (
                <tr key={tool.field}>
                  <td className="px-3.5 py-2 font-mono text-[11px] text-fg">{tool.field}</td>
                  <td className="px-3.5 py-2 text-[11.5px] text-fg-muted">{tool.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
