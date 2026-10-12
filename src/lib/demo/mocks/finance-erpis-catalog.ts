// Erpis ayrıştırma kuralları: stok kodu şeması, ERP grupları, sözlükler, firma kuralları, kart etiketleri.
import type {
  ErpisCardMatrix,
  ErpisCategoryNode,
  ErpisDictionaryCandidate,
  ErpisDictionaryEntry,
  ErpisDictionaryKind,
  ErpisSkuRoute,
  ErpisSkuSegment,
} from '../../api/erpis-catalog';
import { COMPANY_A_ID, COMPANY_B_ID, ERPIS_COMPANIES, ERPIS_ITEMS, type ErpisItemRecord } from '../data/finance-erpis';
import { ago, matchesSearch, paginate } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';

const SEGMENT_POSITIONS = [1, 2, 3] as const;
const SAMPLE_COUNT = 3;
const CANDIDATE_DEFAULT_LIMIT = 20;
const SEGMENT_LABELS: Record<string, string> = { A10: 'Paspas ailesi', A11: 'Bagaj ailesi', A12: 'Kaplama ailesi', SI: 'Siyah', GR: 'Gri', BE: 'Bej' };

// ── Stok kodu şeması ───────────────────────────────────────────────────────────

function segmentValue(item: ErpisItemRecord, position: number): string | null {
  return position === 1 ? item.seg1 : position === 2 ? item.seg2 : item.seg3;
}

function buildSegments(): ErpisSkuSegment[] {
  const segments: ErpisSkuSegment[] = [];
  for (const position of SEGMENT_POSITIONS) {
    const byCode = new Map<string, ErpisItemRecord[]>();
    for (const item of ERPIS_ITEMS) {
      const code = segmentValue(item, position);
      if (code) byCode.set(code, [...(byCode.get(code) ?? []), item]);
    }
    for (const [code, items] of byCode) {
      const label = SEGMENT_LABELS[code] ?? null;
      segments.push({
        id: position * 1000 + segments.length, position, code, label, kind: position === 1 ? 'Family' : position === 3 ? 'Color' : null,
        itemCount: items.length, suggestedLabel: label ? null : items[0].productType, samples: items.slice(0, SAMPLE_COUNT).map((item) => item.sku),
        updatedBy: label ? 'Demo Kullanıcı' : null, updatedAt: label ? ago(40) : null,
      });
    }
  }
  return segments;
}

const SEGMENTS = buildSegments();

function segments(request: DemoRequest) {
  const position = Number(request.query.get('position')) || null;
  const onlyUnlabeled = request.query.get('onlyUnlabeled') === 'true';
  const filtered = SEGMENTS
    .filter((segment) => (!position || segment.position === position) && (!onlyUnlabeled || !segment.label))
    .filter((segment) => matchesSearch(segment, request.query.get('search'), ['code', 'label']));
  const page = paginate(filtered, request.query, 50);
  return { items: page.items, total: page.total, page: page.page, pageSize: page.pageSize };
}

// ── ERP grupları ───────────────────────────────────────────────────────────────

function categoryTree(): ErpisCategoryNode[] {
  const count = (categoryId: number) => ERPIS_ITEMS.filter((item) => item.categoryId === categoryId).length;
  const node = (id: number, code: string, name: string, level: number, parentId: number | null, children: ErpisCategoryNode[] = []): ErpisCategoryNode => ({
    id, code, name, level, parentId, source: 'ERP', itemCount: count(id), children,
  });
  return [
    node(1, 'MAM', 'Mamul', 1, null, [node(11, 'MAM.PAS', 'Paspas', 2, 1), node(12, 'MAM.BAG', 'Bagaj Ürünleri', 2, 1)]),
    node(2, 'YAR', 'Yarı Mamul', 1, null, [node(21, 'YAR.KES', 'Kesilmiş Levha', 2, 2)]),
    node(3, 'HAM', 'Hammadde', 1, null),
    node(4, 'SRF', 'Sarf Malzeme', 1, null),
  ];
}

// ── Sözlükler ──────────────────────────────────────────────────────────────────

function dictionaryValues(kind: ErpisDictionaryKind): string[] {
  const pick = (read: (item: ErpisItemRecord) => string | null) => [...new Set(ERPIS_ITEMS.map(read).filter((value): value is string => !!value))];
  switch (kind) {
    case 'Brand': return pick((item) => item.brand);
    case 'Model': return pick((item) => item.model);
    case 'ProductType': return pick((item) => item.productType);
    case 'Color': return pick((item) => item.color);
    case 'Material': return pick((item) => item.material);
    default: return [];
  }
}

const DICTIONARY_KINDS: ErpisDictionaryKind[] = ['Brand', 'Model', 'ProductType', 'Color', 'Material'];

function dictionaries(request: DemoRequest): ErpisDictionaryEntry[] {
  const kind = request.query.get('kind') as ErpisDictionaryKind | null;
  return DICTIONARY_KINDS.filter((candidate) => !kind || candidate === kind).flatMap((current) =>
    dictionaryValues(current).map((value, index): ErpisDictionaryEntry => ({
      id: DICTIONARY_KINDS.indexOf(current) * 100 + index + 1, kind: current, value, aliases: [value.toLocaleUpperCase('tr')],
      isSeed: index % 3 === 0, isActive: true,
      usageCount: ERPIS_ITEMS.filter((item) => [item.brand, item.model, item.productType, item.color, item.material].includes(value)).length,
    })));
}

function candidates(request: DemoRequest): ErpisDictionaryCandidate[] {
  const limit = Number(request.query.get('limit')) || CANDIDATE_DEFAULT_LIMIT;
  const kind = request.query.get('kind');
  const values = kind === 'Color' ? ['Antrasit', 'Lacivert'] : kind === 'Material' ? ['EVA', 'Kauçuk'] : ['Orion', 'Zephyra', 'Tundra'];
  return values.slice(0, limit).map((value, index) => ({
    value, occurrences: 14 - index * 3, samples: [`${value} paspas takımı`, `${value} bagaj havuzu`],
  }));
}

// ── Firma kuralları ve kart etiketleri ─────────────────────────────────────────

const ROUTES: ErpisSkuRoute[] = [
  { id: 1, pattern: 'A99-9999-AA', label: 'Standart ürün kodları', sample: ERPIS_ITEMS[0].sku, companyId: COMPANY_A_ID, companyName: ERPIS_COMPANIES[0].name, itemCount: ERPIS_ITEMS.filter((item) => item.companyId === COMPANY_A_ID).length, createdAt: ago(150) },
  { id: 2, pattern: 'L99-9999', label: 'Levha kodları', sample: 'L10-2030', companyId: COMPANY_B_ID, companyName: ERPIS_COMPANIES[1].name, itemCount: ERPIS_ITEMS.filter((item) => item.companyId === COMPANY_B_ID).length, createdAt: ago(150) },
];

function cardMatrix(): ErpisCardMatrix {
  const group = (route: ErpisSkuRoute, label: string) => ({
    skuPattern: route.pattern, sample: route.sample, patternLabel: route.label, companyId: route.companyId, companyName: route.companyName,
    routeId: route.id, itemCount: route.itemCount,
    rows: [{ skuPattern: route.pattern, sample: route.sample, itemTypeKey: 'Product', itemCount: route.itemCount, label, isDefaultVisible: true, tagId: route.id }],
  });
  return { groups: [group(ROUTES[0], 'Demo Ürünler'), group(ROUTES[1], 'Demo Levhalar')], untaggedCount: 0 };
}

export const financeErpisCatalogRoutes: DemoRoute[] = [
  get('/erpis/sku-segments', segments),
  get('/erpis/categories', categoryTree),
  get('/erpis/dictionaries/candidates', candidates),
  get('/erpis/dictionaries', dictionaries),
  get('/erpis/routes', () => ROUTES),
  get('/erpis/card-matrix', cardMatrix),
];
