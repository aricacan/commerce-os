import { request } from './core';

// AI istekleri doğası gereği yavaştır: model birden çok araç çağırabilir, her tur ayrı bir
// LLM gidiş-dönüşü ve arada gerçek veritabanı sorguları vardır. Genel 25 sn'lik istek
// bütçesi bunlara yetmiyor ve kullanıcı cevap üretilirken "Bağlantı hatası" görüyordu.
// Sunucu tarafında da bir bütçe var (bkz. AivarAgentEngine) — bu değer ondan kasıtlı olarak
// biraz daha uzun, böylece zaman aşımını ÖNCE sunucu yakalar ve anlamlı bir metin döner.
export const AI_REQUEST_TIMEOUT_MS = 90_000;

// Aivar sohbeti (backend: AiController → IAivarChatService).
// history: bu sohbetin önceki turları — sunucu durumsuz, bağlamı istemci taşır.
export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** Katalogdaki uzman ajan (backend: AivarAgentCatalog) — kadro tek kaynakta tanımlı. */
export interface AiAgentInfo {
  key: string;
  name: string;
  description: string;
  scope: string;
}

/** Arayüzde tablo olarak çizilen veri kartı — hücreler sunucuda biçimlenmiş METİNdir. */
export interface AiDataCard {
  title: string;
  subtitle?: string | null;
  columns: string[];
  rows: string[][];
}

/** Onay bekleyen yazma önerisi. Kullanıcı onaylamadan hiçbir veri değişmez. */
export interface AiPendingAction {
  proposalId: string;
  kind: string;
  title: string;
  summary: string;
  before?: string | null;
  after?: string | null;
}

export interface AiChatResponse {
  reply: string;
  cards: AiDataCard[];
  actions: AiPendingAction[];
  /** Bu cevaba 👍/👎 vermek için kullanılır; 0 = ölçüm kaydedilemedi. */
  interactionId: number;
}

export const aiApi = {
  chat: (message: string, pageUrl?: string, history: AiChatTurn[] = [], agent?: string) =>
    request<AiChatResponse>(
      '/ai/chat',
      { method: 'POST', body: JSON.stringify({ message, pageUrl, history, agent }) },
      true,
      AI_REQUEST_TIMEOUT_MS,
    ),
  agents: () => request<AiAgentInfo[]>('/ai/agents'),
  confirmAction: (proposalId: string) =>
    request<{ result: string }>('/ai/actions/confirm', {
      method: 'POST',
      body: JSON.stringify({ proposalId }),
    }),

  // Aivar'ın bu kullanıcı hakkında kalıcı olarak hatırladıkları (bkz. AivarMemory).
  getMemory: () => request<{ notes: string[] }>('/ai/memory'),
  clearMemory: () => request<{ removed: number }>('/ai/memory', { method: 'DELETE' }),

  // Cevap kalitesi ölçümü — hangi soruların kötü cevaplandığını tahmin etmek yerine ölçeriz.
  sendFeedback: (interactionId: number, wasHelpful: boolean) =>
    request<void>('/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({ interactionId, wasHelpful }),
    }),
};
