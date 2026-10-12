import {
  SHOPIFY_COPY_MODE,
  type ShopifyCopyApplyItemBody,
  type ShopifyCopyItemDto,
  type ShopifyCopyMode,
  type ShopifyCopyOutcome,
} from '../../lib/api/shopify-ai-catalog';
import type { FormSelectOption } from '../../components/ui/FormSelect';

// Mağaza kopyalama ekranının saf kuralları: SKU listesi ayrıştırma, satır taslağı (düzenlenebilir çeviri + mod), uygulama gövdesi.

const SKU_SEPARATOR = /[\n,;\t]+/;

// Metin kutusundaki SKU'lar: satır/virgül/noktalı virgül ayırır; boşlar atılır, büyük/küçük harf farkıyla tekrar tek sayılır.
export function parseSkus(text: string): string[] {
  const seen = new Set<string>();
  return text.split(SKU_SEPARATOR).map((sku) => sku.trim()).filter((sku) => {
    const key = sku.toLowerCase();
    if (!sku || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Önizlemede kullanıcının düzenleyebildiği alanlar (boş metin = hedefte boş).
export interface CopyDraft {
  mode: ShopifyCopyMode;
  title: string;
  descriptionHtml: string;
  seoTitle: string;
  seoDescription: string;
}

export const COPY_MODE_LABELS: Record<ShopifyCopyMode, string> = {
  Create: 'Taslak olarak oluştur',
  Update: 'Mevcut ürünün metnini güncelle',
  Skip: 'Atla',
};

export const COPY_OUTCOME_LABELS: Record<ShopifyCopyOutcome, string> = {
  Created: 'Taslak oluşturuldu',
  Updated: 'Güncellendi',
  Skipped: 'Atlandı',
  Failed: 'Başarısız',
};

// Hedefte aynı SKU varsa oluşturma seçilemez (mükerrer olurdu): atla ya da güncelle. Yoksa güncellenecek ürün de yoktur.
export function availableModes(item: ShopifyCopyItemDto): ShopifyCopyMode[] {
  return item.existingTargetProductId === null
    ? [SHOPIFY_COPY_MODE.Create, SHOPIFY_COPY_MODE.Skip]
    : [SHOPIFY_COPY_MODE.Skip, SHOPIFY_COPY_MODE.Update];
}

export function modeOptions(item: ShopifyCopyItemDto): FormSelectOption<ShopifyCopyMode>[] {
  return availableModes(item).map((mode) => ({ value: mode, label: COPY_MODE_LABELS[mode] }));
}

// Varsayılan: yeni ürün oluşturulur; hedefte var olan sessizce ezilmesin diye atlanır.
export function initialCopyDraft(item: ShopifyCopyItemDto): CopyDraft {
  return {
    mode: availableModes(item)[0],
    title: item.content.title ?? '',
    descriptionHtml: item.content.descriptionHtml ?? '',
    seoTitle: item.content.seoTitle ?? '',
    seoDescription: item.content.seoDescription ?? '',
  };
}

const orNull = (value: string): string | null => (value.trim() === '' ? null : value);

// Atlanan satırlar gövdeye girmez; kaynak veri (görsel, varyant) istemciden gönderilmez, sunucu yeniden okur.
export function buildCopyApplyBody(items: ShopifyCopyItemDto[], drafts: Readonly<Record<number, CopyDraft>>): ShopifyCopyApplyItemBody[] {
  return items.flatMap((item) => {
    const draft = drafts[item.sourceProductId];
    if (!draft || draft.mode === SHOPIFY_COPY_MODE.Skip) return [];
    return [{
      sourceProductId: item.sourceProductId,
      mode: draft.mode,
      content: {
        title: orNull(draft.title),
        descriptionHtml: orNull(draft.descriptionHtml),
        seoTitle: orNull(draft.seoTitle),
        seoDescription: orNull(draft.seoDescription),
      },
    }];
  });
}
