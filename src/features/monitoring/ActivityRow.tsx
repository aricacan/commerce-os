'use client';

import { useState } from 'react';
import { Check, ChevronDown, Copy } from 'lucide-react';
import type { ActivityChangeDto, ActivityEntryDto } from '../../lib/api';
import { formatClock } from './format';

const COPIED_RESET_MS = 1_500;

// Aktivite Akışı'nın tek satırı: "14:32 · Ahmet manuel sipariş MS-0042 oluşturdu".
// Genel Bakış'taki "son işlemler" kartı da aynı satırı `compact` olarak kullanır.
export function ActivityRow({ entry, compact = false }: { entry: ActivityEntryDto; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const expandable = !compact && entry.changes.length > 0;

  return (
    <li className="flex flex-col gap-2 px-4 py-2.5">
      <div className="flex items-start gap-3">
        <span className="w-10 shrink-0 pt-px font-mono text-ui-2xs text-[var(--fg-muted)]">{formatClock(entry.createdAt)}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs text-[var(--fg)]">
            <span className="font-bold">{entry.actorName}</span> {entry.summary}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-ui-2xs text-[var(--fg-muted)]">
            <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-px font-semibold">{entry.domain}</span>
            {entry.targetLabel ? <span className="truncate">{entry.targetLabel}</span> : null}
            {!compact && entry.correlationId ? <CopyCorrelation id={entry.correlationId} /> : null}
          </div>
        </div>
        {expandable ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex shrink-0 items-center gap-1 rounded-[4px] px-1.5 py-1 text-ui-2xs font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
          >
            {entry.changes.length} değişiklik
            <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
      </div>
      {expandable && open ? <ChangesTable changes={entry.changes} /> : null}
    </li>
  );
}

function ChangesTable({ changes }: { changes: ActivityChangeDto[] }) {
  return (
    <div className="overflow-x-auto sm:ml-[52px]">
      <table className="w-full border-collapse text-ui-2xs">
        <thead>
          <tr className="text-left text-[var(--fg-muted)]">
            <th className="px-2 py-1 font-semibold">Alan</th>
            <th className="px-2 py-1 font-semibold">Önce</th>
            <th className="px-2 py-1 font-semibold">Sonra</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.field} className="border-t border-[var(--border-soft)]">
              <td className="px-2 py-1 font-semibold text-[var(--fg)]">{change.label}</td>
              <td className="px-2 py-1 text-[var(--fg-muted)] line-through decoration-[var(--fg-subtle)]">{change.old ?? '—'}</td>
              <td className="px-2 py-1 text-[var(--fg)]">{change.new ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyCorrelation({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Pano izni yoksa (http, eski tarayıcı) kimlik yine title'da okunabilir kalır.
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`İstek kimliği: ${id}`}
      className="flex items-center gap-1 rounded-[3px] px-1 py-px hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Kopyalandı' : 'İstek kimliği'}
    </button>
  );
}
