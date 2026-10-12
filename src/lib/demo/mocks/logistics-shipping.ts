// Lojistik: taşıyıcılar, gönderiler, takip sorgusu ve taşıyıcı eşlemeleri.
import {
  CARRIER_STATUS, SHIPMENT_STATUS,
  type CarrierHealthDto, type ShipmentDetailDto, type ShipmentPageDto, type TrackingLookupResult,
} from '../../api/shipping';
import type { Carrier } from '../../api/carrier';
import { ago, matchesSearch, paginate } from '../seed';
import { DemoHttpResponse, get, post, type DemoRoute } from '../router';
import {
  DEMO_CARRIERS, DEMO_CARRIER_MAPPINGS, DEMO_SHIPMENT_DETAILS,
} from '../data/logistics-shipping';

const NOT_FOUND = 404;
const LOOKUP_STEPS_HOURS = [30, 18, 6];

// Vergi/ünvan kataloğu (fatura tarafındaki taşıyıcı listesi).
const CARRIER_CATALOG: Carrier[] = [
  { id: 1, vkn: '1234567890', title: 'Hızlı Kargo Taşımacılık A.Ş.', matchKeywords: 'hızlı,hizli kargo', isDefaultFallback: true, isActive: true },
  { id: 2, vkn: '2345678901', title: 'Anadolu Lojistik Ltd. Şti.', matchKeywords: 'anadolu,lojistik', isDefaultFallback: false, isActive: true },
  { id: 3, vkn: '3456789012', title: 'Ekspres Taşıma A.Ş.', matchKeywords: 'ekspres', isDefaultFallback: false, isActive: true },
  { id: 4, vkn: '4567890123', title: 'Kuzey Kurye Hizmetleri', matchKeywords: 'kuzey,kurye', isDefaultFallback: false, isActive: false },
];

function findDetail(id: string): ShipmentDetailDto | undefined {
  return DEMO_SHIPMENT_DETAILS.find((detail) => detail.summary.id === Number(id));
}

function listShipments(query: URLSearchParams): ShipmentPageDto {
  const carrierId = query.get('carrierId');
  const status = query.get('status');
  const filtered = DEMO_SHIPMENT_DETAILS
    .map((detail) => detail.summary)
    .filter((item) => carrierId === null || item.carrierId === Number(carrierId))
    .filter((item) => status === null || item.status === Number(status))
    .filter((item) => matchesSearch(item, query.get('search'), ['trackingNumber', 'orderNumber', 'recipientName']));
  return paginate(filtered, query);
}

// Kayıtlı olmayan numara için de makul bir takip geçmişi üretir (anlık sorgu ekranı boş kalmasın).
function lookupTracking(query: URLSearchParams): TrackingLookupResult {
  const trackingNumber = query.get('trackingNumber') ?? '';
  const known = DEMO_SHIPMENT_DETAILS.find((detail) => detail.summary.trackingNumber === trackingNumber);
  if (known) {
    return { success: true, status: known.summary.status, deliveredAt: known.summary.deliveredAt, events: known.events, error: null };
  }
  const steps = [SHIPMENT_STATUS.PickedUp, SHIPMENT_STATUS.InTransit, SHIPMENT_STATUS.OutForDelivery];
  const events = steps.map((status, index) => ({
    id: index + 1,
    status,
    rawStatus: null,
    description: ['Kargo teslim alındı', 'Transfer merkezinde', 'Dağıtıma çıkarıldı'][index],
    location: ['İstanbul Aktarma', 'Ankara Aktarma', 'Ankara Şube'][index],
    occurredAt: ago(0, LOOKUP_STEPS_HOURS[index]),
  }));
  return { success: true, status: SHIPMENT_STATUS.OutForDelivery, deliveredAt: null, events, error: null };
}

const healthy: CarrierHealthDto = { status: CARRIER_STATUS.Connected, error: null };

export const logisticsShippingRoutes: DemoRoute[] = [
  get('/shipping/carriers', () => DEMO_CARRIERS),
  get('/shipping/carriers/:id', (req) => DEMO_CARRIERS.find((c) => c.id === Number(req.params.id)) ?? new DemoHttpResponse(NOT_FOUND)),
  post('/shipping/carriers/:id/check', () => healthy),
  get('/shipping/carrier-mappings', () => DEMO_CARRIER_MAPPINGS),
  get('/shipping/shipments/lookup', (req) => lookupTracking(req.query)),
  get('/shipping/shipments', (req) => listShipments(req.query)),
  get('/shipping/shipments/:id', (req) => findDetail(req.params.id) ?? new DemoHttpResponse(NOT_FOUND)),
  post('/shipping/shipments/:id/track', (req) => findDetail(req.params.id) ?? new DemoHttpResponse(NOT_FOUND)),
  get('/carriers', () => CARRIER_CATALOG),
];
