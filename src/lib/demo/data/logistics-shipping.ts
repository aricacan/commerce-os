// Kargo modülü kurgusal verisi: taşıyıcılar, gönderiler ve takip olayları.
import {
  CARRIER_STATUS, CARRIER_TYPE, SHIPMENT_STATUS,
  type CarrierDto, type CarrierMappingRowDto, type CarrierType,
  type ShipmentDetailDto, type ShipmentEventDto, type ShipmentListItemDto, type ShipmentStatus,
} from '../../api/shipping';
import { ago, createRng } from '../seed';
import { DEMO_CUSTOMERS } from './core';

const SHIPMENT_COUNT = 96;
const MAX_AGE_DAYS = 45;
const CARRIER_HISTORY_DAYS = 120;
const LAST_ACTIVITY_HOURS = 6;

const rng = createRng(7301);

const carrier = (
  id: number, type: CarrierType, displayName: string, accountCode: string, storeCode: string | null,
  overrides: Partial<CarrierDto> = {},
): CarrierDto => ({
  id, type, displayName, accountCode, storeCode,
  isTestMode: false, isDefault: false, isActive: true,
  status: CARRIER_STATUS.Connected, lastError: null,
  lastCheckedAt: ago(0, LAST_ACTIVITY_HOURS), hasCredentials: true, isSupported: true,
  shipmentCount: 0, createdAt: ago(CARRIER_HISTORY_DAYS), updatedAt: ago(3),
  ...overrides,
});

const CARRIER_BASE: CarrierDto[] = [
  carrier(1, CARRIER_TYPE.Aras, 'Hızlı Kargo', 'HK-10045', 'store-a', { isDefault: true }),
  carrier(2, CARRIER_TYPE.Yurtici, 'Anadolu Lojistik', 'AL-20871', 'store-b'),
  carrier(3, CARRIER_TYPE.Ups, 'Royal Express', 'RX-UK-3302', 'store-c', { isDefault: true }),
  carrier(4, CARRIER_TYPE.Surat, 'Kuzey Kurye', 'KK-40519', 'store-a', {
    status: CARRIER_STATUS.AuthFailed, lastError: 'Kimlik doğrulama başarısız (demo verisi).',
  }),
  carrier(5, CARRIER_TYPE.Mng, 'Ekspres Taşıma', 'ET-50117', null, { isSupported: false, hasCredentials: false, status: CARRIER_STATUS.Unknown, lastCheckedAt: null }),
  carrier(6, CARRIER_TYPE.Dhl, 'Channel Freight', 'CF-UK-6008', 'store-c', { isSupported: false, hasCredentials: false, status: CARRIER_STATUS.Unknown, lastCheckedAt: null }),
];

// Gönderi açabilen (adaptörü yazılmış) taşıyıcılar.
const SHIPPING_CARRIER_IDS = [1, 1, 1, 2, 2, 3, 3, 4];

const UK_CARRIER_ID = 3;
const UK_CITIES = ['London', 'Manchester', 'Leeds'];
const UK_FIRST_NAMES = ['Oliver', 'Amelia', 'Jack', 'Sophie'];
const UK_LAST_NAMES = ['Taylor', 'Brown', 'Wilson', 'Evans'];

const STATUS_WEIGHTS: ShipmentStatus[] = [
  SHIPMENT_STATUS.Delivered, SHIPMENT_STATUS.Delivered, SHIPMENT_STATUS.Delivered, SHIPMENT_STATUS.Delivered,
  SHIPMENT_STATUS.InTransit, SHIPMENT_STATUS.InTransit, SHIPMENT_STATUS.OutForDelivery,
  SHIPMENT_STATUS.PickedUp, SHIPMENT_STATUS.Created, SHIPMENT_STATUS.DeliveryFailed,
  SHIPMENT_STATUS.Returned, SHIPMENT_STATUS.Cancelled,
];

// Durum -> o duruma varan olay zinciri.
const EVENT_FLOW: Record<ShipmentStatus, ShipmentStatus[]> = {
  [SHIPMENT_STATUS.Draft]: [],
  [SHIPMENT_STATUS.Created]: [SHIPMENT_STATUS.Created],
  [SHIPMENT_STATUS.PickedUp]: [SHIPMENT_STATUS.Created, SHIPMENT_STATUS.PickedUp],
  [SHIPMENT_STATUS.InTransit]: [SHIPMENT_STATUS.Created, SHIPMENT_STATUS.PickedUp, SHIPMENT_STATUS.InTransit],
  [SHIPMENT_STATUS.OutForDelivery]: [SHIPMENT_STATUS.Created, SHIPMENT_STATUS.PickedUp, SHIPMENT_STATUS.InTransit, SHIPMENT_STATUS.OutForDelivery],
  [SHIPMENT_STATUS.Delivered]: [SHIPMENT_STATUS.Created, SHIPMENT_STATUS.PickedUp, SHIPMENT_STATUS.InTransit, SHIPMENT_STATUS.OutForDelivery, SHIPMENT_STATUS.Delivered],
  [SHIPMENT_STATUS.DeliveryFailed]: [SHIPMENT_STATUS.Created, SHIPMENT_STATUS.PickedUp, SHIPMENT_STATUS.InTransit, SHIPMENT_STATUS.OutForDelivery, SHIPMENT_STATUS.DeliveryFailed],
  [SHIPMENT_STATUS.Returned]: [SHIPMENT_STATUS.Created, SHIPMENT_STATUS.PickedUp, SHIPMENT_STATUS.InTransit, SHIPMENT_STATUS.DeliveryFailed, SHIPMENT_STATUS.Returned],
  [SHIPMENT_STATUS.Cancelled]: [SHIPMENT_STATUS.Created, SHIPMENT_STATUS.Cancelled],
};

const EVENT_TEXT: Record<ShipmentStatus, { tr: string; en: string; raw: string }> = {
  [SHIPMENT_STATUS.Draft]: { tr: 'Taslak oluşturuldu', en: 'Draft created', raw: 'DRAFT' },
  [SHIPMENT_STATUS.Created]: { tr: 'Gönderi kaydı oluşturuldu', en: 'Shipment registered', raw: 'CREATED' },
  [SHIPMENT_STATUS.PickedUp]: { tr: 'Kargo kuryeye teslim edildi', en: 'Collected from sender', raw: 'PICKED_UP' },
  [SHIPMENT_STATUS.InTransit]: { tr: 'Transfer merkezinden çıkış yaptı', en: 'Departed sorting hub', raw: 'IN_TRANSIT' },
  [SHIPMENT_STATUS.OutForDelivery]: { tr: 'Dağıtıma çıkarıldı', en: 'Out for delivery', raw: 'OUT_FOR_DELIVERY' },
  [SHIPMENT_STATUS.Delivered]: { tr: 'Alıcıya teslim edildi', en: 'Delivered to recipient', raw: 'DELIVERED' },
  [SHIPMENT_STATUS.DeliveryFailed]: { tr: 'Alıcı adreste bulunamadı', en: 'Recipient not available', raw: 'DELIVERY_FAILED' },
  [SHIPMENT_STATUS.Returned]: { tr: 'Gönderici şubeye iade edildi', en: 'Returned to sender', raw: 'RETURNED' },
  [SHIPMENT_STATUS.Cancelled]: { tr: 'Gönderi iptal edildi', en: 'Shipment cancelled', raw: 'CANCELLED' },
};

const HUB_LOCATIONS_TR = ['İstanbul Aktarma', 'Ankara Aktarma', 'İzmir Aktarma', 'Bursa Şube'];
const HUB_LOCATIONS_UK = ['Birmingham Hub', 'Daventry Depot', 'Leeds Sorting Centre'];

const FIRST_EVENT_AGE_HOURS_STEP = 14;
const KG_RANGE: [number, number] = [0.4, 18];
const DESI_RANGE: [number, number] = [1, 28];
const TRY_PRICE_RANGE: [number, number] = [58, 240];
const GBP_PRICE_RANGE: [number, number] = [3.9, 14.5];

const TR_STREETS = ['Gül Sokak', 'Atatürk Caddesi', 'Çınar Sokak', 'Cumhuriyet Mahallesi', 'Yeni Yol Caddesi'];
const UK_STREETS = ['High Street', 'Station Road', 'Church Lane', 'Park Avenue'];

function buildEvents(shipmentId: number, status: ShipmentStatus, createdHoursAgo: number, isUk: boolean): ShipmentEventDto[] {
  return EVENT_FLOW[status].map((step, index) => {
    const text = EVENT_TEXT[step];
    const hubs = isUk ? HUB_LOCATIONS_UK : HUB_LOCATIONS_TR;
    return {
      id: shipmentId * 10 + index,
      status: step,
      rawStatus: text.raw,
      description: isUk ? text.en : text.tr,
      location: step === SHIPMENT_STATUS.Created ? null : hubs[(shipmentId + index) % hubs.length],
      occurredAt: ago(0, Math.max(0, createdHoursAgo - index * FIRST_EVENT_AGE_HOURS_STEP)),
    };
  });
}

function buildShipment(id: number): ShipmentDetailDto {
  const carrierId = rng.pick(SHIPPING_CARRIER_IDS);
  const isUk = carrierId === UK_CARRIER_ID;
  const customer = DEMO_CUSTOMERS[id % DEMO_CUSTOMERS.length];
  const status = rng.pick(STATUS_WEIGHTS);
  const createdHoursAgo = rng.int(2, MAX_AGE_DAYS * 24);
  const events = buildEvents(id, status, createdHoursAgo, isUk);
  const carrierInfo = CARRIER_BASE.find((item) => item.id === carrierId) ?? CARRIER_BASE[0];
  const delivered = events.find((event) => event.status === SHIPMENT_STATUS.Delivered);
  const picked = events.find((event) => event.status === SHIPMENT_STATUS.PickedUp);
  const city = isUk ? rng.pick(UK_CITIES) : customer.city;
  const name = isUk ? `${rng.pick(UK_FIRST_NAMES)} ${rng.pick(UK_LAST_NAMES)}` : customer.name;
  const priceRange = isUk ? GBP_PRICE_RANGE : TRY_PRICE_RANGE;

  const summary: ShipmentListItemDto = {
    id,
    carrierId,
    carrierName: carrierInfo.displayName,
    carrierType: carrierInfo.type,
    trackingNumber: status === SHIPMENT_STATUS.Draft ? null : `${isUk ? 'RX' : 'HK'}${String(7_400_000_000 + id * 7919)}`,
    orderNumber: `DM-${String(240_000 + id * 13)}`,
    status,
    recipientName: name,
    recipientCity: city,
    price: rng.float(priceRange[0], priceRange[1]),
    currency: isUk ? 'GBP' : 'TRY',
    shippedAt: picked?.occurredAt ?? null,
    deliveredAt: delivered?.occurredAt ?? null,
    lastTrackedAt: events.at(-1)?.occurredAt ?? null,
    lastError: status === SHIPMENT_STATUS.DeliveryFailed ? 'Teslimat denemesi başarısız oldu.' : null,
    createdAt: events[0]?.occurredAt ?? ago(0, createdHoursAgo),
  };

  return {
    summary,
    recipientPhone: isUk ? '+44 7700 900123' : customer.phone,
    recipientTown: isUk ? null : `${city} Merkez`,
    recipientAddress: isUk ? `${rng.int(1, 120)} ${rng.pick(UK_STREETS)}` : `${rng.pick(TR_STREETS)} No: ${rng.int(1, 90)}`,
    weightKg: rng.float(KG_RANGE[0], KG_RANGE[1], 1),
    desi: rng.int(DESI_RANGE[0], DESI_RANGE[1]),
    labelUrl: null,
    erpOrderId: 1000 + id,
    events,
  };
}

const SHIPMENT_DETAILS: ShipmentDetailDto[] = Array.from({ length: SHIPMENT_COUNT }, (_, index) => buildShipment(index + 1))
  .sort((a, b) => b.summary.createdAt.localeCompare(a.summary.createdAt));

export const DEMO_SHIPMENT_DETAILS = SHIPMENT_DETAILS;

export const DEMO_CARRIERS: CarrierDto[] = CARRIER_BASE.map((item) => ({
  ...item,
  shipmentCount: SHIPMENT_DETAILS.filter((detail) => detail.summary.carrierId === item.id).length,
}));

// Veri kaynağı (ERP) -> taşıyıcı eşlemesi; eşlenmemiş bir kaynak da var ki uyarı kutusu görünsün.
export const DEMO_CARRIER_MAPPINGS: CarrierMappingRowDto[] = [
  { sourceId: 1, sourceCode: 'erp-a-tr', sourceDisplayName: 'Mağaza A ERP', erp: 'ERP-A', country: 'TR', carrierId: 1, carrierName: 'Hızlı Kargo', isActive: true },
  { sourceId: 2, sourceCode: 'erp-b-tr', sourceDisplayName: 'Mağaza B ERP', erp: 'ERP-B', country: 'TR', carrierId: 2, carrierName: 'Anadolu Lojistik', isActive: true },
  { sourceId: 3, sourceCode: 'erp-c-uk', sourceDisplayName: 'Store C ERP', erp: 'ERP-C', country: 'UK', carrierId: 3, carrierName: 'Royal Express', isActive: true },
  { sourceId: 4, sourceCode: 'erp-d-tr', sourceDisplayName: 'Mağaza A Toptan', erp: 'ERP-A', country: 'TR', carrierId: null, carrierName: null, isActive: true },
];
