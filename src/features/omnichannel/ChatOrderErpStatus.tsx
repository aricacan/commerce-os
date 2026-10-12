import type { ChatOrderDto } from '../../lib/api/omnichannel-chat-orders';
import { ERP_NOT_ENABLED_TEXT } from './orderDestinationRules';

const ERP_QUEUED_TEXT = 'ERP kuyruğunda; gönderim bekleniyor.';

// ERP hedefli siparişin durumu: ERP sipariş no, kuyrukta, hata sebebi ya da gönderim henüz kapalı (varsayılan:
// test aşaması, sipariş yalnız panelde kalır). Otomatik yeniden deneme yok; hata sonrası "Yeniden gönder" üst bileşende.
export function ChatOrderErpStatus({ order }: { order: Pick<ChatOrderDto, 'erpOrderNo' | 'erpError' | 'erpQueued'> }) {
  if (order.erpOrderNo) {
    return (
      <p role="status" className="m-0 text-[var(--fg)]">
        ERP sipariş no: <span className="font-mono font-semibold">{order.erpOrderNo}</span>
      </p>
    );
  }
  if (order.erpError) {
    return <p role="alert" className="m-0 break-words text-[var(--danger)]">ERP&apos;ye gönderilemedi: {order.erpError}</p>;
  }
  if (order.erpQueued) return <p role="status" className="m-0 text-[var(--fg-muted)]">{ERP_QUEUED_TEXT}</p>;
  return <p role="status" className="m-0 text-[var(--warning)]">{ERP_NOT_ENABLED_TEXT}; sipariş yalnız panelde kalıyor.</p>;
}
