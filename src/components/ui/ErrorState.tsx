'use client';

import { RotateCw } from 'lucide-react';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<unknown>;
  retryLabel?: string;
  detail?: string;
  className?: string;
};

export function ErrorState({
  title = 'Sayfa yüklenirken bir sorun oluştu',
  description = 'Lütfen tekrar deneyin veya daha sonra yeniden kontrol edin.',
  onRetry,
  retryLabel = 'Yeniden Dene',
  detail,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-2.5 px-4 py-12 text-center ${className}`}
    >
      <div className="flex max-w-sm flex-col items-center gap-1">
        <p className="text-xs font-semibold text-[var(--fg)] m-0">{title}</p>
        {description && (
          <p className="text-ui-xs leading-relaxed text-[var(--fg-muted)] m-0">{description}</p>
        )}
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1.5 inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--fg)] shadow-[var(--shadow-xs)] hover:bg-[var(--card-hover)] transition-all cursor-pointer"
        >
          <RotateCw size={12} className="text-[var(--fg-muted)]" />
          <span>{retryLabel}</span>
        </button>
      )}

      {detail && (
        <details className="mt-2 max-w-full text-ui-xs text-[var(--fg-subtle)]">
          <summary className="cursor-pointer select-none opacity-60 hover:opacity-100">Hata Kodu: {detail}</summary>
        </details>
      )}
    </div>
  );
}
