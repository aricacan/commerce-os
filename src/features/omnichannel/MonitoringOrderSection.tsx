import type { MonitoringOrderDto } from '../../lib/api/omnichannel-monitoring';
import type { ChatOrderStatus } from '../../lib/api/omnichannel-chat-orders';
import { CHAT_ORDER_STATUS_LABELS } from './chatOrderRules';
import { CountRow, MonitoringPanel, MonitoringStat } from './MonitoringParts';

const statusLabel = (status: number): string =>
  (CHAT_ORDER_STATUS_LABELS as Record<number, string | undefined>)[status as ChatOrderStatus] ?? `Durum ${status}`;

// Sohbet siparişi akışı: başladı → onaylandı → ERP/Shopify'a gitti ya da gönderim hatası aldı.
export function MonitoringOrderSection({ data }: { data: MonitoringOrderDto }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MonitoringStat label="Başlayan sipariş" value={String(data.startedCount)} hint="Sohbette açılan taslaklar dahil" />
        <MonitoringStat label="Onaylanan" value={String(data.confirmedCount)} hint="Müşteri özeti onayladı" />
        <MonitoringStat label="Gönderilen" value={String(data.dispatchedCount)} hint="Shopify'da, kargoda ya da ERP numarası almış" />
        <MonitoringStat
          label="Gönderim hatası" value={String(data.dispatchFailedCount)} danger={data.dispatchFailedCount > 0}
          hint="Shopify ya da ERP hata kaydı olanlar"
        />
      </div>
      <MonitoringPanel title="Duruma göre siparişler">
        {data.byStatus.map((row) => (
          <CountRow key={row.status} label={statusLabel(row.status)} count={row.count} />
        ))}
      </MonitoringPanel>
    </div>
  );
}
