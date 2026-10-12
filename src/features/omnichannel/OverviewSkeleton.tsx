import { Skeleton } from '../../components/ui/Skeleton';

const CARD_COUNT = 6;

// Özet gelene kadar kart ızgarasının yerini tutar; veri gelince sayfa zıplamaz.
export function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy aria-label="Genel bakış yükleniyor">
      {Array.from({ length: CARD_COUNT }, (_, i) => <Skeleton key={i} className="h-64 w-full rounded-md" />)}
    </div>
  );
}
