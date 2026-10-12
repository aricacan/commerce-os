'use client';

import { useState } from 'react';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { usePageUsage } from '../../../hooks/monitoring/useMonitoringUsers';
import { useSyntheticOverview } from '../../../hooks/monitoring/useSyntheticChecks';
import {
  botStatusByPage, buildPageHealth, countByStatus, groupPageHealth,
  type PageBotStatus, type PageHealth, type PageHealthStatus,
} from '../page-health';
import { NAV_PAGES } from '../page-map';
import { DaysSelector, Panel, Pill, QueryStatus, type PillTone } from '../ui';

const DAY_OPTIONS = [
  { value: 1, label: '24 saat' },
  { value: 7, label: '7 gün' },
];

const STATUS: Record<PageHealthStatus, { tone: PillTone; label: string }> = {
  error: { tone: 'danger', label: 'Hata var' },
  ok: { tone: 'success', label: 'Sorunsuz' },
  idle: { tone: 'muted', label: 'Açılmadı' },
};

// Kimsenin açmadığı sayfada botun son gördüğü — "açılmadı" yerine gerçek bir cevap.
const BOT_STATUS: Record<PageBotStatus, { tone: PillTone; label: string }> = {
  working: { tone: 'success', label: 'Bot: çalışıyor' },
  broken: { tone: 'danger', label: 'Bot: bozuk' },
};

interface Props {
  /** Hatalı sayfaya tıklanınca Hatalar sekmesine geçmek için. */
  onShowErrors: () => void;
  /** Sentetik bot sonuçları — yalnız platform işletmecisi (uç diğerlerine 403). */
  showBotStatus: boolean;
}

// "Sol paneldeki her sayfa çalışıyor mu?" Her sayfa listelenir — kimsenin açmadığı da,
// çünkü "açılmadı" ile "sorunsuz" farklı cevaplardır.
export function PagesTab({ onShowErrors, showBotStatus }: Props) {
  const { t } = useI18n();
  const [days, setDays] = useState(1);
  const usage = usePageUsage(days);
  const synthetic = useSyntheticOverview(showBotStatus);

  const health = buildPageHealth(usage.data ?? [], NAV_PAGES, botStatusByPage(synthetic.data?.checks ?? []));
  const counts = countByStatus(health);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sayaçlar veri gelmeden gösterilmez: boş veriyle "hepsi açılmadı" yanlış bir cevap olurdu. */}
        {usage.data ? (
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="danger">{counts.error} sorunlu</Pill>
            <Pill tone="success">{counts.ok} sorunsuz</Pill>
            <Pill tone="muted">{counts.idle} açılmadı</Pill>
          </div>
        ) : <span />}
        <DaysSelector value={days} onChange={setDays} options={DAY_OPTIONS} />
      </div>

      <QueryStatus
        isLoading={usage.isLoading}
        isError={usage.isError}
        isEmpty={health.length === 0}
        onRetry={() => usage.refetch()}
        emptyIcon={LayoutGrid}
        emptyTitle="Sol panelde sayfa yok"
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groupPageHealth(health).map((group) => (
            <Panel key={group.groupKey ?? 'root'} title={group.groupKey ? t(group.groupKey) : 'Genel'}>
              <ul className="divide-y divide-[var(--border-soft)]">
                {group.pages.map((item) => (
                  <PageRow key={item.page.href} item={item} onShowErrors={onShowErrors} />
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </QueryStatus>
    </div>
  );
}

function PageRow({ item, onShowErrors }: { item: PageHealth; onShowErrors: () => void }) {
  const { t } = useI18n();
  const status = item.botStatus ? BOT_STATUS[item.botStatus] : STATUS[item.status];
  const detail = item.status === 'error'
    ? `${item.clientErrors} ön yüz hatası · ${item.views} açılma`
    : item.status === 'ok' ? `${item.views} açılma` : item.page.href;

  const content = (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-semibold text-[var(--fg)]">{t(item.page.labelKey)}</span>
        <span className="truncate text-ui-2xs text-[var(--fg-muted)]">{detail}</span>
      </div>
      <Pill tone={status.tone}>{status.label}</Pill>
    </>
  );

  if (item.status !== 'error') {
    return <li className="flex items-center gap-3 px-4 py-2">{content}</li>;
  }

  return (
    <li>
      <button
        type="button"
        onClick={onShowErrors}
        title="Hatalar sekmesinde göster"
        className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-[var(--bg-subtle)]"
      >
        {content}
        <ChevronRight size={13} className="shrink-0 text-[var(--fg-muted)]" />
      </button>
    </li>
  );
}
