'use client';

import { Store } from 'lucide-react';
import { FilterSelect } from '../../components/ui/FilterSelect';
import type { ShopifyStoreDto } from '../../lib/api/shopify';

interface Props {
  stores: ShopifyStoreDto[];
  storeId: number | null;
  onChange: (storeId: number) => void;
}

// Gezgin ekranlarının üstündeki mağaza seçici (her sekme aynı seçimi paylaşır).
export function StoreScopeBar({ stores, storeId, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 text-ui-xs text-fg-muted">
      <Store size={14} aria-hidden />
      <span className="shrink-0">Mağaza</span>
      <FilterSelect
        ariaLabel="Mağaza" placeholder="Mağaza seçin" showAllOption={false} minWidth={160} className="max-w-64"
        value={storeId === null ? '' : String(storeId)}
        options={stores.map((store) => ({ value: String(store.id), label: `${store.name} (${store.countryCode})` }))}
        onChange={(value) => onChange(Number(value))}
        triggerClassName="rounded-md"
      />
    </div>
  );
}
