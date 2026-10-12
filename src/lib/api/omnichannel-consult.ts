import { request } from './core';

// ─── Omnichannel › Temsilci Danışma ────────────────────────────────────────────
//
// Bot çözemediği yerde konuşmayı devretmek yerine temsilciye soru kartı açar. Temsilci hazır seçeneklerden
// birini seçer ya da serbest Türkçe talimat yazar; bot cevabı müşterinin dilinde yazıp hemen gönderir.
// Soru ve seçenek etiketleri Türkçe; customerText müşterinin dilindedir (customerTextTr onun çevirisi).

export interface AgentConsultOptionDto {
  /** Cevap isteğinde optionIndex olarak gönderilir (0'dan başlar). */
  index: number;
  labelTr: string;
  customerText: string;
  customerTextTr: string;
}

export interface AgentConsultationDto {
  id: number;
  conversationId: number;
  questionTr: string;
  options: AgentConsultOptionDto[];
  /** Botun devretmek yerine danıştığı HandoffReason adı (ör. "NotUnderstood"). */
  triggerReason: string;
  createdAt: string;
  /** Bu ana kadar cevap gelmezse konuşma normal devir yoluyla temsilciye düşer. */
  expiresAt: string;
  /**
   * Bu ana kadar seçilmezse bot autoReplyOptionIndex'teki (önerdiği) seçeneği kendisi gönderir. null: otomatik cevap
   * yok (devir sonrası açılan danışma ya da ayar kapalı). Eski backend alanı göndermez (undefined).
   */
  autoReplyAt?: string | null;
  autoReplyOptionIndex?: number | null;
}

/** Ya optionIndex ya da text (en fazla 500 karakter) gönderilir; ikisi birden ya da hiçbiri 400 döner. */
export type AgentConsultAnswerBody = { optionIndex: number } | { text: string };

export interface AgentConsultAnswerResponse {
  /** Müşteriye giden metin (müşteri dilinde). */
  sentText: string;
}

const base = (conversationId: number) => `/omnichannel/conversations/${conversationId}/consultation`;

export const consultApi = {
  /** Bekleyen kart; yoksa 204 (request boş gövdede undefined döner). */
  getPending: (conversationId: number) => request<AgentConsultationDto | undefined>(base(conversationId)),

  answer: (conversationId: number, consultationId: number, body: AgentConsultAnswerBody) =>
    request<AgentConsultAnswerResponse>(`${base(conversationId)}/${consultationId}/answer`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
