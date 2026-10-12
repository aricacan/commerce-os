'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2, ShieldCheck, Undo2 } from 'lucide-react';
import type { InsightFixPreviewDto } from '../../lib/api';
import { describeError } from '../../lib/errors';
import { toast } from '../../lib/toast';
import { useApplyInsightFix, useInsightFixPreview } from '../../hooks/monitoring/useMonitoringInsights';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { RISK_LABELS, RISK_TONES } from './insights';
import { Pill } from './ui';

interface Target {
  insightId: number;
  evidenceFingerprint: string;
  label: string;
}

interface Props {
  target: Target | null;
  onClose: () => void;
}

const PREVIEW_SKELETON_ROWS = 3;
const PREVIEW_ROW_HEIGHT = 40;

// "Düzelt" onay penceresi: CANLI önizleme (ne değişecek, risk, geri alınabilir mi), gerekirse
// seçim (sorumlu kişi, süre) ve "Onayla ve uygula". Sunucu onay anında ön koşulu yeniden denetler.
export function InsightFixDialog({ target, onClose }: Props) {
  return (
    <BottomSheet open={target !== null} onClose={onClose} title={target?.label ?? ''} desktopDialog>
      {target ? <FixBody target={target} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function FixBody({ target, onClose }: { target: Target; onClose: () => void }) {
  const preview = useInsightFixPreview(target.insightId, target.evidenceFingerprint);
  const apply = useApplyInsightFix();
  const [choice, setChoice] = useState('');

  const confirm = (data: InsightFixPreviewDto) =>
    apply.mutate(
      { insightId: target.insightId, evidenceFingerprint: target.evidenceFingerprint, choice: data.choices.length > 0 ? choice : null },
      {
        onSuccess: (record) => {
          if (record.status === 'applied') toast.success(record.message);
          else toast.error(record.message);
          onClose();
        },
        onError: (error) => toast.error(describeError(error)),
      },
    );

  return (
    <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto overscroll-contain p-4 sm:max-h-[calc(100vh-140px)]">
      {preview.isLoading ? <SkeletonList count={PREVIEW_SKELETON_ROWS} rowHeight={PREVIEW_ROW_HEIGHT} /> : null}
      {preview.isError ? (
        <ErrorState title="Önizleme alınamadı" description={describeError(preview.error)} onRetry={() => preview.refetch()} />
      ) : null}
      {preview.data ? (
        <PreviewContent
          data={preview.data}
          choice={choice}
          onChoice={setChoice}
          isApplying={apply.isPending}
          onCancel={onClose}
          onConfirm={() => confirm(preview.data)}
        />
      ) : null}
    </div>
  );
}

interface ContentProps {
  data: InsightFixPreviewDto;
  choice: string;
  onChoice: (value: string) => void;
  isApplying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function PreviewContent({ data, choice, onChoice, isApplying, onCancel, onConfirm }: ContentProps) {
  const needsChoice = data.choices.length > 0;
  const canConfirm = data.canApply && (!needsChoice || choice !== '') && !isApplying;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={RISK_TONES[data.risk]}>{RISK_LABELS[data.risk]}</Pill>
        <span className="flex items-center gap-1 text-ui-2xs font-semibold text-[var(--fg-muted)]">
          {data.reversible ? <><Undo2 size={12} /> Geri alınabilir</> : <><ShieldCheck size={12} /> Geri alınamaz</>}
        </span>
        {data.platformOnly ? (
          <span className="text-ui-2xs font-semibold text-[var(--fg-muted)]">Tüm şirketleri etkiler · yalnız kurulum yöneticisi</span>
        ) : null}
      </div>

      <p className="break-words text-sm leading-relaxed text-[var(--fg)]">{data.summary}</p>

      {data.changes.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h4 className="text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">Ne değişecek</h4>
          <ul className="flex flex-col gap-1">
            {data.changes.map((change) => (
              <li
                key={`${change.label}|${change.before ?? ''}`}
                className="flex min-w-0 flex-col gap-0.5 rounded-[4px] border border-[var(--border-soft)] px-2.5 py-1.5 text-xs sm:flex-row sm:items-center sm:gap-2"
              >
                <span className="min-w-0 break-words font-semibold text-[var(--fg)] sm:w-2/5">{change.label}</span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 break-words text-[var(--fg-muted)]">
                  {change.before ? <span className="break-words">{change.before}</span> : null}
                  {change.before && change.after ? <ArrowRight size={12} className="shrink-0" /> : null}
                  {change.after ? <span className="break-words font-semibold text-[var(--fg)]">{change.after}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {needsChoice ? (
        <label className="flex flex-col gap-1 text-xs font-semibold text-[var(--fg)]">
          {data.choiceLabel ?? 'Seçim'}
          <select
            value={choice}
            onChange={(event) => onChoice(event.target.value)}
            className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-sm font-normal"
          >
            <option value="">Seç…</option>
            {data.choices.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : null}

      {!data.canApply && data.blockedReason ? (
        <p className="flex items-start gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] p-2.5 text-xs text-[var(--fg)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" />
          <span className="break-words">{data.blockedReason}</span>
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--border-soft)] pt-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-semibold text-[var(--fg)]"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="flex h-9 items-center justify-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isApplying ? <Loader2 size={13} className="animate-spin" /> : null}
          Onayla ve uygula
        </button>
      </div>
    </>
  );
}
