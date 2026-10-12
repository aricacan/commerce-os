import { AI_REQUEST_TIMEOUT_MS } from './ai';
import { request } from './core';

// Backend: handoff-catchup uçları. Devredilmiş konuşmaları, 24 saatlik pencere kapanmadan bota geri alır:
// bot devri kapatır, müşteriye kısa özür yazar ve son cevapsız mesajına cevap verir.

export interface CatchupCandidateDto {
  conversationId: number;
  contactName: string | null;
  channelName: string;
  country: string | null;
  lastCustomerMessage: string | null;
  lastCustomerAt: string;
  /** Bot bu andan sonra yazamaz (serbest mesaj penceresi kapanır). */
  windowEndsAt: string;
}

export interface CatchupSkippedDto {
  conversationId: number;
  /** window_closed | already_caught_up | pending_consultation | başka (genel mesaj gösterilir). */
  reason: string;
}

export interface CatchupPreviewDto {
  eligible: CatchupCandidateDto[];
  skipped: CatchupSkippedDto[];
}

export type CatchupOutcome = 'ok' | 'skipped' | 'failed';

export interface CatchupResultDto {
  conversationId: number;
  outcome: CatchupOutcome;
  detail: string | null;
}

export interface CatchupRunResponse {
  results: CatchupResultDto[];
}

/** Backend tek çalıştırmada en çok bu kadar konuşma kabul eder. */
export const CATCHUP_MAX_BATCH = 50;

export const handoffCatchupApi = {
  preview: () => request<CatchupPreviewDto>('/omnichannel/handoff-catchup/preview'),

  // Konuşma başına AYRI istek: bir konuşma bot turuyla 45 sn'ye çıkabilir; topluca gönderince istemci zaman
  // aşımına düşüp sunucudaki işi yarıda bırakıyordu. Model çağırdığı için AI zaman aşımı kullanılır.
  runOne: (conversationId: number) =>
    request<CatchupRunResponse>('/omnichannel/handoff-catchup/run', {
      method: 'POST',
      body: JSON.stringify({ conversationIds: [conversationId] }),
    }, true, AI_REQUEST_TIMEOUT_MS),
};
