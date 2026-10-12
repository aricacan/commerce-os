'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cannibalizationApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/format';
import type { CannibalizationMatrix } from '../../../types/api';
import { ExportMenu, type ExportRow } from '../../../components/ui/ExportMenu';
import { useMobile } from '../../../hooks/useMobile';
import { useI18n } from '../../../lib/i18n';
import { pushAlert } from '../../../stores/alert-stack';
import type { TranslationKey } from '../../../lib/translations/tr';

const CannibalizationBarChart = dynamic(
  () => import('../../../components/analytics/CannibalizationBarChart').then((module) => module.CannibalizationBarChart),
  { ssr: false, loading: () => <div className="h-full w-full rounded-[4px] bg-[var(--bg-subtle)]" /> },
);

function scoreToColor(score: number | null): string {
  if (score === null) return 'var(--bg-subtle)';
  if (score <= -0.6) return 'rgb(239, 68, 68)'; // Red-500
  if (score <= -0.3) return 'rgba(239, 68, 68, 0.7)';
  if (score <= -0.05) return 'rgba(245, 158, 11, 0.7)'; // Amber-500
  if (score <= 0.05) return 'var(--border)';
  if (score <= 0.3) return 'rgba(16, 185, 129, 0.5)';
  if (score <= 0.6) return 'rgba(16, 185, 129, 0.75)';
  return 'rgb(16, 185, 129)'; // Emerald-500
}

function scoreToSoftBg(score: number): string {
  return score < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
}

function scoreToLabel(score: number, t: (key: TranslationKey) => string): string {
  if (score <= -0.6) return t('cannibalization_label_strong_cannibalization');
  if (score <= -0.3) return t('cannibalization_label_moderate_cannibalization');
  if (score <= -0.05) return t('cannibalization_label_slight_negative');
  if (score <= 0.05) return t('cannibalization_label_neutral');
  if (score <= 0.3) return t('cannibalization_label_slight_positive');
  if (score <= 0.6) return t('cannibalization_label_moderate_crosssell');
  return t('cannibalization_label_strong_crosssell');
}

function estimateDuration(): number {
  return 10;
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({
  progress,
  size = 140,
  strokeWidth = 10,
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const d = c * Math.min(progress, 1);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--fg)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${d} ${c - d}`}
          className="transition-[stroke-dasharray] duration-[800ms] ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {children}
      </div>
    </div>
  );
}

// ── Cell Tooltip ──────────────────────────────────────────────────────────────

function CellTooltip({
  visible,
  brand1,
  brand2,
  score,
  dataPoints,
  x,
  y,
}: {
  visible: boolean;
  brand1: string;
  brand2: string;
  score: number;
  dataPoints: number;
  x: number;
  y: number;
}) {
  const { t, lang } = useI18n();
  if (!visible) return null;
  const accent = scoreToColor(score);
  return (
    <div
      style={{ left: Math.min(x + 10, window.innerWidth - 230), top: Math.max(y - 10, 8), borderColor: accent }}
      className="pointer-events-none fixed z-[1000] min-w-[210px] rounded-[4px] border-[1.5px] bg-[var(--card)] p-3 text-xs shadow-xl backdrop-blur-md"
    >
      <div className="mb-1.5 font-mono text-xs font-bold text-[var(--fg)]">{brand1} × {brand2}</div>
      <div style={{ color: accent }} className="font-mono text-lg font-black leading-none">
        {score.toFixed(4)}
      </div>
      <div style={{ background: scoreToSoftBg(score), color: accent }} className="mt-1.5 inline-block rounded-[3px] px-2 py-0.5 font-mono text-[10.5px] font-bold">
        {scoreToLabel(score, t)}
      </div>
      <div className="mt-2 border-t border-[var(--border-soft)] pt-1.5 text-[10.5px] text-[var(--fg-muted)]">
        {lang === 'tr' ? `${dataPoints} ortak günde hesaplandı` : `Calculated over ${dataPoints} common days`}
      </div>
    </div>
  );
}

// ── Risk & Synergy Summary ────────────────────────────────────────────────────

function RiskSummary({ matrix }: { matrix: CannibalizationMatrix['matrix'] }) {
  const { t } = useI18n();
  const risky = [...matrix].sort((a, b) => a.score - b.score).filter((p) => p.score < -0.05).slice(0, 3);
  const synergy = [...matrix].sort((a, b) => b.score - a.score).filter((p) => p.score > 0.1).slice(0, 3);

  if (risky.length === 0 && synergy.length === 0) return null;

  const ScoreBar = ({ score }: { score: number }) => {
    const absScore = Math.abs(score);
    return (
      <div className="mt-1.5 h-1 overflow-hidden rounded-[2px] bg-[var(--border-soft)]">
        <div
          style={{ width: `${Math.min(absScore * 100, 100)}%`, background: scoreToColor(score) }}
          className="h-full rounded-[2px] transition-[width] duration-500"
        />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Risk Kartı */}
      <div className="flex flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        <div className="h-[2px] bg-red-500" />
        <div className="border-b border-[var(--border-soft)] px-3.5 py-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">{t('cannibalization_risky_title')}</div>
          <div className="mt-0.5 text-[10.5px] text-[var(--fg-muted)]">{t('cannibalization_risky_subtitle')}</div>
        </div>
        {risky.length === 0 ? (
          <div className="p-4 text-xs text-[var(--fg-muted)]">{t('cannibalization_risky_empty')}</div>
        ) : (
          risky.map((p, i) => (
            <div key={i} className={`p-3 px-3.5 ${i < risky.length - 1 ? 'border-b border-[var(--border-soft)]' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[var(--fg)]">
                  {p.brand1} <span className="font-normal text-[var(--fg-muted)]">vs</span> {p.brand2}
                </div>
                <span
                  style={{ color: scoreToColor(p.score), background: scoreToSoftBg(p.score) }}
                  className="rounded-[3px] px-1.5 py-0.5 font-mono text-xs font-bold"
                >
                  {p.score.toFixed(2)}
                </span>
              </div>
              <ScoreBar score={p.score} />
              <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{scoreToLabel(p.score, t)}</div>
            </div>
          ))
        )}
      </div>

      {/* Sinerji Kartı */}
      <div className="flex flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        <div className="h-[2px] bg-emerald-500" />
        <div className="border-b border-[var(--border-soft)] px-3.5 py-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">{t('cannibalization_synergy_title')}</div>
          <div className="mt-0.5 text-[10.5px] text-[var(--fg-muted)]">{t('cannibalization_synergy_subtitle')}</div>
        </div>
        {synergy.length === 0 ? (
          <div className="p-4 text-xs text-[var(--fg-muted)]">{t('cannibalization_synergy_empty')}</div>
        ) : (
          synergy.map((p, i) => (
            <div key={i} className={`p-3 px-3.5 ${i < synergy.length - 1 ? 'border-b border-[var(--border-soft)]' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[var(--fg)]">
                  {p.brand1} <span className="font-normal text-[var(--fg-muted)]">+</span> {p.brand2}
                </div>
                <span
                  style={{ color: scoreToColor(p.score), background: scoreToSoftBg(p.score) }}
                  className="rounded-[3px] px-1.5 py-0.5 font-mono text-xs font-bold"
                >
                  +{p.score.toFixed(2)}
                </span>
              </div>
              <ScoreBar score={p.score} />
              <div className="mt-1 text-[10px] text-[var(--fg-muted)]">{scoreToLabel(p.score, t)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Chart & Proofs ────────────────────────────────────────────────────────────

function CannibalizationChartAndProof({ matrix }: { matrix: CannibalizationMatrix['matrix'] }) {
  const { lang } = useI18n();

  const topRisky = [...matrix]
    .filter((p) => p.score < 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map((p) => ({
      name: `${p.brand1} vs ${p.brand2}`,
      score: Number(p.score.toFixed(3)),
      raw: p,
    }));

  if (topRisky.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
      <div>
        <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
          {lang === 'tr' ? 'Kanibalizasyon Risk Analizi & İstatistiksel Kanıtlar' : 'Cannibalization Risk Analysis & Statistical Proof'}
        </h3>
        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
          {lang === 'tr'
            ? 'En yüksek satış çakışması ve trafik bölünmesi yaşayan marka çiftlerinin korelasyon gücü.'
            : 'Correlation strength of brand pairs experiencing the highest sales overlap and traffic division.'}
        </p>
      </div>

      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Grafik */}
        <div className="h-[250px] w-full">
          <CannibalizationBarChart data={topRisky} />
        </div>

        {/* Aksiyon Listesi */}
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {lang === 'tr' ? 'İSTATİSTİKSEL KANITLAR & AKSİYON PLANLARI' : 'STATISTICAL PROOF & ACTION PLANS'}
          </p>
          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
            {topRisky.map((p, idx) => {
              const score = p.raw.score;
              const strength =
                score <= -0.6
                  ? (lang === 'tr' ? 'Kritik Derecede Yüksek' : 'Critically High')
                  : score <= -0.3
                  ? (lang === 'tr' ? 'Orta Dereceli Risk' : 'Moderate Risk')
                  : (lang === 'tr' ? 'Hafif Çakışma' : 'Slight Overlap');
              const action =
                score <= -0.5
                  ? (lang === 'tr'
                      ? 'Promosyon takvimlerini ayırın. Aynı anda iki markaya indirim uygulamak ciro bölünmesine sebep olur.'
                      : 'Separate promotional calendars. Discounting both brands simultaneously causes revenue dilution.')
                  : (lang === 'tr'
                      ? 'Fiyat segmentasyonunu netleştirin (biri premium, diğeri bütçe dostu olmalı).'
                      : 'Clarify price segmentation (one premium, one budget-friendly).');

              return (
                <div key={idx} className="flex flex-col gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--fg)]">{p.name}</span>
                    <span className={`font-mono text-xs font-bold ${score <= -0.6 ? 'text-red-500' : 'text-amber-500'}`}>
                      {score.toFixed(3)}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--fg-muted)]">
                    {lang === 'tr'
                      ? `Kanıt: Korelasyon: ${strength} (${p.raw.dataPoints} sipariş günü)`
                      : `Proof: Correlation: ${strength} (${p.raw.dataPoints} order days)`}
                  </div>
                  <div className="mt-0.5 border-l-2 border-[var(--fg)] pl-2 text-[11px] text-[var(--fg)]">
                    <strong>{lang === 'tr' ? 'Aksiyon:' : 'Action:'}</strong> {action}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────

export default function CannibalizationPage() {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const qc = useQueryClient();

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [estimated, setEstimated] = useState(0);
  const [triggerErr, setTriggerErr] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    brand1: string;
    brand2: string;
    score: number;
    dataPoints: number;
    x: number;
    y: number;
  }>({ visible: false, brand1: '', brand2: '', score: 0, dataPoints: 0, x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(900);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTsRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery<CannibalizationMatrix>({
    queryKey: ['cannibalization-matrix'],
    queryFn: cannibalizationApi.matrix,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const stopRunning = useCallback((success: boolean) => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (success) {
      setProgress(1);
      pushAlert('Kanibalizasyon analizi tamamlandı', 'success');
      setTimeout(() => {
        setRunning(false); setProgress(0); setElapsed(0);
        qc.invalidateQueries({ queryKey: ['cannibalization-matrix'] });
      }, 900);
    } else {
      setRunning(false); setProgress(0); setElapsed(0);
      pushAlert('Kanibalizasyon analizi başarısız oldu', 'error');
    }
  }, [qc]);

  const startPolling = useCallback((id: string, est: number) => {
    startTsRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTsRef.current) / 1000);
      setElapsed(sec);
      setProgress(Math.min(sec / est, 0.95));
    }, 1000);
    pollRef.current = setInterval(async () => {
      try {
        const s = await cannibalizationApi.jobStatus(id);
        if (s.state === 'Succeeded') stopRunning(true);
        if (s.state === 'Failed') stopRunning(false);
      } catch {
        /* noop */
      }
    }, 2500);
  }, [stopRunning]);

  async function handleTrigger() {
    setTriggerErr(null);
    setTriggering(true);
    try {
      const { jobId: id } = await cannibalizationApi.trigger();
      const est = estimateDuration();
      setEstimated(est);
      setElapsed(0);
      setProgress(0);
      setRunning(true);
      pushAlert('Kanibalizasyon analizi başlatıldı', 'info');
      startPolling(id, est);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTriggerErr(msg.includes('403') ? t('cannibalization_error_forbidden') : t('cannibalization_error_trigger_failed'));
    } finally {
      setTriggering(false);
    }
  }

  function getScore(b1: string, b2: string) {
    if (!data || b1 === b2) return null;
    const [lo, hi] = b1 < b2 ? [b1, b2] : [b2, b1];
    return data.matrix.find((p) => p.brand1 === lo && p.brand2 === hi) ?? null;
  }

  const brands = data?.brands ?? [];
  const n = brands.length || 1;
  const LABEL = 130;
  const GAP = 2;
  const HEADER = 90;
  const avail = containerWidth - LABEL - GAP * (n + 1) - 40;
  const CELL = Math.max(34, Math.min(76, Math.floor(avail / n)));
  const remaining = Math.max(0, estimated - elapsed);
  const jobEverRan = !!data?.lastJobRanAt;
  const lastAt = (data?.calculatedAt ?? data?.lastJobRanAt)
    ? formatDateTime((data?.calculatedAt ?? data?.lastJobRanAt)!, 'tr', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      
      {/* ── TEK BİRLEŞİK ANA KART ── */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        
        {/* ── Üst Çubuk (Kartın Başlık Bölümü) ── */}
        <div data-tour="cannibalization-header" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 text-xs">
              <span className="font-semibold text-[var(--fg)]">
                {lastAt ? `${t('cannibalization_last_calc_prefix')}: ${lastAt}` : t('cannibalization_not_analyzed')}
              </span>
              {data?.periodDays && (
                <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">
                  ({data.periodDays} {isTr ? 'gün' : 'days'})
                </span>
              )}
            </div>
          </div>

          <div data-tour="cannibalization-actions" className="flex items-center gap-2">
            <ExportMenu
              filename="kanibalizasyon"
              columns={[
                ...(data?.multiStore ? [{ key: 'store', header: isTr ? 'Mağaza' : 'Store', type: 'text' as const }] : []),
                { key: 'a', header: isTr ? 'Marka A' : 'Brand A', type: 'text' },
                { key: 'b', header: isTr ? 'Marka B' : 'Brand B', type: 'text' },
                { key: 'score', header: isTr ? 'Skor' : 'Score', type: 'decimal' },
                { key: 'points', header: isTr ? 'Veri Noktaları' : 'Data Points', type: 'int' },
              ]}
              getData={() =>
                (data?.matrix ?? []).map((p): ExportRow => ({
                  ...(data?.multiStore ? { store: p.storeName } : {}),
                  a: p.brand1,
                  b: p.brand2,
                  score: p.score,
                  points: p.dataPoints,
                }))
              }
            />

            <button
              type="button"
              onClick={handleTrigger}
              disabled={running || triggering}
              className={`inline-flex h-8 items-center rounded-[4px] px-3 text-xs font-bold transition ${
                running
                  ? 'border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] cursor-not-allowed'
                  : 'bg-[var(--fg)] text-[var(--card)] hover:opacity-90'
              }`}
            >
              {running
                ? t('cannibalization_calculating')
                : t('cannibalization_start_button')}
            </button>
          </div>
        </div>

        {triggerErr && (
          <div className="m-3 rounded-[4px] border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-500 font-semibold">
            {triggerErr}
          </div>
        )}

        {/* ── Kartın İçerik Gövdesi (Tam Dikey Esnek) ── */}
        <div data-tour="cannibalization-matrix" className="min-h-0 flex-1 overflow-y-auto">
          
          {/* Progress Durumu */}
          {running && (
            <div className="flex flex-col items-center gap-4 p-8">
              <ProgressRing progress={progress}>
                <span className="font-mono text-2xl font-extrabold text-[var(--fg)]">
                  {Math.round(progress * 100)}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {t('cannibalization_completed_label')}
                </span>
              </ProgressRing>
              <div className="flex gap-8 text-center text-xs">
                <div>
                  <p className="m-0 text-[10px] font-bold uppercase text-[var(--fg-muted)]">{t('cannibalization_elapsed_label')}</p>
                  <p className="m-0 mt-0.5 font-mono text-lg font-bold text-[var(--fg)]">{elapsed}s</p>
                </div>
                <div className="w-px bg-[var(--border-soft)]" />
                <div>
                  <p className="m-0 text-[10px] font-bold uppercase text-[var(--fg-muted)]">{t('cannibalization_remaining_label')}</p>
                  <p className="m-0 mt-0.5 font-mono text-lg font-bold text-[var(--fg)]">
                    {remaining > 0 ? `~${remaining}s` : t('cannibalization_finishing')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Yükleniyor */}
          {isLoading && !running && (
            <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
              {isTr ? 'Veriler yükleniyor…' : 'Loading…'}
            </div>
          )}

          {/* Boş Durum */}
          {!isLoading && !isError && brands.length === 0 && !running && (
            <div className="p-12 text-center text-xs">
              <p className="m-0 font-bold text-[var(--fg)] text-sm">
                {jobEverRan ? t('cannibalization_empty_title_no_pairs') : t('cannibalization_empty_title_not_started')}
              </p>
              <p className="m-0 mt-1 text-[var(--fg-muted)]">
                {jobEverRan
                  ? (isTr
                      ? `Son analiz: ${lastAt}. Korelasyon için en az 2 markanın aynı günlerde satış yapması gerekir.`
                      : `Last analysis: ${lastAt}. Correlation requires at least 2 brands to have sales on the same days.`)
                  : t('cannibalization_start_hint')}
              </p>
            </div>
          )}

          {/* ── Çoklu Mağaza Modu (Doğrudan Tek Tablo) ── */}
          {!isLoading && !isError && data?.multiStore && data.matrix.length > 0 && (() => {
            const sorted = [...data.matrix].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
            return (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                      <tr>
                        <th className="px-4 py-2.5">{isTr ? 'Mağaza' : 'Store'}</th>
                        <th className="px-4 py-2.5">{isTr ? 'Marka Çifti' : 'Brand Pair'}</th>
                        <th className="px-4 py-2.5 text-right">{isTr ? 'Korelasyon Skoru' : 'Correlation Score'}</th>
                        <th className="px-4 py-2.5 text-right">{isTr ? 'Ortak Veri Günü' : 'Common Data Days'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-soft)]">
                      {sorted.map((p, i) => (
                        <tr key={i} className="transition hover:bg-[var(--bg-subtle)]/40">
                          <td className="px-4 py-3 align-middle">
                            <span className="inline-block rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[var(--fg-muted)]">
                              {p.storeName}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="text-xs font-bold text-[var(--fg)]">
                              {p.brand1} <span className="font-normal text-[var(--fg-muted)]">×</span> {p.brand2}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <span
                              style={{ color: scoreToColor(p.score), background: scoreToSoftBg(p.score) }}
                              className="inline-block rounded-[3px] px-2 py-0.5 font-mono text-xs font-bold"
                            >
                              {p.score > 0 ? `+${p.score.toFixed(3)}` : p.score.toFixed(3)}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-right font-mono text-xs text-[var(--fg-muted)]">
                            {p.dataPoints} {isTr ? 'gün' : 'days'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex h-9 shrink-0 items-center justify-between border-t border-[var(--border-soft)] px-4 text-[11px] text-[var(--fg-muted)]">
                  <span>
                    {isTr ? 'Toplam Listelenen:' : 'Total Listed:'} <b className="text-[var(--fg)]">{sorted.length}</b> {isTr ? 'marka çifti' : 'brand pairs'}
                  </span>
                  <span>
                    {isTr ? 'Negatif skor = Kanibalizasyon Riski' : 'Negative score = Cannibalization Risk'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* ── Tek Mağaza Modu (Risk, Sinerji & Matris) ── */}
          {!isLoading && !isError && !data?.multiStore && data && data.matrix.length > 0 && (
            <div className="flex flex-col gap-4 p-4">
              <RiskSummary matrix={data.matrix} />
              <CannibalizationChartAndProof matrix={data.matrix} />

              {/* Matris */}
              {!isMobile && brands.length > 0 && (
                <div className="flex flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-3.5 py-2.5">
                    <span className="text-xs font-bold text-[var(--fg)]">
                      {isTr ? 'Marka Korelasyon Matrisi' : 'Brand Correlation Matrix'} ({brands.length}×{brands.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setMatrixOpen((o) => !o)}
                      className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 text-[11px] font-semibold text-[var(--fg)] transition hover:bg-[var(--card-hover)]"
                    >
                      {matrixOpen ? (isTr ? 'Gizle' : 'Hide') : (isTr ? 'Genişlet' : 'Expand')}
                    </button>
                  </div>

                  {matrixOpen && (
                    <div className="overflow-x-auto p-4">
                      <table style={{ borderSpacing: GAP }} className="w-full table-fixed border-separate">
                        <colgroup>
                          <col style={{ width: LABEL }} />
                          {brands.map((b) => <col key={b} style={{ width: CELL }} />)}
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="pb-1.5 pr-2 text-right align-bottom text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                              {brands.length} {t('cannibalization_brands_unit')}
                            </th>
                            {brands.map((b) => (
                              <th key={b} style={{ width: CELL, height: HEADER }} className="p-0 align-bottom">
                                <div style={{ height: HEADER }} className="flex items-end justify-center pb-1.5">
                                  <span
                                    style={{ writingMode: 'vertical-rl', maxHeight: HEADER - 10 }}
                                    title={b}
                                    className="block truncate rotate-180 font-mono text-[10.5px] font-semibold text-[var(--fg-muted)]"
                                  >
                                    {b}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {brands.map((rowBrand) => (
                            <tr key={rowBrand}>
                              <td style={{ maxWidth: LABEL }} title={rowBrand} className="truncate pr-2.5 text-right font-mono text-[10.5px] font-semibold text-[var(--fg)]">
                                {rowBrand}
                              </td>
                              {brands.map((colBrand) => {
                                const isDiag = rowBrand === colBrand;
                                const cell = getScore(rowBrand, colBrand);
                                return (
                                  <td
                                    key={colBrand}
                                    onMouseEnter={(e) => {
                                      if (!isDiag && cell) {
                                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                        setTooltip({
                                          visible: true,
                                          brand1: rowBrand,
                                          brand2: colBrand,
                                          score: cell.score,
                                          dataPoints: cell.dataPoints,
                                          x: r.right,
                                          y: r.top,
                                        });
                                      }
                                    }}
                                    onMouseLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
                                    style={{
                                      width: CELL,
                                      height: CELL,
                                      background: isDiag ? 'var(--bg-subtle)' : scoreToColor(cell?.score ?? null),
                                    }}
                                    className={`relative rounded-[2px] transition ${!isDiag && cell ? 'cursor-pointer' : ''}`}
                                  >
                                    {!isDiag && cell && CELL >= 44 && (
                                      <span
                                        style={{
                                          fontSize: CELL >= 56 ? 10.5 : 9,
                                          color: Math.abs(cell.score) > 0.3 ? '#fff' : 'var(--fg)',
                                        }}
                                        className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono font-bold"
                                      >
                                        {cell.score.toFixed(2)}
                                      </span>
                                    )}
                                    {isDiag && (
                                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-xs text-[var(--fg-muted)]">
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Alt Lejant */}
              <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2.5 px-3.5 text-[10.5px]">
                <span className="font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {t('cannibalization_legend_title')}:
                </span>
                {[
                  { color: 'rgb(239, 68, 68)', label: isTr ? '≤ −0.60 Güçlü Risk' : '≤ −0.60 Strong Risk' },
                  { color: 'rgba(239, 68, 68, 0.7)', label: isTr ? '≤ −0.30 Orta' : '≤ −0.30 Moderate' },
                  { color: 'rgba(245, 158, 11, 0.7)', label: t('cannibalization_label_slight_negative') },
                  { color: 'var(--border)', label: t('cannibalization_label_neutral') },
                  { color: 'rgba(16, 185, 129, 0.5)', label: t('cannibalization_label_slight_positive') },
                  { color: 'rgb(16, 185, 129)', label: isTr ? '≥ +0.60 Çapraz Satış' : '≥ +0.60 Cross-sell' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] px-2 py-0.5">
                    <span style={{ background: color }} className="inline-block h-2 w-2 rounded-[1px]" />
                    <span className="font-mono font-semibold text-[var(--fg-muted)]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <CellTooltip {...tooltip} />
    </div>
  );
}
