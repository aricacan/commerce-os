import type {
  SaveShopifyCollectionBody, ShopifyCollectionDetailDto, ShopifyCollectionRuleDto,
} from '../../lib/api/shopify-store-content';

// Koleksiyon formunun saf kuralları: seçenek listeleri, form durumu, doğrulama ve gövde üretimi.

export interface Option {
  value: string;
  label: string;
}

// Shopify CollectionRuleColumn / CollectionRuleRelation (sunucu da aynı listeyi doğrular).
export const RULE_COLUMN_OPTIONS: Option[] = [
  { value: 'TAG', label: 'Ürün etiketi' },
  { value: 'TYPE', label: 'Ürün türü' },
  { value: 'VENDOR', label: 'Satıcı' },
  { value: 'TITLE', label: 'Ürün başlığı' },
  { value: 'VARIANT_PRICE', label: 'Fiyat' },
  { value: 'VARIANT_INVENTORY', label: 'Stok adedi' },
];

export const RULE_RELATION_OPTIONS: Option[] = [
  { value: 'EQUALS', label: 'eşittir' },
  { value: 'NOT_EQUALS', label: 'eşit değildir' },
  { value: 'CONTAINS', label: 'içerir' },
  { value: 'NOT_CONTAINS', label: 'içermez' },
  { value: 'STARTS_WITH', label: 'ile başlar' },
  { value: 'ENDS_WITH', label: 'ile biter' },
  { value: 'GREATER_THAN', label: 'büyüktür' },
  { value: 'LESS_THAN', label: 'küçüktür' },
];

export const SORT_ORDER_OPTIONS: Option[] = [
  { value: 'BEST_SELLING', label: 'Çok satanlar' },
  { value: 'MANUAL', label: 'Elle sıralı' },
  { value: 'ALPHA_ASC', label: 'A → Z' },
  { value: 'ALPHA_DESC', label: 'Z → A' },
  { value: 'PRICE_ASC', label: 'Fiyat artan' },
  { value: 'PRICE_DESC', label: 'Fiyat azalan' },
  { value: 'CREATED_DESC', label: 'Yeniden eskiye' },
  { value: 'CREATED', label: 'Eskiden yeniye' },
];

export const MAX_COLLECTION_RULES = 60;
const DEFAULT_SORT_ORDER = 'BEST_SELLING';
const HANDLE_PATTERN = /^[a-z0-9-]+$/;

export const EMPTY_RULE: ShopifyCollectionRuleDto = { column: 'TAG', relation: 'EQUALS', condition: '' };

export interface CollectionFormState {
  title: string;
  handle: string;
  descriptionHtml: string;
  seoTitle: string;
  seoDescription: string;
  sortOrder: string;
  smart: boolean;
  appliedDisjunctively: boolean;
  rules: ShopifyCollectionRuleDto[];
}

export const NEW_COLLECTION_STATE: CollectionFormState = {
  title: '', handle: '', descriptionHtml: '', seoTitle: '', seoDescription: '',
  sortOrder: DEFAULT_SORT_ORDER, smart: false, appliedDisjunctively: false, rules: [],
};

export function collectionFormState(detail: ShopifyCollectionDetailDto): CollectionFormState {
  return {
    title: detail.title,
    handle: detail.handle,
    descriptionHtml: detail.descriptionHtml ?? '',
    seoTitle: detail.seoTitle ?? '',
    seoDescription: detail.seoDescription ?? '',
    sortOrder: detail.sortOrder ?? DEFAULT_SORT_ORDER,
    smart: detail.isSmart,
    appliedDisjunctively: detail.appliedDisjunctively,
    rules: detail.rules,
  };
}

// Gönderimden önce kullanıcıya gösterilecek ilk hata (yoksa null). Sunucu ayrıca doğrular.
export function collectionFormError(state: CollectionFormState): string | null {
  if (state.title.trim() === '') return 'Koleksiyon başlığı gerekli.';
  const handle = state.handle.trim();
  if (handle !== '' && !HANDLE_PATTERN.test(handle)) return 'Adres yalnız küçük harf, rakam ve tire içerebilir.';
  if (!state.smart) return null;
  if (state.rules.length === 0) return 'Akıllı koleksiyon için en az bir kural ekleyin.';
  if (state.rules.length > MAX_COLLECTION_RULES) return `En fazla ${MAX_COLLECTION_RULES} kural eklenebilir.`;
  return state.rules.some((rule) => rule.condition.trim() === '') ? 'Kural değerleri boş olamaz.' : null;
}

// Oluşturmada dolu alanlar gider. Düzenlemede adres yalnız değiştiyse (gereksiz yönlendirme açılmasın), SEO/açıklama
// her zaman (boş = temizle). Akıllı/manuel ayrımı değişmez: kurallar yalnız akıllı koleksiyonda gider.
export function buildCollectionBody(state: CollectionFormState, original?: ShopifyCollectionDetailDto): SaveShopifyCollectionBody {
  const handle = state.handle.trim();
  const body: SaveShopifyCollectionBody = {
    title: state.title.trim(),
    handle: handle !== '' && handle !== original?.handle ? handle : undefined,
    sortOrder: state.sortOrder,
    seoTitle: original || state.seoTitle.trim() !== '' ? state.seoTitle.trim() : undefined,
    seoDescription: original || state.seoDescription.trim() !== '' ? state.seoDescription.trim() : undefined,
    descriptionHtml: original || state.descriptionHtml.trim() !== '' ? state.descriptionHtml.trim() : undefined,
  };
  if (!state.smart) return body;
  return {
    ...body,
    appliedDisjunctively: state.appliedDisjunctively,
    rules: state.rules.map((rule) => ({ ...rule, condition: rule.condition.trim() })),
  };
}

export function ruleSummary(rule: ShopifyCollectionRuleDto): string {
  const column = RULE_COLUMN_OPTIONS.find((o) => o.value === rule.column)?.label ?? rule.column;
  const relation = RULE_RELATION_OPTIONS.find((o) => o.value === rule.relation)?.label ?? rule.relation;
  return `${column} ${relation} "${rule.condition}"`;
}
