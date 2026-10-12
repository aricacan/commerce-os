// İade talepleri (claims), iade belgeleri (returns) ve kategori moderasyon kuyruğu.
import type { PendingModeration } from '../../../types/api';
import type { ClaimRow, ClaimsReport } from '../../api/claims';
import { DEMO_CLAIMS, DEMO_RETURNS } from '../data/orders-returns';
import { DEMO_GBP_TRY_RATE } from '../data/orders-seed';
import { DemoHttpResponse, get, type DemoRequest, type DemoRoute } from '../router';
import { matchesSearch } from '../seed';

const NOT_FOUND = 404;
const DEFAULT_CLAIM_LIMIT = 200;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const refundInTry = (claim: ClaimRow): number =>
  (claim.refundAmount ?? 0) * (claim.currency === 'GBP' ? DEMO_GBP_TRY_RATE : 1);

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  items.forEach((item) => groups.set(key(item), [...(groups.get(key(item)) ?? []), item]));
  return groups;
}

function claimsReport(request: DemoRequest): ClaimsReport {
  const { query } = request;
  const from = query.get('from');
  const to = query.get('to');
  const limit = Number(query.get('limit') ?? DEFAULT_CLAIM_LIMIT);
  const matching = DEMO_CLAIMS.filter((claim) => {
    const day = claim.claimDate.slice(0, 10);
    const inRange = (!from || day >= from) && (!to || day <= to);
    return inRange && matchesSearch(claim, query.get('search'), ['platformOrderNumber', 'sku', 'reason', 'storeName']);
  });

  return {
    totalCount: matching.length,
    items: matching.slice(0, limit),
    byReason: [...groupBy(matching, (claim) => claim.reason)].map(([reason, rows]) => ({
      reason,
      count: rows.length,
      refund: round2(rows.reduce((total, row) => total + refundInTry(row), 0)),
    })).sort((a, b) => b.count - a.count),
    byStatus: [...groupBy(matching, (claim) => claim.status)].map(([status, rows]) => ({ status, count: rows.length })),
    totalRefund: round2(matching.reduce((total, row) => total + refundInTry(row), 0)),
    lastSyncedAt: DEMO_CLAIMS.map((claim) => claim.syncedAt).sort().at(-1) ?? null,
    neverSynced: DEMO_CLAIMS.length === 0,
  };
}

function returnById(request: DemoRequest) {
  const found = DEMO_RETURNS.find((document) => document.id === Number(request.params.id));
  return found ?? new DemoHttpResponse(NOT_FOUND);
}

const PENDING_MODERATION: PendingModeration[] = [
  { logId: 1, originalText: 'Oto kokusu şişe asma', productName: 'AeroLine Oto Kokusu Premium', rawCategory: 'Araç Parfümü', suggestedCategoryId: 3, confidence: 0.91 },
  { logId: 2, originalText: 'Cam suyu katkısı 250ml', productName: 'ClearView Cam Suyu Katkısı', rawCategory: 'Oto Bakım Sıvıları', suggestedCategoryId: 3, confidence: 0.84 },
  { logId: 3, originalText: 'Lastik parlatıcı sprey', productName: 'UrbanFit Lastik Parlatıcı', rawCategory: 'Lastik Bakım', suggestedCategoryId: 3, confidence: 0.77 },
  { logId: 4, originalText: 'Telefon tutucu vantuzlu', productName: 'NovaDrive Araç Telefon Tutucu', rawCategory: 'Telefon Aksesuarı', suggestedCategoryId: 5, confidence: 0.69 },
  { logId: 5, originalText: 'Bagaj düzenleyici çanta', productName: 'TrackPro Bagaj Havuzu Gri', rawCategory: 'Bagaj Aksesuarı', suggestedCategoryId: 2, confidence: 0.62 },
  { logId: 6, originalText: 'Ön cam güneşliği', productName: 'UrbanFit Direksiyon Kılıfı Bej', rawCategory: 'Cam Aksesuarı', suggestedCategoryId: 4, confidence: 0.48 },
];

export const orderClaimRoutes: DemoRoute[] = [
  get('/claims', claimsReport),
  get('/returns', (request) => {
    const status = request.query.get('status');
    return status ? DEMO_RETURNS.filter((document) => document.status === status) : DEMO_RETURNS;
  }),
  get('/returns/:id', returnById),
  get('/moderation/pending', () => PENDING_MODERATION),
];
