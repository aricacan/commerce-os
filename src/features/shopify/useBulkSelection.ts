'use client';

import { useState } from 'react';
import { SHOPIFY_BULK_MAX_ITEMS } from '../../lib/api/shopify-bulk';
import { addWithinLimit, removeIds } from './bulkRules';

export interface BulkSelection {
  selected: ReadonlySet<number>;
  count: number;
  limitReached: boolean;
  toggle: (id: number) => void;
  setMany: (ids: readonly number[], on: boolean) => void;
  remove: (ids: readonly number[]) => void;
  clear: () => void;
}

// Liste çoklu seçimi (kimlik kümesi). Sayfa değişse de seçim korunur; en fazla SHOPIFY_BULK_MAX_ITEMS kayıt seçilir.
export function useBulkSelection(): BulkSelection {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  const setMany = (ids: readonly number[], on: boolean) =>
    setSelected((current) => (on ? addWithinLimit(current, ids) : removeIds(current, ids)));

  return {
    selected,
    count: selected.size,
    limitReached: selected.size >= SHOPIFY_BULK_MAX_ITEMS,
    toggle: (id) => setMany([id], !selected.has(id)),
    setMany,
    remove: (ids) => setMany(ids, false),
    clear: () => setSelected(new Set()),
  };
}
