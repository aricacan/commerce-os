import type { PageUsageDto, SyntheticCheckDto } from '../../lib/api';
import type { TranslationKey } from '../../lib/translations/tr';
import { NAV_PAGES, resolveNavPage, type NavPage } from './page-map';

// "Sol paneldeki her sayfa çalışıyor mu" — pasif sinyal: gerçek kullanıcıların açılışları
// ve o sayfada yakalanan ön yüz hataları. Kimse açmasa bile hata varsa sayfa sorunludur.
// Kimsenin açmadığı sayfada ise sentetik bot sonucu (varsa) "çalışıyor mu" sorusunu cevaplar.

export type PageHealthStatus = 'error' | 'ok' | 'idle';
/** Botun sayfayı en son açtığında gördüğü: yavaş da olsa açıldıysa çalışıyor sayılır. */
export type PageBotStatus = 'working' | 'broken';

export interface PageHealth {
  page: NavPage;
  views: number;
  clientErrors: number;
  status: PageHealthStatus;
  /** Yalnız kimsenin açmadığı (idle) sayfada dolar; bot sonucu yoksa null. */
  botStatus: PageBotStatus | null;
}

export interface PageHealthGroup {
  groupKey: TranslationKey | null;
  pages: PageHealth[];
  errorCount: number;
}

const STATUS_RANK: Record<PageHealthStatus, number> = { error: 0, ok: 1, idle: 2 };

function statusOf(views: number, clientErrors: number): PageHealthStatus {
  if (clientErrors > 0) return 'error';
  return views > 0 ? 'ok' : 'idle';
}

const BOT_LAYERS: ReadonlySet<SyntheticCheckDto['layer']> = new Set(['pages', 'browser']);

/**
 * Sayfa/tarayıcı kontrollerini sol panel sayfalarına bağlar; aynı sayfaya düşen birden çok
 * sonuçta EN YENİSİ geçerlidir. Atlanan kontrol bir şey söylemez, sayılmaz.
 */
export function botStatusByPage(
  checks: readonly SyntheticCheckDto[],
  pages: readonly NavPage[] = NAV_PAGES,
): Map<string, PageBotStatus> {
  const latest = new Map<string, SyntheticCheckDto>();
  for (const check of checks) {
    if (!BOT_LAYERS.has(check.layer) || !check.path || check.status === 'skipped') continue;
    const page = resolveNavPage(check.path, pages);
    if (!page) continue;
    const current = latest.get(page.href);
    if (!current || Date.parse(check.finishedAt) > Date.parse(current.finishedAt)) latest.set(page.href, check);
  }

  const result = new Map<string, PageBotStatus>();
  for (const [href, check] of latest) result.set(href, check.status === 'failed' ? 'broken' : 'working');
  return result;
}

/** Kullanım satırlarını sol panel sayfalarına toplar (alt yollar üst sayfaya sayılır). */
export function buildPageHealth(
  usage: readonly PageUsageDto[],
  pages: readonly NavPage[] = NAV_PAGES,
  botStatus: ReadonlyMap<string, PageBotStatus> = new Map(),
): PageHealth[] {
  const totals = new Map<string, { views: number; clientErrors: number }>();
  for (const row of usage) {
    const page = resolveNavPage(row.path, pages);
    if (!page) continue;
    const current = totals.get(page.href) ?? { views: 0, clientErrors: 0 };
    totals.set(page.href, { views: current.views + row.views, clientErrors: current.clientErrors + row.clientErrors });
  }

  return pages.map((page) => {
    const { views, clientErrors } = totals.get(page.href) ?? { views: 0, clientErrors: 0 };
    const status = statusOf(views, clientErrors);
    const bot = status === 'idle' ? botStatus.get(page.href) ?? null : null;
    return { page, views, clientErrors, status, botStatus: bot };
  });
}

/** Sol paneldeki gruplara böler; hatalı sayfası olan grup ve hatalı sayfa en üste çıkar. */
export function groupPageHealth(items: readonly PageHealth[]): PageHealthGroup[] {
  const groups: PageHealthGroup[] = [];
  for (const item of items) {
    const existing = groups.find((group) => group.groupKey === item.page.groupKey);
    if (existing) existing.pages.push(item);
    else groups.push({ groupKey: item.page.groupKey, pages: [item], errorCount: 0 });
  }

  for (const group of groups) {
    group.pages.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    group.errorCount = group.pages.filter((item) => item.status === 'error').length;
  }
  // Array.prototype.sort kararlıdır: hatasız gruplar sol paneldeki sırasını korur.
  return groups.sort((a, b) => b.errorCount - a.errorCount);
}

export function countByStatus(items: readonly PageHealth[]): Record<PageHealthStatus, number> {
  const counts: Record<PageHealthStatus, number> = { error: 0, ok: 0, idle: 0 };
  for (const item of items) counts[item.status] += 1;
  return counts;
}
