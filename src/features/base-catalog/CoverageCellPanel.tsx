'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { baseCatalogApi, type BaseCoverageCategory, type BaseCoverageRow } from '../../lib/api/base-catalog';

interface CoverageCellPanelProps {
  row: BaseCoverageRow;
  category: BaseCoverageCategory;
  onClose: () => void;
}

export function CoverageCellPanel({ row, category, onClose }: CoverageCellPanelProps) {
  // Ayrı bir uç nokta yok: kapsam hücresi zaten make+model+categoryId ile tarif ediliyor.
  const query = useQuery({
    queryKey: ['base-catalog', 'cell', row.make, row.model, category.id],
    queryFn: () => baseCatalogApi.products({
      make: row.make,
      model: row.model,
      categoryId: category.id,
      pageSize: 200,
    }),
  });

  const products = query.data?.items ?? [];

  return (
    <aside className="flex w-[320px] shrink-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--fg)]">{row.make} {row.model}</span>
          <span className="text-xs text-[var(--fg-muted)]">{category.name}</span>
        </div>
        <button type="button" onClick={onClose} className="cursor-pointer text-[var(--fg-muted)] hover:text-[var(--fg)]">
          <X className="h-4 w-4" />
        </button>
      </header>

      {query.isLoading && <p className="text-sm text-[var(--fg-muted)]">Yükleniyor…</p>}

      {!query.isLoading && products.length === 0 && (
        <p className="text-sm text-[var(--fg-muted)]">
          Bu modelde bu kategoride ürün yok — doldurulabilir bir boşluk.
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {products.map((product) => (
          <Link
            key={product.sku}
            href={`/products/${encodeURIComponent(product.sku)}`}
            className="flex flex-col gap-0.5 rounded-[4px] px-2 py-1.5 transition hover:bg-[var(--bg-subtle)]"
          >
            <span className="line-clamp-2 text-xs text-[var(--fg)]">{product.name}</span>
            <span className="text-[11px] text-[var(--fg-muted)]">
              {product.sku}{product.modelYear ? ` · ${product.modelYear}` : ''}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
