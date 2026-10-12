'use client';

import type { OverviewPeriodParams } from '../../lib/api/omnichannel';
import { emailOutboundApi, OUTBOUND_EMAIL_STATUS } from '../../lib/api/omnichannel-email-outbound';
import { ChartCard } from './OverviewCards';
import { EMAIL_KIND_LABELS, emailSuccessPercent, toUtcRange } from './overviewWidgetRules';
import { SnapshotList, type SnapshotItem } from './SnapshotList';
import { formatRelativeTime } from './relativeTime';
import { useResource } from './useResource';

const FAILED_PREVIEW_COUNT = 3;

interface Props {
  period: OverviewPeriodParams;
  reloadKey: number;
}

// Sistemin gönderdiği e-postalar (devir, sipariş, bildirim, cevap): başarı oranı ve son hatalar. Yalnız yöneticiye gösterilir.
export function OverviewEmailWidget({ period, reloadKey }: Props) {
  const { from, to } = toUtcRange(period);
  const result = useResource(async () => {
    const [sent, failed] = await Promise.all([
      emailOutboundApi.list({ status: OUTBOUND_EMAIL_STATUS.Sent, from, to, page: 1, pageSize: 1 }),
      emailOutboundApi.list({ status: OUTBOUND_EMAIL_STATUS.Failed, from, to, page: 1, pageSize: FAILED_PREVIEW_COUNT }),
    ]);
    return { sent: sent.totalCount, failed: failed.totalCount, recentFailures: failed.items };
  }, `email-${from}-${to}-${reloadKey}`);

  const data = result.data;
  const percent = data ? emailSuccessPercent(data.sent, data.failed) : null;
  const failures: SnapshotItem[] = (data?.recentFailures ?? []).map((m) => ({
    id: m.id,
    title: `${EMAIL_KIND_LABELS[m.kind]}: ${m.subject}`,
    subtitle: m.errorSummary ?? m.toAddress,
    meta: formatRelativeTime(m.sentAtUtc),
    attention: true,
  }));

  return (
    <ChartCard
      title="Giden e-postalar" loading={result.loading && !data} error={result.error}
      caption={percent === null ? undefined : `Gönderimlerin %${percent}'i başarılı.`}
    >
      {data && <EmailBody sent={data.sent} failed={data.failed} failures={failures} />}
    </ChartCard>
  );
}

function EmailBody({ sent, failed, failures }: { sent: number; failed: number; failures: SnapshotItem[] }) {
  if (sent + failed === 0) {
    return <p className="m-0 py-6 text-center text-ui-sm text-fg-muted">Bu dönemde e-posta gönderilmedi.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <EmailCount label="Gönderildi" value={sent} />
        <EmailCount label="Başarısız" value={failed} warn={failed > 0} />
      </div>
      {failures.length > 0 && <SnapshotList items={failures} ariaLabel="Son başarısız e-postalar" emptyText="" />}
    </div>
  );
}

function EmailCount({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-bg-subtle p-2">
      <span className="text-[10.5px] font-semibold uppercase text-fg-muted">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${warn ? 'text-warning' : 'text-fg'}`}>{value}</span>
    </div>
  );
}
