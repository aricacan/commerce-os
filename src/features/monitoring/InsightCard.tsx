'use client';

import { Check, EyeOff, RotateCcw, Sparkles, Wrench } from 'lucide-react';
import type { InsightEvidenceDto, InsightFixRecordDto, InsightStatus, MonitoringInsightDto } from '../../lib/api';
import type { MonitoringTabKey } from './monitoring-tabs';
import { CATEGORY_LABELS, fixableEvidence, SEVERITY_LABELS, SEVERITY_TONES } from './insights';
import { InsightEvidenceRow } from './InsightEvidenceRow';
import { InsightFixRecord } from './InsightFixRecord';
import { Pill } from './ui';

interface Props {
  insight: MonitoringInsightDto;
  /** Kartın bulgularına uygulanmış en son düzeltme (varsa). */
  lastFix: InsightFixRecordDto | null;
  onNavigate: (tab: MonitoringTabKey) => void;
  onStatusChange: (status: InsightStatus) => void;
  onFix: (evidence: InsightEvidenceDto) => void;
  onUndo: (fixId: number) => void;
  isUpdating: boolean;
  isUndoing: boolean;
}

const STATUS_LABELS: Record<Exclude<InsightStatus, 'new'>, string> = {
  done: 'Yapıldı',
  ignored: 'Yoksayıldı',
};

const ACTION_CLASS =
  'flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-60';

// Tek öneri kartı: önem + kategori, somut başlık, neden, adımlar, kanıt (neden, etkilenen kayıtlar,
// ekrana bağlantı), "Düzelt" önerisi ve son düzeltmenin sonucu, Yapıldı / Yoksay.
export function InsightCard({ insight, lastFix, onNavigate, onStatusChange, onFix, onUndo, isUpdating, isUndoing }: Props) {
  const closedLabel = insight.status === 'new' ? null : STATUS_LABELS[insight.status];
  const closed = closedLabel !== null;
  const fixable = fixableEvidence(insight);

  return (
    <article
      className={`flex min-w-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 ${closed ? 'opacity-70' : ''}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Pill tone={SEVERITY_TONES[insight.severity]}>{SEVERITY_LABELS[insight.severity]}</Pill>
        <span className="text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
          {CATEGORY_LABELS[insight.category]}
        </span>
        {insight.origin === 'ai' ? (
          <span className="flex items-center gap-1 text-ui-2xs text-[var(--fg-muted)]" title="Metni yapay zekâ yazdı; rakamlar kanıttan">
            <Sparkles size={11} /> AI
          </span>
        ) : null}
        {closedLabel ? (
          <span className="ml-auto">
            <Pill tone="success">{closedLabel}</Pill>
          </span>
        ) : null}
      </header>

      <div className="flex flex-col gap-1">
        <h3 className="break-words text-sm font-semibold text-[var(--fg)]">{insight.title}</h3>
        <p className="break-words text-xs leading-relaxed text-[var(--fg-muted)]">{insight.reason}</p>
      </div>

      {insight.steps.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h4 className="text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">Ne yapılmalı</h4>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs text-[var(--fg)]">
            {insight.steps.map((step) => <li key={step} className="break-words">{step}</li>)}
          </ol>
        </section>
      ) : null}

      <section className="flex flex-col gap-1.5">
        <h4 className="text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">Kanıt</h4>
        <ul className="flex flex-col gap-1.5">
          {insight.evidence.map((evidence) => (
            <InsightEvidenceRow key={evidence.fingerprint} evidence={evidence} onNavigate={onNavigate} />
          ))}
        </ul>
      </section>

      {lastFix ? <InsightFixRecord record={lastFix} onUndo={onUndo} isUndoing={isUndoing} /> : null}

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
        {!closed && fixable.map((evidence) => (
          <button
            key={evidence.fingerprint}
            type="button"
            className="mr-auto flex min-h-8 max-w-full items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 py-1.5 text-left text-xs font-semibold text-[var(--bg)] transition-opacity hover:opacity-90"
            onClick={() => onFix(evidence)}
            title={evidence.fix?.platformOnly ? 'Tüm şirketleri etkiler — yalnız kurulum yöneticisi uygulayabilir' : undefined}
          >
            <Wrench size={13} className="shrink-0" /> <span className="break-words">Düzelt: {evidence.fix?.label}</span>
          </button>
        ))}
        {closed ? (
          <button type="button" className={ACTION_CLASS} disabled={isUpdating} onClick={() => onStatusChange('new')}>
            <RotateCcw size={13} /> Geri al
          </button>
        ) : (
          <>
            <button type="button" className={ACTION_CLASS} disabled={isUpdating} onClick={() => onStatusChange('ignored')}>
              <EyeOff size={13} /> Yoksay
            </button>
            <button type="button" className={ACTION_CLASS} disabled={isUpdating} onClick={() => onStatusChange('done')}>
              <Check size={13} /> Yapıldı
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
