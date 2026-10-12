'use client';

import { useState } from 'react';
import { useErpisMixedOrders } from '@/hooks/erpis/useErpisQuery';
import { useErpisFilterState } from './useErpisFilterState';
import { OrderLineDrawer } from './OrderLineDrawer';
import { EmptyState, ErrorState, KpiCard, formatDate, formatNumber } from './shared';

// Karma Siparişler — kalemleri birden çok firmaya dağılan siparişler.
//
// Firma ayrımı stok koduna göre yapılıyor (bkz. SkuRoutesTab), sipariş başlığı ise
// yüklemenin firmasında kalıyor. Bir müşteri aynı siparişte hem bitmiş ürün hem levha
// istediğinde kalemler iki şirkete dağılıyor.
//
// Bu SESSİZCE olmamalı: kim faturalayacak, kim sevk edecek — insan kararı. Ekran kararı
// vermiyor, kararın gerektiği yerleri görünür kılıyor.
export function MixedOrdersTab({ companyId }: { companyId: number | null }) {
  const { filter } = useErpisFilterState(companyId);
  const mixed = useErpisMixedOrders(filter);
  const [selected, setSelected] = useState<number | null>(null);

  if (mixed.isError) return <div className="p-4"><ErrorState /></div>;

  const rows = mixed.data ?? [];

  if (mixed.isLoading) {
    return <p className="p-4 text-[12px] text-[var(--fg-muted)]">Yükleniyor…</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="Karma sipariş yok"
          hint="Her siparişin bütün kalemleri tek firmaya ait. Firma kuralları değiştiğinde burası dolabilir."
        />
      </div>
    );
  }

  const lineTotal = rows.reduce((sum, r) => sum + r.lineCount, 0);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div data-tour="erpis-mixed-kpis" className="grid shrink-0 grid-cols-2 gap-2 md:grid-cols-3">
        <KpiCard label="Karma Sipariş" value={formatNumber(rows.length)} hint="Kalemleri iki firmaya dağılan" />
        <KpiCard label="Kalem" value={formatNumber(lineTotal)} hint="Bu siparişlerdeki toplam" />
        <KpiCard
          label="En Çok Dağılan"
          value={formatNumber(Math.max(...rows.map((r) => r.companies.length)))}
          hint="Tek siparişteki firma sayısı"
        />
      </div>

      <div data-tour="erpis-mixed-list" className="flex flex-col gap-2.5">
        {rows.map((order) => (
          <button
            key={order.orderId}
            type="button"
            onClick={() => setSelected(order.orderId)}
            className="flex flex-col gap-2.5 rounded-[8px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 text-left transition-all hover:border-[var(--border)] shadow-xs"
          >
            {/* Üst Satır: Cari & Sipariş Bilgisi & Kalem Sayısı */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-bold leading-snug text-[var(--fg)] truncate">
                  {order.partyName ?? '—'}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)] pt-0.5">
                  <span className="font-bold tabular-nums text-[var(--fg)]">{order.orderNo}</span>
                  <span className="opacity-40">·</span>
                  <span className="tabular-nums">{formatDate(order.orderDate)}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end text-right">
                <span className="text-[13.5px] font-extrabold tabular-nums text-[var(--fg)]">
                  {formatNumber(order.lineCount)} kalem
                </span>
                <span className="text-[10px] text-[var(--fg-muted)] font-medium">
                  {order.companies.length} firma
                </span>
              </div>
            </div>

            {/* Dağılım ORANLA gösteriliyor: "3 kalem Merkez, 1 kalem Levha" cümlesi
                siparişin ağırlığının nerede olduğunu tek bakışta söylemiyor. */}
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              {order.companies.map((company, index) => (
                <span
                  key={company.companyId}
                  style={{
                    width: `${(company.lineCount / order.lineCount) * 100}%`,
                    background: index === 0 ? 'rgba(100,116,139,0.85)' : 'rgba(100,116,139,0.4)',
                  }}
                />
              ))}
            </div>

            {/* Alt Bölüm: Firma Kırılım Kutucukları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-t border-[var(--border-soft)] pt-2">
              {order.companies.map((company) => (
                <div
                  key={company.companyId}
                  className="flex items-center justify-between rounded-[4px] bg-[var(--bg-subtle)]/70 px-2.5 py-1.5 min-w-0"
                >
                  <span className="text-[11.5px] font-bold text-[var(--fg)] truncate mr-2">
                    {company.companyName}
                  </span>
                  <span className="text-[10.5px] tabular-nums text-[var(--fg-muted)] shrink-0 font-medium">
                    {formatNumber(company.lineCount)} kalem · {formatNumber(company.amount, 0)}
                  </span>
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selected != null && (
        <OrderLineDrawer id={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
