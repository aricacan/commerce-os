'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useI18n } from '../../../lib/i18n';
import { formatDateTime } from '../../../lib/format';
import { anomalyApi, notificationApi } from '../../../lib/api';
import type { AnomalyGroup } from '../../../types/api';
import { RefreshCw, Check } from 'lucide-react';
import { ExportMenu } from '../../../components/ui/ExportMenu';
import type { ExportColumn } from '../../../lib/export';
import { FilterSelect } from '../../../components/ui/FilterSelect';

const ANOMALY_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', header: 'Ad' },
  { key: 'status', header: 'Durum' },
  { key: 'currentCount', header: 'Bugünkü Sipariş', type: 'int' },
  { key: 'mean', header: 'Ortalama (μ)', type: 'decimal' },
  { key: 'stdDev', header: 'Std. Sapma (σ)', type: 'decimal' },
  { key: 'zScore', header: 'Z-Skoru', type: 'decimal' },
  { key: 'activeDays', header: 'Aktif Gün', type: 'int' },
];

const AnomalyTrendChart = dynamic(
  () => import('../../../components/analytics/AnomalyTrendChart').then((module) => module.AnomalyTrendChart),
  { ssr: false, loading: () => <div className="h-full w-full bg-[var(--bg-subtle)]" /> },
);

type GroupByOption = 'category' | 'platform' | 'product';

const GROUP_OPTIONS: { value: GroupByOption; labelTr: string; labelEn: string }[] = [
  { value: 'category', labelTr: 'Kategori', labelEn: 'Category' },
  { value: 'platform', labelTr: 'Platform', labelEn: 'Platform' },
  { value: 'product',  labelTr: 'Ürün',      labelEn: 'Product' },
];

const WINDOW_OPTIONS: { value: number; labelTr: string; labelEn: string }[] = [
  { value: 14, labelTr: '14 gün', labelEn: '14 days' },
  { value: 30, labelTr: '30 gün', labelEn: '30 days' },
  { value: 60, labelTr: '60 gün', labelEn: '60 days' },
  { value: 90, labelTr: '90 gün', labelEn: '90 days' },
  { value: 180, labelTr: '180 gün', labelEn: '180 days' },
];

function useSemanticHex() {
  const { resolvedTheme, theme } = useTheme();
  const dark = (resolvedTheme ?? theme) === 'dark';
  return {
    danger:  dark ? '#ef4444' : '#dc2626',
    warning: dark ? '#f59e0b' : '#d97706',
    success: dark ? '#22c55e' : '#16a34a',
  };
}

function statusToken(status: string): 'danger' | 'warning' | 'success' {
  if (status === 'critical') return 'danger';
  if (status === 'warning') return 'warning';
  return 'success';
}

const STATUS_TEXT_CLASS: Record<'danger' | 'warning' | 'success', string> = {
  danger: 'text-red-500',
  warning: 'text-amber-500',
  success: 'text-emerald-500',
};

export default function AnomalyContent() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const hex = useSemanticHex();

  const [groupBy, setGroupBy] = useState<GroupByOption>('category');
  const [windowDays, setWindowDays] = useState(60);
  const [selectedGroup, setSelectedGroup] = useState<AnomalyGroup | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState<{ text: string; error: boolean } | null>(null);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['anomaly-overview'],
    queryFn: anomalyApi.overview,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: analysis, isLoading: analysisLoading, refetch } = useQuery({
    queryKey: ['anomaly-analysis', groupBy, windowDays],
    queryFn: () => anomalyApi.analysis(groupBy, windowDays),
    staleTime: 30_000,
  });

  const { data: notifications } = useQuery({
    queryKey: ['anomaly-notifications'],
    queryFn: async () => {
      const all = await notificationApi.list();
      return all.filter((notification) => notification.type === 'Anomaly').slice(0, 20);
    },
    staleTime: 30_000,
  });

  const handleMarkRead = async (id: number) => {
    await notificationApi.markAsRead(id);
  };

  async function handleTrigger() {
    setTriggering(true);
    setTriggerMsg(null);
    try {
      await anomalyApi.trigger();
      setTriggerMsg({ text: tr ? 'Anomali tespiti tetiklendi' : 'Detection triggered', error: false });
      setTimeout(() => setTriggerMsg(null), 4000);
      refetch();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTriggerMsg({
        text: msg.includes('403')
          ? (tr ? 'Yetkiniz yok' : 'Not authorized')
          : (tr ? 'Tetiklenemedi, tekrar deneyin' : 'Could not trigger, try again'),
        error: true,
      });
      setTimeout(() => setTriggerMsg(null), 5000);
    } finally {
      setTriggering(false);
    }
  }

  const groups = analysis?.groups ?? [];
  const anomalyGroups = groups.filter((g) => g.status !== 'normal');
  const active = selectedGroup ?? anomalyGroups[0] ?? null;

  const healthScore = overview?.healthScore ?? 100;
  const healthHex = healthScore >= 80 ? hex.success : healthScore >= 50 ? hex.warning : hex.danger;
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - healthScore / 100);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-transparent p-4 md:p-5">
      
      {/* ── Üst Çubuk: Sağlık Puanı + İstatistikler + Filtreler ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
        <div data-tour="anomaly-kpis" className="flex flex-wrap items-center gap-1.5">
          {/* Sağlık Skoru */}
          <div className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3">
            <svg viewBox="0 0 96 96" width="16" height="16" className="shrink-0">
              <circle cx="48" cy="48" r="44" fill="none" stroke="var(--border-soft)" strokeWidth="10" />
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke={healthHex}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 48 48)"
                className="transition-[stroke-dashoffset] duration-1000 ease-out"
              />
            </svg>
            <span className="text-xs font-bold text-[var(--fg)]">{overviewLoading ? '—' : Math.round(healthScore)}</span>
            <span className="text-[10.5px] text-[var(--fg-muted)]">{tr ? 'Sağlık' : 'Health'}</span>
          </div>

          {/* İstatistik Rozetleri */}
          {[
            { label: tr ? 'Toplam Anomali' : 'Total Anomalies', value: overviewLoading ? '—' : overview?.totalAnomalies ?? 0 },
            { label: tr ? 'Kritik' : 'Critical', value: overviewLoading ? '—' : overview?.criticalCount ?? 0 },
            { label: tr ? 'Okunmamış' : 'Unread', value: overviewLoading ? '—' : overview?.unreadCount ?? 0 },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3"
            >
              <span className="text-xs font-bold text-[var(--fg)]">{value}</span>
              <span className="text-[10.5px] text-[var(--fg-muted)]">{label}</span>
            </div>
          ))}
        </div>

        {/* Filtreler & Tetikle Butonu */}
        <div data-tour="anomaly-filters" className="flex flex-wrap items-center gap-2">
          <FilterSelect
            value={groupBy}
            options={GROUP_OPTIONS.map((opt) => ({ value: opt.value, label: tr ? opt.labelTr : opt.labelEn }))}
            placeholder={tr ? 'Grupla' : 'Group By'}
            onChange={(val) => { setGroupBy((val || 'category') as GroupByOption); setSelectedGroup(null); }}
            minWidth={120}
          />

          <FilterSelect
            value={String(windowDays)}
            options={WINDOW_OPTIONS.map((opt) => ({ value: String(opt.value), label: tr ? opt.labelTr : opt.labelEn }))}
            placeholder={tr ? 'Pencere' : 'Window'}
            onChange={(val) => { setWindowDays(Number(val || '30')); setSelectedGroup(null); }}
            minWidth={110}
          />

          <button
            type="button"
            onClick={handleTrigger}
            disabled={analysisLoading || triggering}
            title={tr ? 'Z-skor algoritmasıyla sipariş hacimlerindeki anlık dalgalanmaları izler' : 'Monitors real-time order volume fluctuations using the Z-score algorithm'}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--card)] transition hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={12} className={(analysisLoading || triggering) ? 'animate-spin' : ''} />
            <span>{triggering ? (tr ? 'Hesaplanıyor...' : 'Computing...') : (tr ? 'Hesapla' : 'Calculate')}</span>
          </button>

          {triggerMsg && (
            <span className={`text-[11px] font-semibold ${triggerMsg.error ? 'text-red-500' : 'text-emerald-500'}`}>
              {triggerMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* ── Ana İçerik: Sıralama + Trend Grafiği ── */}
      <div className="grid min-h-[380px] grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
        
        {/* Sol: Z-Skor Sıralaması */}
        <div data-tour="anomaly-ranking" className="flex flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3.5 py-2.5">
            <span className="text-xs font-bold text-[var(--fg)]">
              {tr ? 'Anomali Sıralaması' : 'Anomaly Ranking'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--fg-muted)]">
                {anomalyGroups.length} {tr ? 'anomali' : 'anomalies'}
              </span>
              <ExportMenu
                filename="anomali-fiyat-stok"
                columns={ANOMALY_EXPORT_COLUMNS}
                getData={() => anomalyGroups.map((g) => ({
                  name: g.name,
                  status: g.status,
                  currentCount: g.currentCount,
                  mean: g.mean,
                  stdDev: g.stdDev,
                  zScore: g.zScore,
                  activeDays: g.activeDays,
                }))}
              />
            </div>
          </div>

          {analysisLoading ? (
            <div className="flex flex-1 items-center justify-center p-12 text-xs text-[var(--fg-muted)]">
              <RefreshCw size={16} className="animate-spin text-[var(--fg)]" />
            </div>
          ) : anomalyGroups.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-12 text-xs text-[var(--fg-muted)]">
              {tr ? 'Anomali tespit edilmedi' : 'No anomalies detected'}
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto">
              {anomalyGroups.map((group) => {
                const isActive = active?.name === group.name;
                const tone = STATUS_TEXT_CLASS[statusToken(group.status)];
                return (
                  <div
                    key={group.name}
                    className={`flex cursor-pointer items-center justify-between gap-3 border-b border-[var(--border-soft)] px-3.5 py-2.5 transition last:border-b-0 ${
                      isActive ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-subtle)]/50'
                    }`}
                    onClick={() => setSelectedGroup(group)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="truncate text-xs font-bold text-[var(--fg)] block">{group.name}</span>
                      <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
                        {tr ? 'Bugün' : 'Today'}: {group.currentCount} · μ: {group.mean} · σ: {group.stdDev}
                        {' · '}{group.activeDays}/{analysis?.windowDays ?? windowDays} {tr ? 'gün aktif' : 'active days'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${tone}`}>
                        {group.zScore > 0 ? '+' : ''}{group.zScore.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-bold ${tone}`}>
                        {group.status === 'critical' ? (tr ? 'Kritik' : 'Critical') : group.status === 'warning' ? (tr ? 'Uyarı' : 'Warning') : (tr ? 'Normal' : 'Normal')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sağ: Trend Grafiği */}
        <div data-tour="anomaly-chart" className="flex flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
          {active ? (
            <>
              <div className="flex items-start justify-between border-b border-[var(--border-soft)] px-3.5 py-2.5">
                <div>
                  <span className="text-xs font-bold text-[var(--fg)]">{active.name}</span>
                  <p className="mt-0.5 text-[10.5px] text-[var(--fg-muted)]">
                    {tr ? '24 Saatlik Sipariş Trendi' : '24-Hour Order Trend'}
                  </p>
                </div>
                <span className={`font-mono text-xs font-bold ${STATUS_TEXT_CLASS[statusToken(active.status)]}`}>
                  Z: {active.zScore > 0 ? '+' : ''}{active.zScore.toFixed(2)}
                </span>
              </div>
              <div className="h-80 p-3">
                <AnomalyTrendChart group={active} color={hex[statusToken(active.status)]} orderLabel={tr ? 'Sipariş' : 'Orders'} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-12 text-xs text-[var(--fg-muted)]">
              {tr ? 'Analiz için bir öğe seçin' : 'Select an item to analyze'}
            </div>
          )}
        </div>
      </div>

      {/* ── Son Anomali Olayları ── */}
      <div className="flex flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        <div className="border-b border-[var(--border-soft)] px-3.5 py-2.5">
          <span className="text-xs font-bold text-[var(--fg)]">
            {tr ? 'Son Anomali Olayları' : 'Recent Anomaly Events'}
          </span>
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
              {tr ? 'Henüz anomali kaydı yok' : 'No anomaly records yet'}
            </div>
          ) : (
            notifications.map((n) => {
              const tone = n.severity === 'Critical' ? 'text-red-500' : 'text-amber-500';
              return (
                <div key={n.id} className="flex border-b border-[var(--border-soft)] px-3.5 py-2.5 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-[var(--fg)]">{n.title}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`text-[10px] font-bold ${tone}`}>{n.severity}</span>
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(n.id)}
                            title={tr ? 'Okundu işaretle' : 'Mark as read'}
                            className="flex h-5 w-5 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                          >
                            <Check size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">{n.body}</p>
                    <span className="mt-1 block font-mono text-[10px] text-[var(--fg-subtle)]">
                      {formatDateTime(n.createdAt, tr ? 'tr' : 'en')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
