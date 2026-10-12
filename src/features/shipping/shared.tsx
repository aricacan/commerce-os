'use client';

import { Truck, Package, Plane, Globe } from 'lucide-react';
import {
  CARRIER_STATUS, CARRIER_TYPE, SHIPMENT_STATUS,
  type CarrierStatus, type CarrierType, type ShipmentStatus,
} from '../../lib/api/shipping';
import {
  palette, card, btnPrimary as dsBtnPrimary, btnGhost as dsBtnGhost,
  input as dsInput, select as dsSelect, label as dsLabel, errorText, statusDot,
} from '../shared/design';

// Taşıyıcı kimlik bilgileri şirket adına gönderi açma ve faturalandırma yetkisi demek;
// backend controller'ıyla ([Authorize(Roles = ...)]) birebir aynı kısıt.
// Gönderi görmek günlük operasyon işi; taşıyıcı kimlik bilgisi yönetmek değil.
// Backend'deki ShipmentsController yetkisiyle birebir aynı.
export const SHIPPING_OPERATOR_ROLES = [
  'SuperAdmin', 'Admin', 'Shipping.Admin', 'Shipping.Operator',
];

// Bu modül ortak tasarım sistemini kullanır. Aşağıdakiler yalnızca eski isimleri
// koruyan takma adlar — mevcut bileşenleri tek tek değiştirmek yerine tanımı tek
// yerden çevirmek, geçişi küçük ve geri alınabilir tutuyor.
export const cardStyle = card;
export const btnPrimary = dsBtnPrimary;
export const btnGhost = dsBtnGhost;
export const inputStyle = dsInput;
export const selectStyle = dsSelect;
export const labelStyle = dsLabel;
export const errorTextStyle = errorText;

// Tasarımın <select>'i yerel oku gizliyor; oku her kullanım yerinde elle
// konumlandırmak yerine tek sarmalayıcıda toplandı.

// ─── Taşıyıcı tipi görünümü ───────────────────────────────────────────────────

// lucide-react marka ikonları yayınlamıyor — nötr karşılıklar kullanılıyor.
// Taşıyıcılar ham marka renkleriyle (Aras kırmızısı, DHL sarısı) ayrılmıyor artık:
// kart üzerinde ad zaten yazılı, altı ayrı marka rengi sıcak gri zeminde
// palet dışına taşıyordu. Ayrımı ikon + etiket taşıyor.
export const CARRIER_TYPE_META = {
  [CARRIER_TYPE.Aras]:    { label: 'Aras Kargo',    Icon: Truck,   color: palette.accent },
  [CARRIER_TYPE.Yurtici]: { label: 'Yurtiçi Kargo', Icon: Truck,   color: palette.accent },
  [CARRIER_TYPE.Mng]:     { label: 'MNG Kargo',     Icon: Package, color: palette.accent },
  [CARRIER_TYPE.Surat]:   { label: 'Sürat Kargo',   Icon: Package, color: palette.accent },
  [CARRIER_TYPE.Ups]:     { label: 'UPS',           Icon: Globe,   color: palette.accent },
  [CARRIER_TYPE.Dhl]:     { label: 'DHL',           Icon: Plane,   color: palette.accent },
} as const satisfies Record<CarrierType, { label: string; Icon: typeof Truck; color: string }>;

export const CARRIER_STATUS_META = {
  [CARRIER_STATUS.Unknown]:     { label: 'Doğrulanmadı',  color: palette.neutral },
  [CARRIER_STATUS.Connected]:   { label: 'Bağlı',         color: palette.success },
  [CARRIER_STATUS.AuthFailed]:  { label: 'Kimlik hatası', color: palette.danger },
  [CARRIER_STATUS.Unreachable]: { label: 'Ulaşılamıyor',  color: palette.warning },
} as const satisfies Record<CarrierStatus, { label: string; color: string }>;

// Gönderi durumları. Renk seçimi anlamlı: nötr = henüz yola çıkmadı, aksan tonları =
// yolda, yeşil = bitti, kırmızı/turuncu = müdahale gerekiyor.
//
// Yoldaki üç adım tek bir aksan rengine indirilemedi: kullanıcı listede "teslim
// alındı → yolda → dağıtımda" ilerlemesini renk koyulaşmasından okuyor. Tonlar
// paletin aksan ekseninde (hue 255) kalıyor, dışına çıkmıyor.
export const SHIPMENT_STATUS_META = {
  [SHIPMENT_STATUS.Draft]:          { label: 'Taslak',           color: palette.neutral },
  [SHIPMENT_STATUS.Created]:        { label: 'Oluşturuldu',      color: palette.textMuted },
  [SHIPMENT_STATUS.PickedUp]:       { label: 'Teslim alındı',    color: 'oklch(55% 0.05 255)' },
  [SHIPMENT_STATUS.InTransit]:      { label: 'Yolda',            color: 'oklch(44% 0.05 255)' },
  [SHIPMENT_STATUS.OutForDelivery]: { label: 'Dağıtımda',        color: palette.accent },
  [SHIPMENT_STATUS.Delivered]:      { label: 'Teslim edildi',    color: palette.success },
  [SHIPMENT_STATUS.DeliveryFailed]: { label: 'Teslim edilemedi', color: palette.danger },
  [SHIPMENT_STATUS.Returned]:       { label: 'İade',             color: palette.warning },
  [SHIPMENT_STATUS.Cancelled]:      { label: 'İptal',            color: palette.textFaint },
} as const satisfies Record<ShipmentStatus, { label: string; color: string }>;

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const meta = SHIPMENT_STATUS_META[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 99,
      // oklch renkler hex gibi alfa eklenerek soluklaştırılamıyor; karışım
      // kart zeminiyle yapılıyor ki rozet panelden kopmasın.
      background: `color-mix(in oklch, ${meta.color} 12%, ${palette.card})`,
      color: meta.color,
      fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={statusDot(meta.color, 6)} />
      {meta.label}
    </span>
  );
}

// Taşıyıcı tipine göre panelde istenecek kimlik alanları. Backend'deki
// CarrierCredentialsValidator ile aynı kuralın UI karşılığı — kullanıcı boş bırakıp
// sunucudan hata almadan önce burada uyarılır.
const USERNAME_PASSWORD_FIELDS = [
  { key: 'username', label: 'Kullanıcı adı' },
  { key: 'password', label: 'Parola' },
  { key: 'customerCode', label: 'Müşteri kodu', optional: true },
];

export const CREDENTIAL_FIELDS: Record<
  CarrierType,
  { key: string; label: string; optional?: boolean }[]
> = {
  [CARRIER_TYPE.Aras]:    USERNAME_PASSWORD_FIELDS,
  [CARRIER_TYPE.Yurtici]: USERNAME_PASSWORD_FIELDS,
  [CARRIER_TYPE.Surat]:   USERNAME_PASSWORD_FIELDS,
  [CARRIER_TYPE.Mng]: [
    { key: 'apiKey', label: 'API Key' },
    { key: 'apiSecret', label: 'API Secret' },
  ],
  [CARRIER_TYPE.Ups]: [
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client Secret' },
    { key: 'accountNumber', label: 'Hesap numarası' },
  ],
  [CARRIER_TYPE.Dhl]: [
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientSecret', label: 'Client Secret' },
    { key: 'accountNumber', label: 'Hesap numarası' },
  ],
};

export function StatusDot({ status }: { status: CarrierStatus }) {
  const meta = CARRIER_STATUS_META[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: meta.color }}>
      <span style={statusDot(meta.color, 8)} />
      {meta.label}
    </span>
  );
}

// Açılır menü ortak katmanda — modüller aynı ismi kullanmaya devam etsin.
export { Select } from '../shared/Select';
