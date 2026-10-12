'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { orderApi } from '../../../../lib/api';
import { useI18n } from '../../../../lib/i18n';
import { useMobile } from '../../../../hooks/useMobile';
import { formatDateTime } from '../../../../lib/format';
import { OrderNoteEditor } from '../../../../components/orders/OrderNoteEditor';
import { OrderSourceDiscrepancyPanel } from '../../../../components/orders/OrderSourceDiscrepancyPanel';
import {
  ArrowLeft, User, Truck, CreditCard, Printer
} from 'lucide-react';
import { SkeletonPage } from '../../../../components/ui/Skeleton';
import { formatOrderNumberWithHash } from '../../../../utils/orderNumber';
import { orderStatusLabel } from '../../../../utils/orderStatusLabel';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { EntityHistoryPanel } from '../../../../components/shared/EntityHistoryPanel';
import { OrderOperationStatusSelector } from '../../../../components/orders/OrderOperationStatusSelector';

function fmtCurrency(n: number, symbol: string) {
  return symbol + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = Number(resolvedParams.id);
  const { lang } = useI18n();
  const isMobile = useMobile();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const res = await orderApi.list({ search: String(orderId), page: 1, pageSize: 1 });
      const found = res?.items.find(o => o.orderId === orderId || String(o.platformOrderNumber) === String(orderId));
      if (!found) throw new Error('Sipariş bulunamadı.');
      return found;
    },
    enabled: !isNaN(orderId),
  });

  if (isLoading) return <SkeletonPage />;
  if (isError || !data) return <ErrorState title="Sipariş bulunamadı veya yüklenemedi." onRetry={refetch} />;

  const o = data;
  const ordersQueryKey = ['order-detail', orderId] as const;

  // Sipariş geneli kârlılık özeti — her satırın maliyet bileşenlerini toplar.
  const totals = o.items.reduce(
    (acc, it) => {
      acc.productCost += (it.buyingPrice ?? 0) * it.quantity;
      acc.boxCost += (it.boxCost ?? 0) * it.quantity;
      acc.shipping += (it.shippingCost ?? 0);
      acc.commission += (it.commissionAmount ?? 0);
      acc.serviceFee += (it.serviceFeeAmount ?? 0);
      acc.vat += (it.vatAmount ?? 0);
      acc.netProfit += (it.hasCostData ? it.netProfit : 0);
      acc.revenue += it.unitPrice * it.quantity;
      return acc;
    },
    { productCost: 0, boxCost: 0, shipping: 0, commission: 0, serviceFee: 0, vat: 0, netProfit: 0, revenue: 0 },
  );
  const marginPct = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0;
  const missingCostCount = o.items.filter(i => !i.hasCostData).length;
  // Kargosu hesaplanamayan kalemler (UK tarifesi girilmemis / desi yok). shippingCost bu
  // kalemlerde 0'dir; "bedava kargo" gibi gorunmesin diye ayrica sayilir.
  // Alan opsiyonel: eski backend gondermez, o zaman hepsi bilinir sayilir.
  const unknownShippingCount = o.items.filter(i => i.shippingCostKnown === false).length;

  return (
    <div style={{ padding: isMobile ? 12 : 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Geri Butonu & Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/orders"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--fg)', textDecoration: 'none',
            }}
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>
              Sipariş {formatOrderNumberWithHash(o.platformOrderNumber, o.orderCode)}
            </h1>
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0' }}>
              {formatDateTime(o.orderDate, lang === 'tr' ? 'tr' : 'en')} · {o.storeName} ({o.platformName})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
              borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Printer size={14} /> Yazdır
          </button>
        </div>
      </div>

      {/* Kaynak farkı — yalnızca ERP ile pazaryeri çeliştiyse çizilir */}
      <OrderSourceDiscrepancyPanel orderId={o.orderId} />

      {/* Sipariş Özet Kartları */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 14,
      }}>
        {/* Müşteri Bilgileri */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>
            <User size={16} style={{ color: 'var(--accent)' }} /> Müşteri Bilgileri
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>{o.customerName || 'Müşteri adı belirtilmemiş'}</p>
            {/* E-posta: pazaryeri proxy adresleri açıkça etiketlenir — bu adreslere
                pazarlama maili atmak pazaryeri politikasını ihlal eder. */}
            {o.customerEmail && (
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--fg)' }}>{o.customerEmail}</span>
                {o.customerEmailKind === 'MarketplaceProxy' && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                    border: '1px solid rgba(245,158,11,0.28)', background: 'rgba(245,158,11,0.08)',
                    color: 'var(--fg-muted)',
                  }} title="Pazaryerinin maskeli adresi — yalnızca bu siparişle ilgili işlemsel mesaj gönderilebilir.">
                    pazaryeri adresi
                  </span>
                )}
              </p>
            )}
            <p style={{ margin: 0, color: 'var(--fg-muted)' }}>{o.shipCity} {o.addressDistrict && `(${o.addressDistrict})`}</p>
            {o.addressLine && <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--fg-subtle)' }}>{o.addressLine}</p>}
          </div>
        </div>

        {/* Ödeme & Tutar */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>
            <CreditCard size={16} style={{ color: '#10b981' }} /> Ödeme Detayı
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#10b981' }}>{fmtCurrency(o.totalAmount, '₺')}</p>
            <p style={{ margin: 0, color: 'var(--fg-muted)' }}>Durum: {orderStatusLabel(o.universalStatus)}</p>
            {o.paymentStatus && <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-subtle)' }}>{o.paymentStatus}</p>}
          </div>
        </div>

        {/* Kargo & Paket */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 10 }}>
            <Truck size={16} style={{ color: '#8b5cf6' }} /> Kargo & Lojistik
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0 }}>Paket Kodu: {o.packageCode || o.orderCode || '—'}</p>
            <p style={{ margin: 0, color: 'var(--fg-muted)' }}>Kargo Maliyeti: {o.shippingTotal != null ? fmtCurrency(o.shippingTotal, '₺') : '—'}</p>
          </div>
        </div>
      </div>

      {/* Sipariş Notu */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: '0 0 10px' }}>Sipariş Notu</h3>
        <OrderNoteEditor orderId={o.orderId} note={o.note} queryKey={ordersQueryKey} />
      </div>

      {/* Ürün Listesi Tablosu */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>
          Sipariş Kalemleri ({o.items.length} Kalem)
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--fg-muted)' }}>Ürün Adı</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--fg-muted)' }}>SKU</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>Adet</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--fg-muted)' }}>Birim Fiyat</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--fg-muted)' }}>Alış Fiyatı</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--fg-muted)' }}>Kutu Kodu</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--fg-muted)' }}>Marj</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--fg-muted)' }}>Net Kâr</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((item, idx) => {
                const lineRevenue = item.unitPrice * item.quantity;
                const lineMargin = item.hasCostData && lineRevenue > 0 ? (item.netProfit / lineRevenue) * 100 : null;
                return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--fg)' }}>{item.productName}</td>
                  <td className="font-mono" style={{ padding: '12px 16px', color: 'var(--fg-muted)' }}>{item.supplierSku || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{fmtCurrency(item.unitPrice, '₺')}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: item.buyingPrice != null ? 'var(--fg)' : '#d97706' }}>
                    {item.buyingPrice != null ? fmtCurrency(item.buyingPrice, '₺') : 'Maliyet Eksik'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className="font-mono" style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 11 }}>
                      {item.boxCode || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: lineMargin == null ? 'var(--fg-subtle)' : lineMargin >= 0 ? '#10b981' : '#ef4444' }}>
                    {lineMargin == null ? '—' : `%${lineMargin.toFixed(1)}`}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: !item.hasCostData ? 'var(--fg-subtle)' : item.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                    {item.hasCostData ? fmtCurrency(item.netProfit, '₺') : '—'}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sipariş Geneli Kârlılık Özeti */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 12,
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16,
      }}>
        <SummaryCell label="Ürün Maliyeti" value={fmtCurrency(totals.productCost, '₺')} />
        <SummaryCell label="Kutu Maliyeti" value={fmtCurrency(totals.boxCost, '₺')} />
        <SummaryCell label="Komisyon + Hizmet" value={fmtCurrency(totals.commission + totals.serviceFee, '₺')} />
        <SummaryCell
          label="Kargo"
          value={unknownShippingCount === o.items.length && o.items.length > 0 ? 'Bilinmiyor' : fmtCurrency(totals.shipping, '₺')}
          sub={unknownShippingCount > 0 && unknownShippingCount < o.items.length
            ? `${unknownShippingCount} kalemde kargo maliyeti bilinmiyor`
            : undefined}
        />
        <SummaryCell
          label="Net Kâr"
          value={`${totals.netProfit >= 0 ? '+' : ''}${fmtCurrency(totals.netProfit, '₺')}`}
          valueColor={totals.netProfit >= 0 ? '#10b981' : '#ef4444'}
          sub={missingCostCount > 0
            ? `${missingCostCount} kalemde maliyet eksik — kâr tam değil`
            : unknownShippingCount > 0
              ? 'Kargo maliyeti bilinmiyor — kâr tam değil'
              : `Marj: %${marginPct.toFixed(1)}`}
        />
      </div>

      {/* Operasyon durumu — pazaryeri durumunun YANINDA, onun yerine değil. */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <OrderOperationStatusSelector
          orderId={orderId}
          currentStatusId={o.operationStatusId}
          onChanged={() => { void refetch(); }}
        />
      </div>

      {/* Denetim geçmişi — veri yıllardır AuditLog'daydı, eksik olan tek şey gösterilmesiydi. */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 12 }}>
          Geçmiş
        </div>
        <EntityHistoryPanel entityType="Order" entityId={String(orderId)} />
      </div>
    </div>
  );
}

function SummaryCell({ label, value, valueColor = 'var(--fg)', sub }: {
  label: string; value: string; valueColor?: string; sub?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: valueColor }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: '#d97706' }}>{sub}</span>}
    </div>
  );
}
