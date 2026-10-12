// Genel Bakış'taki "şu an" liste widget'larının (devir kuyruğu, süresi geçen konuşmalar, görevler) ortak satır listesi.

export interface SnapshotItem {
  id: number;
  title: string;
  subtitle: string;
  // Sağdaki kısa bilgi ("3sa", "Yarın").
  meta: string;
  // Dikkat isteyen satır (acil, vadesi geçmiş): meta metni uyarı renginde.
  attention?: boolean;
  onOpen?: () => void;
}

const ROW_CLASS = 'flex w-full min-w-0 items-start justify-between gap-3 rounded-md border border-border-soft p-2 text-left';

export function SnapshotList({ items, emptyText, ariaLabel }: { items: SnapshotItem[]; emptyText: string; ariaLabel: string }) {
  if (items.length === 0) return <p className="m-0 py-6 text-center text-ui-sm text-fg-muted">{emptyText}</p>;

  return (
    <ul aria-label={ariaLabel} className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <SnapshotRow item={item} />
        </li>
      ))}
    </ul>
  );
}

function SnapshotRow({ item }: { item: SnapshotItem }) {
  const content = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-ui-sm font-semibold text-fg">{item.title}</span>
        <span className="truncate text-ui-xs text-fg-muted">{item.subtitle}</span>
      </span>
      <span className={`shrink-0 text-ui-xs tabular-nums ${item.attention ? 'font-semibold text-warning' : 'text-fg-muted'}`}>{item.meta}</span>
    </>
  );
  if (!item.onOpen) return <div className={ROW_CLASS}>{content}</div>;
  return (
    <button type="button" onClick={item.onOpen} className={`${ROW_CLASS} cursor-pointer bg-transparent hover:bg-bg-subtle`}>
      {content}
    </button>
  );
}
