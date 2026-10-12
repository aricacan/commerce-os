import type {
  ShopifyVehicleApplyItemBody,
  ShopifyVehicleApplyRowDto,
  ShopifyVehicleCollectionSuggestionDto,
} from '../../lib/api/shopify-ai-catalog';
import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { MENU_TYPE, newMenuNode } from './menuTree';

// Araç koleksiyonu önerisinin saf kuralları: seçim → oluşturma gövdesi → menü taslağı.

export const DEFAULT_MIN_PRODUCTS = 2;
const COLLECTION_GID_PREFIX = 'gid://shopify/Collection/';

// Başlığı kullanıcı düzenlediyse adres de yeniden türetilsin diye (sunucu başlıktan üretir) eski adres gönderilmez.
export type TitleOverrides = Readonly<Record<string, string>>;

export function effectiveTitle(row: ShopifyVehicleCollectionSuggestionDto, overrides: TitleOverrides): string {
  return overrides[row.key]?.trim() || row.title;
}

// Varsayılan seçim: henüz mağazada olmayan satırlar (var olanlar menüye bağlanmak istenirse elle seçilir).
export function defaultVehicleSelection(rows: ShopifyVehicleCollectionSuggestionDto[]): Set<string> {
  return new Set(rows.filter((row) => row.existingCollectionId === null).map((row) => row.key));
}

export function buildVehicleApplyBody(
  rows: ShopifyVehicleCollectionSuggestionDto[], selected: ReadonlySet<string>, overrides: TitleOverrides,
): ShopifyVehicleApplyItemBody[] {
  return rows
    .filter((row) => selected.has(row.key))
    .map((row) => {
      const title = effectiveTitle(row, overrides);
      return {
        key: row.key,
        title,
        handle: title === row.title ? row.handle : undefined,
        rules: row.rules,
        appliedDisjunctively: row.appliedDisjunctively,
      };
    });
}

export interface ResolvedVehicleRow {
  key: string;
  title: string;
  parentKey: string | null;
  collectionId: number;
}

// Oluşturma sonucundan (oluşturulan + var olan) menüye bağlanabilen satırlar; başarısız satırlar elenir.
export function resolveVehicleRows(
  rows: ShopifyVehicleCollectionSuggestionDto[], results: ShopifyVehicleApplyRowDto[],
): ResolvedVehicleRow[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return results.flatMap((result) => {
    const row = byKey.get(result.key);
    return row && result.collectionId !== null && result.outcome !== 'Failed'
      ? [{ key: row.key, title: result.title, parentKey: row.parentKey, collectionId: result.collectionId }]
      : [];
  });
}

const collectionNode = (row: ResolvedVehicleRow, items: ShopifyMenuNodeDto[] = []): ShopifyMenuNodeDto =>
  newMenuNode({ title: row.title, type: MENU_TYPE.Collection, resourceId: `${COLLECTION_GID_PREFIX}${row.collectionId}`, items });

// Marka → model hiyerarşisi: modeller üst markanın altına, üst markası seçilmemiş modeller kök seviyeye girer.
export function buildVehicleMenuDraft(rows: ResolvedVehicleRow[]): ShopifyMenuNodeDto[] {
  const keys = new Set(rows.map((row) => row.key));
  const isChild = (row: ResolvedVehicleRow) => row.parentKey !== null && keys.has(row.parentKey);
  return rows
    .filter((row) => !isChild(row))
    .map((row) => collectionNode(row, rows.filter((child) => isChild(child) && child.parentKey === row.key).map((child) => collectionNode(child))));
}

// Taslağı canlı ağaca ekler: menüde zaten bağlı koleksiyon tekrar eklenmez; marka düğümü varsa yalnız eksik modeller altına girer.
export function mergeVehicleDraft(live: ShopifyMenuNodeDto[], draft: ShopifyMenuNodeDto[]): ShopifyMenuNodeDto[] {
  const next = live.map((node) => ({ ...node }));
  for (const brand of draft) {
    const existing = next.find((node) => node.resourceId === brand.resourceId);
    if (!existing) {
      next.push(brand);
      continue;
    }
    const linked = new Set(existing.items.map((child) => child.resourceId));
    existing.items = [...existing.items, ...brand.items.filter((child) => !linked.has(child.resourceId))];
  }
  return next;
}

export const APPLY_OUTCOME_LABELS: Record<ShopifyVehicleApplyRowDto['outcome'], string> = {
  Created: 'Oluşturuldu',
  Existing: 'Zaten vardı',
  Failed: 'Başarısız',
};
