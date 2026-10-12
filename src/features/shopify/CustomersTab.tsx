'use client';

import { useState, type SyntheticEvent } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  shopifyExplorerApi, type SaveShopifyCustomerBody, type ShopifyCustomerListItemDto, type ShopifyWriteResultDto,
} from '../../lib/api/shopify-explorer';
import { useFeedback } from '../shared/Feedback';
import { CustomerForm } from './CustomerForm';
import { explorerErrorText, formatDateTime, writeFailure } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { PagerBar } from './PagerBar';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';
import { useCursorPaging } from './useCursorPaging';

interface Props {
  storeId: number;
}

const LIST_STALE_MS = 30_000;

// null = form kapalı, 'new' = yeni müşteri, müşteri = o müşteriyi düzenle.
type FormTarget = 'new' | ShopifyCustomerListItemDto | null;

// Müşteriler: canlı sayfalı liste (kişisel veri panelde kopyalanmaz) + ekle / düzenle / sil.
export function CustomersTab({ storeId }: Props) {
  const queryClient = useQueryClient();
  const { notify, confirm } = useFeedback();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormTarget>(null);
  const [writing, setWriting] = useState(false);
  const paging = useCursorPaging();

  const list = useQuery({
    queryKey: ['shopify', 'customers', storeId, search, paging.after],
    queryFn: () => shopifyExplorerApi.customers(storeId, search, paging.after),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });

  const submitSearch = (event: SyntheticEvent) => {
    event.preventDefault();
    paging.reset();
    setSearch(draft);
  };

  // Ekle / düzenle / sil aynı akış: çağır → Shopify reddini göster → başarıda formu kapat ve listeyi yenile.
  const write = async (action: () => Promise<ShopifyWriteResultDto>, successText: string) => {
    setWriting(true);
    try {
      const failure = writeFailure(await action());
      if (failure) {
        notify.error(failure);
        return;
      }
      notify.success(successText);
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ['shopify', 'customers', storeId] });
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setWriting(false);
    }
  };

  const save = (body: SaveShopifyCustomerBody) => {
    if (form === null) return;
    if (form === 'new') void write(() => shopifyExplorerApi.createCustomer(storeId, body), 'Müşteri oluşturuldu.');
    else void write(() => shopifyExplorerApi.updateCustomer(storeId, form.id, body), 'Müşteri güncellendi.');
  };

  const remove = async (customer: ShopifyCustomerListItemDto) => {
    const ok = await confirm({
      title: 'Müşteri Shopify\'dan silinsin mi?',
      body: `${customer.name ?? 'İsimsiz müşteri'} silinir. Bu işlem geri alınamaz; siparişi olan müşteri silinemez.`,
      confirmLabel: 'Müşteriyi sil',
      danger: true,
    });
    if (ok) await write(() => shopifyExplorerApi.deleteCustomer(storeId, customer.id), 'Müşteri silindi.');
  };

  const customers = list.data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={submitSearch} className="flex items-end gap-2" aria-label="Müşteri arama">
        <label className="flex flex-1 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Ara (ad, e-posta, telefon)
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className={fieldClass} />
        </label>
        <button type="submit" className={primaryButtonClass}><Search size={14} aria-hidden /> Ara</button>
        <button type="button" className={ghostButtonClass} onClick={() => setForm('new')}>
          <Plus size={14} aria-hidden /> Yeni müşteri
        </button>
      </form>
      {form !== null && (
        <CustomerForm
          key={form === 'new' ? 'new' : form.id}
          title={form === 'new' ? 'Yeni müşteri' : `Müşteriyi düzenle: ${form.name ?? 'İsimsiz müşteri'}`}
          initial={form === 'new' ? undefined : { email: form.email, phone: form.phone }}
          busy={writing} onSubmit={save} onCancel={() => setForm(null)}
        />
      )}
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={customers.length === 0}
        emptyTitle={search ? 'Aramaya uyan müşteri yok' : 'Mağazada müşteri yok'}
        onRetry={() => void list.refetch()}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {customers.map((customer) => (
            <li key={customer.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2">
              <span className="min-w-0 flex-1 basis-40 break-words text-ui-sm font-bold text-fg">{customer.name ?? 'İsimsiz müşteri'}</span>
              <span className="min-w-0 flex-1 basis-40 break-all text-ui-xs text-fg-muted">
                {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'İletişim bilgisi yok'}
              </span>
              <span className="text-ui-xs text-fg">{customer.orderCount} sipariş</span>
              <span className="text-ui-2xs text-fg-muted">{formatDateTime(customer.createdAt)}</span>
              <span className="flex gap-1">
                <button type="button" className={ghostButtonClass} aria-label={`${customer.name ?? 'Müşteri'} düzenle`} onClick={() => setForm(customer)}>
                  <Pencil size={14} aria-hidden />
                </button>
                <button type="button" className={ghostButtonClass} aria-label={`${customer.name ?? 'Müşteri'} sil`} disabled={writing} onClick={() => void remove(customer)}>
                  <Trash2 size={14} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
        <PagerBar
          pageNumber={paging.pageNumber} hasPrevious={paging.hasPrevious} hasNext={Boolean(list.data?.hasNextPage)}
          busy={list.isFetching} total={list.data?.total} onPrevious={paging.previous}
          onNext={() => list.data?.endCursor && paging.next(list.data.endCursor)}
        />
      </ExplorerState>
    </div>
  );
}
