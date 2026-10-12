'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import type { ProductErpVariant } from '../../types/api';
import { erpSourcesApi } from '../../lib/api';
import type { ErpSourceInfo } from '../../lib/api';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import { ErpProductUpdateDialog } from '../../features/products/ErpProductUpdateDialog';

interface ProductErpSummaryProps {
  variants: ProductErpVariant[];
  detailed?: boolean;
}

export interface ErpSlot {
  source: ErpSourceInfo;
  variant: ProductErpVariant | undefined;
}

// Slotlar artık kod içinde sabit DEĞİL — /api/erp-sources'tan (DataSources tablosu)
// dinamik gelir. Yeni bir ERP hesabı (marka/connector kombinasyonu) eklendiğinde
// kod değişikliği gerekmeden burada yeni bir kart belirir. Saf fonksiyon olarak
// component gövdesinden AYRI tutulur ki React/network mock'suz unit test edilebilsin
// (bkz. ProductErpSummary.test.ts).
export function resolveErpSlots(sources: ErpSourceInfo[], variants: ProductErpVariant[]): ErpSlot[] {
  return sources.map(source => ({
    source,
    variant: variants.find(item =>
      item.connectorType.toLocaleLowerCase('tr-TR') === source.erp.toLocaleLowerCase('tr-TR')
      && item.sourceCode.toLocaleLowerCase('tr-TR') === source.code.toLocaleLowerCase('tr-TR')),
  }));
}

function useErpSummarySources() {
  const { data: sources, isLoading } = useQuery({
    queryKey: ['erp-sources'],
    queryFn: () => erpSourcesApi.list(),
    staleTime: 5 * 60_000,
  });
  return { sources: sources ?? [], isLoading };
}

function formatTry(value: number) {
  return `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProductErpSummary({ variants, detailed = false }: ProductErpSummaryProps) {
  const { toGbp } = useBaseCurrency();
  const { sources, isLoading } = useErpSummarySources();
  // Guncelleme HER ZAMAN tek bir ERP kaydini hedefler: ayni SKU birden cok hesapta ayri
  // Product satiri ve ayri ErpProductId tasiyor. Bu yuzden diyalog varyanttan acilir,
  // urunden degil — "hangi hesabin kaydini degistiriyorum" belirsiz kalmasin.
  const [updateTarget, setUpdateTarget] = useState<{ variant: ProductErpVariant; label: string } | null>(null);

  function formatPrice(variant: ProductErpVariant) {
    if (variant.connectorType.toLocaleLowerCase('tr-TR') !== 'base') {
      return formatTry(variant.priceTry);
    }

    const gbp = toGbp(variant.priceTry);
    const gbpPrice = gbp == null
      ? '£—'
      : `£${gbp.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `${gbpPrice} · ${formatTry(variant.priceTry)}`;
  }

  if (isLoading) return null;

  return (
    <div className={detailed ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'grid grid-cols-2 gap-1'}>
      {resolveErpSlots(sources, variants).map(({ source, variant }) => {
        const label = `${source.erp} ${source.storeName}`;

        return (
          <div
            key={source.id}
            className={`border border-[var(--border-soft)] ${
              detailed
                ? 'rounded-md bg-[var(--card)] px-2.5 py-2'
                : 'rounded-[4px] bg-[var(--bg-subtle)] px-1.5 py-1'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="truncate text-[10px] font-semibold text-[var(--fg-muted)]">{label}</span>
              {variant && (
                <span className="shrink-0 text-[9.5px] text-[var(--fg-muted)] font-mono tabular-nums">Stok {variant.stockQuantity}</span>
              )}
            </div>

            {variant ? (
              <>
                {detailed && (
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-[var(--fg)]" title={variant.productName}>
                    {variant.productName}
                  </p>
                )}
                <div className={`${detailed ? 'mt-1.5' : 'mt-0.5'} flex items-end justify-between gap-1`}>
                  <strong className="truncate text-[11px] font-semibold font-mono tabular-nums text-[var(--fg)]" title={formatPrice(variant)}>
                    {formatPrice(variant)}
                  </strong>
                  {detailed && (
                    <span className="shrink-0 text-[10px] text-[var(--fg-muted)] font-mono tabular-nums">Satış {variant.salesCount}</span>
                  )}
                </div>
                {detailed && (
                  <button
                    type="button"
                    onClick={() => setUpdateTarget({ variant, label })}
                    className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-[4px] border border-[var(--border-soft)] py-1 text-[10px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  >
                    <Pencil size={10} />
                    ERP&apos;de güncelle
                  </button>
                )}
              </>
            ) : (
              <p className={`${detailed ? 'mt-1.5 py-1' : 'mt-0.5'} text-[10px] font-medium text-[var(--fg-subtle)]`}>—</p>
            )}
          </div>
        );
      })}

      {updateTarget && (
        <ErpProductUpdateDialog
          productId={updateTarget.variant.productId}
          targetLabel={updateTarget.label}
          productName={updateTarget.variant.productName}
          erpCurrency={updateTarget.variant.originalCurrency}
          currentPriceTry={updateTarget.variant.priceTry}
          currentDescription={null}
          onClose={() => setUpdateTarget(null)}
        />
      )}
    </div>
  );
}
