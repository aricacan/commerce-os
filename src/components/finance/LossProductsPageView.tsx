'use client';

import { resolveDatePreset, type DatePreset } from '../../utils/date';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { financeApi } from '../../lib/api/finance';
import type { LossProductRow } from '../../types/api';
import { useI18n } from '../../lib/i18n';
import { FilterSelect, type FilterSelectOption } from '../ui/FilterSelect';

// Ortak tarih mantığı (utils/date.ts) — bu ekranın sunduğu alt küme.
type PresetKey = Extract<DatePreset, 'week' | 'month' | 'lastMonth' | '30days' | 'custom'>;


function money(n: number): string {
  return `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LossProductsPageView() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';

  const [preset, setPreset] = useState<PresetKey>('month');
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);

  const { from, to } = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return resolveDatePreset(preset);
  }, [preset, customFrom, customTo]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['finance-loss-products', from, to],
    queryFn: () => financeApi.lossProducts(from, to),
    staleTime: 60_000,
  });

  const PRESET_OPTIONS: FilterSelectOption[] = [
    { value: 'week', label: isTr ? 'Bu Hafta' : 'This Week' },
    { value: 'month', label: isTr ? 'Bu Ay' : 'This Month' },
    { value: 'lastMonth', label: isTr ? 'Geçen Ay' : 'Last Month' },
    { value: '30days', label: isTr ? 'Son 30 Gün' : 'Last 30 Days' },
    { value: 'custom', label: isTr ? 'Özel Tarih Aralığı' : 'Custom Range' },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-transparent p-4 md:p-5">
      {/* ── TEK BİRLEŞİK MASTER KART ── */}
      <div className="flex min-h-0 flex-1 flex-col rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
        
        {/* ── Üst Çubuk: Tarih Dropdown + Eksik Maliyet Bilgisi Tek Satırda ── */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
          
          {/* Sol: Tarih Dropdown & Özel Tarihler */}
          <div data-tour="loss-filters" className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={preset}
              options={PRESET_OPTIONS}
              placeholder={isTr ? 'Tarih Aralığı' : 'Date Range'}
              onChange={(val) => {
                const next = (val || 'month') as PresetKey;
                setPreset(next);
                if (next !== 'custom') {
                  setCustomFrom(null);
                  setCustomTo(null);
                }
              }}
              minWidth={140}
            />

            {preset === 'custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={customFrom || from}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
                <span className="text-xs text-[var(--fg-muted)]">—</span>
                <input
                  type="date"
                  value={customTo || to}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            )}
          </div>

          {/* Sağ: Eksik Alış Fiyatı Bilgisi & Rehber Butonu */}
          <div className="flex items-center gap-2">
            {data && data.excludedNoCostCount > 0 && (
              <div className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 text-xs">
                <span className="text-[var(--fg-muted)]">
                  <strong className="text-[var(--fg)]">{data.excludedNoCostCount} ürünün</strong> alış fiyatı girilmemiş (hesap dışı)
                </span>
                <Link
                  href="/product-costs"
                  className="inline-flex items-center gap-0.5 font-bold text-[var(--fg)] hover:underline"
                >
                  <span>{isTr ? 'Fiyatları Gir' : 'Enter Costs'}</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Kâr / Zarar Özet Şeridi ── */}
        {data && data.items.length > 0 && (
          <div data-tour="loss-summary" className="grid shrink-0 grid-cols-1 divide-y border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0 divide-[var(--border-soft)]">
            <div className="flex items-baseline justify-between p-3 px-4">
              <span className="text-xs font-semibold text-[var(--fg-muted)]">
                {isTr ? 'Toplam Zarar' : 'Total Loss'}
              </span>
              <span className="font-mono text-sm font-bold text-rose-500/90 dark:text-rose-400">
                -{money(Math.abs(data.totalLoss))}
              </span>
            </div>

            <div className="flex items-baseline justify-between p-3 px-4">
              <span className="text-xs font-semibold text-[var(--fg-muted)]">
                {isTr ? 'Zararlı Ürün Sayısı' : 'Loss Product Count'}
              </span>
              <span className="font-mono text-sm font-bold text-[var(--fg)]">
                {data.items.length} {isTr ? 'ürün' : 'products'}
              </span>
            </div>

            <div className="flex items-baseline justify-between p-3 px-4">
              <span className="text-xs font-semibold text-[var(--fg-muted)]">
                {isTr ? 'Ortalama Ürün Başı Zarar' : 'Avg Loss Per Product'}
              </span>
              <span className="font-mono text-sm font-bold text-rose-500/80 dark:text-rose-400/80">
                -{money(Math.abs(data.totalLoss) / data.items.length)}
              </span>
            </div>
          </div>
        )}

        {/* ── İçerik Gövdesi ── */}
        <div data-tour="loss-table" className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
              {isTr ? 'Zarar verileri hesaplanıyor…' : 'Calculating loss data…'}
            </div>
          ) : isError ? (
            <div className="p-16 text-center text-xs text-rose-500/85">
              {isTr ? 'Veri alınamadı.' : 'Failed to load data.'}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-16 text-center text-xs text-[var(--fg-muted)]">
              <p className="m-0 font-bold text-[var(--fg)] text-sm">
                {isTr ? 'Zararına Satılan Ürün Bulunmuyor' : 'No Loss-Making Products'}
              </p>
              <p className="m-0 mt-1">
                {isTr ? 'Seçili tarih aralığında tüm satışlar kârlı veya başa baş gerçekleşti.' : 'All sales were profitable or break-even.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--border-soft)]">
              {data.items.map((item) => {
                const loss = Math.abs(item.grossProfit);
                const unitLoss = item.quantitySold > 0 ? loss / item.quantitySold : loss;
                const marginPct = item.revenue > 0 ? (item.grossProfit / item.revenue) * 100 : 0;
                const isExpanded = expandedProductId === item.productId;

                return (
                  <div key={item.productId} className="flex flex-col bg-[var(--card)] transition hover:bg-[var(--bg-subtle)]/30">
                    <button
                      type="button"
                      onClick={() => setExpandedProductId(isExpanded ? null : item.productId)}
                      className="flex w-full items-center justify-between gap-4 p-3.5 px-4 text-left outline-none"
                    >
                      {/* Ürün & SKU & Mağaza */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-[var(--fg)]" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
                          <span className="text-[var(--fg-muted)] font-semibold">{item.sku}</span>
                          {item.brand && (
                            <span className="rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[var(--fg-muted)]">
                              {item.brand}
                            </span>
                          )}
                          <span className="rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.2 font-bold text-[var(--fg)]">
                            {item.storeName}
                          </span>
                        </div>
                      </div>

                      {/* Metrikler */}
                      <div className="hidden sm:flex items-center gap-6 text-right">
                        <div>
                          <span className="block text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                            {isTr ? 'Adet' : 'Qty'}
                          </span>
                          <span className="font-mono text-xs font-bold text-[var(--fg)]">
                            {item.quantitySold}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                            {isTr ? 'Ciro' : 'Rev'}
                          </span>
                          <span className="font-mono text-xs font-bold text-[var(--fg)]">
                            {money(item.revenue)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                            {isTr ? 'Birim Zarar' : 'Unit Loss'}
                          </span>
                          <span className="font-mono text-xs font-bold text-rose-500/90 dark:text-rose-400">
                            -{money(unitLoss)}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                            {isTr ? 'Marj' : 'Margin'}
                          </span>
                          <span className="font-mono text-xs font-bold text-rose-500/90 dark:text-rose-400">
                            %{marginPct.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Toplam Zarar */}
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-sm font-bold text-rose-500/90 dark:text-rose-400">
                          -{money(loss)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-[var(--fg-muted)]" />
                        ) : (
                          <ChevronDown size={14} className="text-[var(--fg-muted)]" />
                        )}
                      </div>
                    </button>

                    {/* Genişletilmiş Zarar Kırılımı */}
                    {isExpanded && <CostBreakdown item={item} isTr={isTr} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Alt Bar ── */}
        <div className="flex h-9 shrink-0 items-center justify-between border-t border-[var(--border-soft)] px-4 text-[11px] text-[var(--fg-muted)]">
          <span>
            {isTr ? 'Listelenen Zararlı Ürün:' : 'Listed Loss Products:'}{' '}
            <b className="text-[var(--fg)]">{data?.items.length ?? 0}</b>
          </span>
          <span>
            {isTr ? 'Alış + Kutu + Kargo + Komisyon + KDV dahil net kâr hesabıdır.' : 'Net calculation including COGS, box, shipping, commission, VAT.'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Maliyet Kırılımı Dökümü ───────────────────────────────────────────────────

function CostBreakdown({ item, isTr }: { item: LossProductRow; isTr: boolean }) {
  const rows = [
    { label: isTr ? 'Satış Geliri (Ciro)' : 'Revenue', value: item.revenue, isPositive: true },
    { label: isTr ? 'Ürün Alış Maliyeti' : 'Buying Cost', value: -item.buyingCost },
    { label: isTr ? 'Kutu / Ambalaj Maliyeti' : 'Box Cost', value: -item.boxCost },
    { label: isTr ? 'Kargo / Nakliye Maliyeti' : 'Shipping Cost', value: -item.shippingCost },
    { label: isTr ? 'Pazaryeri Komisyonu' : 'Commission', value: -item.commission },
    { label: isTr ? 'Hizmet Bedeli' : 'Service Fee', value: -item.serviceFee },
    { label: isTr ? 'Net KDV Yükü' : 'Net VAT', value: -item.vat },
    { label: isTr ? 'Net Zarar' : 'Net Loss', value: item.grossProfit, isTotal: true },
  ];

  return (
    <div className="border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3.5 px-6">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
        {isTr ? 'Maliyet ve Zarar Kırılımı' : 'Cost & Loss Breakdown'}
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <div
            key={r.label}
            className={`flex items-center justify-between rounded-[3px] border border-[var(--border-soft)] p-2 px-3 text-xs ${
              r.isTotal
                ? 'bg-rose-500/5 border-rose-500/20 font-bold text-rose-500/90 dark:text-rose-400'
                : 'bg-[var(--card)] font-medium text-[var(--fg)]'
            }`}
          >
            <span className="text-[11px] text-[var(--fg-muted)]">{r.label}</span>
            <span className="font-mono font-bold">
              {r.value > 0 ? '+' : ''}
              {money(r.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
