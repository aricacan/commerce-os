'use client';

import Link from 'next/link';
import { ImageOff } from 'lucide-react';
import type { BaseCatalogProduct } from '../../lib/api/base-catalog';

interface CatalogProductGridProps {
  products: BaseCatalogProduct[];
  isLoading: boolean;
  emptyMessage: string;
}

export function CatalogProductGrid({ products, isLoading, emptyMessage }: CatalogProductGridProps) {
  if (isLoading) {
    return <p className="px-2 py-4 text-sm text-[var(--fg-muted)]">Yükleniyor…</p>;
  }

  if (products.length === 0) {
    return <p className="px-2 py-4 text-sm text-[var(--fg-muted)]">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-3 overflow-y-auto pr-1 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
      {products.map((product) => (
        <Link
          key={product.sku}
          href={`/products/${encodeURIComponent(product.sku)}`}
          className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 transition hover:border-[var(--border)]"
        >
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-[4px] bg-[var(--bg-subtle)]">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <ImageOff className="h-5 w-5 text-[var(--fg-subtle)]" />
            )}
          </div>

          <p className="line-clamp-2 text-sm font-medium text-[var(--fg)]">{product.name}</p>
          <p className="text-[11px] text-[var(--fg-muted)]">{product.sku}</p>

          {product.categoryName && (
            <span className="w-fit rounded-[4px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--fg-muted)]">
              {product.categoryName}
            </span>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-[var(--fg-muted)]">
            <span>{product.price.toLocaleString('tr-TR')} {product.currency ?? ''}</span>
            <span>Stok {product.stock}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {product.stores.map((store) => (
              <span key={store} className="rounded-[4px] border border-[var(--border-soft)] px-1.5 py-0.5 text-[10px] text-[var(--fg-muted)]">
                {store}
              </span>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
