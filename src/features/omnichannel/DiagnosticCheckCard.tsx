'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, ChevronDown } from 'lucide-react';
import { DIAGNOSTIC_STATUS, type DiagnosticCheckDto, type DiagnosticStatus } from '../../lib/api/omnichannel';

const STATUS_META: Record<DiagnosticStatus, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  [DIAGNOSTIC_STATUS.Ok]:      { icon: CheckCircle2,  tone: 'text-emerald-500', label: 'Sorun yok' },
  [DIAGNOSTIC_STATUS.Warning]: { icon: AlertTriangle, tone: 'text-amber-500',   label: 'Dikkat' },
  [DIAGNOSTIC_STATUS.Failed]:  { icon: XCircle,       tone: 'text-rose-500',    label: 'Sorun var' },
  [DIAGNOSTIC_STATUS.Skipped]: { icon: MinusCircle,   tone: 'text-[var(--fg-muted)]', label: 'Kontrol edilemedi' },
};

// Tek kontrol satırı. Kapalıyken yalnız sonuç cümlesi; sorun varsa açılınca
// "Ne oldu / Neden / Ne yapmalısınız" ve en altta gizli teknik ayrıntı.
export function DiagnosticCheckCard({ check }: { check: DiagnosticCheckDto }) {
  const isProblem = check.status === DIAGNOSTIC_STATUS.Failed || check.status === DIAGNOSTIC_STATUS.Warning;
  const [open, setOpen] = useState(check.status === DIAGNOSTIC_STATUS.Failed);
  const [showTechnical, setShowTechnical] = useState(false);
  const meta = STATUS_META[check.status];
  const Icon = meta.icon;
  const hasDetails = Boolean(check.whatHappened || check.why || check.whatToDo.length > 0 || check.technicalDetail);

  return (
    <div className="rounded-md border border-[var(--border-soft)] bg-[var(--card)]">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        className={`flex w-full items-start gap-3 p-3 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
        aria-expanded={open}
      >
        <Icon size={18} className={`mt-0.5 shrink-0 ${meta.tone}`} aria-label={meta.label} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--fg)]">{check.title}</span>
            <span className={`text-[10.5px] font-semibold ${meta.tone}`}>{meta.label}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--fg)]">{check.summary}</p>
        </div>
        {hasDetails && (
          <ChevronDown size={16} className={`mt-0.5 shrink-0 text-[var(--fg-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && hasDetails && (
        <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] px-3 pb-3 pt-3 pl-10">
          {check.whatHappened && <Section title="Ne oldu?">{check.whatHappened}</Section>}
          {check.why && <Section title="Neden?">{check.why}</Section>}

          {check.whatToDo.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[var(--fg)]">{isProblem ? 'Ne yapmalısınız?' : 'Öneri'}</div>
              <ol className="mt-1.5 flex flex-col gap-1.5">
                {check.whatToDo.map((step, i) => (
                  <li key={step} className="flex gap-2 text-xs leading-relaxed text-[var(--fg)]">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[10px] font-bold text-[var(--fg-muted)]">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {check.technicalDetail && (
            <div>
              <button
                type="button"
                onClick={() => setShowTechnical((v) => !v)}
                className="text-[10.5px] font-semibold text-[var(--fg-muted)] underline-offset-2 hover:underline cursor-pointer"
              >
                {showTechnical ? 'Teknik ayrıntıyı gizle' : 'Teknik ayrıntıyı göster (destek için)'}
              </button>
              {showTechnical && (
                <pre className="mt-1.5 whitespace-pre-wrap break-words rounded bg-[var(--bg-subtle)] p-2 font-mono text-[10.5px] text-[var(--fg-muted)]">
                  {check.technicalDetail}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-[var(--fg)]">{title}</div>
      <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">{children}</p>
    </div>
  );
}
