import { request } from './core';
import { httpStatusOf } from '../errors';

// Backend: OmnichannelCopilotController (FAZ 7) — devir sonrası temsilci yardımcısı. Hiçbir şey otomatik gitmez:
// temsilci seçeneği yazma alanına alır, düzenler, kendisi gönderir.

export const COPILOT_STATE = {
  Disabled: 'Disabled',
  NotHandedOff: 'NotHandedOff',
  NothingToAnswer: 'NothingToAnswer',
  Stale: 'Stale',
  Ready: 'Ready',
  Failed: 'Failed',
} as const;
export type CopilotState = (typeof COPILOT_STATE)[keyof typeof COPILOT_STATE];

export interface CopilotOptionDto {
  label: string;
  /** Müşterinin dilinde gönderilecek metin. */
  text: string;
  /** Türkçe karşılığı (müşteri dili Türkçe değilse). */
  textTr: string | null;
  /** "[...]" boşluğu var: temsilci doldurmadan gönderilmemeli. */
  hasBlanks: boolean;
}

export interface AgentCopilotDto {
  state: CopilotState;
  suggestionId: number | null;
  forMessageId: number | null;
  summary: string | null;
  openQuestion: string | null;
  options: CopilotOptionDto[];
  language: string | null;
  toolsUsed: string[];
  createdAt: string | null;
}

const base = (conversationId: number) => `/omnichannel/conversations/${conversationId}/copilot`;
const NOT_FOUND = 404;

// Eski backend'de uç yok (404): kart hiç gösterilmez.
async function orNull<T>(call: Promise<T>): Promise<T | null> {
  try {
    return await call;
  } catch (e) {
    if (httpStatusOf(e) === NOT_FOUND) return null;
    throw e;
  }
}

export const copilotApi = {
  get: (conversationId: number) => orNull(request<AgentCopilotDto>(base(conversationId))),

  /** Son müşteri mesajı için öneri yoksa üretir (birkaç saniye). */
  generate: (conversationId: number) => orNull(request<AgentCopilotDto>(base(conversationId), { method: 'POST' })),

  /** Gönderilen seçenek onaylı cevap adayı olur. */
  recordUse: (conversationId: number, body: { suggestionId: number; optionIndex: number; sentText: string }) =>
    request<void>(`${base(conversationId)}/used`, { method: 'POST', body: JSON.stringify(body) }),
};
