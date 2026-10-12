'use client';

import { useState } from 'react';
import { shopifyProductsApi, type ShopifyProductOptionDto } from '../../lib/api/shopify-products';
import { fieldClass, ghostButtonClass } from './styles';
import { useWriteAction } from './useWriteAction';

interface Props {
  storeId: number;
  productId: number;
  options: ShopifyProductOptionDto[];
  // Yeniden adlandırma sonrası ürün Shopify'dan yeniden okunur.
  onChanged: () => Promise<void>;
}

// Mevcut ürünün seçenekleri: değerler salt okunur, ad değiştirilebilir (productOptionUpdate).
// Yeni değer yeni varyant eklenirken kendiliğinden oluşur; seçenek ekleme/silme bu ekranda yoktur.
export function ProductExistingOptions({ storeId, productId, options, onChanged }: Props) {
  const { busy, run } = useWriteAction(onChanged);

  return (
    <section className="flex flex-col gap-2 rounded-md border border-border-soft p-3" aria-label="Seçenekler">
      <h4 className="m-0 text-ui-xs font-semibold text-fg">Seçenekler</h4>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {options.map((option) => (
          <OptionRow
            key={option.id} option={option} busy={busy}
            onRename={(name) => run(() => shopifyProductsApi.renameOption(storeId, productId, option.id, name), 'Seçenek adı güncellendi.')}
          />
        ))}
      </ul>
    </section>
  );
}

interface RowProps {
  option: ShopifyProductOptionDto;
  busy: boolean;
  onRename: (name: string) => Promise<boolean>;
}

function OptionRow({ option, busy, onRename }: RowProps) {
  const [name, setName] = useState(option.name);
  const unchanged = name.trim() === '' || name.trim() === option.name;

  return (
    <li className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-1 basis-40 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Seçenek adı
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <span className="min-w-0 flex-1 basis-48 break-words pb-2 text-ui-2xs text-fg-muted">Değerler: {option.values.join(', ')}</span>
      <button type="button" className={ghostButtonClass} disabled={busy || unchanged} onClick={() => void onRename(name.trim())}>
        Adı değiştir
      </button>
    </li>
  );
}
