import type { SaveShopifyOptionBody, ShopifyVariantOptionDto } from '../../lib/api/shopify-products';

// Ürün seçenekleri (renk/beden) kuralları — saf, test edilir. Sınırlar backend ShopifyProductLimits ile aynı;
// asıl doğrulama sunucuda.

export const MAX_OPTIONS = 3;
export const MAX_COMBINATIONS = 100;

// Kullanıcının yazdığı seçenek: ad + virgülle ayrılmış değerler.
export interface OptionFormState {
  name: string;
  values: string;
}

export const emptyOption = (): OptionFormState => ({ name: '', values: '' });

// "Kırmızı, Mavi, kırmızı" → ["Kırmızı", "Mavi", "kırmızı"]: kırpılır, boşlar atılır, birebir aynı değer tekrarlanmaz.
export function parseOptionValues(text: string): string[] {
  const values = text.split(',').map((value) => value.trim()).filter(Boolean);
  return [...new Set(values)];
}

// Adı ve en az bir değeri olan seçenekler (yarım yazılmış satırlar yok sayılır).
export function definedOptions(options: OptionFormState[]): SaveShopifyOptionBody[] {
  return options
    .map((option) => ({ name: option.name.trim(), values: parseOptionValues(option.values) }))
    .filter((option) => option.name !== '' && option.values.length > 0);
}

export const combinationCount = (options: SaveShopifyOptionBody[]): number =>
  options.reduce((total, option) => total * option.values.length, 1);

// Seçeneklerin tüm kombinasyonları (kartezyen çarpım), seçenek sırasıyla.
export function combinations(options: SaveShopifyOptionBody[]): ShopifyVariantOptionDto[][] {
  return options.reduce<ShopifyVariantOptionDto[][]>(
    (rows, option) => rows.flatMap((row) => option.values.map((value) => [...row, { name: option.name, value }])),
    [[]],
  );
}

// Varyant satırında gösterilen ad: "Kırmızı / M".
export const variantLabel = (optionValues: ShopifyVariantOptionDto[]): string => optionValues.map((o) => o.value).join(' / ');

// Gönderilmeden önce ilk hata; geçerliyse null. Yarım satır (ad var değer yok ya da tersi) hata sayılır.
export function validateOptions(options: OptionFormState[]): string | null {
  if (options.length > MAX_OPTIONS) return `En fazla ${MAX_OPTIONS} seçenek tanımlanabilir.`;
  const half = options.find((o) => (o.name.trim() === '') !== (parseOptionValues(o.values).length === 0));
  if (half) return 'Her seçenek için hem ad hem en az bir değer girin.';

  const defined = definedOptions(options);
  const names = defined.map((o) => o.name.toLowerCase());
  if (new Set(names).size !== names.length) return 'Seçenek adları benzersiz olmalı.';

  const count = combinationCount(defined);
  return count > MAX_COMBINATIONS ? `Kombinasyon sayısı en fazla ${MAX_COMBINATIONS} olabilir (şu an ${count}).` : null;
}
