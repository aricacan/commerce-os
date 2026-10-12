import { FACT_KEYS, type CustomerFactDto, type CustomerMergeSuggestionDto, type FactKey } from '../../lib/api/customer-crm';
import { DATA_SOURCE, type CustomerVehicleDto, type DataSource } from '../../lib/api/customers';

// Müşteri 360 panelinin saf kuralları: bilgi (fact) etiketleri, dil ve gövde tipi adları,
// araç satırı ve birleştirme önerisi biçimi.

// Backend etiketi gönderir; eski/eksik yanıtta aynı Türkçe ad buradan gelir (CustomerFactKeys.Label).
export const FACT_LABELS: Record<FactKey, string> = {
  full_name: 'Ad soyad',
  email: 'E-posta',
  phone: 'Telefon',
  city: 'Şehir',
  preferred_language: 'Dil',
  payment_preference: 'Ödeme tercihi',
  business_type: 'İşletme tipi',
  note: 'Not',
};

export const isFactKey = (key: string): key is FactKey => (FACT_KEYS as readonly string[]).includes(key);

export function factLabel(fact: Pick<CustomerFactDto, 'key' | 'label'>): string {
  if (fact.label) return fact.label;
  return isFactKey(fact.key) ? FACT_LABELS[fact.key] : fact.key;
}

// Henüz değeri olmayan anahtarlar — "Bilgi ekle" menüsü yalnız bunları sunar.
export function missingFactKeys(facts: readonly Pick<CustomerFactDto, 'key'>[]): FactKey[] {
  const present = new Set(facts.map((f) => f.key));
  return FACT_KEYS.filter((key) => !present.has(key));
}

export const FACT_SOURCE_LABELS: Record<DataSource, string> = {
  [DATA_SOURCE.Bot]: 'Bot',
  [DATA_SOURCE.Agent]: 'Temsilci',
  [DATA_SOURCE.Order]: 'Sipariş',
  [DATA_SOURCE.Channel]: 'Kanal',
};

export function factSourceLabel(source: number): string {
  return FACT_SOURCE_LABELS[source as DataSource] ?? 'Bilinmiyor';
}

// 0..1 güven → "%85". Temsilcinin yazdığı bilgi 1'dir; yüzde göstermeye gerek yok.
export function formatConfidence(confidence: number): string | null {
  if (!Number.isFinite(confidence) || confidence >= 1) return null;
  return `%${Math.round(Math.max(0, confidence) * 100)}`;
}

export const LANGUAGE_OPTIONS = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'İngilizce' },
  { code: 'sq', label: 'Arnavutça' },
] as const;

export function languageLabel(code: string | null): string | null {
  if (!code) return null;
  return LANGUAGE_OPTIONS.find((l) => l.code === code.toLowerCase())?.label ?? code.toUpperCase();
}

export const BODY_TYPE_OPTIONS = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'estate', label: 'Station wagon' },
] as const;

export function bodyTypeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return BODY_TYPE_OPTIONS.find((b) => b.value === value.toLowerCase())?.label ?? value;
}

// "Volkswagen Passat B7 2012 · Station wagon" — eski backend nesil/gövde göndermez.
export function vehicleLabel(vehicle: Pick<CustomerVehicleDto, 'make' | 'model' | 'year' | 'generation' | 'bodyType'>): string {
  const name = [vehicle.make, vehicle.model, vehicle.generation, vehicle.year].filter(Boolean).join(' ');
  const body = bodyTypeLabel(vehicle.bodyType);
  return body ? `${name} · ${body}` : name;
}

export function mergeScorePercent(score: number): number {
  return Math.round(Math.min(1, Math.max(0, score)) * 100);
}

const REASON_SEPARATOR = ' · ';

export function mergeReasons(suggestion: Pick<CustomerMergeSuggestionDto, 'reasons'>): string[] {
  return suggestion.reasons.split(REASON_SEPARATOR).map((r) => r.trim()).filter(Boolean);
}
