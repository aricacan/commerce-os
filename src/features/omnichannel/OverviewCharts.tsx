'use client';

import { useMemo } from 'react';
import type { OverviewInsightsDto, OverviewSummaryDto } from '../../lib/api/omnichannel';
import { DailyMessagesChart } from './DailyMessagesChart';
import { HourlyActivityChart } from './HourlyActivityChart';
import { ChartCard } from './OverviewCards';
import {
  channelCaption, dailyCaption, hourlyCaption, reasonCaption, responseCaption, stageCaption,
  toBrandBars, toChannelBars, toCountryBars, toDailyPoints, toHourPoints, toReasonBars, toResponsePoints, toStageBars, toTopicBars,
} from './overviewRules';
import { RankedBarsChart } from './RankedBarsChart';
import { ResponseTimeChart } from './ResponseTimeChart';
import type { Resource } from './useResource';

interface Props {
  summary: OverviewSummaryDto;
  insights: Resource<OverviewInsightsDto>;
  // Ülke kodu → ad ("KS" → "Kosova").
  countryNames: Record<string, string>;
  onReloadInsights: () => void;
}

const BRAND_CAPTION = 'Yazan müşterilerin kanalın bağlı olduğu markaya göre dağılımı.';
const COUNTRY_CAPTION = 'Kanalın ülkesi esas alınır; kanal ülkesizse müşterinin ülkesi.';
const TOPIC_CAPTION = "Konu etiketleri konuşmalara otomatik atanır; 'Etiketsiz' henüz sınıflanmamış olanlardır.";

// Özet ve ağır hesap (insights) verisinden çizilen grafik kartları. Izgaranın (OverviewTab) çocuklarıdır.
export function OverviewCharts({ summary, insights, countryNames, onReloadInsights }: Props) {
  const view = useMemo(() => ({
    daily: toDailyPoints(summary.daily),
    hours: toHourPoints(summary.hourlyInbound),
    stages: toStageBars(summary.stages),
    channels: toChannelBars(summary.channels),
    reasons: toReasonBars(summary.handoffReasons),
    topics: toTopicBars(summary.topics),
  }), [summary]);
  const data = insights.data;
  const insightState = { loading: insights.loading && !data, error: insights.error, onRetry: onReloadInsights };

  return (
    <>
      <ChartCard title="Günlük mesajlar" caption={dailyCaption(view.daily)} className="xl:col-span-2">
        <DailyMessagesChart data={view.daily} />
      </ChartCard>
      <ChartCard title="Konuşmalar hangi aşamada?" caption={stageCaption(summary)}>
        <RankedBarsChart bars={view.stages} unit="Konuşma" ariaLabel="Konuşmaların aşamalara göre dağılımı" emptyText="Bu kapsamda konuşma yok." />
      </ChartCard>
      <ChartCard title="Kanal bazlı hacim" caption={channelCaption(view.channels)}>
        <RankedBarsChart bars={view.channels} unit="Konuşma" ariaLabel="Yazan müşterilerin kanallara göre dağılımı" emptyText="Bu dönemde yazan müşteri yok." />
      </ChartCard>
      <ChartCard title="Saat saat yoğunluk" caption={hourlyCaption(summary.hourlyInbound)}>
        <HourlyActivityChart points={view.hours} />
      </ChartCard>
      <ChartCard title="İlk yanıt süresi trendi" caption={data ? responseCaption(data.firstResponse) : undefined} {...insightState}>
        {data && <ResponseTimeChart points={toResponsePoints(data.firstResponse.daily)} />}
      </ChartCard>
      <ChartCard title="Neden devrediliyor?" caption={reasonCaption(view.reasons)}>
        <RankedBarsChart bars={view.reasons} unit="Devir" ariaLabel="Devirlerin sebebe göre dağılımı" emptyText="Bu dönemde devir yok." />
      </ChartCard>
      <ChartCard title="Ne hakkında yazıyorlar?" caption={TOPIC_CAPTION}>
        <RankedBarsChart bars={view.topics} unit="Konuşma" ariaLabel="Konuşmaların konuya göre dağılımı" emptyText="Bu kapsamda konuşma yok." />
      </ChartCard>
      <ChartCard title="Ülkeye göre" caption={COUNTRY_CAPTION} {...insightState}>
        {data && (
          <RankedBarsChart
            bars={toCountryBars(data.countries, countryNames)} unit="Konuşma"
            ariaLabel="Yazan müşterilerin ülkeye göre dağılımı" emptyText="Bu dönemde yazan müşteri yok."
          />
        )}
      </ChartCard>
      <ChartCard title="Markaya göre" caption={BRAND_CAPTION} {...insightState}>
        {data && (
          <RankedBarsChart
            bars={toBrandBars(data.brands)} unit="Konuşma"
            ariaLabel="Yazan müşterilerin markaya göre dağılımı" emptyText="Bu dönemde yazan müşteri yok."
          />
        )}
      </ChartCard>
    </>
  );
}
