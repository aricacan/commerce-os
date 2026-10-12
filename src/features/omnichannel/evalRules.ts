import { EVAL_RUN_STATUS, type EvalQuickScoreDto, type EvalRunDto, type EvalScoreKey } from '../../lib/api/omnichannel-eval';
import type { BadgeTone } from '../shared/design';

// Değerlendirme koşularının saf kuralları: veri seti doğrulama/sayım, durum etiketi, hızlı puan biçimi.

const PERCENT = 100;
const BYTES_PER_MB = 1024 * 1024;
// Tarayıcının belleğe okuyacağı makul üst sınır; daha büyüğü okunmadan reddedilir.
export const EVAL_DATASET_MAX_MB = 25;
export const EVAL_DATASET_MAX_BYTES = EVAL_DATASET_MAX_MB * BYTES_PER_MB;
export const EVAL_POLL_INTERVAL_MS = 5000;

const CUSTOMER_ROLE = 'customer';
const BOT_ROLE = 'bot';
// Panel notu ve sistem satırı müşteriye gitmez; tur sınırını bozmaz.
const SILENT_ROLES = new Set(['note', 'system']);

export interface DatasetSummary {
  conversations: number;
  botTurns: number;
}

export type DatasetCheck = { ok: true; summary: DatasetSummary } | { ok: false; error: string };

interface DatasetMessage { r: string; x: string }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isId = (value: unknown): boolean => typeof value === 'string' || typeof value === 'number';
const isMessage = (value: unknown): value is DatasetMessage =>
  isRecord(value) && typeof value.r === 'string' && typeof value.x === 'string';

// Bot turu: müşteri mesaj(lar)ı + ardından gelen bot mesaj(lar)ı (RUBRIC.md). Yalnız bot cevabı olan tur sayılır.
export function countBotTurns(messages: readonly DatasetMessage[]): number {
  let turns = 0;
  let lastRole: string | null = null;
  for (const { r } of messages) {
    if (SILENT_ROLES.has(r)) continue;
    if (r === BOT_ROLE && lastRole === CUSTOMER_ROLE) turns += 1;
    lastRole = r;
  }
  return turns;
}

// Beklenen biçim: {version, conversations:[{id, msgs:[{r, x}]}]}. İlk hatayı konumuyla söyler.
export function checkEvalDataset(json: unknown): DatasetCheck {
  if (!isRecord(json)) return { ok: false, error: 'Dosya bir JSON nesnesi değil.' };
  if (!isId(json.version)) return { ok: false, error: '"version" alanı eksik.' };
  if (!Array.isArray(json.conversations) || json.conversations.length === 0) {
    return { ok: false, error: '"conversations" boş ya da liste değil.' };
  }

  let botTurns = 0;
  for (const [index, conversation] of json.conversations.entries()) {
    const position = index + 1;
    if (!isRecord(conversation) || !isId(conversation.id)) return { ok: false, error: `${position}. konuşmada "id" eksik.` };
    if (!Array.isArray(conversation.msgs)) return { ok: false, error: `${position}. konuşmada "msgs" listesi yok.` };
    if (!conversation.msgs.every(isMessage)) {
      return { ok: false, error: `${position}. konuşmada her mesajın "r" ve "x" metin alanı olmalı.` };
    }
    botTurns += countBotTurns(conversation.msgs);
  }

  if (botTurns === 0) return { ok: false, error: 'Veri setinde puanlanacak bot turu yok.' };
  return { ok: true, summary: { conversations: json.conversations.length, botTurns } };
}

export function parseEvalDataset(text: string): DatasetCheck {
  try {
    return checkEvalDataset(JSON.parse(text));
  } catch {
    return { ok: false, error: 'Dosya geçerli bir JSON değil.' };
  }
}

// ── Koşu durumu ────────────────────────────────────────────────────────────────

export interface ChipStyle { label: string; tone: BadgeTone }

const RUN_STATUS_CHIPS: Record<number, ChipStyle> = {
  [EVAL_RUN_STATUS.Queued]: { label: 'Sırada', tone: 'neutral' },
  [EVAL_RUN_STATUS.Running]: { label: 'Koşuyor', tone: 'info' },
  [EVAL_RUN_STATUS.Completed]: { label: 'Tamamlandı', tone: 'success' },
  [EVAL_RUN_STATUS.Failed]: { label: 'Başarısız', tone: 'danger' },
  [EVAL_RUN_STATUS.Cancelled]: { label: 'İptal edildi', tone: 'neutral' },
};

export const evalRunStatusChip = (status: number): ChipStyle =>
  RUN_STATUS_CHIPS[status] ?? { label: `Durum ${status}`, tone: 'neutral' };

export const isEvalRunActive = (run: Pick<EvalRunDto, 'status'>): boolean =>
  run.status === EVAL_RUN_STATUS.Queued || run.status === EVAL_RUN_STATUS.Running;

// Başarısız ya da iptal edilmiş ve bitmemiş turu olan koşu kaldığı yerden sürdürülebilir.
export const isEvalRunResumable = (run: Pick<EvalRunDto, 'status' | 'turnsDone' | 'turnsTotal'>): boolean =>
  (run.status === EVAL_RUN_STATUS.Failed || run.status === EVAL_RUN_STATUS.Cancelled) && run.turnsDone < run.turnsTotal;

export const hasActiveEvalRun =(runs: readonly Pick<EvalRunDto, 'status'>[]): boolean => runs.some(isEvalRunActive);

// 0..100 arası tam yüzde; toplam 0 ise 0 (bölme hatası yok).
export function evalProgressPercent(run: Pick<EvalRunDto, 'turnsDone' | 'turnsTotal'>): number {
  if (run.turnsTotal <= 0) return 0;
  return Math.min(PERCENT, Math.round((run.turnsDone / run.turnsTotal) * PERCENT));
}

// ── Hızlı puan ─────────────────────────────────────────────────────────────────

export interface ScoreDimension { key: EvalScoreKey; short: string; label: string }

export const EVAL_SCORE_DIMENSIONS: readonly ScoreDimension[] = [
  { key: 'turnSuccess', short: 'Tur', label: 'Tur başarısı' },
  { key: 'U', short: 'U', label: 'Anlama' },
  { key: 'C', short: 'C', label: 'Bağlam / hafıza' },
  { key: 'D', short: 'D', label: 'İçerik doğruluğu' },
  { key: 'L', short: 'L', label: 'Dil ve ton' },
  { key: 'F', short: 'F', label: 'Biçim' },
  { key: 'H', short: 'H', label: 'Devir kararı' },
  { key: 'T', short: 'T', label: 'Teslimat' },
];

// 0..1 oranını yüzdeye çevirir (sınır dışını kırpar); değer yoksa null.
export function scorePercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(Math.min(1, Math.max(0, value)) * PERCENT);
}

export function formatScore(value: number | null | undefined): string {
  const percent = scorePercent(value);
  return percent === null ? '—' : `%${percent}`;
}

export const scoreOf = (score: EvalQuickScoreDto | null, key: EvalScoreKey): number | null => score?.[key] ?? null;

export const evalRunTitle = (run: Pick<EvalRunDto, 'id' | 'name'>): string => run.name.trim() || `Koşu ${run.id}`;
