import type { ReactNode } from 'react';
import { Skeleton } from '../../components/ui/Skeleton';
import { Sparkline } from '../../components/ui/Sparkline';

// Genel Bakış'ın iki yapı taşı: widget kartı (başlık + içerik + "ne görüyorum?" cümlesi; yükleniyor ve hata
// durumunu kendisi çizer) ve KPI kutusu (sayı + ipucu + isteğe bağlı mini grafik).

const CARD_CLASS = 'flex min-w-0 flex-col gap-2 rounded-md border border-border-soft bg-card p-3';

interface ChartCardProps {
  title: string;
  caption?: string;
  children: ReactNode;
  // Izgarada kaç sütun kaplayacağı (ör. "xl:col-span-2").
  className?: string;
  // Başlığın sağındaki kısayol (ör. "Tümünü gör").
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ChartCard({ title, caption, children, className = '', action, loading = false, error = null, onRetry }: ChartCardProps) {
  return (
    <section className={`${CARD_CLASS} ${className}`}>
      <header className="flex items-center justify-between gap-2">
        <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
        {action}
      </header>
      <CardBody loading={loading} error={error} onRetry={onRetry}>
        {children}
        {caption && <p className="m-0 text-ui-xs text-fg-muted">{caption}</p>}
      </CardBody>
    </section>
  );
}

function CardBody({ loading, error, onRetry, children }: Pick<ChartCardProps, 'loading' | 'error' | 'onRetry' | 'children'>) {
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-ui-xs text-danger">
        <span>{error}</span>
        {onRetry && (
          <button
            type="button" onClick={onRetry}
            className="cursor-pointer rounded-md border border-border bg-transparent px-2.5 py-1 text-ui-xs font-semibold text-fg hover:bg-bg-subtle"
          >
            Yeniden dene
          </button>
        )}
      </div>
    );
  }
  if (loading) return <Skeleton className="h-40 w-full rounded-md" />;
  return <>{children}</>;
}

interface KpiTileProps {
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
  storea?: number[];
  // Verilirse kutu tıklanır (ör. "Cevap bekleyen" → gelen kutusu o filtreyle).
  onClick?: () => void;
  actionLabel?: string;
}

const TILE_CLASS = `${CARD_CLASS} gap-1 text-left`;

export function KpiTile({ label, value, hint, warn = false, storea, onClick, actionLabel }: KpiTileProps) {
  const content = (
    <>
      <span className="text-[10.5px] font-semibold uppercase text-fg-muted">{label}</span>
      <span className="flex items-end justify-between gap-2">
        <span className={`truncate text-2xl font-bold tabular-nums ${warn ? 'text-warning' : 'text-fg'}`}>{value}</span>
        {storea && <Sparkline data={storea} color="var(--info)" />}
      </span>
      <span className="text-[11px] text-fg-muted">{hint}</span>
    </>
  );
  if (!onClick) return <div className={TILE_CLASS}>{content}</div>;
  return (
    <button
      type="button" onClick={onClick} title={actionLabel} aria-label={actionLabel ? `${label}: ${value} — ${actionLabel}` : undefined}
      className={`${TILE_CLASS} cursor-pointer transition-colors hover:border-border hover:bg-bg-subtle`}
    >
      {content}
    </button>
  );
}

// Kart başlığındaki küçük kısayol düğmesi ("Tümünü gör").
export function CardLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="cursor-pointer border-0 bg-transparent p-0 text-ui-xs font-semibold text-fg-muted hover:text-fg"
    >
      {label}
    </button>
  );
}

// Yükleniyor iskeleti: kutular ve kartlar yerleşimle aynı yerde durur, sayfa zıplamaz.
export function KpiSkeleton() {
  return <Skeleton className="h-[88px] w-full rounded-md" />;
}
