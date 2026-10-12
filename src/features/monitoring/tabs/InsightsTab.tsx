'use client';

import { useState } from 'react';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { describeError } from '../../../lib/errors';
import { toast } from '../../../lib/toast';
import type { InsightEvidenceDto, InsightStatus, MonitoringInsightDto, MonitoringInsightsViewDto } from '../../../lib/api';
import {
  useAnalyzeInsights,
  useInsights,
  useUndoInsightFix,
  useUpdateInsightStatus,
} from '../../../hooks/monitoring/useMonitoringInsights';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { MonitoringTabKey } from '../monitoring-tabs';
import { InsightCard } from '../InsightCard';
import { InsightFixDialog } from '../InsightFixDialog';
import { InsightFixHistory } from '../InsightFixHistory';
import {
  buildNavPages, filterInsights, groupByPriority, latestFixFor, MODE_LABELS, SEVERITY_LABELS, type InsightFilter,
} from '../insights';
import { formatRelative } from '../format';
import { DaysSelector, Panel, QueryStatus, useNow } from '../ui';
import { InsightFilterBar } from './InsightFilterBar';

// Varsayılan dönem haftalık otomatik analizle aynı: sabah açan kişi hazır sonucu görür.
const DEFAULT_PERIOD_DAYS = 7;
const DEFAULT_FILTER: InsightFilter = { category: 'all', showClosed: false, onlyFixable: false };

interface Props {
  onNavigate: (tab: MonitoringTabKey) => void;
}

interface FixTarget {
  insightId: number;
  evidenceFingerprint: string;
  label: string;
}

// "Ne düzeltilmeli, ne açıklanmalı, ne geliştirilmeli" — kanıtlı, önem grubuna ayrılmış, etkiye
// göre sıralı öneriler; güvenli olanlarda "Düzelt" (önizle → onayla → geri al). Yalnız SuperAdmin.
export function InsightsTab({ onNavigate }: Props) {
  const { t } = useI18n();
  const [periodDays, setPeriodDays] = useState(DEFAULT_PERIOD_DAYS);
  const [filter, setFilter] = useState<InsightFilter>(DEFAULT_FILTER);
  const [fixTarget, setFixTarget] = useState<FixTarget | null>(null);

  const insights = useInsights(periodDays);
  const analyze = useAnalyzeInsights(periodDays);
  const updateStatus = useUpdateInsightStatus();
  const undoFix = useUndoInsightFix();

  const runAnalysis = () =>
    analyze.mutate(buildNavPages(t), {
      onSuccess: (view) => {
        if (view.cached) toast.info('Bu dönem son bir saat içinde analiz edildi; aynı sonuç gösteriliyor.');
        else toast.success('Analiz tamamlandı.');
      },
      onError: (error) => toast.error(describeError(error)),
    });

  const changeStatus = (id: number, status: InsightStatus) =>
    updateStatus.mutate({ id, status }, { onError: (error) => toast.error(describeError(error)) });

  const undo = (fixId: number) =>
    undoFix.mutate(fixId, {
      onSuccess: (record) => toast.success(record.message),
      onError: (error) => toast.error(describeError(error)),
    });

  const openFix = (insight: MonitoringInsightDto, evidence: InsightEvidenceDto) =>
    setFixTarget({ insightId: insight.id, evidenceFingerprint: evidence.fingerprint, label: evidence.fix?.label ?? 'Düzelt' });

  const view = insights.data;
  const all = view?.insights ?? [];
  const fixes = view?.fixes ?? [];
  const groups = groupByPriority(filterInsights(all, filter));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DaysSelector value={periodDays} onChange={setPeriodDays} />
        <button
          type="button"
          onClick={runAnalysis}
          disabled={analyze.isPending || view?.manualRunsLeftToday === 0}
          className="flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {analyze.isPending ? 'Analiz ediliyor…' : 'Analiz et'}
        </button>
      </div>

      {view ? <RunMeta view={view} /> : null}
      {all.length > 0 ? <InsightFilterBar insights={all} filter={filter} onChange={setFilter} /> : null}

      <QueryStatus
        isLoading={insights.isLoading}
        isError={insights.isError}
        isEmpty={false}
        onRetry={() => insights.refetch()}
        emptyIcon={Lightbulb}
        emptyTitle=""
      >
        {!view?.run ? (
          <Panel>
            <EmptyState
              icon={Lightbulb}
              title="Henüz analiz yok"
              description="Analiz et'e bas: izleme verisi kurallarla taranır, yapay zekâ bulguları önceliklendirip ne yapılacağını yazar. Otomatik analiz her sabah 07:30'da da çalışır."
              action={{ label: 'Analiz et', onClick: runAnalysis }}
            />
          </Panel>
        ) : groups.length === 0 ? (
          <Panel>
            <EmptyState
              icon={Lightbulb}
              title={all.length === 0 ? 'Öneri yok — her şey yolunda görünüyor' : 'Bu süzgeçte açık öneri yok'}
              description={all.length === 0
                ? 'Kurallar bu dönemde dikkat gerektiren bir bulgu üretmedi.'
                : 'Başka bir kategori seç ya da kapatılanları göster.'}
              action={all.length === 0
                ? { label: 'Yeniden analiz et', onClick: runAnalysis }
                : { label: 'Süzgeci temizle', onClick: () => setFilter({ ...DEFAULT_FILTER, showClosed: true }) }}
            />
          </Panel>
        ) : (
          groups.map((group) => (
            <section key={group.severity} className="flex min-w-0 flex-col gap-2">
              <h3 className="text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                {SEVERITY_LABELS[group.severity]} · {group.insights.length}
              </h3>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {group.insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    lastFix={latestFixFor(insight, fixes)}
                    onNavigate={onNavigate}
                    onStatusChange={(status) => changeStatus(insight.id, status)}
                    onFix={(evidence) => openFix(insight, evidence)}
                    onUndo={undo}
                    isUpdating={updateStatus.isPending}
                    isUndoing={undoFix.isPending}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </QueryStatus>

      <InsightFixHistory fixes={fixes} onUndo={undo} isUndoing={undoFix.isPending} />
      <InsightFixDialog target={fixTarget} onClose={() => setFixTarget(null)} />
    </div>
  );
}

// Son analizin künyesi: ne zaman, kim yazdı (AI / kurallar), kaç token, kalan elle analiz hakkı.
function RunMeta({ view }: { view: MonitoringInsightsViewDto }) {
  const now = useNow();
  const { run } = view;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-[var(--fg-muted)]">
        {run
          ? `Son analiz ${formatRelative(run.createdAt, now)} · ${MODE_LABELS[run.mode]} · ${run.evidenceCount} bulgu`
          : 'Bu dönem henüz analiz edilmedi.'}
        {` · Bugün ${view.manualRunsLeftToday} elle analiz hakkı kaldı`}
      </p>
      {run ? (
        <p className="text-ui-2xs text-[var(--fg-muted)] opacity-80">
          {run.totalTokens > 0 ? `${run.totalTokens.toLocaleString('tr-TR')} token` : '0 token'}
          {run.aiNote ? ` · ${run.aiNote}` : ''}
        </p>
      ) : null}
    </div>
  );
}
