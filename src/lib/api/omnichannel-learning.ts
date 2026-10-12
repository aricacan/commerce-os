import { request } from './core';

// ─── Omnichannel › Öğrenme v2 ─────────────────────────────────────────────────────
//
// "Önerir + emin olunca uygular": arka plan öğrenme işi SSS taslakları ve sözlük önerileri
// açar; yüksek güvenli sözlük eşlemesini kendisi uygular (geri alınabilir). SSS taslağı
// ASLA kendiliğinden yayınlanmaz — onay burada verilir.

const BASE = '/omnichannel/learning';

export interface FaqDraftDto {
  id: number;
  question: string;
  title: string;
  triggers: string[];
  answerTr: string | null;
  answerEn: string | null;
  // Kosova müşterisine giden Arnavutça cevap.
  answerSq: string | null;
  evidenceCount: number;
  sourceConversationIds: number[];
  createdAt: string;
}

export interface AliasLearningDto {
  id: number;
  wrongTerm: string;
  correctTerm: string | null;
  candidates: string[];
  // 0–1 arası kural tabanlı güven.
  confidence: number;
  evidenceCount: number;
  autoAppliedAt: string | null;
  createdAt: string;
}

export interface LearningSuggestionsDto {
  pendingCount: number;
  autoAppliedThisWeek: number;
  faqDrafts: FaqDraftDto[];
  aliasSuggestions: AliasLearningDto[];
  autoApplied: AliasLearningDto[];
}

// Tetikleyiciler satır başına bir tane (SSS formuyla aynı biçim).
export interface FaqDraftUpdateBody {
  title: string;
  triggers: string;
  answerTr: string | null;
  answerEn: string | null;
  answerSq: string | null;
}

// ─── Temsilci düzeltmelerinden öğrenme (P36) ──────────────────────────────────────
//
// Temsilcinin botu düzelttiği anlar (bot cevabını değiştirdi, "yanlış" işareti koydu, bot tekrar
// eden hatayla devretti) toplanır; haftalık rapor en sık hata kalıplarını çıkarır.

// Sunucudaki BotCorrectionSignal / BotCorrectionCategory / BotCorrectionFixType ile aynı sayılar.
export const CORRECTION_SIGNAL = { AgentOverrode: 1, AgentFlagged: 2, RepeatedFailure: 3, AgentConsulted: 4 } as const;
export type CorrectionSignal = (typeof CORRECTION_SIGNAL)[keyof typeof CORRECTION_SIGNAL];

export const CORRECTION_CATEGORY = { Unknown: 0, Product: 1, Price: 2, Language: 3, Tone: 4, Flow: 5 } as const;
export type CorrectionCategory = (typeof CORRECTION_CATEGORY)[keyof typeof CORRECTION_CATEGORY];

export const CORRECTION_FIX_TYPE = {
  Dictionary: 1, CategoryDictionary: 2, Faq: 3, PromptRule: 4, CodeBug: 5,
} as const;
export type CorrectionFixType = (typeof CORRECTION_FIX_TYPE)[keyof typeof CORRECTION_FIX_TYPE];

export interface CorrectionSignalCountDto {
  signal: CorrectionSignal;
  count: number;
}

export interface CorrectionPatternDto {
  pattern: string;
  category: CorrectionCategory;
  suggestedFixType: CorrectionFixType;
  example: string;
  // Kalıba giren düzeltme sayısı.
  count: number;
}

export interface CorrectionDigestDto {
  // Raporun haftası (Pazartesi), "2026-09-28".
  weekStart: string;
  correctionCount: number;
  createdAt: string;
  patterns: CorrectionPatternDto[];
}

export interface CorrectionReportDto {
  days: number;
  totalCount: number;
  bySignal: CorrectionSignalCountDto[];
  latestDigest: CorrectionDigestDto | null;
}

export const learningApi = {
  getSuggestions: () => request<LearningSuggestionsDto>(`${BASE}/suggestions`),
  updateFaqDraft: (id: number, body: FaqDraftUpdateBody) =>
    request<void>(`${BASE}/faq-drafts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  approveFaqDraft: (id: number) =>
    request<void>(`${BASE}/faq-drafts/${id}/approve`, { method: 'POST' }),
  approveAlias: (id: number, correctTerm: string) =>
    request<void>(`${BASE}/aliases/${id}/approve`, { method: 'POST', body: JSON.stringify({ correctTerm }) }),
  revertAlias: (id: number) =>
    request<void>(`${BASE}/aliases/${id}/revert`, { method: 'POST' }),
  reject: (id: number) =>
    request<void>(`${BASE}/${id}/reject`, { method: 'POST' }),
  getCorrections: (days: number) =>
    request<CorrectionReportDto>(`${BASE}/corrections?days=${days}`),
  // Bot mesajını "yanlış" işaretler; aynı mesajı tekrar işaretlemek zararsızdır.
  flagWrongMessage: (messageId: number) =>
    request<void>(`/omnichannel/messages/${messageId}/flag-wrong`, { method: 'POST' }),
};
