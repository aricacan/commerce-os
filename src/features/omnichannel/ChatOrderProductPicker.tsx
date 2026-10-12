'use client';

import { Car, Plus, Search } from 'lucide-react';
import type { ChatOrderProductOptionDto } from '../../lib/api/omnichannel-chat-orders';
import { focusRing, motionFast } from '../shared/design';
import { fitmentOf } from './chatOrderFormRules';
import { formatOrderMoney } from './chatOrderRules';
import { MIN_CATALOG_QUERY_LENGTH, useChatOrderCatalogSearch } from './useChatOrderCatalogSearch';

interface Props {
  conversationId: number;
  country: string | null;
  currency: string;
  onPick: (option: ChatOrderProductOptionDto) => void;
}

// Katalogdan ürün seçici: ad / SKU / araç ile arama; her sonuçta fiyat, stok ve araç uyumu.
export function ChatOrderProductPicker({ conversationId, country, currency, onPick }: Props) {
  const search = useChatOrderCatalogSearch(conversationId, country);
  const term = search.query.trim();

  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex min-w-0 items-center">
        <Search size={14} className="pointer-events-none absolute left-3 text-fg-muted" aria-hidden />
        <input
          type="search"
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          placeholder="Ürün adı, SKU ya da araç (ör. doblo kaput)"
          aria-label="Katalogda ürün ara"
          className={`h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-ui-sm text-fg md:h-9 ${focusRing}`}
        />
      </label>

      {search.error && <p role="alert" className="m-0 text-ui-xs text-danger">{search.error}</p>}
      {search.loading && <p className="m-0 text-ui-xs text-fg-muted">Aranıyor…</p>}
      {!search.loading && term.length >= MIN_CATALOG_QUERY_LENGTH && search.results.length === 0 && !search.error && (
        <p className="m-0 text-ui-xs text-fg-muted">Bu kanalın kataloğunda eşleşen ürün yok.</p>
      )}

      {search.results.length > 0 && (
        <ul className="m-0 flex max-h-72 list-none flex-col divide-y divide-border-soft overflow-y-auto rounded-lg border border-border-soft p-0">
          {search.results.map((option) => (
            <li key={option.productId}>
              <ProductOption option={option} currency={currency} onPick={() => onPick(option)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductOption({ option, currency, onPick }: {
  option: ChatOrderProductOptionDto;
  currency: string;
  onPick: () => void;
}) {
  const fitment = fitmentOf(option);
  const inStock = option.stockQuantity > 0;

  return (
    <button type="button" onClick={onPick}
      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-bg-subtle ${focusRing} ${motionFast}`}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ui-sm font-semibold text-fg">{option.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-2xs text-fg-muted">
          <span className="font-mono">{option.sku}</span>
          {fitment && <span className="inline-flex items-center gap-1"><Car size={10} aria-hidden /> {fitment}</span>}
          <span className={inStock ? 'text-success' : 'text-danger'}>{inStock ? `Stok ${option.stockQuantity}` : 'Stokta yok'}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-ui-sm font-bold text-fg">
          {option.price === null ? 'Fiyat yok' : formatOrderMoney(option.price, option.currency ?? currency)}
        </span>
        <span className="inline-flex items-center gap-1 text-ui-2xs font-semibold text-fg-muted"><Plus size={11} aria-hidden /> Ekle</span>
      </span>
    </button>
  );
}
