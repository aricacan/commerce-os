import { request } from './core';
import { QUALITY_PAGE_SIZE } from './omnichannel-quality';
import { asRecord, bool, list, num, numOrNull, str, strOrNull } from './safe-read';

// ─── Omnichannel › Kalite Merkezi › Sözlük (FAZ 6.4) ─────────────────────────────────
//
// Botun müşteri yazımlarını öğrendiği sözlük: aday kutusu ve terim listesi. Uçlar /omnichannel/lexicon/* (yalnız
// yönetici; ortak satırları yalnız SuperAdmin değiştirir). Ön yüz backend'den önce yayına çıkar: her yanıt güvenli
// varsayılana çekilir, uç yoksa ekran sakin "güncelleniyor" durumunu gösterir (isServerUpdatePending).
// Backend enum'ları sayı olarak gönderir (global JsonStringEnumConverter yok).

const ROOT = '/omnichannel/lexicon';
// Kalite Merkezi'nin ortak sayfa boyutu: sayfa çubuğu (QualityPager) aynı sayıyla sayfa hesaplar.
export const LEXICON_PAGE_SIZE = QUALITY_PAGE_SIZE;

// Backend LexiconKind / LexiconSource / LexiconCandidateStatus / LexiconTermScope ile birebir.
export const LEXICON_KIND = { VehicleMake: 0, VehicleModel: 1, Part: 2, BodyType: 3, Word: 4 } as const;
export type LexiconKind = (typeof LEXICON_KIND)[keyof typeof LEXICON_KIND];

export const LEXICON_SOURCE = { Seed: 0, Learned: 1, Manual: 2 } as const;
export type LexiconSource = (typeof LEXICON_SOURCE)[keyof typeof LEXICON_SOURCE];

export const LEXICON_CANDIDATE_STATUS = { Pending: 0, Approved: 1, Rejected: 2 } as const;
export type LexiconCandidateStatus = (typeof LEXICON_CANDIDATE_STATUS)[keyof typeof LEXICON_CANDIDATE_STATUS];

export const LEXICON_SCOPE = { All: 0, Global: 1, Tenant: 2 } as const;
export type LexiconScope = (typeof LEXICON_SCOPE)[keyof typeof LEXICON_SCOPE];

export interface LexiconCandidateDto {
  id: number;
  token: string;
  exampleText: string;
  count: number;
  lowConfidenceCount: number;
  suggestedMeaning: string | null;
  suggestedKind: LexiconKind | null;
  suggestedMake: string | null;
  status: LexiconCandidateStatus;
  lastSeenAt: string;
}

export interface LexiconTermDto {
  id: number;
  isGlobal: boolean;
  term: string;
  meaning: string;
  kind: LexiconKind;
  make: string | null;
  language: string | null;
  source: LexiconSource;
  isActive: boolean;
  hits: number;
}

export interface LexiconPageDto<T> {
  items: T[];
  total: number;
}

export interface LexiconCandidateQuery {
  status: LexiconCandidateStatus;
  search: string;
  page: number;
}

export interface LexiconTermQuery {
  search: string;
  kind: LexiconKind | null;
  source: LexiconSource | null;
  scope: LexiconScope;
  page: number;
}

/** Onay ve düzenleme gövdesi: terimin kendisi değişmez, anlam/tür/marka/dil. */
export interface LexiconTermFields {
  meaning: string;
  kind: LexiconKind;
  make: string | null;
  language: string | null;
}

export interface NewLexiconTermInput extends LexiconTermFields {
  term: string;
  isGlobal: boolean;
}

const kindOf = (value: unknown): LexiconKind => {
  const n = num(value, LEXICON_KIND.Word);
  return n >= LEXICON_KIND.VehicleMake && n <= LEXICON_KIND.Word ? (n as LexiconKind) : LEXICON_KIND.Word;
};

const statusOf = (value: unknown): LexiconCandidateStatus => {
  const n = num(value, LEXICON_CANDIDATE_STATUS.Pending);
  return n === LEXICON_CANDIDATE_STATUS.Approved || n === LEXICON_CANDIDATE_STATUS.Rejected ? n : LEXICON_CANDIDATE_STATUS.Pending;
};

const sourceOf = (value: unknown): LexiconSource => {
  const n = num(value, LEXICON_SOURCE.Manual);
  return n === LEXICON_SOURCE.Seed || n === LEXICON_SOURCE.Learned ? n : LEXICON_SOURCE.Manual;
};

export function normalizeLexiconCandidate(raw: unknown): LexiconCandidateDto {
  const r = asRecord(raw);
  const suggestedKind = numOrNull(r.suggestedKind);
  return {
    id: num(r.id),
    token: str(r.token),
    exampleText: str(r.exampleText),
    count: num(r.count),
    lowConfidenceCount: num(r.lowConfidenceCount),
    suggestedMeaning: strOrNull(r.suggestedMeaning),
    suggestedKind: suggestedKind === null ? null : kindOf(suggestedKind),
    suggestedMake: strOrNull(r.suggestedMake),
    status: statusOf(r.status),
    lastSeenAt: str(r.lastSeenAt),
  };
}

export function normalizeLexiconTerm(raw: unknown): LexiconTermDto {
  const r = asRecord(raw);
  return {
    id: num(r.id),
    isGlobal: bool(r.isGlobal),
    term: str(r.term),
    meaning: str(r.meaning),
    kind: kindOf(r.kind),
    make: strOrNull(r.make),
    language: strOrNull(r.language),
    source: sourceOf(r.source),
    isActive: r.isActive !== false,
    hits: num(r.hits),
  };
}

const skipOf = (page: number) => String(page * LEXICON_PAGE_SIZE);

export function lexiconCandidatesUrl(query: LexiconCandidateQuery): string {
  const params = new URLSearchParams({ status: String(query.status), skip: skipOf(query.page), take: String(LEXICON_PAGE_SIZE) });
  if (query.search.trim()) params.set('search', query.search.trim());
  return `${ROOT}/candidates?${params}`;
}

export function lexiconTermsUrl(query: LexiconTermQuery): string {
  const params = new URLSearchParams({ scope: String(query.scope), skip: skipOf(query.page), take: String(LEXICON_PAGE_SIZE) });
  if (query.kind !== null) params.set('kind', String(query.kind));
  if (query.source !== null) params.set('source', String(query.source));
  if (query.search.trim()) params.set('search', query.search.trim());
  return `${ROOT}/terms?${params}`;
}

async function readPage<T>(path: string, normalize: (raw: unknown) => T): Promise<LexiconPageDto<T>> {
  const raw = asRecord(await request<unknown>(path));
  const items = list(raw.items).map(normalize);
  return { items, total: num(raw.total, items.length) };
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

export const lexiconApi = {
  getCandidates: (query: LexiconCandidateQuery) => readPage(lexiconCandidatesUrl(query), normalizeLexiconCandidate),
  approveCandidate: async (id: number, fields: LexiconTermFields) =>
    normalizeLexiconTerm(await post<unknown>(`${ROOT}/candidates/${id}/approve`, fields)),
  rejectCandidate: (id: number) => post<unknown>(`${ROOT}/candidates/${id}/reject`),
  rejectMany: async (ids: number[]) => {
    const raw = asRecord(await post<unknown>(`${ROOT}/candidates/bulk`, { ids, action: 'reject' }));
    return { processed: num(raw.processed), skipped: num(raw.skipped) };
  },

  getTerms: (query: LexiconTermQuery) => readPage(lexiconTermsUrl(query), normalizeLexiconTerm),
  createTerm: async (input: NewLexiconTermInput) => normalizeLexiconTerm(await post<unknown>(`${ROOT}/terms`, input)),
  updateTerm: async (id: number, fields: LexiconTermFields) =>
    normalizeLexiconTerm(await request<unknown>(`${ROOT}/terms/${id}`, { method: 'PUT', body: JSON.stringify(fields) })),
  setTermActive: async (id: number, isActive: boolean) =>
    normalizeLexiconTerm(await post<unknown>(`${ROOT}/terms/${id}/active`, { isActive })),
};
