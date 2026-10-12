// Deterministik sahte veri üretimi: aynı seed her açılışta aynı veriyi verir.

const DEFAULT_SEED = 20261011;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/** mulberry32 — küçük, hızlı, tekrarlanabilir rastgele üreteç. */
export function createRng(seed: number = DEFAULT_SEED) {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number): number => Math.floor(next() * (max - min + 1)) + min,
    float: (min: number, max: number, digits = 2): number => Number((next() * (max - min) + min).toFixed(digits)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (probability: number): boolean => next() < probability,
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Bugünden `days` gün (ve isteğe bağlı saat/dakika) önce, ISO biçiminde. */
export function ago(days: number, hours = 0, minutes = 0): string {
  return new Date(Date.now() - days * MS_PER_DAY - hours * MS_PER_HOUR - minutes * MS_PER_MINUTE).toISOString();
}

/** Bugünden `days` gün önce, "YYYY-MM-DD". */
export function dayAgo(days: number): string {
  return ago(days).slice(0, 10);
}

/** Son `days` günün her günü için değer üretir (eskiden yeniye). */
export function lastDays<T>(days: number, build: (date: string, index: number) => T): T[] {
  return Array.from({ length: days }, (_, index) => build(dayAgo(days - 1 - index), index));
}

export function paginate<T>(items: T[], query: URLSearchParams, defaultPageSize = 25) {
  const page = Math.max(1, Number(query.get('page') ?? 1));
  const pageSize = Math.max(1, Number(query.get('pageSize') ?? query.get('limit') ?? defaultPageSize));
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalCount: items.length,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

/** Metin araması: verilen alanlardan biri sorguyu içeriyorsa kalır. */
export function matchesSearch<T>(item: T, search: string | null, fields: (keyof T)[]): boolean {
  if (!search) return true;
  const needle = search.toLocaleLowerCase('tr');
  return fields.some((field) => String(item[field] ?? '').toLocaleLowerCase('tr').includes(needle));
}
