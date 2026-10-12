import type {
  FreeShippingEffect, ShippingChargeBasis, ShippingPolicyApplyTo, ShippingPolicyDto,
  ShippingPolicySaveBody, ShippingPricingMethod, ShippingRuleBody, ShippingRuleDto,
} from '../../../lib/api/shipping-policies';

// Kargo ayarı formunun saf kuralları: sunucu kaydı ↔ düzenlenebilir taslak.
// Sayılar metin olarak tutulur — boş input "0" demek değildir ("fiyat yok" demektir).
// Her fiyat teslimat bölgesi başına tutulur (bölge → metin); tek bölgeli ülkede tek anahtar "".

export type ZonePrices = Record<string, string>;

export const PRICING_METHOD_OPTIONS: { key: ShippingPricingMethod; label: string; hint: string }[] = [
  { key: 'DesiBand', label: 'Desiye göre', hint: 'Ürünün desisine göre tarifeden fiyatlanır.' },
  { key: 'Category', label: 'Kategoriye göre', hint: 'Her kategoriye ayrı fiyat; diğerleri ortak fiyatı öder.' },
  { key: 'Flat', label: 'Sabit fiyat', hint: 'Her ürün aynı fiyatı öder.' },
];

export const CHARGE_BASIS_OPTIONS: { key: ShippingChargeBasis; label: string; hint: string }[] = [
  { key: 'PerItem', label: 'Ürün başına', hint: 'Her adet ayrı ödenir: 3 ürün = 3 × fiyat.' },
  { key: 'PerOrder', label: 'Sipariş başına', hint: 'Sipariş tek koli: en pahalı ürünün fiyatı bir kez ödenir.' },
];

export const FREE_SHIPPING_EFFECT_OPTIONS: { value: FreeShippingEffect; label: string }[] = [
  { value: 'CustomerOnly', label: 'Müşteri ödemez, maliyetimiz sürer' },
  { value: 'CarrierCostWaived', label: 'Taşıyıcı da ücret almaz (maliyet 0)' },
];

export interface SkuRuleDraft {
  // React listesi için kararlı anahtar — yeni kuralın sunucu kimliği yok.
  key: string;
  sku: string;
  label: string | null;
  prices: ZonePrices;
}

export interface ShippingPolicyDraft {
  pricingMethod: ShippingPricingMethod;
  chargeBasis: ShippingChargeBasis;
  // Teslimat bölgesi → ücretsiz kargo eşiği; boş bölgede eşik yok.
  freeShippingThresholds: ZonePrices;
  effect: FreeShippingEffect;
  // Kategori yönteminde "diğer tüm kategoriler", sabit yöntemde tüm ürünlerin fiyatı.
  defaultPrices: ZonePrices;
  // Kategori kimliği → bölge fiyatları. Boş olan "diğer tüm kategoriler" fiyatını öder.
  categoryPrices: Record<number, ZonePrices>;
  skuRules: SkuRuleDraft[];
}

let draftKeySeed = 0;
export const nextRuleKey = () => `rule-${++draftKeySeed}`;

const amountText = (value: number | null) => (value === null ? '' : String(value));

export const emptyZonePrices = (zones: string[]): ZonePrices => Object.fromEntries(zones.map((z) => [z, '']));

export const hasAnyPrice = (prices: ZonePrices | undefined) =>
  Object.values(prices ?? {}).some((text) => text.trim() !== '');

// Kurallardan bölge fiyatları: bölgenin kendi fiyatı, yoksa bölgesiz ("tüm bölgeler") fiyat —
// eski (bölgesiz) kayıtlar da her sütunda görünür, kaydedilince bölge bölge yazılır.
function zonePrices(rules: ShippingRuleDto[], zones: string[]): ZonePrices {
  const anyZone = rules.find((r) => r.zone === '');
  return Object.fromEntries(zones.map((zone) => {
    const own = rules.find((r) => r.zone === zone);
    return [zone, amountText((own ?? anyZone)?.price ?? null)];
  }));
}

function groupBy<K>(rules: ShippingRuleDto[], keyOf: (rule: ShippingRuleDto) => K | null): Map<K, ShippingRuleDto[]> {
  const groups = new Map<K, ShippingRuleDto[]>();
  for (const rule of rules) {
    const key = keyOf(rule);
    if (key === null) continue;
    groups.set(key, [...(groups.get(key) ?? []), rule]);
  }
  return groups;
}

export function toDraft(
  policy: ShippingPolicyDto | undefined,
  zones: string[],
  fallbackMethod: ShippingPricingMethod = 'DesiBand',
): ShippingPolicyDraft {
  const rules = policy?.rules ?? [];

  const categoryPrices: Record<number, ZonePrices> = {};
  for (const [id, group] of groupBy(rules, (r) => (r.target === 'Category' ? r.internalCategoryId : null)))
    categoryPrices[id] = zonePrices(group, zones);

  const skuRules: SkuRuleDraft[] = [];
  for (const [sku, group] of groupBy(rules, (r) => (r.target === 'Product' ? r.sku : null)))
    skuRules.push({ key: nextRuleKey(), sku, label: group[0].label, prices: zonePrices(group, zones) });

  return {
    pricingMethod: policy?.pricingMethod ?? fallbackMethod,
    chargeBasis: policy?.chargeBasis ?? 'PerItem',
    freeShippingThresholds: zonePrices(rules.filter((r) => r.target === 'FreeShipping'), zones),
    effect: policy?.freeShippingEffect ?? 'CustomerOnly',
    defaultPrices: zonePrices(rules.filter((r) => r.target === 'Default'), zones),
    categoryPrices,
    skuRules,
  };
}

// Boş ya da sayı olmayan metin null — "0" ise gerçekten sıfır.
export function parseAmount(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

const isInvalid = (text: string, allowZero: boolean) => {
  if (text.trim() === '') return false;
  const value = parseAmount(text);
  return value === null || value < 0 || (!allowZero && value === 0);
};

export type DraftValidation = { body: ShippingPolicySaveBody; error: null } | { body: null; error: string };

type RuleKey = Pick<ShippingRuleBody, 'target' | 'sku' | 'internalCategoryId'>;

// Bir satırın bölge fiyatlarını kural satırlarına açar; boş bölgeler gönderilmez.
function zoneRules(key: RuleKey, prices: ZonePrices, zones: string[]): ShippingRuleBody[] | null {
  const rules: ShippingRuleBody[] = [];
  for (const zone of zones) {
    const text = prices[zone] ?? '';
    if (text.trim() === '') continue;
    if (isInvalid(text, true)) return null;
    rules.push({ ...key, zone, price: parseAmount(text)! });
  }
  return rules;
}

const fail = (error: string): DraftValidation => ({ body: null, error });

export function toSaveBody(
  draft: ShippingPolicyDraft,
  region: string,
  dataSourceId: number | null,
  zones: string[],
  applyTo: ShippingPolicyApplyTo,
): DraftValidation {
  const method = draft.pricingMethod;
  if (zones.some((z) => isInvalid(draft.freeShippingThresholds[z] ?? '', false)))
    return fail('Ücretsiz kargo eşiği sıfırdan büyük bir sayı olmalı (eşik istemediğiniz bölgeyi boş bırakın).');

  const rules: ShippingRuleBody[] = [];
  const add = (key: RuleKey, prices: ZonePrices) => {
    const built = zoneRules(key, prices, zones);
    if (built === null) return false;
    rules.push(...built);
    return true;
  };

  // Yalnızca seçili yöntemin fiyatları gönderilir — diğer yöntemin eski girişleri hesaba karışmaz.
  if (method !== 'DesiBand') {
    if (method === 'Flat' && zones.some((z) => parseAmount(draft.defaultPrices[z] ?? '') === null))
      return fail('Sabit fiyat yönteminde her bölgeye fiyat girilmeli.');
    if (!add({ target: 'Default', sku: null, internalCategoryId: null }, draft.defaultPrices))
      return fail('Fiyatlar geçerli bir sayı olmalı.');
  }
  if (method === 'Category') {
    for (const [id, prices] of Object.entries(draft.categoryPrices)) {
      if (!add({ target: 'Category', sku: null, internalCategoryId: Number(id) }, prices))
        return fail('Kategori fiyatları geçerli bir sayı olmalı.');
    }
  }

  add({ target: 'FreeShipping', sku: null, internalCategoryId: null }, draft.freeShippingThresholds);

  for (const rule of draft.skuRules) {
    const sku = rule.sku.trim();
    if (!sku && !hasAnyPrice(rule.prices)) continue;
    if (!sku) return fail('Ürün istisnasında SKU boş olamaz.');
    if (!hasAnyPrice(rule.prices)) return fail(`${sku} için fiyat girin.`);
    if (!add({ target: 'Product', sku, internalCategoryId: null }, rule.prices))
      return fail(`${sku} için geçerli bir fiyat girin.`);
  }

  return {
    error: null,
    body: {
      region,
      dataSourceId,
      // Desi yönteminde her ürün kendi bandını öder; ödeme şekli yalnızca kategori/sabitte seçilir.
      chargeBasis: method === 'DesiBand' ? 'PerItem' : draft.chargeBasis,
      pricingMethod: method,
      freeShippingEffect: draft.effect,
      rules,
      applyTo,
    },
  };
}
