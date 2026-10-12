import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import type { MonitoringSectionState } from './useMonitoringSection';

interface Props<T> {
  title: string;
  state: MonitoringSectionState<T>;
  // Dönemde hiç kayıt yoksa gösterilecek boş durum; verilmezse veri geldiği sürece içerik çizilir.
  isEmpty?: (data: T) => boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  children: (data: T) => ReactNode;
}

// Bir izleme bölümü: başlık + yükleniyor iskeleti / hata (yeniden dene) / boş durum / içerik.
// Hata ya da boşluk sessizce gizlenmez; her biri kendi durumunu gösterir.
export function MonitoringSection<T>({ title, state, isEmpty, emptyIcon, emptyTitle, emptyDescription, children }: Props<T>) {
  const { data, loading, error, reload } = state;
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-busy={loading}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
      {error && (
        <div className="rounded-md border border-border-soft bg-card">
          <ErrorState title="Bu bölüm yüklenemedi" description={error} onRetry={reload} className="py-6" />
        </div>
      )}
      {!error && !data && loading && <SectionSkeleton />}
      {!error && data && isEmpty?.(data) && (
        <div className="rounded-md border border-border-soft bg-card">
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="py-8" />
        </div>
      )}
      {!error && data && !isEmpty?.(data) && (
        <div className={loading ? 'opacity-60 transition-opacity motion-reduce:transition-none' : ''}>{children(data)}</div>
      )}
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 rounded-md" />)}
    </div>
  );
}
