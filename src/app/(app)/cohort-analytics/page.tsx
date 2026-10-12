'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { cohortApi } from '../../../lib/api';
import type { CohortAnalyticsResponse, CohortMatrixRow, CohortCell } from '../../../types/api';
import { ExportMenu, type ExportRow } from '../../../components/ui/ExportMenu';
import { useMobile } from '../../../hooks/useMobile';
import { useI18n } from '../../../lib/i18n';

// ── Monokrom Isı Paleti (Yoğunluk = Tutunma Oranı) ───────────────────────────

function heatColor(rate: number): { bg: string; text: string } {
  if (rate <= 0) return { bg: 'var(--bg-subtle)', text: 'var(--fg-muted)' };
  if (rate >= 80) return { bg: 'rgb(51, 65, 85)', text: '#ffffff' };
  if (rate >= 60) return { bg: 'rgb(71, 85, 105)', text: '#ffffff' };
  if (rate >= 40) return { bg: 'rgb(100, 116, 139)', text: '#ffffff' };
  if (rate >= 20) return { bg: 'rgba(148, 163, 184, 0.4)', text: 'var(--fg)' };
  return { bg: 'rgba(148, 163, 184, 0.16)', text: 'var(--fg-muted)' };
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR').format(n);
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
}

const CohortRetentionChart = dynamic(
  () => import('../../../components/analytics/CohortRetentionChart').then((module) => module.CohortRetentionChart),
  { ssr: false, loading: () => <div className="h-[380px] rounded-[4px] bg-[var(--bg-subtle)]" /> },
);

// ── Heat Cell ─────────────────────────────────────────────────────────────────

function HeatCell({ cell, isFirst, cohortSize }: { cell: CohortCell; isFirst: boolean; cohortSize: number }) {
  const { t, lang } = useI18n();
  const [show, setShow] = useState(false);
  const rate = isFirst ? 100 : cell.retentionRate;
  const { bg, text } = heatColor(rate);
  const aov = cell.orderCount > 0 ? cell.totalRevenue / cell.orderCount : 0;
  const rpc = cell.customerCount > 0 ? cell.totalRevenue / cell.customerCount : 0;

  return (
    <td
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ background: bg }}
      className="relative min-w-[76px] cursor-pointer border border-[var(--border-soft)] p-2 text-center transition"
    >
      <div className="font-mono text-xs font-bold" style={{ color: text }}>
        {isFirst ? '100%' : `${rate.toFixed(1)}%`}
      </div>
      <div className="mt-0.5 font-mono text-[9.5px] font-semibold opacity-80" style={{ color: text }}>
        {fmt(cell.customerCount)}
      </div>

      {show && (
        <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[80] min-w-[210px] -translate-x-1/2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-3 text-left text-xs shadow-xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between border-b border-[var(--border-soft)] pb-1.5 font-mono text-xs font-bold text-[var(--fg)]">
            <span>
              {isFirst
                ? t('cohort_month_zero_label')
                : (lang === 'tr' ? `+${cell.monthOffset}. Ay` : `Month +${cell.monthOffset}`)}
            </span>
            <span>{rate.toFixed(1)}%</span>
          </div>
          <div className="flex flex-col gap-1 text-[11px]">
            {[
              [t('cohort_active_customers'), `${fmt(cell.customerCount)} / ${fmt(cohortSize)}`],
              [t('kpi_orders'), fmt(cell.orderCount)],
              [t('kpi_revenue'), fmtMoney(cell.totalRevenue)],
              [t('cohort_aov_label'), fmtMoney(aov)],
              [t('cohort_revenue_per_customer'), fmtMoney(rpc)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2">
                <span className="text-[var(--fg-muted)]">{label}:</span>
                <span className="font-mono font-bold text-[var(--fg)]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </td>
  );
}

// ── Curve Data ────────────────────────────────────────────────────────────────

function buildCurveData(matrix: CohortMatrixRow[], maxOffset: number, lang: 'tr' | 'en') {
  return Array.from({ length: maxOffset + 1 }, (_, offset) => {
    const point: Record<string, number | string> = {
      offset: lang === 'tr' ? `Ay ${offset}` : `Month ${offset}`,
    };
    matrix.forEach((row) => {
      const cell = row.cells.find((c) => c.monthOffset === offset);
      point[row.cohortMonth] = cell ? parseFloat(cell.retentionRate.toFixed(1)) : 0;
    });
    return point;
  });
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────

export default function CohortAnalyticsPage() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const yr = new Date().getFullYear();
  const [from, setFrom] = useState(`${yr - 1}-01`);
  const [to, setTo] = useState(`${yr}-12`);
  const [applied, setApplied] = useState({ from: `${yr - 1}-01`, to: `${yr}-12` });
  const [tab, setTab] = useState<'matrix' | 'curves'>('matrix');
  const [showInfo, setShowInfo] = useState(false);

  const { data, isLoading, isError, error } = useQuery<CohortAnalyticsResponse>({
    queryKey: ['cohort-analytics', applied.from, applied.to],
    queryFn: () => cohortApi.get({ from: applied.from, to: applied.to }),
    staleTime: 5 * 60 * 1000,
  });

  const matrix = useMemo(() => data?.matrix ?? [], [data?.matrix]);
  const maxOffset = data?.maxMonthOffset ?? 0;
  const allOffsets = useMemo(() => Array.from({ length: maxOffset + 1 }, (_, i) => i), [maxOffset]);
  const curveData = useMemo(() => buildCurveData(matrix, maxOffset, lang), [matrix, maxOffset, lang]);

  const totalFirstBuyers = matrix.reduce((s, r) => s + r.cohortSize, 0);

  const avgRetention1 = useMemo(() => {
    const valid = matrix.filter((r) => r.cells.some((c) => c.monthOffset === 1));
    if (!valid.length) return 0;
    return (
      valid.reduce((s, r) => {
        const c1 = r.cells.find((c) => c.monthOffset === 1);
        return s + (c1?.retentionRate ?? 0);
      }, 0) / valid.length
    );
  }, [matrix]);

  const totalRevenue = useMemo(
    () => matrix.reduce((s, r) => s + r.cells.reduce((ss, c) => ss + c.totalRevenue, 0), 0),
    [matrix]
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-transparent p-4 md:p-5">
      
      {/* ── Üst Çubuk: KPI Sayaçları + Tarih Aralığı + Sekmeler + Dışa Aktarma ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
        
        {/* Sol: KPI Sayaç Rozetleri */}
        <div data-tour="cohort-kpis" className="flex flex-wrap items-center gap-1.5">
          {[
            { label: t('cohort_kpi_analyzed_label'), value: `${matrix.length} ${isTr ? 'Ay' : 'Mo.'}` },
            { label: t('cohort_kpi_acquired_label'), value: fmt(totalFirstBuyers) },
            { label: t('cohort_kpi_retention_label'), value: `%${avgRetention1.toFixed(1)}` },
            { label: t('cohort_kpi_revenue_label'), value: fmtMoney(totalRevenue) },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3"
            >
              <span className="font-mono text-xs font-bold text-[var(--fg)]">
                {isLoading ? '—' : value}
              </span>
              <span className="text-[10.5px] text-[var(--fg-muted)]">{label}</span>
            </div>
          ))}
        </div>

        {/* Sağ: Tarih Aralığı + Sekmeler + Dışa Aktarma */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tarih Aralığı */}
          <div data-tour="cohort-filters" className="flex items-center gap-1">
            <input
              type="month"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
            <span className="text-xs text-[var(--fg-muted)]">—</span>
            <input
              type="month"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
            <button
              type="button"
              onClick={() => setApplied({ from, to })}
              className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--card)] transition hover:opacity-90"
            >
              {t('cohort_apply_button')}
            </button>
          </div>

          {/* Sekme Butonları */}
          <div data-tour="cohort-tabs" className="flex items-center gap-1">
            {(['matrix', 'curves'] as const).map((tabId) => {
              const active = tab === tabId;
              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setTab(tabId)}
                  className={`inline-flex h-8 items-center rounded-[4px] px-3 text-xs font-semibold transition ${
                    active
                      ? 'bg-[var(--fg)] text-[var(--card)] font-bold'
                      : 'border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                  }`}
                >
                  {tabId === 'matrix' ? t('cohort_tab_heatmap') : t('cohort_tab_curves')}
                </button>
              );
            })}
          </div>

          {/* Bilgi Butonu */}
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className={`inline-flex h-8 items-center rounded-[4px] border px-2.5 text-xs font-semibold transition ${
              showInfo
                ? 'border-[var(--fg)] bg-[var(--bg-subtle)] text-[var(--fg)] font-bold'
                : 'border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {isTr ? 'Bilgi' : 'Info'}
          </button>

          {/* Dışa Aktarma */}
          <ExportMenu
            filename="kohort-analizi"
            columns={[
              { key: 'cohort', header: isTr ? 'Kohort' : 'Cohort', type: 'text' },
              { key: 'size', header: isTr ? 'Boyut' : 'Size', type: 'int' },
              ...allOffsets.map((o) => ({
                key: `m${o}`,
                header: isTr ? `Ay ${o} (%)` : `Month ${o} (%)`,
                type: 'percent' as const,
              })),
              { key: 'revenue', header: isTr ? 'Toplam Ciro' : 'Total Revenue', type: 'money' },
            ]}
            getData={() =>
              (data?.matrix ?? []).map((row): ExportRow => {
                const cellByOffset = new Map(row.cells.map((c) => [c.monthOffset, c]));
                const monthCols = Object.fromEntries(
                  allOffsets.map((o) => [`m${o}`, o === 0 ? 100 : (cellByOffset.get(o)?.retentionRate ?? 0)])
                );
                return {
                  cohort: row.cohortMonth,
                  size: row.cohortSize,
                  ...monthCols,
                  revenue: row.cells.reduce((s, c) => s + c.totalRevenue, 0),
                };
              })
            }
          />
        </div>
      </div>

      {/* ── Bilgilendirme Notu ── */}
      {showInfo && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--fg-muted)]">
          <p className="m-0 leading-relaxed">
            {isTr
              ? 'Aynı ay ilk kez sipariş veren müşteriler bir "kohort" oluşturur. Tablo, o müşterilerin sonraki aylarda ne kadarının geri dönüp tekrar alışveriş yaptığını gösterir. Koyu hücreler yüksek sadakati, açık hücreler düşüşü işaret eder.'
              : 'Customers making their first purchase in a given month form a cohort. The matrix shows the retention percentage in subsequent months.'}
          </p>
        </div>
      )}

      {/* ── Ana İçerik Kartı ── */}
      <div data-tour="cohort-matrix" className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
            {t('cohort_loading_text')}
          </div>
        ) : isError ? (
          <div className="p-16 text-center text-xs text-red-500">
            <div className="font-bold">{t('cohort_error_title')}</div>
            <div className="mt-1 text-[var(--fg-muted)]">{t('cohort_error_hint')}</div>
            {error instanceof Error && error.message && (
              <div className="mt-2 font-mono text-[10px] text-[var(--fg-subtle)]">{error.message}</div>
            )}
          </div>
        ) : matrix.length === 0 ? (
          <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
            <div className="font-bold">{t('cohort_empty_title')}</div>
            <div className="mt-1 opacity-70">{t('cohort_empty_hint')}</div>
          </div>
        ) : tab === 'matrix' ? (
          /* ── Isı Haritası Tablosu ── */
          isMobile ? (
            <div className="flex flex-col gap-2 p-3">
              {matrix.map((row: CohortMatrixRow) => {
                const cellByOffset = new Map(row.cells.map((c) => [c.monthOffset, c]));
                return (
                  <div key={row.cohortMonth} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[var(--fg)]">{row.cohortMonth}</span>
                      <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">
                        {fmt(row.cohortSize)} {isTr ? 'ilk alıcı' : 'buyers'}
                      </span>
                    </div>
                    <div className="flex gap-1 overflow-x-auto pb-1">
                      {allOffsets.map((idx) => {
                        const cell = cellByOffset.get(idx);
                        if (!cell) return <div key={idx} className="h-10 min-w-[50px] shrink-0 rounded-[2px] bg-[var(--border-soft)]" />;
                        const { bg, text } = heatColor(idx === 0 ? 100 : cell.retentionRate);
                        return (
                          <div
                            key={idx}
                            style={{ background: bg }}
                            className="flex h-10 min-w-[50px] shrink-0 flex-col items-center justify-center rounded-[2px]"
                          >
                            <span className="font-mono text-[10.5px] font-bold" style={{ color: text }}>
                              {idx === 0 ? '100%' : `${cell.retentionRate.toFixed(0)}%`}
                            </span>
                            <span className="font-mono text-[9px] opacity-75" style={{ color: text }}>
                              {isTr ? `Ay ${idx}` : `M${idx}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="min-w-full overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                    <th className="sticky left-0 z-10 border-r border-[var(--border-soft)] bg-[var(--bg-subtle)] px-4 py-2.5 text-left">
                      {t('cohort_col_month')}
                    </th>
                    <th className="border-r border-[var(--border-soft)] px-3 py-2.5 text-center">
                      {t('cohort_col_size')}
                    </th>
                    {allOffsets.map((o) => (
                      <th key={o} className="min-w-[76px] px-2 py-2.5 text-center">
                        {o === 0 ? (isTr ? 'Ay 0' : 'Month 0') : isTr ? `+${o} Ay` : `+${o} Mo`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {matrix.map((row: CohortMatrixRow) => {
                    const cellMap = new Map(row.cells.map((c) => [c.monthOffset, c]));
                    return (
                      <tr key={row.cohortMonth} className="transition hover:bg-[var(--bg-subtle)]/30">
                        <td className="sticky left-0 z-10 whitespace-nowrap border-r border-[var(--border-soft)] bg-[var(--card)] px-4 py-2 font-mono font-bold text-[var(--fg)]">
                          {row.cohortMonth}
                        </td>
                        <td className="border-r border-[var(--border-soft)] px-3 py-2 text-center font-mono font-bold text-[var(--fg)]">
                          {fmt(row.cohortSize)}
                        </td>
                        {allOffsets.map((o) => {
                          const cell = cellMap.get(o);
                          if (!cell) return <td key={o} className="min-w-[76px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]" />;
                          return <HeatCell key={o} cell={cell} isFirst={o === 0} cohortSize={row.cohortSize} />;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── Tutunma Eğrileri Grafiği ── */
          <div className="p-4 md:p-6">
            <div className="mb-3 text-xs text-[var(--fg-muted)]">{t('cohort_curves_desc')}</div>
            <CohortRetentionChart
              data={curveData}
              cohortMonths={matrix.map((row) => row.cohortMonth)}
              compact={isMobile}
            />
          </div>
        )}

        {/* ── Alt Lejant ── */}
        {!isLoading && !isError && matrix.length > 0 && tab === 'matrix' && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2.5 px-4 text-[10.5px]">
            <span className="font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              {t('cohort_legend_title')}:
            </span>
            {[
              { label: '≥ 80%', color: 'var(--fg)' },
              { label: '60–79%', color: 'rgba(var(--fg-rgb, 255,255,255), 0.75)' },
              { label: '40–59%', color: 'rgba(var(--fg-rgb, 255,255,255), 0.45)' },
              { label: '20–39%', color: 'rgba(var(--fg-rgb, 255,255,255), 0.22)' },
              { label: '< 20%', color: 'rgba(var(--fg-rgb, 255,255,255), 0.08)' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] px-2 py-0.5">
                <div style={{ background: color }} className="h-2 w-2 rounded-[1px] border border-[var(--border-soft)]" />
                <span className="font-mono font-semibold text-[var(--fg-muted)]">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
