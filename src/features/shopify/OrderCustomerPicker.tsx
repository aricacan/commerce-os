'use client';

import { useState, type SyntheticEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { shopifyExplorerApi, type ShopifyCustomerListItemDto } from '../../lib/api/shopify-explorer';
import { explorerErrorText } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  onPick: (customer: ShopifyCustomerListItemDto) => void;
}

const SEARCH_STALE_MS = 30_000;

// Mevcut müşteriyi ara ve seç (ad, e-posta, telefon). Seçilmezse sipariş formundaki e-postayla yeni müşteri oluşturulur.
export function OrderCustomerPicker({ storeId, onPick }: Props) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const results = useQuery({
    queryKey: ['shopify', 'order-customer-picker', storeId, search],
    queryFn: () => shopifyExplorerApi.customers(storeId, search, null),
    enabled: search !== '',
    staleTime: SEARCH_STALE_MS,
  });

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    setSearch(draft.trim());
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex items-end gap-2" aria-label="Müşteri arama">
        <label className="flex flex-1 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Mevcut müşteri ara (ad, e-posta, telefon)
          <input value={draft} onChange={(e) => setDraft(e.target.value)} className={fieldClass} />
        </label>
        <button type="submit" className={primaryButtonClass} disabled={draft.trim() === ''}><Search size={14} aria-hidden /> Ara</button>
      </form>
      {results.isFetching && <p className="m-0 text-ui-2xs text-fg-muted">Aranıyor…</p>}
      {results.error && <p role="alert" className="m-0 text-ui-xs text-danger">Arama çalışmadı: {explorerErrorText(results.error)}</p>}
      {results.data?.items.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Aramaya uyan müşteri yok; aşağıya yeni müşteri bilgisi yazın.</p>}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {results.data?.items.map((customer) => (
          <li key={customer.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-1.5 text-ui-xs">
            <span className="min-w-0 flex-1 basis-32 break-words font-bold text-fg">{customer.name ?? 'İsimsiz müşteri'}</span>
            <span className="min-w-0 flex-1 basis-32 break-all text-fg-muted">{[customer.email, customer.phone].filter(Boolean).join(' · ') || 'İletişim yok'}</span>
            <button type="button" className={ghostButtonClass} onClick={() => onPick(customer)}>Seç</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
