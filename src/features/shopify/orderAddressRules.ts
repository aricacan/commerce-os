import type { ShopifyOrderAddressDto } from '../../lib/api/shopify-explorer';
import type { ShopifyOrderAddressInput } from '../../lib/api/shopify-order-crud';
import { trimmedOrUndefined } from './explorerRules';

// Teslimat adresi formu (elle sipariş ve sipariş düzenlemede ortak). Tüm alanlar metindir; boşluklar gönderimde temizlenir.
export interface OrderAddressDraft {
  fullName: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export function emptyAddress(countryCode: string): OrderAddressDraft {
  return { fullName: '', phone: '', addressLine: '', district: '', city: '', postalCode: '', countryCode };
}

// Siparişin mevcut adresinden form; adres yoksa boş form.
export function addressFromOrder(address: ShopifyOrderAddressDto | null, fallbackCountry: string): OrderAddressDraft {
  if (!address) return emptyAddress(fallbackCountry);
  return {
    fullName: address.name ?? '',
    phone: address.phone ?? '',
    addressLine: address.address1 ?? '',
    district: address.address2 ?? '',
    city: address.city ?? '',
    postalCode: address.postalCode ?? '',
    countryCode: address.countryCode ?? fallbackCountry,
  };
}

const ISO_COUNTRY_PATTERN = /^[A-Za-z]{2}$/;

const REQUIRED_FIELDS: { key: keyof OrderAddressDraft; label: string }[] = [
  { key: 'fullName', label: 'Alıcı adı' },
  { key: 'phone', label: 'Telefon' },
  { key: 'addressLine', label: 'Adres' },
  { key: 'city', label: 'Şehir' },
];

// İlk eksik/hatalı alanın mesajı; geçerliyse null.
export function validateAddress(address: OrderAddressDraft): string | null {
  const missing = REQUIRED_FIELDS.find(({ key }) => address[key].trim() === '');
  if (missing) return `${missing.label} zorunlu.`;
  return ISO_COUNTRY_PATTERN.test(address.countryCode.trim()) ? null : 'Ülke kodu 2 harf olmalı (ör. XK, TR).';
}

export function toAddressInput(address: OrderAddressDraft): ShopifyOrderAddressInput {
  return {
    fullName: address.fullName.trim(),
    phone: address.phone.trim(),
    addressLine: address.addressLine.trim(),
    city: address.city.trim(),
    district: trimmedOrUndefined(address.district),
    postalCode: trimmedOrUndefined(address.postalCode),
    countryCode: address.countryCode.trim().toUpperCase(),
  };
}

// Düzenlemede adres yalnız gerçekten değiştiyse gönderilir.
export function addressChanged(current: OrderAddressDraft, original: OrderAddressDraft): boolean {
  return (Object.keys(current) as (keyof OrderAddressDraft)[]).some(
    (key) => current[key].trim().toUpperCase() !== original[key].trim().toUpperCase(),
  );
}
