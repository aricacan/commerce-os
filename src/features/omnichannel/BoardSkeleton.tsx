import { Skeleton } from '../../components/ui/Skeleton';
import { BOARD_COLUMNS } from './boardColumns';

const SKELETON_CARDS = 3;

// Pano ilk yüklenirken gerçek sütun/kart düzeninin iskeleti: genişlik ve sayı gerçekle aynı, zıplama yok.
export function BoardSkeleton() {
  return (
    <div role="status" aria-label="Pano yükleniyor" className="flex h-full min-w-0 gap-3 overflow-hidden p-4">
      {BOARD_COLUMNS.map((column) => (
        <div key={column.key} className="flex w-full shrink-0 flex-col gap-2 rounded-2xl border border-border-soft bg-bg-subtle/60 p-2 sm:w-[300px]">
          <Skeleton height={14} width="45%" className="m-2 rounded-md" />
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <Skeleton key={index} height={96} className="rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
