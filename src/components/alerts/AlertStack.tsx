'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X, Loader2 } from 'lucide-react';
import { useAlertStack, type AlertItem, type AlertType } from '../../stores/alert-stack';

interface AlertTypeConfig {
  Icon: typeof Info;
  borderClass: string;
  badgeClass: string;
  iconClass: string;
}

const TYPE_CONFIG: Record<AlertType, AlertTypeConfig> = {
  success: {
    Icon: CheckCircle2,
    borderClass: 'border-l-emerald-500 dark:border-l-emerald-600',
    badgeClass: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  info: {
    Icon: Info,
    borderClass: 'border-l-sky-500 dark:border-l-sky-600',
    badgeClass: 'bg-sky-500/10 dark:bg-sky-500/15',
    iconClass: 'text-sky-600 dark:text-sky-400',
  },
  warning: {
    Icon: AlertTriangle,
    borderClass: 'border-l-amber-500 dark:border-l-amber-600',
    badgeClass: 'bg-amber-500/10 dark:bg-amber-500/15',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    Icon: XCircle,
    borderClass: 'border-l-rose-500 dark:border-l-rose-600',
    badgeClass: 'bg-rose-500/10 dark:bg-rose-500/15',
    iconClass: 'text-rose-600 dark:text-rose-400',
  },
};

export function AlertStack() {
  const alerts = useAlertStack((s) => s.alerts);

  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col-reverse gap-2 pointer-events-none max-w-[360px] w-[calc(100vw-32px)]">
      {alerts.map((a) => <AlertToast key={a.id} item={a} />)}
    </div>
  );
}

function AlertToast({ item }: { item: AlertItem }) {
  const dismiss = useAlertStack((s) => s.dismiss);
  const { Icon, borderClass, badgeClass, iconClass } = TYPE_CONFIG[item.type];

  useEffect(() => {
    if (item.durationMs <= 0) return;
    const t = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => clearTimeout(t);
  }, [item.id, item.durationMs, dismiss]);

  return (
    <div
      className={`alert-toast-enter pointer-events-auto flex items-center gap-2.5 px-3 py-2.5 rounded-[4px] border border-[var(--border)] border-l-[3px] ${borderClass} bg-[var(--card)] shadow-md text-[12.5px] text-[var(--fg)]`}
    >
      <span
        className={`w-6 h-6 rounded-[3px] shrink-0 flex items-center justify-center ${badgeClass}`}
      >
        {item.pending ? (
          <Loader2 size={13} className={`animate-spin ${iconClass}`} />
        ) : (
          <Icon size={13} className={iconClass} />
        )}
      </span>

      <span className="flex-1 leading-snug font-medium break-words">
        {item.message}
      </span>

      {item.action && (
        <button
          onClick={() => {
            item.action?.onClick();
            dismiss(item.id);
          }}
          className="shrink-0 cursor-pointer rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card-hover)] transition-colors"
        >
          {item.action.label}
        </button>
      )}

      {!item.pending && (
        <button
          onClick={() => dismiss(item.id)}
          className="shrink-0 cursor-pointer p-1 rounded-[3px] text-[var(--fg-subtle)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition-colors flex items-center justify-center"
          aria-label="Kapat"
        >
          <X size={13} />
        </button>
      )}

      <style>{`
        .alert-toast-enter { animation: alertSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

