'use client';

import { useMemo, useState } from 'react';
import { Inbox, Mail, ShoppingCart, UserRoundCheck } from 'lucide-react';
import { monitoringApi } from '../../lib/api/omnichannel-monitoring';
import { MonitoringBotSection } from './MonitoringBotSection';
import { MonitoringDeliverySection } from './MonitoringDeliverySection';
import { MonitoringHandoffSection } from './MonitoringHandoffSection';
import { MonitoringOrderSection } from './MonitoringOrderSection';
import { MonitoringSection } from './MonitoringSection';
import { MonitoringToolbar } from './MonitoringToolbar';
import { ShadowMovedNotice } from './ShadowMovedNotice';
import {
  defaultMonitoringRange, exceedsMaxRange, toMonitoringQuery, withoutSandbox, type MonitoringRangeValue,
} from './monitoringRules';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';
import { useMonitoringSection } from './useMonitoringSection';

// "İzleme": bot hızı, devir/SLA, teslimat ve sipariş akışı. Tek tarih aralığı dört bölümü de sürer;
// her bölüm bağımsız yüklenir (biri hata verse diğerleri görünür). Test Alanı kayıtları hiçbir yerde yoktur.
// Gölge karşılaştırma Kalite Merkezi'ne taşındı (FAZ 7.5); yöneticiye oraya bağlantı gösterilir.
export function MonitorTab() {
  const [range, setRange] = useState<MonitoringRangeValue>(() => defaultMonitoringRange());
  const [refreshToken, setRefreshToken] = useState(0);
  const isAdmin = useIsOmnichannelAdmin();

  const { preset, customFrom, customTo } = range;
  const query = useMemo(() => toMonitoringQuery({ preset, customFrom, customTo }), [preset, customFrom, customTo]);

  const bot = useMonitoringSection(monitoringApi.getBotHealth, query, refreshToken);
  const handoffs = useMonitoringSection(monitoringApi.getHandoffs, query, refreshToken);
  const delivery = useMonitoringSection(monitoringApi.getDelivery, query, refreshToken);
  const orders = useMonitoringSection(monitoringApi.getOrders, query, refreshToken);

  const refreshing = [bot, handoffs, delivery, orders].some((section) => section.loading);

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 sm:p-5">
      <MonitoringToolbar
        range={range}
        onRangeChange={(patch) => setRange((current) => ({ ...current, ...patch }))}
        onRefresh={() => setRefreshToken((token) => token + 1)}
        refreshing={refreshing}
        overLimit={query !== null && exceedsMaxRange(query)}
        invalid={query === null}
      />
      {query !== null && (
        <>
          <MonitoringSection
            title="Bot ve kanallar" state={bot}
            isEmpty={(data) => withoutSandbox(data.channels).length === 0}
            emptyIcon={Inbox} emptyTitle="Henüz kanal yok"
            emptyDescription="İzlenecek gerçek bir kanal bağlandığında trafik ve bot göstergeleri burada görünür."
          >
            {(data) => <MonitoringBotSection data={data} />}
          </MonitoringSection>
          <MonitoringSection
            title="Devirler ve SLA" state={handoffs}
            isEmpty={(data) => data.ticketCount === 0 && data.slaTrackedCount === 0}
            emptyIcon={UserRoundCheck} emptyTitle="Bu dönemde devir yok"
            emptyDescription="Seçili dönemde bot hiçbir konuşmayı temsilciye devretmedi ve süresi dolan SLA yok."
          >
            {(data) => <MonitoringHandoffSection data={data} />}
          </MonitoringSection>
          <MonitoringSection
            title="Teslimat" state={delivery}
            isEmpty={(data) => data.emailByKind.length === 0 && data.mailboxes.length === 0
              && data.metaErrorCodes.length === 0 && data.failedWithoutCode === 0}
            emptyIcon={Mail} emptyTitle="Teslimat sorunu ya da e-posta trafiği yok"
            emptyDescription="Seçili dönemde giden e-posta, gönderim hatası ya da e-posta kutusu kaydı bulunmuyor."
          >
            {(data) => <MonitoringDeliverySection data={data} />}
          </MonitoringSection>
          <MonitoringSection
            title="Sohbet siparişleri" state={orders}
            isEmpty={(data) => data.startedCount === 0}
            emptyIcon={ShoppingCart} emptyTitle="Bu dönemde sohbet siparişi yok"
            emptyDescription="Müşteriler seçili dönemde sohbetten sipariş başlatmadı."
          >
            {(data) => <MonitoringOrderSection data={data} />}
          </MonitoringSection>
          {isAdmin && <ShadowMovedNotice />}
        </>
      )}
    </div>
  );
}
