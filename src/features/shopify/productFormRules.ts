import { SHOPIFY_CATALOG_AUTHORITY, type ShopifyCatalogAuthority } from '../../lib/api/shopify';
import {
  PRODUCT_STATUS, type ProductStatus, type SaveShopifyProductBody, type SaveShopifyVariantBody, type ShopifyProductDetailDto,
  type ShopifyProductOptionDto, type ShopifyVariantOptionDto,
} from '../../lib/api/shopify-products';
import { parseTags, trimmedOrUndefined } from './explorerRules';
import {
  MAX_COMBINATIONS, combinationCount, combinations, definedOptions, validateOptions, variantLabel, type OptionFormState,
} from './productOptionRules';

// Ürün formunun saf kuralları (test edilir). Asıl doğrulama ve katalog yetkisi kararı sunucuda.

export interface VariantFormState {
  // null = henüz Shopify'da yok (yeni varyant).
  id: number | null;
  sku: string;
  title: string;
  price: string;
  stock: string;
  barcode: string;
  // Çok seçenekli üründe bu varyantın değerleri (Renk = Kırmızı); seçeneksiz üründe boş.
  optionValues: ShopifyVariantOptionDto[];
}

export interface ProductFormState {
  title: string;
  descriptionHtml: string;
  productType: string;
  vendor: string;
  tags: string;
  status: ProductStatus;
  seoTitle: string;
  seoDescription: string;
  variants: VariantFormState[];
  // Yeni üründe kullanıcının tanımladığı seçenekler (varyantlar bunlardan üretilir).
  options: OptionFormState[];
  // Mevcut ürünün seçenekleri (salt okunur; ad değişikliği ayrı uçla yapılır).
  existingOptions: ShopifyProductOptionDto[];
}

export const emptyVariant = (): VariantFormState => ({ id: null, sku: '', title: '', price: '', stock: '', barcode: '', optionValues: [] });

// Mevcut çok seçenekli ürüne eklenecek yeni varyant: her seçenek için değer bekler.
export const emptyVariantFor = (options: ShopifyProductOptionDto[]): VariantFormState => ({
  ...emptyVariant(), optionValues: options.map((option) => ({ name: option.name, value: '' })),
});

export const emptyProductForm = (): ProductFormState => ({
  title: '', descriptionHtml: '', productType: '', vendor: '', tags: '', status: PRODUCT_STATUS.Draft,
  seoTitle: '', seoDescription: '', variants: [emptyVariant()], options: [], existingOptions: [],
});

const comboKey = (optionValues: ShopifyVariantOptionDto[]) => optionValues.map((o) => o.value).join('\u001F');

// Seçenekler değişince varyant satırlarını kombinasyonlardan yeniden üretir; aynı kombinasyonun girdiği SKU/fiyat/stok korunur.
// Seçenek kalmazsa tek boş varyanta dönülür. Kombinasyon sınırı aşılırsa satırlar değişmez (doğrulama hatayı söyler).
export function syncVariantsWithOptions(options: OptionFormState[], current: VariantFormState[]): VariantFormState[] {
  const defined = definedOptions(options);
  if (defined.length === 0) return current.some((v) => v.optionValues.length > 0) ? [emptyVariant()] : current;
  if (combinationCount(defined) > MAX_COMBINATIONS) return current;

  const byKey = new Map(current.map((variant) => [comboKey(variant.optionValues), variant]));
  return combinations(defined).map((optionValues) => ({
    ...(byKey.get(comboKey(optionValues)) ?? emptyVariant()), optionValues,
  }));
}

const PRICE_DECIMALS = 2;

export function formFromDetail(detail: ShopifyProductDetailDto): ProductFormState {
  return {
    title: detail.title,
    descriptionHtml: detail.descriptionHtml,
    productType: detail.productType ?? '',
    vendor: detail.vendor ?? '',
    tags: detail.tags.join(', '),
    status: statusOf(detail.status),
    seoTitle: detail.seoTitle ?? '',
    seoDescription: detail.seoDescription ?? '',
    variants: detail.variants.map((v) => ({
      id: v.id, sku: v.sku ?? '', title: v.title ?? '',
      price: v.price === null ? '' : v.price.toFixed(PRICE_DECIMALS),
      stock: v.inventoryQuantity === null ? '' : String(v.inventoryQuantity),
      barcode: v.barcode ?? '',
      optionValues: v.selectedOptions ?? [],
    })),
    options: [],
    existingOptions: detail.options ?? [],
  };
}

const KNOWN_STATUSES: readonly string[] = Object.values(PRODUCT_STATUS);

function statusOf(value: string): ProductStatus {
  return KNOWN_STATUSES.includes(value) ? (value as ProductStatus) : PRODUCT_STATUS.Draft;
}

// ERP yetkili mağazada stok ve fiyat alanları salt okunur (sunucu da reddeder).
export const isStockPriceLocked = (authority: ShopifyCatalogAuthority) => authority === SHOPIFY_CATALOG_AUTHORITY.Erp;

// "12,50" ve "12.50" kabul edilir; boş = girilmedi (null); geçersiz = NaN.
export function parseDecimal(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (trimmed === '') return null;
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function parseStock(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

// Gönderilmeden önce kullanıcıya gösterilecek ilk hata; geçerliyse null.
export function validateProductForm(form: ProductFormState): string | null {
  if (!form.title.trim()) return 'Ürün başlığı zorunlu.';
  const optionProblem = validateOptions(form.options);
  if (optionProblem) return optionProblem;
  const skus = form.variants.map((v) => v.sku.trim().toLowerCase()).filter(Boolean);
  if (new Set(skus).size !== skus.length) return 'Aynı SKU birden fazla varyantta var.';
  for (const variant of form.variants) {
    const label = variant.sku.trim() || variantLabel(variant.optionValues) || variant.title.trim() || 'Varyant';
    if (variant.optionValues.some((o) => o.value.trim() === '')) return `${label}: tüm seçenek değerleri girilmeli.`;
    if (Number.isNaN(parseDecimal(variant.price))) return `${label}: fiyat geçersiz.`;
    if (Number.isNaN(parseStock(variant.stock))) return `${label}: stok tam sayı olmalı.`;
  }
  return null;
}

const orUndefined = <T,>(value: T | null): T | undefined => value ?? undefined;

const trimmedOptionValues = (optionValues: ShopifyVariantOptionDto[]): ShopifyVariantOptionDto[] =>
  optionValues.map((o) => ({ name: o.name, value: o.value.trim() }));

// Varyantın Shopify'a gidecek hali. Düzenlemede yalnız DEĞİŞEN alanlar gider (değişmeyen stok yeniden yazılmaz);
// kilitli (ERP) mağazada fiyat/stok hiç gitmez.
function variantBody(variant: VariantFormState, original: VariantFormState | undefined, locked: boolean): SaveShopifyVariantBody | null {
  const changed = (key: keyof VariantFormState) => original === undefined || variant[key] !== original[key];
  const body: SaveShopifyVariantBody = {
    id: orUndefined(variant.id),
    sku: changed('sku') ? trimmedOrUndefined(variant.sku) : undefined,
    title: original === undefined ? trimmedOrUndefined(variant.title) : undefined,
    barcode: changed('barcode') ? trimmedOrUndefined(variant.barcode) : undefined,
    price: !locked && changed('price') ? orUndefined(parseDecimal(variant.price)) : undefined,
    stock: !locked && changed('stock') ? orUndefined(parseStock(variant.stock)) : undefined,
    // Seçenek değerleri yalnız yeni varyantla gider; mağazadaki varyantın değerleri bu uçtan değişmez.
    options: original === undefined && variant.optionValues.length > 0 ? trimmedOptionValues(variant.optionValues) : undefined,
  };
  const hasChange = Object.entries(body).some(([key, value]) => key !== 'id' && value !== undefined);
  return original === undefined || hasChange ? body : null;
}

// Form → API gövdesi. `initial` verilirse (düzenleme) yalnız değişen alanlar gönderilir.
export function buildProductBody(form: ProductFormState, locked: boolean, initial?: ProductFormState): SaveShopifyProductBody {
  const changed = <K extends keyof ProductFormState>(key: K) => initial === undefined || form[key] !== initial[key];
  const tags = parseTags(form.tags);
  const originals = new Map(initial?.variants.map((v) => [v.id, v]));
  const variants = form.variants
    .map((variant) => variantBody(variant, variant.id === null ? undefined : originals.get(variant.id), locked))
    .filter((body): body is SaveShopifyVariantBody => body !== null);

  // Oluşturmada boş metin gönderilmez; düzenlemede değişen alan (boşaltılmış olsa da) gönderilir ki Shopify'da temizlensin.
  const text = (key: TextKey) => {
    if (initial === undefined) return trimmedOrUndefined(form[key]);
    return changed(key) ? form[key].trim() : undefined;
  };

  return {
    title: text('title'),
    descriptionHtml: initial === undefined ? trimmedOrUndefined(form.descriptionHtml) : changedValue(changed('descriptionHtml'), form.descriptionHtml),
    productType: text('productType'),
    vendor: text('vendor'),
    tags: initial === undefined ? nonEmpty(tags) : changedValue(changed('tags'), tags),
    status: changed('status') ? form.status : undefined,
    seoTitle: text('seoTitle'),
    seoDescription: text('seoDescription'),
    variants: variants.length > 0 ? variants : undefined,
    options: initial === undefined ? nonEmpty(definedOptions(form.options)) : undefined,
  };
}

type TextKey = 'title' | 'productType' | 'vendor' | 'seoTitle' | 'seoDescription';

const nonEmpty = <T,>(list: T[]): T[] | undefined => (list.length > 0 ? list : undefined);

const changedValue =<T,>(isChanged: boolean, value: T): T | undefined => (isChanged ? value : undefined);

// Düzenlemede hiçbir alan değişmediyse kaydetmenin anlamı yok.
export const hasChanges = (body: SaveShopifyProductBody) => Object.values(body).some((value) => value !== undefined);

// Görseli bir basamak yukarı/aşağı taşır; yeni sıra (kimlik listesi) döner, sınırdaysa null.
export function moveImage(ids: number[], index: number, direction: -1 | 1): number[] | null {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const PRODUCT_STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: PRODUCT_STATUS.Active, label: 'Aktif' },
  { value: PRODUCT_STATUS.Draft, label: 'Taslak' },
  { value: PRODUCT_STATUS.Archived, label: 'Arşiv' },
];
