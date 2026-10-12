import type { ShopifyCollectionListItemDto } from '../../lib/api/shopify-store-content';

// Koleksiyon ağacı (saf): Marka → Model. Başlıktan türetilir; markası bulunamayanlar "Diğer" altında toplanır.
// Marka sözlüğü backend ShopifyVehicleCatalog'un marka adlarını yansıtır (model ayrımı gerekmez: model koleksiyonları
// "BMW 3 Series" gibi marka adını içeren başlıklarla markanın altına girer). Backend'e yeni marka eklenince burası da güncellenir.

interface BrandEntry {
  name: string;
  aliases: string[];
}

export const VEHICLE_BRANDS: BrandEntry[] = [
  { name: 'BMW', aliases: [] },
  { name: 'Mercedes-Benz', aliases: ['Mercedes', 'Mercedes Benz'] },
  { name: 'Audi', aliases: [] },
  { name: 'Volkswagen', aliases: ['VW'] },
  { name: 'Opel', aliases: ['Vauxhall'] },
  { name: 'Ford', aliases: [] },
  { name: 'Renault', aliases: [] },
  { name: 'Peugeot', aliases: [] },
  { name: 'Citroen', aliases: ['Citroën'] },
  { name: 'Fiat', aliases: [] },
  { name: 'Toyota', aliases: [] },
  { name: 'Honda', aliases: [] },
  { name: 'Hyundai', aliases: [] },
  { name: 'Kia', aliases: [] },
  { name: 'Skoda', aliases: ['Škoda'] },
  { name: 'Seat', aliases: [] },
  { name: 'Dacia', aliases: [] },
  { name: 'Nissan', aliases: [] },
  { name: 'Mazda', aliases: [] },
  { name: 'Volvo', aliases: [] },
];

export const OTHER_BRAND_KEY = 'brand:other';
export const OTHER_BRAND_LABEL = 'Diğer';

export interface CollectionTreeNode {
  key: string;
  label: string;
  // Dolu: tıklanınca detay açılır. Boş: yalnız gruplama düğümü (ör. koleksiyonu olmayan marka ya da "Diğer").
  collection: ShopifyCollectionListItemDto | null;
  children: CollectionTreeNode[];
  // Rozet: koleksiyonun kendi ürün sayısı; gruplama düğümünde altındakilerin toplamı.
  productCount: number;
}

// Büyük/küçük harf ve aksan farkını yok sayar (Türkçe İ/ı dahil), harf-rakam dışını boşluğa çevirir.
export function normalizeText(text: string): string {
  return ` ${text.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

const BRAND_TERMS = VEHICLE_BRANDS.map((brand) => ({
  brand,
  terms: [brand.name, ...brand.aliases].map(normalizeText),
}));

function brandOf(title: string): { brand: BrandEntry; exact: boolean } | null {
  const text = normalizeText(title);
  const found = BRAND_TERMS.find(({ terms }) => terms.some((term) => text.includes(term)));
  return found ? { brand: found.brand, exact: found.terms.includes(text) } : null;
}

const byLabel = (a: CollectionTreeNode, b: CollectionTreeNode) => a.label.localeCompare(b.label, 'tr');

const leaf = (collection: ShopifyCollectionListItemDto): CollectionTreeNode => ({
  key: `collection:${collection.id}`, label: collection.title, collection, children: [], productCount: collection.productCount,
});

function group(key: string, label: string, own: ShopifyCollectionListItemDto | null, members: CollectionTreeNode[]): CollectionTreeNode {
  const children = [...members].sort(byLabel);
  const total = own?.productCount ?? children.reduce((sum, child) => sum + child.productCount, 0);
  return { key, label, collection: own, children, productCount: total };
}

export function buildCollectionTree(collections: ShopifyCollectionListItemDto[]): CollectionTreeNode[] {
  const byBrand = new Map<string, { own: ShopifyCollectionListItemDto | null; members: ShopifyCollectionListItemDto[] }>();
  const others: ShopifyCollectionListItemDto[] = [];
  for (const collection of collections) {
    const match = brandOf(collection.title);
    if (!match) {
      others.push(collection);
      continue;
    }
    const entry = byBrand.get(match.brand.name) ?? { own: null, members: [] };
    if (match.exact && entry.own === null) entry.own = collection;
    else entry.members.push(collection);
    byBrand.set(match.brand.name, entry);
  }
  const brands = [...byBrand].map(([name, { own, members }]) => group(`brand:${name}`, name, own, members.map(leaf))).sort(byLabel);
  return others.length === 0 ? brands : [...brands, group(OTHER_BRAND_KEY, OTHER_BRAND_LABEL, null, others.map(leaf))];
}

export interface FilteredCollectionTree {
  nodes: CollectionTreeNode[];
  // Arama eşleşmesi olan alt öğeleri bulunan dallar: otomatik açılır.
  openKeys: ReadonlySet<string>;
}

function matches(node: CollectionTreeNode, query: string): boolean {
  return normalizeText(`${node.label} ${node.collection?.handle ?? ''}`).includes(query);
}

// Marka adı eşleşirse dalın tamamı kalır; yoksa yalnız eşleşen alt öğeler (dal açık gelir).
export function filterCollectionTree(nodes: CollectionTreeNode[], rawQuery: string): FilteredCollectionTree {
  const query = normalizeText(rawQuery);
  if (query.trim() === '') return { nodes, openKeys: new Set() };
  const openKeys = new Set<string>();
  const kept = nodes.flatMap((node) => {
    if (matches(node, query)) return [node];
    const children = node.children.filter((child) => matches(child, query));
    if (children.length === 0) return [];
    openKeys.add(node.key);
    return [{ ...node, children }];
  });
  return { nodes: kept, openKeys };
}
