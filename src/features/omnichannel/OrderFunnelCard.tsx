'use client';

import { omnichannelApi, type OrderFunnelDto, type OverviewPeriodParams, type OverviewScopeParams } from '../../lib/api/omnichannel';
import { crossSellSummary, followUpReturnPercent, FUNNEL_STEP_LABELS, toFunnelBars } from './funnelRules';
import { ChartCard } from './OverviewCards';
import { useResource } from './useResource';

interface Props {
  period: OverviewPeriodParams;
  scope: OverviewScopeParams;
  reloadKey: number;
  className?: string;
}

// Sohbetten siparişe huni (P32): "bot çok kapsamlı oldu mu?" sorusunun sayısı. Her çubuk bir adım;
// yanındaki % bir önceki adımdan geçenlerin oranı — en büyük düşüşün nerede olduğu bir bakışta görünür.
export function OrderFunnelCard({ period, scope, reloadKey, className }: Props) {
  const { brandId, channelId, country } = scope;
  const funnel = useResource(
    () => omnichannelApi.getOrderFunnel(period, { brandId, channelId, country }),
    `funnel-${period.days}-${period.from}-${period.to}-${brandId}-${channelId}-${country}-${reloadKey}`,
  );

  return (
    <ChartCard title="Sohbetten sipariş hunisi" className={className} loading={funnel.loading && !funnel.data} error={funnel.error}>
      {funnel.data && <FunnelBody data={funnel.data} />}
    </ChartCard>
  );
}

function FunnelBody({ data }: { data: OrderFunnelDto }) {
  const bars = toFunnelBars(data.steps);
  const crossSellText = crossSellSummary(data.crossSell);
  const returnPercent = followUpReturnPercent(data.followUps.sent, data.followUps.customerRepliedAfter);

  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Sipariş hunisi adımları" className="m-0 flex list-none flex-col gap-1.5 p-0">
        {bars.map((bar) => (
          <li key={bar.step} className="grid grid-cols-[minmax(0,140px)_1fr_auto] items-center gap-2 text-ui-sm">
            <span className="truncate text-fg-muted">{FUNNEL_STEP_LABELS[bar.step]}</span>
            <span className="h-2 rounded-full bg-bg-subtle">
              {/* Çubuk genişliği veriden gelen tek dinamik ölçü: Tailwind sınıfıyla ifade edilemez. */}
              <span className="block h-2 rounded-full bg-info" style={{ width: `${bar.widthPercent}%` }} />
            </span>
            <span className="font-mono tabular-nums text-fg">
              {bar.count}
              {bar.passPercent !== null && <span className="text-fg-muted"> · %{bar.passPercent}</span>}
            </span>
          </li>
        ))}
      </ul>

      <p className="m-0 text-ui-xs text-fg-muted">
        Takip mesajı: {data.followUps.sent} gönderildi
        {returnPercent !== null && `, %${returnPercent}'ine müşteri sonradan yazdı`}
        {data.followUps.waitingForAgent > 0 && ` · ${data.followUps.waitingForAgent} tanesi temsilci onayı bekliyor`}.
      </p>

      {crossSellText && <p className="m-0 text-ui-xs text-fg-muted">{crossSellText}</p>}

      {data.brands.length > 1 && <BrandTable data={data} />}
    </div>
  );
}

function BrandTable({ data }: { data: OrderFunnelDto }) {
  const bars = toFunnelBars(data.steps);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-ui-xs">
        <thead className="text-[10.5px] uppercase text-fg-muted">
          <tr className="border-b border-border-soft">
            <th className="p-1.5 text-left">Marka</th>
            {bars.map((b) => <th key={b.step} className="p-1.5 text-right">{FUNNEL_STEP_LABELS[b.step]}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.brands.map((brand) => (
            <tr key={brand.brandId ?? 'none'} className="border-b border-border-soft last:border-b-0">
              <td className="p-1.5">{brand.brandName}</td>
              {brand.steps.map((s) => <td key={s.step} className="p-1.5 text-right font-mono">{s.count}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
