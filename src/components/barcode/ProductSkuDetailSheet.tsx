'use client';

import { useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { ProductErpSummary } from '../products/ProductErpSummary';
import { useProductSkuDetail } from '../../hooks/useProductSkuDetail';

type Period = '30' | '60' | '90' | 'all';

interface Props {
  sku: string | null;
  onClose: () => void;
}

const PERIODS: readonly Period[] = ['30', '60', '90', 'all'];
const CUTOFF_DAYS: Record<Exclude<Period, 'all'>, number> = { '30': 30, '60': 60, '90': 90 };

function currencySymbol(currency: string | null) {
  return currency === 'GBP' ? '£' : '₺';
}

export function ProductSkuDetailSheet({ sku, onClose }: Props) {
  const { data, isLoading, isError } = useProductSkuDetail(sku);
  const [period, setPeriod] = useState<Period>('30');
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const salesCount = period === '30'
    ? data?.sales30d
    : period === '60'
      ? data?.sales60d
      : period === '90'
        ? data?.sales90d
        : data?.salesTotal;

  const chartData = period === 'all'
    ? data?.salesTimeline
    : data?.salesTimeline.filter(day => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS[period]);
        return new Date(day.date) >= cutoff;
      });

  return (
    <BottomSheet
      open={!!sku}
      onClose={onClose}
      title="Ürün Ayrıntısı"
      aboveBottomNav
      desktopDialog
    >
      {isLoading && (
        <div className="flex h-56 items-center justify-center text-sm text-[var(--fg-muted)]">
          Yükleniyor…
        </div>
      )}

      {isError && (
        <div className="flex h-56 flex-col items-center justify-center gap-2 px-6 text-sm">
          <span className="font-semibold text-red-500">Ürün bilgileri alınamadı.</span>
          <span className="text-xs text-[var(--fg-muted)]">SKU: {sku}</span>
        </div>
      )}

      {data && (
        <div className="max-h-[calc(100vh-140px)] overflow-y-auto px-4 pb-4 sm:max-h-none sm:overflow-visible sm:px-6 sm:pb-6">
          <header className="grid gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--card)] p-3.5 sm:grid-cols-[80px_minmax(0,1fr)_auto] sm:items-center">
            {data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.imageUrl}
                alt={data.name}
                className="h-20 w-20 rounded-md border border-[var(--border-soft)] bg-white object-contain p-1"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                <Package size={24} className="text-[var(--fg-muted)]" />
              </div>
            )}

            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[var(--fg-muted)]">
                  SKU: {data.sku}
                </span>
                {data.barcode && (
                  <span className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[var(--fg-muted)]">
                    Barkod: {data.barcode}
                  </span>
                )}
              </div>
              <h2 className="text-sm font-bold leading-snug text-[var(--fg)] sm:text-base">{data.name}</h2>
              {data.brand && (
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">
                  {[data.brand, data.model, data.modelYear].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
              <MetricTile label="Toplam Satış" value={`${data.salesTotal} adet`} />
              <MetricTile
                label="Alış Fiyatı"
                value={data.cost
                  ? `${currencySymbol(data.cost.currency)}${data.cost.buyingPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                  : 'Yok'}
              />
            </div>
          </header>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1.12fr_.88fr]">
            <div className="min-w-0 space-y-3">
              <section className="rounded-md border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
                <div className="mb-2.5">
                  <h3 className="text-xs font-bold text-[var(--fg)]">ERP Kayıtları</h3>
                  <p className="text-[10.5px] text-[var(--fg-muted)]">Her kaynağın adı, fiyatı ve stoğu</p>
                </div>
                <div>
                  <ProductErpSummary variants={data.erpVariants ?? []} detailed />
                </div>
              </section>

              {data.description && (
                <section className="rounded-md border border-[var(--border-soft)] bg-[var(--card)] px-3.5 py-2.5">
                  <button
                    onClick={() => setDescriptionOpen(open => !open)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-xs font-bold text-[var(--fg)]">Ürün açıklaması</span>
                    {descriptionOpen
                      ? <ChevronUp size={14} className="text-[var(--fg-muted)]" />
                      : <ChevronDown size={14} className="text-[var(--fg-muted)]" />}
                  </button>
                  {descriptionOpen && (
                    <p className="mt-2 text-xs leading-relaxed text-[var(--fg-muted)]">{data.description}</p>
                  )}
                </section>
              )}
            </div>

            <div className="min-w-0 space-y-3">
              <section className="rounded-md border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
                <div className="mb-2.5">
                  <h3 className="text-xs font-bold text-[var(--fg)]">Pazaryerleri</h3>
                  <p className="text-[10.5px] text-[var(--fg-muted)]">Siparişin gerçek ERP ve mağaza kaynağı</p>
                </div>
                {data.platforms.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {data.platforms.map(platform => (
                      <div
                        key={`${platform.name}-${platform.connectorType}-${platform.storeName}`}
                        className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-2"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <strong className="truncate text-xs text-[var(--fg)]">{platform.name}</strong>
                          <span className="shrink-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--fg)]">
                            {platform.orderCount}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[10px] text-[var(--fg-muted)]">
                          {platform.connectorType} · {platform.storeName}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-3 text-center text-xs text-[var(--fg-muted)]">
                    Bu SKU için pazaryeri siparişi yok.
                  </p>
                )}
              </section>

              <section className="rounded-md border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--fg)]">Satış Eğilimi</h3>
                    <p className="text-[10.5px] text-[var(--fg-muted)]">Seçilen dönemde satılan adet</p>
                  </div>
                  <strong className="shrink-0 text-xl font-bold text-[var(--fg)]">{salesCount ?? 0}</strong>
                </div>

                <div className="flex gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-0.5 mb-2">
                  {PERIODS.map(item => (
                    <button
                      key={item}
                      onClick={() => setPeriod(item)}
                      className={`flex-1 rounded-[3px] py-1 text-[10px] font-semibold transition-colors ${
                        period === item
                          ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs'
                          : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                      }`}
                    >
                      {item === 'all' ? 'Tümü' : `${item}G`}
                    </button>
                  ))}
                </div>

                <div className="h-24">
                  {chartData && chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 2, bottom: 0, left: -34 }}>
                        <defs>
                          <linearGradient id="skuSalesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)' }} />
                        <Area
                          type="monotone"
                          dataKey="quantity"
                          name="Satış"
                          stroke="var(--accent)"
                          strokeWidth={1.5}
                          fill="url(#skuSalesGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--fg-muted)]">
                      Bu dönemde satış yok.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
}

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="min-w-[120px] rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1.5">
      <span className="text-[10px] font-medium text-[var(--fg-muted)]">{label}</span>
      <p className="text-xs font-bold text-[var(--fg)] mt-0.5">{value}</p>
    </div>
  );
}
