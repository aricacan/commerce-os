'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { productCostApi } from '../../lib/api/product-cost';
import { actionQueueApi, type ActionQueueItem } from '@/lib/api/orderStatuses';
import { useI18n } from '../../lib/i18n';
import { ExportMenu } from '../ui/ExportMenu';

interface AlertItem {
  id: string;
  node: ReactNode;
}

// ── Uyarı 1: Alış fiyatı (maliyet) eksik ürünler ──────────────────────────────
function useMissingCostAlert(): AlertItem | null {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['product-cost-missing-banner'],
    queryFn: () => productCostApi.list({ page: 1, pageSize: 1 }),
    staleTime: 5 * 60_000,
  });

  if (dismissed || isLoading || !data || data.overallTotal === 0) return null;

  const filled = data.overallFilled ?? 0;
  const total = data.overallTotal ?? 0;
  const missing = total - filled;
  if (missing / total < 0.2) return null;

  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  const node = (
    <div className="flex flex-col gap-1.5 rounded-[5px] border border-border-soft bg-card p-2.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-bold text-fg">{t('dashboard_missing_cost_title')}</span>
        <button
          onClick={() => setDismissed(true)}
          aria-label={t('dashboard_missing_cost_hide')}
          className="flex shrink-0 border-0 bg-transparent p-0.5 text-fg-subtle hover:text-fg cursor-pointer"
        >
          <X size={12} />
        </button>
      </div>
      <p className="m-0 text-[10px] leading-relaxed text-fg-muted">{t('dashboard_missing_cost_desc')}</p>
      <div className="h-[4px] overflow-hidden rounded-full bg-border-soft">
        <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-accent" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9.5px] font-medium text-fg-muted">
          {t('dashboard_missing_cost_progress').replace('{{filled}}', String(filled)).replace('{{total}}', String(total))}
        </span>
        <Link href="/product-costs?onlyMissing=true" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10.5px] font-bold text-accent no-underline hover:underline">
          {t('dashboard_missing_cost_go')} <ArrowRight size={10} />
        </Link>
      </div>
    </div>
  );

  return { id: 'missing-cost', node };
}

// ── Uyarı 2: Operasyonel Aksiyon Kuyruğu (Yapılacaklar / Uyarılar) ─────────────
function useActionQueueAlerts(): AlertItem[] {
  const { data } = useQuery<ActionQueueItem[]>({
    queryKey: ['action-queue-alerts'],
    queryFn: () => actionQueueApi.get(),
    staleTime: 60_000,
  });

  if (!data) return [];
  const pending = data.filter((item) => item.count > 0);

  return pending.map((item) => ({
    id: `action-${item.key}`,
    node: (
      <Link
        key={item.key}
        href={item.href}
        className="flex items-center justify-between gap-2.5 rounded-[4px] border border-border-soft bg-card px-3 py-2 text-ui-xs text-fg transition hover:bg-bg-subtle hover:border-border no-underline shadow-xs"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
          <span className="font-semibold text-fg">{item.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-[3px] bg-warning-soft text-warning px-1.5 py-0.5 text-[10.5px] font-mono font-bold">
            {item.count}
          </span>
          <ArrowRight size={11} className="text-fg-muted" />
        </div>
      </Link>
    ),
  }));
}

export function DashboardAlerts() {
  const { t, lang } = useI18n();
  const missingCost = useMissingCostAlert();
  const actionQueueItems = useActionQueueAlerts();

  const alerts: AlertItem[] = [
    ...(missingCost ? [missingCost] : []),
    ...actionQueueItems,
  ];

  return (
    <div className="widget-card-static" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div className="widget-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3>{t('dashboard_alerts_title')}</h3>
          <p>{t('dashboard_alerts_desc')}</p>
        </div>
        <ExportMenu
          filename="panel-uyarilari"
          getData={() => alerts.length > 0 ? [{
            'Uyarı Tipi': 'Operasyonel Uyarılar',
            'Durum': 'Kritik',
            'Açıklama': 'İnceleme bekleyen operasyonel maddeler mevcut.',
            'Tarih': new Date().toLocaleDateString('tr-TR'),
          }] : [{
            'Uyarı Tipi': 'Tüm Sistemler Normal',
            'Durum': 'OK',
            'Açıklama': 'Aktif bekleyen kritik uyarı bulunmuyor.',
            'Tarih': new Date().toLocaleDateString('tr-TR'),
          }]}
          label={lang === 'tr' ? 'Dışa Aktar' : 'Export'}
        />
      </div>

      {alerts.length === 0 ? (
        <div className="flex min-h-[100px] flex-1 flex-col items-center justify-center gap-1.5 text-center text-[11px] text-fg-muted">
          <CheckCircle2 size={18} className="text-success" />
          <span>{t('dashboard_alerts_empty')}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">
          {alerts.map((a) => (
            <div key={a.id}>{a.node}</div>
          ))}
        </div>
      )}
    </div>
  );
}
