'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingUp, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import {
  adsHubApi, ADS_ANOMALY_METRIC, ADS_RECOMMENDATION_SEVERITY,
  type AdsAnomalyMetric, type AdsRecommendationDto, type AdsRecommendationSeverity,
} from '../../lib/api/adshub';

const METRIC_LABEL: Record<AdsAnomalyMetric, string> = {
  [ADS_ANOMALY_METRIC.Spend]: 'Harcama',
  [ADS_ANOMALY_METRIC.Ctr]: 'CTR',
  [ADS_ANOMALY_METRIC.Cpc]: 'CPC',
  [ADS_ANOMALY_METRIC.Cpm]: 'CPM',
  [ADS_ANOMALY_METRIC.ConversionCount]: 'Dönüşüm Sayısı',
  [ADS_ANOMALY_METRIC.ConversionRate]: 'Dönüşüm Oranı',
  [ADS_ANOMALY_METRIC.Revenue]: 'Ciro (ERP)',
  [ADS_ANOMALY_METRIC.Roas]: 'MER / ROAS',
  [ADS_ANOMALY_METRIC.Cpa]: 'CPA',
};

const SEVERITY_CONFIG: Record<
  AdsRecommendationSeverity,
  { label: string; badge: string; border: string; bg: string; Icon: typeof AlertTriangle }
> = {
  [ADS_RECOMMENDATION_SEVERITY.Critical]: {
    label: 'Kritik',
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/5',
    Icon: AlertTriangle,
  },
  [ADS_RECOMMENDATION_SEVERITY.Warning]: {
    label: 'Uyarı',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    Icon: Flame,
  },
  [ADS_RECOMMENDATION_SEVERITY.Opportunity]: {
    label: 'Fırsat',
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    Icon: TrendingUp,
  },
  [ADS_RECOMMENDATION_SEVERITY.Healthy]: {
    label: 'Sağlıklı',
    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    border: 'border-zinc-500/30',
    bg: 'bg-zinc-500/5',
    Icon: CheckCircle2,
  },
};

function formatValue(metric: AdsAnomalyMetric, value: number): string {
  switch (metric) {
    case ADS_ANOMALY_METRIC.Ctr:
    case ADS_ANOMALY_METRIC.ConversionRate:
      return `%${(value * 100).toFixed(2)}`;
    case ADS_ANOMALY_METRIC.Roas:
      return `${value.toFixed(2)}x`;
    case ADS_ANOMALY_METRIC.ConversionCount:
      return value.toFixed(1);
    default:
      return value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
  }
}

function RecommendationCard({ rec }: { rec: AdsRecommendationDto }) {
  const cfg = SEVERITY_CONFIG[rec.severity] ?? SEVERITY_CONFIG[ADS_RECOMMENDATION_SEVERITY.Healthy];
  const changePercent =
    rec.baselineAverage !== 0
      ? ((rec.value - rec.baselineAverage) / Math.abs(rec.baselineAverage)) * 100
      : null;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-[4px] border ${cfg.border} ${cfg.bg} text-xs`}>
      <cfg.Icon size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-[3px] border font-bold text-[10px] uppercase tracking-wider ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="font-bold text-xs text-[var(--fg)]">{METRIC_LABEL[rec.metric]}</span>
          <span className="text-[11px] text-[var(--fg-muted)]">• Kaynak: {rec.erpSourceCode}</span>
        </div>

        <p className="text-xs text-[var(--fg)] leading-relaxed">
          Mevcut Değer: <strong className="font-mono">{formatValue(rec.metric, rec.value)}</strong>, 7 günlük ortalama:{' '}
          <strong className="font-mono">{formatValue(rec.metric, rec.baselineAverage)}</strong>
          {changePercent !== null && (
            <span className="font-semibold ml-1">
              ({changePercent >= 0 ? `+${changePercent.toFixed(0)}% artış` : `${changePercent.toFixed(0)}% düşüş`})
            </span>
          )}{' '}
          <span className="text-[11px] text-[var(--fg-muted)] font-mono">(Z-score: {rec.zScore.toFixed(2)})</span>
        </p>

        <div className="text-[10.5px] text-[var(--fg-muted)] pt-0.5">
          Tespit Tarihi: {new Date(rec.evaluatedDate).toLocaleDateString('tr-TR')}
        </div>
      </div>
    </div>
  );
}

export function RecommendationsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adshub', 'recommendations'],
    queryFn: () => adsHubApi.getRecommendations(),
    staleTime: 60_000,
  });

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="adshub-recommendations-info">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--fg-muted)]" />
          <h3 className="text-sm font-bold text-[var(--fg)]">Otomatik Anomali & Reklam Optimizasyon Önerileri</h3>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          İstatistiksel anomali motoru (Z-Score) ile harcama ve kârlılık sapmalarını tespit eder.
        </p>
        {/* Kullanıcı "burada ne kullanılıyor" diye sorabiliyordu — motorun girdisi, penceresi
            ve çalışma sıklığı ekranda yazmıyordu. */}
        <p className="text-[11px] text-[var(--fg-muted)] mt-1.5 leading-relaxed">
          Her gece <strong>07:30</strong>&apos;da dünün rakamları, önceki <strong>7 günün</strong> ortalamasıyla
          karşılaştırılır (en az 3 gün veri gerekir). İzlenen 9 metrik: harcama, TO, TBM, BGBM,
          dönüşüm sayısı, dönüşüm oranı, ERP cirosu, MER (harmanlanmış ROAS) ve ERP sipariş
          başına maliyet. Günlük harcaması <strong>₺250</strong> altında kalan günler ciro/ROAS/CPA
          karşılaştırmasına girmez. Normale dönen bulgu listeden kendiliğinden düşer.
        </p>
      </div>

      {isLoading && <div className="text-xs text-[var(--fg-muted)] py-6 text-center">Öneriler analiz ediliyor…</div>}
      {error && (
        <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
          Öneriler yüklenemedi: {(error as Error).message}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="flex items-center gap-2.5 rounded-[4px] border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-500">
          <CheckCircle2 size={16} />
          <span>Şu an dikkat gerektiren bir anomali yok — tüm reklam ve kârlılık metrikleri beklenen aralıkta seyrediyor.</span>
        </div>
      )}

      {data && data.length > 0 && (
        <div data-tour="adshub-recommendations-list" className="flex flex-col gap-2.5">
          {data.map((rec) => (
            <RecommendationCard key={`${rec.erpSourceCode}-${rec.metric}`} rec={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
