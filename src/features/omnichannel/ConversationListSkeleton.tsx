import { Skeleton } from '../../components/ui/Skeleton';

const SKELETON_ROWS = 8;

// Liste yüklenirken gerçek satırın iskeleti: avatar + üç çizgi. Yükseklik gerçek satırla aynı
// tutulur ki veri gelince liste zıplamasın.
export function ConversationListSkeleton() {
  return (
    <div role="status" aria-label="Konuşmalar yükleniyor" className="flex flex-col">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-start gap-3 border-b border-border-soft px-4 py-3">
          <Skeleton width={40} height={40} className="shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton height={12} width="55%" className="rounded-md" />
            <Skeleton height={10} width="85%" className="rounded-md" />
            <Skeleton height={14} width="40%" className="rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
