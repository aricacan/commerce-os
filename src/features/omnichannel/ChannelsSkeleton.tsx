import { Skeleton } from '../../components/ui/Skeleton';

const SKELETON_CARD_COUNT = 3;
const SKELETON_CARD_HEIGHT = 168;
const SKELETON_TITLE_HEIGHT = 20;
const SKELETON_TITLE_WIDTH = 160;

// Kanallar yüklenirken marka başlığı + üç kart iskeleti.
export function ChannelsSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Kanallar yükleniyor">
      <Skeleton height={SKELETON_TITLE_HEIGHT} width={SKELETON_TITLE_WIDTH} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => (
          <Skeleton key={i} height={SKELETON_CARD_HEIGHT} className="rounded-md" />
        ))}
      </div>
    </div>
  );
}
