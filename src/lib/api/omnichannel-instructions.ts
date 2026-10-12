import { request } from './core';

// ─── Omnichannel › Bota talimat ver ────────────────────────────────────────────
//
// Temsilci konuşmaya özel bir yönerge yazar; bot cevaplarında yüksek öncelikle uygular. Talimat müşteriye
// gitmez ve çevrilmez. "Şimdi uygula" ile bot son müşteri mesajına talimata göre hemen cevap yazar.

export const INSTRUCTION_MODE = { Persistent: 'Persistent', OneShot: 'OneShot' } as const;
export type InstructionMode = (typeof INSTRUCTION_MODE)[keyof typeof INSTRUCTION_MODE];

// FAZ 7: talimatın kapsamı — hangi konuşmalarda botun istemine girer.
export const INSTRUCTION_SCOPE = {
  Conversation: 'Conversation', Customer: 'Customer', Channel: 'Channel', Account: 'Account',
} as const;
export type InstructionScope = (typeof INSTRUCTION_SCOPE)[keyof typeof INSTRUCTION_SCOPE];

export interface ConversationInstructionDto {
  id: number;
  text: string;
  mode: InstructionMode;
  /** Kalıcı: temsilci kaldırana dek; tek sefer: bir bot cevabında kullanılana dek aktif. */
  isActive: boolean;
  createdByUserId: number;
  /** Pasif kullanıcıda null (panel "Temsilci" yazar). */
  createdByName: string | null;
  createdAt: string;
  // ── FAZ 7 (eski backend göndermez) ──
  scope?: InstructionScope;
  /** Kalıcı talimatın bitişi. */
  expiresAt?: string | null;
  lastAppliedAt?: string | null;
  deactivatedAt?: string | null;
  /** Başka konuşmada geniş kapsamla verildi, bu konuşmaya da uygulanıyor (yalnız oradan kaldırılır). */
  inherited?: boolean;
}

export interface ConversationInstructionCreateBody {
  text: string;
  mode: InstructionMode;
  scope?: InstructionScope;
  expiresAt?: string | null;
  /** Önizlemede onaylanan (gerekirse düzenlenen) bot cevabı: talimatla birlikte müşteriye bot olarak gider. */
  sendText?: string;
  /** Önizlemenin orijinal metni — düzenleme farkı kalite incelemesine gider. */
  previewText?: string;
}

export const PREVIEW_STATE = {
  Ready: 'Ready', Handoff: 'Handoff', Rejected: 'Rejected', NothingToAnswer: 'NothingToAnswer', Unavailable: 'Unavailable',
} as const;
export type PreviewState = (typeof PREVIEW_STATE)[keyof typeof PREVIEW_STATE];

export interface InstructionPreviewDto {
  state: PreviewState;
  /** Botun müşteriye göndereceği mesajlar (sırasıyla). */
  replies: string[];
  toolsUsed: string[];
  customerMessage: string | null;
  detail: string | null;
}

export const APPLY_OUTCOME = {
  NotRequested: 'NotRequested',
  Sent: 'Sent',
  BotInactive: 'BotInactive',
  WindowClosed: 'WindowClosed',
  ReplyRejected: 'ReplyRejected',
  Unavailable: 'Unavailable',
  NothingToAnswer: 'NothingToAnswer',
} as const;
export type ApplyOutcome = (typeof APPLY_OUTCOME)[keyof typeof APPLY_OUTCOME];

export interface ConversationInstructionCreateResponse {
  instruction: ConversationInstructionDto;
  applyOutcome: ApplyOutcome;
  /** Müşteriye giden metin (yalnız Sent'te). */
  sentText: string | null;
  /** Gönderilmediyse nedeni (Türkçe). */
  detail: string | null;
}

const base = (conversationId: number) => `/omnichannel/conversations/${conversationId}/instructions`;

export const instructionsApi = {
  /** Talimat geçmişi (aktif + pasif), yeniden eskiye. */
  list: (conversationId: number) => request<ConversationInstructionDto[]>(base(conversationId)),

  create: (conversationId: number, body: ConversationInstructionCreateBody) =>
    request<ConversationInstructionCreateResponse>(base(conversationId), {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Talimat kaydedilmeden botun (araçlarla) ne cevap vereceği; hiçbir şey gönderilmez. */
  preview: (conversationId: number, text: string) =>
    request<InstructionPreviewDto>(`${base(conversationId)}/preview`, { method: 'POST', body: JSON.stringify({ text }) }),

  /** Kalıcı talimatın bitişini değiştirir (null = varsayılan ömür). */
  updateExpiry: (conversationId: number, instructionId: number, expiresAt: string | null) =>
    request<void>(`${base(conversationId)}/${instructionId}`, { method: 'PATCH', body: JSON.stringify({ expiresAt }) }),

  /** Talimatı pasifler; geçmişte not olarak kalır. */
  remove: (conversationId: number, instructionId: number) =>
    request<void>(`${base(conversationId)}/${instructionId}`, { method: 'DELETE' }),
};
