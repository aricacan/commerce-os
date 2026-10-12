import { DELIVERY_STATUS, type MessageDto } from '../../lib/api/omnichannel';
import type { GoldBulkItemResultDto, GoldRunSummaryDto, GoldScenarioDto } from '../../lib/api/omnichannel-gold';
import { senderKindOf } from './messageSender';

// Kalite Merkezi › Senaryolar bölümünün saf yardımcıları (P35, eski Altın Set).

export const GOLD_LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  tr: 'Türkçe',
  en: 'İngilizce',
  sq: 'Arnavutça',
};

// Sunucudaki kapı eşiğiyle aynı (GoldGateRules.MaxAllowedDrop); asıl karar sunucuda, burada yalnız gösterim.
export const GOLD_GATE_THRESHOLD = 0.3;

// Puanı 10 üzerinden tek ondalıkla yazar; puan yoksa çizgi.
export const formatGoldScore = (score: number | null): string =>
  score === null ? '—' : score.toFixed(1).replace('.', ',');

// "+0,4" / "−1,2" / "0,0"; fark yoksa çizgi. Eksi işareti gerçek eksi (U+2212): rakamla aynı genişlikte hizalanır.
export function formatGoldDelta(delta: number | null): string {
  if (delta === null) return '—';
  const text = Math.abs(delta).toFixed(1).replace('.', ',');
  if (Math.abs(delta) < 0.05) return text;
  return `${delta > 0 ? '+' : '−'}${text}`;
}

export type GoldDeltaTone = 'up' | 'down' | 'flat';

export function goldDeltaTone(delta: number | null): GoldDeltaTone {
  if (delta === null || Math.abs(delta) < 0.05) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export const goldLanguageLabel = (code: string): string => GOLD_LANGUAGE_LABELS[code] ?? code.toUpperCase();

export type GoldRunStatus = 'running' | 'passed' | 'blocked';

export function goldRunStatus(run: GoldRunSummaryDto): GoldRunStatus {
  if (run.finishedAt === null) return 'running';
  return run.gatePassed === false ? 'blocked' : 'passed';
}

export const GOLD_RUN_STATUS_LABELS: Readonly<Record<GoldRunStatus, string>> = {
  running: 'Sürüyor',
  passed: 'Geçti',
  blocked: 'Deploy durur',
};

export interface GoldScenarioFilter {
  language: string;
  country: string;
}

export const ALL_FILTER = '';

export function filterGoldScenarios(
  scenarios: readonly GoldScenarioDto[], filter: GoldScenarioFilter,
): GoldScenarioDto[] {
  return scenarios.filter((s) =>
    (filter.language === ALL_FILTER || s.language === filter.language)
    && (filter.country === ALL_FILTER || s.countryCode === filter.country));
}

export const distinctCountries = (scenarios: readonly GoldScenarioDto[]): string[] =>
  [...new Set(scenarios.map((s) => s.countryCode))].sort();

export function goldScenarioSummary(scenarios: readonly GoldScenarioDto[]): string {
  if (scenarios.length === 0) return 'Henüz senaryo yok. Gelen kutusunda bir temsilci cevabındaki "Senaryoya ekle" düğmesini ya da Adaylar bölümünü kullanın.';
  const active = scenarios.filter((s) => s.isActive).length;
  return `${scenarios.length} senaryo, ${active} aktif.`;
}

// "Şimdi koştur" ilerlemesi: tamamlanan / toplam senaryo.
export interface GoldRunProgress {
  done: number;
  total: number;
}

export const goldProgressLabel = ({ done, total }: GoldRunProgress): string => `${done} / ${total} senaryo koşuldu`;

// Koşu satırının sürüm etiketi: boşsa "manuel".
export const goldVersionLabel = (run: GoldRunSummaryDto): string => run.versionLabel || 'manuel';

// Panelden başlatılan koşunun etiketi (sunucu 64 karaktere kısaltır).
export const GOLD_MANUAL_LABEL = 'panel';

// "Senaryoya ekle" düğmesi yalnız gerçekten gönderilmiş bir TEMSİLCİ cevabında görünür: kayıtlı (gerçek id),
// metni olan ve müşteriye ulaşmayı deneyen. Panel dışından yazılan (platform) cevap temsilcimizin sayılmaz.
export function canAddToGold(message: MessageDto): boolean {
  if (senderKindOf(message) !== 'agent') return false;
  if (message.id <= 0 || !message.body) return false;
  return message.deliveryStatus !== DELIVERY_STATUS.Pending && message.deliveryStatus !== DELIVERY_STATUS.Failed;
}

// ─── Aday öner (otomatik aday üretimi) ───────────────────────────────────────────

// Sunucu varsayılanıyla aynı pencere; aday ve toplu ekleme üst sınırı sunucuda (GoldSetLimits).
export const GOLD_CANDIDATE_DAYS = 60;
export const GOLD_BULK_MAX = 20;

// Seçimi değiştirir: seçiliyse çıkarır, değilse ekler (sınır aşılırsa eklemez).
export function toggleGoldSelection(selected: readonly number[], messageId: number): number[] {
  if (selected.includes(messageId)) return selected.filter((id) => id !== messageId);
  return selected.length >= GOLD_BULK_MAX ? [...selected] : [...selected, messageId];
}

// Listeden düşen adaylar: eklenenler ve zaten sette olanlar. Yetkisiz/başarısızlar listede kalır.
export function settledCandidateIds(results: readonly GoldBulkItemResultDto[]): number[] {
  return results.filter((r) => r.outcome === 'Created' || r.outcome === 'AlreadyExists').map((r) => r.messageId);
}

// "3 eklendi, 1 zaten vardı, 2 eklenemedi" — boş sayılar yazılmaz.
export function goldBulkSummary(results: readonly GoldBulkItemResultDto[]): string {
  const created = results.filter((r) => r.outcome === 'Created').length;
  const existing = results.filter((r) => r.outcome === 'AlreadyExists').length;
  const failed = results.length - created - existing;
  const parts = [
    created > 0 ? `${created} eklendi` : null,
    existing > 0 ? `${existing} zaten vardı` : null,
    failed > 0 ? `${failed} eklenemedi` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : 'Hiçbir şey eklenmedi';
}
