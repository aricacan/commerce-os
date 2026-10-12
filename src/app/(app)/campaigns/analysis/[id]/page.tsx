'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { campaignApi } from '../../../../../lib/api';
import { useI18n } from '../../../../../lib/i18n';
import { formatDate } from '../../../../../lib/format';
import type { TranslationKey } from '../../../../../lib/translations/tr';
import type { OfferAnalysis } from '../../../../../types/api';

type TFunc = (key: TranslationKey) => string;

type Filter = 'all' | 'profitable' | 'unprofitable';

const CampaignAnalysisCharts = dynamic(
  () => import('../../../../../components/analytics/CampaignAnalysisCharts').then((module) => module.CampaignAnalysisCharts),
  { ssr: false, loading: () => <div className="mb-6 h-[300px] rounded-[var(--radius)] bg-bg-subtle" /> },
);

export default function CampaignAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['campaign-analysis', id],
    queryFn: () => campaignApi.analysis(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <LoadingState t={t} />;
  if (error || !analysis) return <ErrorState t={t} />;

  const campaignTypeLabel =
    analysis.campaignType === 'Flash' ? t('campaign_flash')
    : analysis.campaignType === 'Starred' ? t('campaign_starred')
    : analysis.campaignType === 'Plus' ? t('campaign_plus')
    : analysis.campaignType === 'Opportunity' ? t('campaign_opportunity')
    : analysis.campaignType;

  const filtered = analysis.offers.filter((o) => {
    if (filter === 'profitable' && !o.isProfitable) return false;
    if (filter === 'unprofitable' && o.isProfitable) return false;
    if (search) {
      const term = search.toLowerCase();
      return o.productName.toLowerCase().includes(term) ||
        o.barcode.toLowerCase().includes(term);
    }
    return true;
  });

  const chartData = analysis.offers
    .filter((o) => o.buyingPrice > 0)
    .slice(0, 30)
    .map((o) => ({
      name: o.productName.length > 20 ? o.productName.slice(0, 20) + '...' : o.productName,
      netProfit: o.netProfit,
    }));

  const costBreakdown = analysis.offers
    .filter((o) => o.buyingPrice > 0)
    .slice(0, 20)
    .map((o) => ({
      name: o.productName.length > 15 ? o.productName.slice(0, 15) + '...' : o.productName,
      buying: o.buyingPrice,
      boxCost: o.boxCost,
      shipping: o.shippingCost,
      commission: o.commissionAmount,
      kdv: o.kdvAmount,
    }));

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Başlık */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/trendyol/campaigns" className="flex text-fg-muted">
            <ArrowLeft size={20} />
          </Link>
          <p className="m-0 text-xl font-bold text-fg">
            {analysis.fileName} — {campaignTypeLabel}
          </p>
        </div>
        <Link
          href={`/orders?campaignUploadId=${analysis.uploadId}`}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3.5 py-2 text-[12.5px] font-bold text-white no-underline shadow-xs"
        >
          <ShoppingCart size={14} />
          {lang === 'tr' ? 'Kampanya Siparişlerini Gör' : 'See Campaign Orders'}
        </Link>
      </div>

      {/* Özet — sadece kâr/zarar anlamsal renk taşıyor, geri kalanı nötr */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label={t('campaign_total_offers')} value={analysis.totalOffers} />
        <KpiCard label={t('campaign_profitable')} value={analysis.profitableOffers} tone="success" />
        <KpiCard label={t('campaign_unprofitable')} value={analysis.unprofitableOffers} tone="danger" />
        <KpiCard label={t('campaign_avg_margin')} value={`%${analysis.averageMargin.toFixed(1)}`} />
      </div>

      <CampaignAnalysisCharts
        profitData={chartData}
        costData={costBreakdown}
        labels={{
          netProfit: t('campaign_net_profit'),
          costBreakdown: t('campaign_cost_breakdown'),
          buyingPrice: t('campaign_buying_price'),
          boxCost: t('campaign_box_cost'),
          shipping: t('campaign_shipping'),
          commission: t('campaign_commission'),
          kdv: t('campaign_kdv'),
        }}
      />

      {/* Filtre + tablo */}
      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          {(['all', 'profitable', 'unprofitable'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? 'bg-accent text-white' : 'bg-bg-subtle text-fg-muted'}`}
            >
              {f === 'all' ? t('campaign_all') : f === 'profitable' ? t('campaign_profitable') : t('campaign_unprofitable')}
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('campaign_search_product')}
            className="ml-auto w-[200px] rounded-[var(--radius-sm)] border border-border bg-bg-subtle px-3 py-1.5 text-xs text-fg outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="border-b border-border">
                {[
                  t('campaign_col_product'),
                  ...(analysis.campaignType === 'Flash' ? [t('campaign_col_list_price'), t('campaign_col_current_price')] : []),
                  analysis.campaignType === 'Flash' ? t('campaign_col_flash_price') : t('campaign_col_sale'),
                  ...(analysis.campaignType === 'Flash' ? [t('campaign_col_discount')] : []),
                  t('campaign_commission'),
                  ...(analysis.campaignType === 'Flash' ? [t('campaign_col_source')] : []),
                  t('campaign_shipping'), t('campaign_kdv'), t('campaign_net_profit'), t('campaign_margin'), t('campaign_roi'), t('campaign_col_status'),
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <OfferRow key={o.offerId} offer={o} expanded={expanded === o.offerId}
                  isFlash={analysis.campaignType === 'Flash'}
                  onToggle={() => setExpanded(expanded === o.offerId ? null : o.offerId)} t={t} lang={lang} />
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-10 text-center text-[13px] text-fg-muted">{t('campaign_no_results')}</div>
        )}
      </div>
    </div>
  );
}

type ToneKey = 'success' | 'warning' | 'muted';
const SOURCE_TONE_CLASSES: Record<ToneKey, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  muted:   'bg-bg-subtle text-fg-muted',
};

function commissionSourceInfo(source: string, t: TFunc): { label: string; detail: string; tone: ToneKey } | null {
  if (source === 'Tarife') {
    return { label: t('campaign_source_tariff_label'), detail: t('campaign_source_tariff_detail'), tone: 'success' };
  }
  if (source === 'TarifeReferansYok') {
    return { label: t('campaign_source_no_ref_label'), detail: t('campaign_source_no_ref_detail'), tone: 'warning' };
  }
  if (source === 'MevcutKomisyon') {
    return { label: t('campaign_source_current_label'), detail: t('campaign_source_current_detail'), tone: 'muted' };
  }
  return null;
}

function OfferRow({ offer: o, expanded, onToggle, t, lang, isFlash }: {
  offer: OfferAnalysis; expanded: boolean;
  onToggle: () => void; t: TFunc; lang: 'tr' | 'en'; isFlash: boolean;
}) {
  const sourceInfo = o.commissionSource ? commissionSourceInfo(o.commissionSource, t) : null;
  const colSpan = isFlash ? 12 : 9;
  const profitTone = o.netProfit >= 0 ? 'text-success' : 'text-danger';
  const marginTone = o.profitMargin >= 0 ? 'text-success' : 'text-danger';

  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-b border-border">
        <td className="px-3 py-2.5">
          <div className="text-[13px] font-medium text-fg">{o.productName}</div>
          <div className="text-[11px] text-fg-muted">{o.barcode}</div>
        </td>
        {isFlash && (
          <>
            <td className="px-3 py-2.5 text-[13px] text-fg-muted">
              {o.listPrice != null ? `₺${o.listPrice.toFixed(2)}` : '-'}
            </td>
            <td className="px-3 py-2.5 text-[13px] text-fg-muted">
              {o.currentSellingPrice != null ? `₺${o.currentSellingPrice.toFixed(2)}` : '-'}
            </td>
          </>
        )}
        <td className={`px-3 py-2.5 text-[13px] ${isFlash ? 'font-semibold' : ''}`}>₺{o.salePrice.toFixed(2)}</td>
        {isFlash && (
          <td className="px-3 py-2.5 text-[13px] font-semibold text-accent">
            {o.discountPercent != null ? `%${o.discountPercent.toFixed(1)}` : '-'}
          </td>
        )}
        <td className="px-3 py-2.5 text-[13px]">
          ₺{o.commissionAmount.toFixed(2)} <span className="text-[10px] text-fg-muted">(%{o.commissionRate})</span>
        </td>
        {isFlash && (
          <td className="px-3 py-2.5">
            {sourceInfo && (
              <span title={sourceInfo.detail} className={`inline-block cursor-help rounded-full px-2 py-0.5 text-[10px] font-semibold ${SOURCE_TONE_CLASSES[sourceInfo.tone]}`}>
                {sourceInfo.label}
              </span>
            )}
          </td>
        )}
        <td className="px-3 py-2.5 text-[13px]">₺{o.shippingCost.toFixed(2)}</td>
        <td className="px-3 py-2.5 text-[13px]">₺{o.kdvAmount.toFixed(2)}</td>
        <td className={`px-3 py-2.5 text-[13px] font-semibold ${profitTone}`}>₺{o.netProfit.toFixed(2)}</td>
        <td className={`px-3 py-2.5 text-[13px] ${marginTone}`}>%{o.profitMargin.toFixed(1)}</td>
        <td className="px-3 py-2.5 text-[13px]">%{o.roi.toFixed(1)}</td>
        <td className="px-3 py-2.5">
          {o.buyingPrice === 0 ? (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-warning">
              {t('campaign_no_cost_warning')}
            </span>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.isProfitable ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
              {o.isProfitable ? t('campaign_profitable') : t('campaign_unprofitable')}
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-bg-subtle">
          <td colSpan={colSpan} className="px-5 py-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              <DetailItem label={t('campaign_buying_price')} value={`₺${o.buyingPrice.toFixed(2)}`} />
              <DetailItem label={t('campaign_box_cost')} value={`₺${o.boxCost.toFixed(2)}`} />
              <DetailItem label={t('campaign_shipping')} value={`₺${o.shippingCost.toFixed(2)}`} />
              <DetailItem label={t('campaign_commission')} value={`₺${o.commissionAmount.toFixed(2)} (%${o.commissionRate})`} />
              <DetailItem label={t('campaign_kdv')} value={`₺${o.kdvAmount.toFixed(2)}`} />
              <DetailItem label={t('campaign_net_profit')} value={`₺${o.netProfit.toFixed(2)}`} tone={o.netProfit >= 0 ? 'text-success' : 'text-danger'} />
              {isFlash && o.estimatedVolumeMultiplier != null && (
                <DetailItem label={t('campaign_estimated_volume_multiplier')} value={`×${o.estimatedVolumeMultiplier.toFixed(1)}`} />
              )}
              {isFlash && sourceInfo && (
                <DetailItem label={t('campaign_commission_source')} value={sourceInfo.label} tone={sourceInfo.tone === 'success' ? 'text-success' : sourceInfo.tone === 'warning' ? 'text-warning' : 'text-fg-muted'} />
              )}
              {o.timeWindow && <DetailItem label={t('campaign_window')} value={o.timeWindow} />}
              {o.startDate && <DetailItem label={t('campaign_start_date')} value={formatDate(o.startDate, lang)} />}
              {o.endDate && <DetailItem label={t('campaign_end_date')} value={formatDate(o.endDate, lang)} />}
            </div>
            {isFlash && sourceInfo && (
              <p className="mt-2.5 text-[11px] leading-relaxed text-fg-muted">{sourceInfo.detail}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function DetailItem({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-semibold uppercase text-fg-muted">{label}</div>
      <div className={`text-[13px] font-semibold ${tone ?? 'text-fg'}`}>{value}</div>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'danger' }) {
  const valueClass = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-fg';
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-card p-4">
      <p className="mb-1.5 text-[11px] font-medium text-fg-muted">{label}</p>
      <p className={`text-[22px] font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function LoadingState({ t }: { t: TFunc }) {
  return <div className="p-20 text-center text-sm text-fg-muted">{t('campaign_analysis_loading')}</div>;
}

function ErrorState({ t }: { t: TFunc }) {
  return (
    <div className="p-20 text-center">
      <AlertCircle size={32} className="mx-auto mb-3 text-danger" />
      <p className="text-sm text-fg-muted">{t('campaign_analysis_load_failed')}</p>
      <Link href="/trendyol/campaigns" className="text-[13px] text-accent">{t('campaign_go_back')}</Link>
    </div>
  );
}
