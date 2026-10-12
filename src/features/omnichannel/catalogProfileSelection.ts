// Profil formundaki kaynak seçimleri. Sonradan pasife çekilmiş (ya da ülkesi değişmiş) bir kaynak
// seçim listelerinde görünmez; kimliği formda kalırsa kullanıcı işareti kaldıramaz ve sunucu
// kaydı "kaynak pasif" diye reddeder. Bu yüzden form yalnız seçilebilir kaynakları taşır,
// ayıklananlar kullanıcıya ayrıca gösterilir.

// Fiyat seçimi tek listede: ERP ve site kaynakları birlikte ("erp:5" / "site:2").
export const ERP_PRICE_PREFIX = 'erp:';
export const SITE_PRICE_PREFIX = 'site:';

export interface CatalogSourceSelection {
  productSourceIds: number[];
  productSiteSourceId: number | null;
  price: string;
  stockSourceId: number | null;
  stockSiteSourceId: number | null;
  linkSourceId: number | null;
  linkSiteSourceId: number | null;
}

export type RemovedSourceKind = 'erp' | 'site';

export interface RemovedSource {
  field: string;
  kind: RemovedSourceKind;
  id: number;
}

export interface PrunedSelection {
  selection: CatalogSourceSelection;
  removed: RemovedSource[];
}

export function pruneUnavailableSources(
  selection: CatalogSourceSelection,
  availableErpIds: ReadonlySet<number>,
  availableSiteIds: ReadonlySet<number>,
): PrunedSelection {
  const removed: RemovedSource[] = [];
  const keep = (field: string, kind: RemovedSourceKind, id: number | null): number | null => {
    if (id === null) return null;
    if ((kind === 'erp' ? availableErpIds : availableSiteIds).has(id)) return id;
    removed.push({ field, kind, id });
    return null;
  };

  const productSourceIds = selection.productSourceIds.filter((id) => keep('ürün kaynağı', 'erp', id) !== null);

  return {
    selection: {
      productSourceIds,
      productSiteSourceId: keep('ürün sitesi', 'site', selection.productSiteSourceId),
      price: prunePrice(selection.price, (kind, id) => keep('fiyat kaynağı', kind, id) !== null),
      stockSourceId: keep('stok kaynağı', 'erp', selection.stockSourceId),
      stockSiteSourceId: keep('stok sitesi', 'site', selection.stockSiteSourceId),
      linkSourceId: keep('link kaynağı', 'erp', selection.linkSourceId),
      linkSiteSourceId: keep('link sitesi', 'site', selection.linkSiteSourceId),
    },
    removed,
  };
}

function prunePrice(price: string, isKept: (kind: RemovedSourceKind, id: number) => boolean): string {
  if (price.startsWith(ERP_PRICE_PREFIX)) return isKept('erp', Number(price.slice(ERP_PRICE_PREFIX.length))) ? price : '';
  if (price.startsWith(SITE_PRICE_PREFIX)) return isKept('site', Number(price.slice(SITE_PRICE_PREFIX.length))) ? price : '';
  return price;
}
