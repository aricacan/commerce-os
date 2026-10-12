'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

// Sistem İzleme'nin KULLANICILAR / Sayfalar / Güvenlik sekmelerinin ortak parçaları.
// Her sekme aynı gün seçiciyi, sayfalayıcıyı ve yükleniyor/hata/boş üçlüsünü kullanır —
// tek tek yazılsaydı beş sekme beş ayrı görünüme kayardı.

const NOW_TICK_MS = 60_000;

/** "5 dk önce" gibi göreli zamanlar için dakikada bir ilerleyen şimdiki an. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export const DAY_OPTIONS = [
  { value: 1, label: '24 saat' },
  { value: 7, label: '7 gün' },
  { value: 30, label: '30 gün' },
];

export function DaysSelector({ value, onChange, options = DAY_OPTIONS }: {
  value: number;
  onChange: (days: number) => void;
  options?: { value: number; label: string }[];
}) {
  return <SegmentedControl size="sm" value={value} options={options} onChange={onChange} />;
}

/** Kenarlıklı içerik kartı; başlık verilirse üstte küçük büyük-harf etiket çizer. */
export function Panel({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] px-4 py-2.5">
          <h3 className="text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">{title}</h3>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

interface QueryStatusProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  children: ReactNode;
}

/** Sorgunun dört hâli tek yerde: yükleniyor → iskelet, hata → yeniden dene, boş → açıklama. */
export function QueryStatus({
  isLoading, isError, isEmpty, onRetry, emptyIcon, emptyTitle, emptyDescription, children,
}: QueryStatusProps) {
  if (isLoading) return <SkeletonList count={5} rowHeight={40} className="p-4" />;
  if (isError) {
    return (
      <ErrorState
        title="Veri yüklenemedi"
        description="Sunucuya ulaşılamadı ya da istek hata verdi."
        onRetry={onRetry}
      />
    );
  }
  if (isEmpty) return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  return <>{children}</>;
}

export function Pager({ page, pageSize, totalCount, onChange }: {
  page: number;
  pageSize: number;
  totalCount: number;
  onChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  if (pageCount <= 1) return null;

  const buttonClass =
    'flex h-7 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] px-4 py-2.5">
      <span className="mr-auto text-xs text-[var(--fg-muted)]">
        {totalCount.toLocaleString('tr-TR')} kayıt · {page}/{pageCount}
      </span>
      <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={13} /> Önceki
      </button>
      <button type="button" className={buttonClass} disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        Sonraki <ChevronRight size={13} />
      </button>
    </div>
  );
}

export type PillTone = 'success' | 'danger' | 'warning' | 'neutral' | 'muted';

const PILL_TONES: Record<PillTone, string> = {
  success: 'bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)]',
  danger: 'bg-[rgba(var(--danger-rgb),0.1)] text-[var(--danger)]',
  warning: 'bg-[rgba(var(--warning-rgb),0.1)] text-[var(--warning)]',
  neutral: 'bg-[var(--bg-subtle)] text-[var(--fg)]',
  muted: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]',
};

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-ui-2xs font-bold ${PILL_TONES[tone]}`}>
      {children}
    </span>
  );
}

/** Tablo başlık ve hücre sınıfları — yeni sekmelerin tabloları aynı yoğunlukta dursun. */
export const TH_CLASS =
  'whitespace-nowrap border-b border-[var(--border-soft)] px-4 py-2 text-left text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]';
export const TD_CLASS = 'whitespace-nowrap border-b border-[var(--border-soft)] px-4 py-2.5 text-xs text-[var(--fg)]';
