'use client';

import { useState, type SyntheticEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { shopifyPromotionsApi, type ShopifyDiscountDto } from '../../lib/api/shopify-promotions';
import { useFeedback } from '../shared/Feedback';
import { discountFamily, discountKindBadge, isEditableKind } from './discountKindRules';
import { EditDiscountPanel } from './EditDiscountPanel';
import { NewDiscountPanel } from './NewDiscountPanel';
import { formatDateTime } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { FilterField, FilterSelectField } from './FilterField';
import { PagerBar } from './PagerBar';
import { describeDiscountValue, describeUsage, discountStatusMeta, DISCOUNT_STATUS_OPTIONS } from './promotionRules';
import { StatusBadge } from './StatusBadge';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';
import { useCursorPaging } from './useCursorPaging';
import { useShopifyWrite } from './useShopifyWrite';

interface Props {
  storeId: number;
}

const LIST_STALE_MS = 30_000;
const ACTIVE_STATUS = 'ACTIVE';

// İndirim kodları: canlı liste + oluştur / etkinleştir / devre dışı bırak / sil. Silme geri alınamaz → onay penceresi.
export function DiscountCodesSection({ storeId }: Props) {
  const { confirm } = useFeedback();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const paging = useCursorPaging();
  const { writing, run } = useShopifyWrite(['shopify', 'discounts', storeId]);

  const list = useQuery({
    queryKey: ['shopify', 'discounts', storeId, search, status, paging.after],
    queryFn: () => shopifyPromotionsApi.discounts(storeId, search, status, paging.after),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });

  const submitSearch = (event: SyntheticEvent) => {
    event.preventDefault();
    paging.reset();
    setSearch(draft);
  };

  const startEditing = (id: number) => {
    setCreating(false);
    setEditingId(id);
  };

  const startCreating = () => {
    setEditingId(null);
    setCreating(true);
  };

  const toggle = (discount: ShopifyDiscountDto) => {
    const family = discountFamily(discount.kind);
    if (discount.status === ACTIVE_STATUS) {
      void run(() => shopifyPromotionsApi.deactivateDiscount(storeId, discount.id, family), 'İndirim devre dışı bırakıldı.');
    } else {
      void run(() => shopifyPromotionsApi.activateDiscount(storeId, discount.id, family), 'İndirim etkinleştirildi.');
    }
  };

  const remove = async (discount: ShopifyDiscountDto) => {
    const ok = await confirm({
      title: 'İndirim Shopify\'dan silinsin mi?',
      body: `${discount.code ?? discount.title} silinir. Bu işlem geri alınamaz; geçici kapatmak için "Devre dışı bırak"ı kullanın.`,
      confirmLabel: 'İndirimi sil',
      danger: true,
    });
    if (ok) await run(() => shopifyPromotionsApi.deleteDiscount(storeId, discount.id, discountFamily(discount.kind)), 'İndirim silindi.');
  };

  const discounts = list.data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submitSearch} className="flex flex-wrap items-end gap-2" aria-label="İndirim arama">
        <FilterField label="Kod ara" wide>
          <input aria-label="Kod ara" value={draft} onChange={(e) => setDraft(e.target.value)} className={fieldClass} />
        </FilterField>
        <FilterSelectField
          label="Durum" value={status} options={DISCOUNT_STATUS_OPTIONS} allLabel="Tümü"
          onChange={(value) => { paging.reset(); setStatus(value); }}
        />
        <button type="submit" className={primaryButtonClass}><Search size={14} aria-hidden /> Ara</button>
        <button type="button" className={ghostButtonClass} onClick={startCreating}>
          <Plus size={14} aria-hidden /> Yeni indirim
        </button>
      </form>
      {creating && <NewDiscountPanel storeId={storeId} onDone={() => setCreating(false)} />}
      {editingId !== null && <EditDiscountPanel storeId={storeId} discountId={editingId} onDone={() => setEditingId(null)} />}
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={discounts.length === 0}
        emptyTitle={search || status ? 'Süzgece uyan indirim yok' : 'Mağazada indirim kodu yok'}
        onRetry={() => void list.refetch()}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {discounts.map((discount) => (
            <DiscountRow key={discount.id} discount={discount} busy={writing} onEdit={startEditing} onToggle={toggle} onRemove={remove} />
          ))}
        </ul>
        <PagerBar
          pageNumber={paging.pageNumber} hasPrevious={paging.hasPrevious} hasNext={Boolean(list.data?.hasNextPage)}
          busy={list.isFetching} onPrevious={paging.previous}
          onNext={() => list.data?.endCursor && paging.next(list.data.endCursor)}
        />
      </ExplorerState>
    </div>
  );
}

interface RowProps {
  discount: ShopifyDiscountDto;
  busy: boolean;
  onEdit: (id: number) => void;
  onToggle: (discount: ShopifyDiscountDto) => void;
  onRemove: (discount: ShopifyDiscountDto) => Promise<void>;
}

function DiscountRow({ discount, busy, onEdit, onToggle, onRemove }: RowProps) {
  const meta = discountStatusMeta(discount.status);
  const kindBadge = discountKindBadge(discount.kind);
  const isActive = discount.status === ACTIVE_STATUS;
  const label = discount.code ?? discount.title;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2">
      <span className="min-w-0 flex-1 basis-40 break-words">
        <span className="block text-ui-sm font-bold text-fg">{label}</span>
        <span className="block text-ui-2xs text-fg-muted">{discount.title}</span>
      </span>
      <StatusBadge label={kindBadge.label} tone={kindBadge.tone} />
      <span className="text-ui-xs font-semibold text-fg">{describeDiscountValue(discount)}</span>
      <StatusBadge label={meta.label} tone={meta.tone} />
      <span className="text-ui-xs text-fg-muted">{describeUsage(discount)}</span>
      <span className="text-ui-2xs text-fg-muted">
        {discount.startsAt ? formatDateTime(discount.startsAt) : '—'} → {discount.endsAt ? formatDateTime(discount.endsAt) : 'süresiz'}
      </span>
      <span className="flex gap-1">
        {isEditableKind(discount.kind) && (
          <button type="button" className={ghostButtonClass} aria-label={`${label} düzenle`} disabled={busy} onClick={() => onEdit(discount.id)}>
            <Pencil size={14} aria-hidden /> Düzenle
          </button>
        )}
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => onToggle(discount)}>
          <Power size={14} aria-hidden /> {isActive ? 'Devre dışı bırak' : 'Etkinleştir'}
        </button>
        <button type="button" className={ghostButtonClass} aria-label={`${label} sil`} disabled={busy} onClick={() => void onRemove(discount)}>
          <Trash2 size={14} aria-hidden />
        </button>
      </span>
    </li>
  );
}
