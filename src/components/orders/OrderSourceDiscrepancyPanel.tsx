'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { orderApi } from '../../lib/api/orders';

// ERP ile pazaryerinin aynı sipariş alanı için farklı değer bildirdiği durumlar.
//
// Birleştirmede alanın SAHİBİ kazanır (bkz. backend OrderFieldOwnershipRegistry), ama
// kaybeden değer atılmaz. Bu panel onu görünür kılar — aksi halde tekrar eden bir
// tutarsızlığı (ör. ERP'nin kargo bedelini tutara katması) kimse fark edemezdi.
//
// Uyuşmazlık yoksa HİÇBİR ŞEY çizmez: temiz siparişte boş bir kutu gürültüdür.

const FIELD_LABELS: Record<string, string> = {
  TotalAmount: 'Sipariş tutarı',
  PaymentStatus: 'Ödeme durumu',
  CustomerName: 'Müşteri adı',
  ShipCity: 'Şehir',
  AddressDistrict: 'İlçe',
  AddressLine: 'Adres',
  TrackingNumber: 'Kargo takip no',
  CourierName: 'Kargo firması',
  OrderCode: 'Sipariş kodu',
  PackageCode: 'Paket kodu',
  ActualCommissionAmount: 'Gerçek komisyon',
  ActualShippingCost: 'Gerçek kargo maliyeti',
  MarketplaceStatus: 'Pazaryeri durumu',
};

const SOURCE_LABELS: Record<string, string> = {
  Erp: 'ERP',
  Marketplace: 'Pazaryeri',
};

export function OrderSourceDiscrepancyPanel({ orderId }: { orderId: number }) {
  const { data } = useQuery({
    queryKey: ['order-source-discrepancies', orderId],
    queryFn: () => orderApi.sourceDiscrepancies(orderId),
    enabled: Number.isFinite(orderId),
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <header className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-500" aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--fg)]">
          Kaynak farkı ({data.length})
        </h2>
      </header>

      <p className="text-xs text-[var(--muted)]">
        ERP ile pazaryeri bu alanlarda farklı değer bildirdi. Kayıtta alanın sahibi olan
        kaynağın değeri duruyor; diğeri karşılaştırma için saklandı.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-[var(--muted)]">
              <th className="py-2 pr-4 font-medium">Alan</th>
              <th className="py-2 pr-4 font-medium">Kayıtlı değer</th>
              <th className="py-2 pr-4 font-medium">Farklı bildiren</th>
              <th className="py-2 font-medium">Bildirilen değer</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id} className="border-t border-[var(--border)]">
                <td className="py-2 pr-4 text-[var(--fg)]">
                  {FIELD_LABELS[row.field] ?? row.field}
                </td>
                <td className="py-2 pr-4 font-medium text-[var(--fg)]">
                  {row.ownerValue ?? '—'}
                </td>
                <td className="py-2 pr-4 text-[var(--muted)]">
                  {SOURCE_LABELS[row.reportedBy] ?? row.reportedBy}
                </td>
                <td className="py-2 text-[var(--muted)]">{row.reportedValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
