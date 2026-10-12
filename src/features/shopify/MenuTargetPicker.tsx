'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { shopifyStoreContentApi, type ShopifyMenuTargetDto } from '../../lib/api/shopify-store-content';
import { listRowClass } from './contentStyles';
import { explorerErrorText } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  // COLLECTION | PRODUCT | PAGE
  kind: string;
  onPick: (target: ShopifyMenuTargetDto) => void;
}

const TARGETS_STALE_MS = 30_000;
const ENTER_KEY = 'Enter';

// Menü öğesinin bağlanacağı koleksiyon / ürün / sayfayı Shopify'da canlı arar. Boş aramada ilk sonuçlar gelir.
export function MenuTargetPicker({ storeId, kind, onPick }: Props) {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');

  const targets = useQuery({
    queryKey: ['shopify', 'menu-targets', storeId, kind, search],
    queryFn: () => shopifyStoreContentApi.menuTargets(storeId, kind, search),
    staleTime: TARGETS_STALE_MS,
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          aria-label="Hedef ara" value={draft} onChange={(e) => setDraft(e.target.value)} className={fieldClass} placeholder="Hedef ara…"
          onKeyDown={(e) => { if (e.key === ENTER_KEY) { e.preventDefault(); setSearch(draft.trim()); } }}
        />
        <button type="button" className={primaryButtonClass} onClick={() => setSearch(draft.trim())}><Search size={14} aria-hidden /> Ara</button>
      </div>
      {targets.isLoading && <p className="m-0 text-ui-xs text-fg-muted">Aranıyor…</p>}
      {targets.error && <p role="alert" className="m-0 text-ui-xs text-danger">{explorerErrorText(targets.error)}</p>}
      {targets.data?.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Sonuç yok.</p>}
      <ul className="m-0 flex max-h-48 list-none flex-col gap-1 overflow-y-auto p-0">
        {targets.data?.map((target) => (
          <li key={target.resourceId} className={listRowClass}>
            <span className="min-w-0 flex-1 break-words text-ui-xs text-fg">{target.title}</span>
            {target.handle && <span className="text-ui-2xs text-fg-muted">/{target.handle}</span>}
            <button type="button" className={ghostButtonClass} onClick={() => onPick(target)}>Seç</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
