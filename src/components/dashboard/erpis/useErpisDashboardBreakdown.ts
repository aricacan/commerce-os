'use client';

import { useMemo } from 'react';
import { useErpisBreakdown } from '@/hooks/erpis/useErpisQuery';
import type { ErpisBreakdownKey, ErpisBreakdownOrder, ErpisQueryFilter } from '@/lib/api';

// Pano kırılım kartlarının veri kaynağı.
//
// Sunucu her satır için TEK ölçüde karşılaştırılabilir bir tutar döndürüyor
// (`comparableAmount`) ve sıralamayı da onun üzerinden yapıyor. Daha önce baskın para
// birimini istemci seçiyordu; sıralama sunucuda, gösterim istemcide olunca ikisi
// ayrışabiliyordu — artık tek kaynak var.
export interface ErpisBreakdownRow {
  key: string;
  label: string;
  /** Stok kodu kırılımında ürün adı — kod tek başına okunmuyor. */
  subLabel: string | null;
  amount: number;
  quantity: number;
  rowCount: number;
  orderCount: number;
}

export interface ErpisBreakdownResult {
  rows: ErpisBreakdownRow[];
  /** Tutarların gösterildiği para birimi. */
  currency: string | null;
  isLoading: boolean;
}

export function useErpisDashboardBreakdown(
  filter: ErpisQueryFilter,
  by: ErpisBreakdownKey,
  limit: number,
  orderBy: ErpisBreakdownOrder = 'amount',
  ascending = false,
): ErpisBreakdownResult {
  // Kur çevrimi AÇIK: farklı dövizlerdeki cariler aynı listede sıralanabilsin.
  // Kapalı olsaydı yalnız baskın birimle çalışanlar görünür, yurt dışı cariler
  // listenin dibine düşerdi.
  const query = useErpisBreakdown({ ...filter, convertTo: 'TL' }, by, limit, orderBy, ascending);

  return useMemo(() => {
    const items = query.data ?? [];

    return {
      rows: items.map((item) => ({
        key: item.key,
        label: item.label,
        subLabel: item.subLabel,
        amount: item.comparableAmount,
        quantity: item.quantity,
        rowCount: item.lineCount,
        orderCount: item.orderCount,
      })),
      currency: items[0]?.comparableCurrency ?? null,
      isLoading: query.isLoading,
    };
  }, [query.data, query.isLoading]);
}
