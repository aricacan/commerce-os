'use client';

import Link from 'next/link';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import type { InsightEvidenceDto } from '../../lib/api';
import { isMonitoringTabKey, type MonitoringTabKey } from './monitoring-tabs';

interface Props {
  evidence: InsightEvidenceDto;
  onNavigate: (tab: MonitoringTabKey) => void;
}

const LINK_CLASS =
  'inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline';

// Tek bulgu: özet + rakamlar, somut neden, etkilenen kayıtlar (açılır liste) ve düzeltmenin
// yapılacağı ekrana bağlantı. Rakamlar YALNIZ burada — metni kim yazmış olursa olsun veriden gelir.
export function InsightEvidenceRow({ evidence, onNavigate }: Props) {
  const items = evidence.items ?? [];

  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] px-2.5 py-2 text-xs text-[var(--fg-muted)]">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <span className="min-w-0 flex-1 break-words">{evidence.summary}</span>
        {evidence.facts.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {evidence.facts.map((fact) => (
              <span
                key={fact.label}
                className="whitespace-nowrap rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-ui-2xs font-semibold text-[var(--fg)]"
              >
                {fact.label}: {fact.value}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      {evidence.cause ? (
        <p className="break-words rounded-[3px] bg-[var(--bg-subtle)] px-2 py-1 font-mono text-ui-2xs text-[var(--fg)]">
          <span className="font-sans font-semibold text-[var(--fg-muted)]">Neden: </span>
          {evidence.cause}
        </p>
      ) : null}

      {items.length > 0 ? (
        <details className="group">
          <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 font-semibold text-[var(--fg)]">
            <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
            Etkilenen kayıtlar ({items.length})
          </summary>
          <ul className="mt-1 flex flex-col gap-1 pl-4">
            {items.map((item) => (
              <li key={`${item.label}|${item.detail ?? ''}`} className="flex min-w-0 flex-col break-words sm:flex-row sm:gap-2">
                {item.path ? (
                  <Link href={item.path} className="min-w-0 break-words font-semibold text-[var(--fg)] hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className="min-w-0 break-words font-semibold text-[var(--fg)]">{item.label}</span>
                )}
                {item.detail ? <span className="min-w-0 break-words">{item.detail}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <EvidenceTarget evidence={evidence} onNavigate={onNavigate} />
    </li>
  );
}

// Önce izleme sekmesi (bağlam kaybolmaz), yoksa uygulama içi sayfa; ikisi de yoksa bağlantı yok.
function EvidenceTarget({ evidence, onNavigate }: Props) {
  const label = evidence.actionLabel ?? 'İlgili ekrana git';

  if (isMonitoringTabKey(evidence.targetTab)) {
    const tab = evidence.targetTab;
    return (
      <button type="button" className={`${LINK_CLASS} self-start`} onClick={() => onNavigate(tab)}>
        {label} <ArrowUpRight size={12} />
      </button>
    );
  }
  if (evidence.targetPath) {
    return (
      <Link href={evidence.targetPath} className={`${LINK_CLASS} self-start`}>
        {label} <ArrowUpRight size={12} />
      </Link>
    );
  }
  return null;
}
