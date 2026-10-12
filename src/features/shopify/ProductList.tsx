'use client';

import { Pencil } from 'lucide-react';
import type { ShopifyProductListItemDto } from '../../lib/api/shopify-explorer';
import { PRODUCT_STATUS } from '../../lib/api/shopify-products';
import { BulkSelectBox } from './BulkSelectBox';
import type { BulkSelection } from './useBulkSelection';
import { productStatusMeta } from './explorerRules';
import { ProductRemovalButtons } from './ProductRemovalButtons';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass } from './styles';

interface Props {
  products: ShopifyProductListItemDto[];
  onEdit: (productId: number) => void;
  onArchive: (product: ShopifyProductListItemDto) => void;
  onDelete: (product: ShopifyProductListItemDto) => void;
  // Arşivle/sil çağrısı sürerken düğmeler kilitlenir.
  busy: boolean;
  // Verilirse her satırın başına toplu işlem seçim kutusu eklenir.
  selection?: BulkSelection;
}

// Ürün satırları: ad, durum, tür/marka, toplam stok ve varyantların SKU/fiyat/stok özeti; "Düzenle" ürün formunu açar,
// "Arşivle" güvenli kaldırma, "Sil" kalıcı silmedir (ikisi de üst bileşende onaylanır).
export function ProductList({ products, selection, ...rowProps }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {products.map((product) => <ProductRow key={product.id} product={product} selection={selection} {...rowProps} />)}
    </ul>
  );
}

interface RowProps extends Omit<Props, 'products'> {
  product: ShopifyProductListItemDto;
}

function ProductRow({ product, onEdit, onArchive, onDelete, busy, selection }: RowProps) {
  const status = productStatusMeta(product.status);
  const hidden = product.variantCount - product.variants.length;
  const outOfStock = product.totalInventory !== null && product.totalInventory <= 0;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border-soft bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {selection && (
          <BulkSelectBox
            checked={selection.selected.has(product.id)} label={`${product.title} ürününü seç`}
            disabled={selection.limitReached && !selection.selected.has(product.id)} onChange={() => selection.toggle(product.id)}
          />
        )}
        <span className="min-w-0 flex-1 basis-48 break-words text-ui-sm font-bold text-fg">{product.title}</span>
        <StatusBadge label={status.label} tone={status.tone} />
        <StatusBadge
          label={product.totalInventory === null ? 'Stok bilinmiyor' : `Stok ${product.totalInventory}`}
          tone={outOfStock ? 'danger' : 'neutral'}
        />
        <button type="button" className={ghostButtonClass} aria-label={`${product.title} düzenle`} onClick={() => onEdit(product.id)}>
          <Pencil size={14} aria-hidden /> Düzenle
        </button>
        <ProductRemovalButtons
          title={product.title} isArchived={product.status === PRODUCT_STATUS.Archived} busy={busy}
          onArchive={() => onArchive(product)} onDelete={() => onDelete(product)}
        />
      </div>
      <p className="m-0 text-ui-2xs text-fg-muted">{[product.vendor, product.productType].filter(Boolean).join(' · ') || 'Marka/tür yok'}</p>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {product.variants.map((variant, index) => (
          <li key={`${variant.sku ?? 'sku-yok'}-${index}`} className="flex flex-wrap items-center gap-x-4 text-ui-xs text-fg">
            <span className="w-40 shrink-0 break-all font-mono text-ui-2xs">{variant.sku ?? 'SKU yok'}</span>
            <span className="min-w-0 flex-1 basis-24 truncate text-fg-muted">{variant.title}</span>
            <span className="w-20 text-right">{variant.price === null ? '—' : variant.price.toFixed(2)}</span>
            <span className="w-16 text-right">{variant.inventoryQuantity ?? '—'}</span>
          </li>
        ))}
      </ul>
      {hidden > 0 && <p className="m-0 text-ui-2xs text-fg-muted">+{hidden} varyant daha (Shopify&apos;da görüntüleyin)</p>}
    </li>
  );
}
