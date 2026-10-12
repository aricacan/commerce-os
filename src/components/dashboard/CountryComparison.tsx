'use client';

import { useQueries } from '@tanstack/react-query';
import { orderApi } from '../../lib/api';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import { useStoreSelector, type ErpSourceCode } from '../../stores/store-selector';
import { useI18n } from '../../lib/i18n';
import type { TranslationKey } from '../../lib/translations/tr';
import { CountryFlag } from '../ui/CountryFlag';
import { ExportMenu } from '../ui/ExportMenu';
import type { ProfitSummary } from '../../types/api';

// TR = iki Sentos mağazası, UK = iki Base mağazası (bkz. stores/store-selector.ts).
const TR_STORES: ErpSourceCode[] = ['storea-sentos', 'storeb-sentos'];
const UK_STORES: ErpSourceCode[] = ['base-storea', 'base-storeb'];

type Agg = {
  revenue: number; cost: number; shipping: number; commission: number;
  serviceFee: number; boxCost: number; vat: number; gross: number; net: number;
  expenses: number; orders: number; sales: number;
};

const EMPTY: Agg = {
  revenue: 0, cost: 0, shipping: 0, commission: 0, serviceFee: 0, boxCost: 0,
  vat: 0, gross: 0, net: 0, expenses: 0, orders: 0, sales: 0,
};

function aggregate(items: (ProfitSummary | undefined)[]): Agg {
  return items.reduce<Agg>((a, s) => {
    if (!s) return a;
    return {
      revenue: a.revenue + s.totalRevenue,
      cost: a.cost + s.totalCost,
      shipping: a.shipping + s.totalShipping,
      commission: a.commission + s.totalCommission,
      serviceFee: a.serviceFee + s.totalServiceFee,
      boxCost: a.boxCost + s.totalBoxCost,
      vat: a.vat + s.totalVat,
      gross: a.gross + s.grossProfit,
      net: a.net + s.netProfit,
      expenses: a.expenses + s.proratedExpenses,
      orders: a.orders + s.orderCount,
      sales: a.sales + s.salesCount,
    };
  }, { ...EMPTY });
}

function abbrev(n: number, sym = ''): string {
  const neg = n < 0 ? '-' : '';
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${neg}${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${neg}${sym}${(v / 1_000).toFixed(1)}K`;
  return `${neg}${sym}${Math.round(v)}`;
}

function pct(part: number, whole: number): number {
  return whole !== 0 ? (part / whole) * 100 : 0;
}

export function CountryComparison() {
  const { getDateParams, categoryId } = useDashboardFilters();
  const { from, to } = getDateParams();
  const { toGbp } = useBaseCurrency();
  // Üstteki ambient ERP seçicisi (boş = Tümü). Seçim varsa kart yalnızca kendi
  // ülkesinden SEÇİLİ kaynakları toplar — böylece kartlar ERP filtresine de uyar.
  const selectedStores = useStoreSelector((s) => s.selectedStores);

  const inScope = (code: ErpSourceCode) => selectedStores.length === 0 || selectedStores.includes(code);
  const trCodes = TR_STORES.filter(inScope);
  const ukCodes = UK_STORES.filter(inScope);

  const allCodes = [...TR_STORES, ...UK_STORES];
  const results = useQueries({
    queries: allCodes.map((code) => ({
      queryKey: ['country-profit', code, from, to, categoryId],
      queryFn: () => orderApi.profitSummary(from, to, undefined, categoryId, code),
      staleTime: 60_000,
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const byCode = new Map<ErpSourceCode, ProfitSummary | undefined>(
    allCodes.map((code, i) => [code, results[i].data as ProfitSummary | undefined]),
  );
  const tr = aggregate(trCodes.map((c) => byCode.get(c)));
  const uk = aggregate(ukCodes.map((c) => byCode.get(c)));

  return (
    <div className="country-cmp-row">
      <CountryCard flag="TR" titleKey="widget_country_tr_title" data={tr} loading={loading} delay={0} />
      <CountryCard flag="GB" titleKey="widget_country_uk_title" data={uk} loading={loading} delay={90} toGbp={toGbp} />

      <style>{`
        .country-cmp-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          padding: 12px 16px 0;
          position: relative;
          z-index: 25;
        }
        @media (max-width: 720px) { .country-cmp-row { grid-template-columns: 1fr; } }
        @keyframes country-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .country-metric { animation: country-enter 0.4s ease both; }
      `}</style>
    </div>
  );
}

const COUNTRY_EXPORT_COLS = [
  { key: 'Ülke', header: 'Ülke', type: 'text' as const },
  { key: 'Sipariş', header: 'Sipariş', type: 'int' as const },
  { key: 'Satılan Adet', header: 'Satılan Adet', type: 'int' as const },
  { key: 'Ciro (TL)', header: 'Ciro (TL)', type: 'money' as const },
  { key: 'Ürün Maliyeti (TL)', header: 'Ürün Maliyeti (TL)', type: 'money' as const },
  { key: 'Kargo (TL)', header: 'Kargo (TL)', type: 'money' as const },
  { key: 'Pazaryeri Komisyonu (TL)', header: 'Pazaryeri Komisyonu (TL)', type: 'money' as const },
  { key: 'Hizmet Bedeli (TL)', header: 'Hizmet Bedeli (TL)', type: 'money' as const },
  { key: 'Koli Maliyeti (TL)', header: 'Koli Maliyeti (TL)', type: 'money' as const },
  { key: 'KDV (TL)', header: 'KDV (TL)', type: 'money' as const },
  { key: 'Genel Gider (TL)', header: 'Genel Gider (TL)', type: 'money' as const },
  { key: 'Brüt Kâr (TL)', header: 'Brüt Kâr (TL)', type: 'money' as const },
  { key: 'Net Kâr (TL)', header: 'Net Kâr (TL)', type: 'money' as const },
  { key: 'Brüt Marj (%)', header: 'Brüt Marj (%)', type: 'percent' as const },
  { key: 'Net Marj (%)', header: 'Net Marj (%)', type: 'percent' as const },
];

function CountryCard({
  flag, titleKey, data, loading, delay, toGbp,
}: {
  flag: 'TR' | 'GB'; titleKey: TranslationKey; data: Agg;
  loading: boolean; delay: number; toGbp?: (n: number) => number | null;
}) {
  const { t, lang } = useI18n();
  const grossMargin = pct(data.gross, data.revenue);
  const netMargin = pct(data.net, data.revenue);
  const revGbp = toGbp ? toGbp(data.revenue) : null;

  // UK kartı: base ERP'nin gerçek para birimi GBP olduğundan, toGbp prop'u varsa
  // (yani bu Birleşik Krallık kartıysa) metrik kutucukları £ gösterir — ₺ karşılığı
  // artık her kutucukta tekrarlanmıyor (minimal), sadece başlıktaki toplam Ciro'da var.
  function money(tryValue: number): { value: string } {
    const gbp = toGbp ? toGbp(tryValue) : null;
    return { value: gbp != null ? abbrev(gbp, '£') : abbrev(tryValue, '₺') };
  }

  const metrics: { label: string; value: string; strong?: boolean; color?: string }[] = [
    { label: t('widget_orders_column'), value: abbrev(data.orders) },
    { label: t('widget_sales_count_label'), value: abbrev(data.sales) },
    { label: t('widget_revenue_column'), ...money(data.revenue), strong: true },
    { label: t('widget_country_cost'), ...money(data.cost) },
    { label: t('widget_country_shipping'), ...money(data.shipping) },
    { label: t('widget_country_commission'), ...money(data.commission) },
    { label: t('widget_country_service_fee'), ...money(data.serviceFee) },
    { label: t('widget_country_box_cost'), ...money(data.boxCost) },
    { label: t('widget_country_vat'), ...money(data.vat) },
    { label: t('widget_country_expenses'), ...money(data.expenses) },
    { label: t('widget_gross_profit_column'), ...money(data.gross), strong: true, color: data.gross === 0 ? 'var(--fg-muted)' : data.gross > 0 ? '#10b981' : '#f43f5e' },
    { label: t('widget_net_profit_column'), ...money(data.net), strong: true, color: data.net === 0 ? 'var(--fg-muted)' : data.net > 0 ? '#10b981' : '#f43f5e' },
    { label: t('widget_gross_margin_label'), value: `%${grossMargin.toFixed(1)}` },
    { label: t('widget_country_net_margin'), value: `%${netMargin.toFixed(1)}` },
  ];

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '16px 18px',
        boxShadow: 'var(--shadow-xs)',
        animation: 'country-enter 0.45s ease both',
        animationDelay: `${delay}ms`,
        minWidth: 0,
        position: 'relative',
        zIndex: 10,
        overflow: 'visible',
      }}
    >
      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CountryFlag code={flag} size={24} />
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px' }}>{t(titleKey)}</div>
          <ExportMenu
            filename={`ulke-analizi-${flag.toLowerCase()}`}
            columns={COUNTRY_EXPORT_COLS}
            getData={() => [{
              'Ülke': flag === 'TR' ? 'Türkiye (Sentos)' : 'İngiltere (Base)',
              'Sipariş': data.orders,
              'Satılan Adet': data.sales,
              'Ciro (TL)': data.revenue,
              'Ürün Maliyeti (TL)': data.cost,
              'Kargo (TL)': data.shipping,
              'Pazaryeri Komisyonu (TL)': data.commission,
              'Hizmet Bedeli (TL)': data.serviceFee,
              'Koli Maliyeti (TL)': data.boxCost,
              'KDV (TL)': data.vat,
              'Genel Gider (TL)': data.expenses,
              'Brüt Kâr (TL)': data.gross,
              'Net Kâr (TL)': data.net,
              'Brüt Marj (%)': Number(grossMargin.toFixed(1)),
              'Net Marj (%)': Number(netMargin.toFixed(1)),
            }]}
            label={lang === 'tr' ? 'Dışa Aktar' : 'Export'}
          />
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('widget_revenue_column')}</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--fg)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-end' }}>
            {loading ? '…' : revGbp != null ? (
              <>
                {abbrev(revGbp, '£')}
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fg-subtle)' }}>≈ {abbrev(data.revenue, '₺')}</span>
              </>
            ) : abbrev(data.revenue, '₺')}
          </div>
        </div>
      </div>

      {/* Küçük metrik ızgarası */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8 }}>
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="country-metric"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border-soft)',
              borderRadius: '4px',
              padding: '7px 9px',
              animationDelay: `${delay + i * 24}ms`,
            }}
          >
            <div style={{ fontSize: 9.5, color: 'var(--fg-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {m.label}
            </div>
            <div style={{ fontSize: m.strong ? 14 : 12.5, fontWeight: m.strong ? 800 : 700, color: m.color ?? 'var(--fg)', marginTop: 2 }}>
              {loading ? '…' : m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
