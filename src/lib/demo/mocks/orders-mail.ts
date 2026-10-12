// Sipariş maili şablonları: liste, yer tutucular ve gerçek siparişle önizleme (gönderim yok).
import type { OrderDetail } from '../../../types/api';
import {
  MAIL_AUDIENCE, type OrderMailPlaceholder, type OrderMailPreview, type OrderMailTemplate,
} from '../../api/order-mail-templates';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';
import { ago } from '../seed';
import { currentOrders } from './orders-store';

const NOT_FOUND = 404;

const PLACEHOLDERS: OrderMailPlaceholder[] = [
  { name: 'musteriAdi', description: 'Alıcının adı soyadı' },
  { name: 'siparisNo', description: 'Pazaryeri sipariş numarası' },
  { name: 'toplamTutar', description: 'Sipariş toplamı (para birimiyle)' },
  { name: 'magazaAdi', description: 'Siparişin geldiği mağaza' },
  { name: 'takipNo', description: 'Kargo takip numarası' },
];

function template(
  id: number, key: string, name: string, triggerStatus: string | null, subject: string, body: string,
  audience: OrderMailTemplate['audience'], isEnabled: boolean,
): OrderMailTemplate {
  return {
    id, key, name, triggerStatus, subject, audience, isEnabled,
    htmlBody: `<p>Merhaba {{musteriAdi}},</p><p>${body}</p><p>{{magazaAdi}}</p>`,
    unknownPlaceholders: [],
    updatedAt: ago(id * 3),
  };
}

const TEMPLATES: OrderMailTemplate[] = [
  template(1, 'siparis-alindi', 'Sipariş alındı', 'Yeni', '{{siparisNo}} numaralı siparişiniz alındı',
    '{{siparisNo}} numaralı siparişiniz alındı. Toplam tutar: {{toplamTutar}}.', MAIL_AUDIENCE.DirectOnly, true),
  template(2, 'siparis-onaylandi', 'Sipariş onaylandı', 'Onaylandı', 'Siparişiniz onaylandı',
    'Siparişiniz onaylandı ve hazırlığa alındı.', MAIL_AUDIENCE.DirectOnly, true),
  template(3, 'siparis-kargolandi', 'Kargoya verildi', 'Kargolandı', 'Siparişiniz kargoda',
    'Siparişiniz kargoya verildi. Takip numaranız: {{takipNo}}.', MAIL_AUDIENCE.DirectAndProxy, true),
  template(4, 'siparis-teslim', 'Teslim edildi', 'Teslim Edildi', 'Siparişiniz teslim edildi',
    'Siparişiniz teslim edildi. Bizi tercih ettiğiniz için teşekkürler.', MAIL_AUDIENCE.DirectOnly, false),
  template(5, 'siparis-iptal', 'Sipariş iptali', 'İptal', 'Siparişiniz iptal edildi',
    '{{siparisNo}} numaralı siparişiniz iptal edildi.', MAIL_AUDIENCE.DirectAndProxy, false),
];

function fill(text: string, order: OrderDetail): string {
  const values: Record<string, string> = {
    musteriAdi: order.customerName ?? 'Değerli müşterimiz',
    siparisNo: order.platformOrderNumber,
    toplamTutar: `${order.totalAmount.toLocaleString('tr-TR')} ₺`,
    magazaAdi: order.storeName,
    takipNo: order.packageCode ?? 'henüz oluşmadı',
  };
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => values[name] ?? match);
}

function blockReason(order: OrderDetail, audience: OrderMailTemplate['audience']): string | null {
  if (order.customerEmailKind === 'None') return 'Siparişte e-posta adresi yok.';
  if (order.customerEmailKind === 'MarketplaceProxy' && audience === MAIL_AUDIENCE.DirectOnly) {
    return 'Pazaryeri maskeli adresi: şablon yalnızca gerçek adreslere gönderilir.';
  }
  return null;
}

function preview(request: DemoRequest): OrderMailPreview | DemoHttpResponse {
  const mailTemplate = TEMPLATES.find((candidate) => candidate.id === Number(request.params.id));
  if (!mailTemplate) return new DemoHttpResponse(NOT_FOUND);
  const orders = currentOrders();
  const requestedId = Number(request.query.get('orderId'));
  const order = orders.find((candidate) => candidate.orderId === requestedId)
    ?? [...orders].reverse().find((candidate) => candidate.customerEmailKind === 'Direct')
    ?? orders[orders.length - 1];
  const reason = blockReason(order, mailTemplate.audience);

  return {
    orderId: order.orderId,
    platformOrderNumber: order.platformOrderNumber,
    recipient: order.customerEmail,
    recipientKind: order.customerEmailKind,
    wouldSend: reason === null && mailTemplate.isEnabled,
    blockReason: reason ?? (mailTemplate.isEnabled ? null : 'Şablon kapalı.'),
    subject: fill(mailTemplate.subject, order),
    htmlBody: fill(mailTemplate.htmlBody, order),
  };
}

export const orderMailRoutes: DemoRoute[] = [
  get('/order-mail-templates/placeholders', () => PLACEHOLDERS),
  get('/order-mail-templates/:id/preview', preview),
  get('/order-mail-templates', () => TEMPLATES),
];
