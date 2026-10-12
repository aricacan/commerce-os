import { EVAL_RUN_STATUS, type EvalRunDto } from '../../lib/api/omnichannel-eval';
import {
  EVAL_DIFF_DIRECTION, QUALITY_CANDIDATE_STATUS, QUALITY_DATASET_SOURCE, QUALITY_PAGE_SIZE, QUALITY_SIGNAL,
  type QualityDatasetDto, type QualityTrendPointDto,
} from '../../lib/api/omnichannel-quality';
import type { ChipStyle } from './evalRules';
import { scorePercent } from './evalRules';

// Kalite Merkezi'nin (FAZ 7.5, Altın Set'in yeni adı) saf kuralları: bölümler, sinyal etiketleri, trend satırları,
// karşılaştırma farkları, beklenti listesi ayrıştırma, sayfa sayısı.

// ── Bölümler (adreste ?sub=) ───────────────────────────────────────────────────

export const QUALITY_SECTIONS = [
  { key: 'summary', label: 'Genel Bakış' },
  { key: 'runs', label: 'Koşular' },
  { key: 'candidates', label: 'Adaylar' },
  { key: 'scenarios', label: 'Senaryolar ve veri setleri' },
  { key: 'shadow', label: 'Gölge' },
  { key: 'answers', label: 'Onaylı cevaplar' },
  { key: 'lexicon', label: 'Sözlük' },
] as const;

export type QualitySectionKey = (typeof QUALITY_SECTIONS)[number]['key'];

/** Bilinmeyen ya da boş bölüm Genel Bakış'a düşer. */
export function resolveQualitySection(sub: string | null): QualitySectionKey {
  return QUALITY_SECTIONS.find((section) => section.key === sub)?.key ?? 'summary';
}

// ── Aday sinyalleri ────────────────────────────────────────────────────────────

export interface SignalOption { signal: number; label: string; chip: ChipStyle }

export const SIGNAL_OPTIONS: readonly SignalOption[] = [
  { signal: QUALITY_SIGNAL.Handoff, label: 'Devir', chip: { label: 'Devir', tone: 'warning' } },
  { signal: QUALITY_SIGNAL.FlaggedWrong, label: '"Yanlış" işareti', chip: { label: 'Yanlış', tone: 'danger' } },
  { signal: QUALITY_SIGNAL.AgentAnswer, label: 'Temsilci cevabı', chip: { label: 'Temsilci cevabı', tone: 'info' } },
  { signal: QUALITY_SIGNAL.ReplyFallback, label: 'Yedek cevap', chip: { label: 'Yedek cevap', tone: 'warning' } },
  { signal: QUALITY_SIGNAL.FailedTurn, label: 'Hatalı tur', chip: { label: 'Hata', tone: 'danger' } },
  { signal: QUALITY_SIGNAL.DuplicateSuppressed, label: 'Bastırılan tekrar', chip: { label: 'Tekrar', tone: 'neutral' } },
  { signal: QUALITY_SIGNAL.LowAuditScore, label: 'Düşük denetim puanı', chip: { label: 'Düşük puan', tone: 'warning' } },
];

/** Bayrak toplamındaki sinyallerin çipleri, sabit sırada. */
export function signalChips(flags: number): ChipStyle[] {
  return SIGNAL_OPTIONS.filter((option) => (flags & option.signal) === option.signal).map((option) => option.chip);
}

export const CANDIDATE_STATUS_OPTIONS = [
  { value: QUALITY_CANDIDATE_STATUS.Pending, label: 'Bekleyen' },
  { value: QUALITY_CANDIDATE_STATUS.Approved, label: 'Onaylanan' },
  { value: QUALITY_CANDIDATE_STATUS.Rejected, label: 'Reddedilen' },
] as const;

// ── Trend ──────────────────────────────────────────────────────────────────────

export interface TrendRow {
  label: string;
  version: string;
  name: string;
  turnSuccess: number | null;
}

const DATE_LABEL: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };

/** Koşular eskiden yeniye; tur başarısı yüzde (0..100), puanı olmayan koşu boşluk bırakır. */
export function trendRows(points: readonly QualityTrendPointDto[]): TrendRow[] {
  return points.map((point) => {
    const date = new Date(point.at);
    const day = Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('tr-TR', DATE_LABEL);
    return {
      label: `${day} · ${point.pipelineVersion}`,
      version: point.pipelineVersion,
      name: point.name,
      turnSuccess: scorePercent(point.score?.turnSuccess),
    };
  });
}

/** Hedefe uzaklık metni: "Hedefe 12 puan" ya da "Hedefte". */
export function targetGapLabel(ratio: number | null, target: number): string {
  const value = scorePercent(ratio);
  const goal = scorePercent(target);
  if (value === null || goal === null) return 'Puan yok';
  return value >= goal ? 'Hedefte' : `Hedefe ${goal - value} puan`;
}

// ── Karşılaştırma ──────────────────────────────────────────────────────────────

/** Karşılaştırılabilir koşular: en az bir turu tekrar edilmiş olanlar (liste sırası korunur: yeniden eskiye). */
export const comparableRuns = (runs: readonly EvalRunDto[]): EvalRunDto[] => runs.filter((run) => run.turnsDone > 0);

/** Varsayılan çift: hedef en yeni tamamlanmış koşu (yoksa en yeni), taban ondan sonraki ilk koşu. */
export function defaultComparePair(runs: readonly EvalRunDto[]): { base: number | null; target: number | null } {
  const target = runs.find((run) => run.status === EVAL_RUN_STATUS.Completed) ?? runs[0];
  if (!target) return { base: null, target: null };
  const base = runs.slice(runs.indexOf(target) + 1)[0] ?? runs.find((run) => run.id !== target.id);
  return { base: base?.id ?? null, target: target.id };
}

const DIRECTION_CHIPS: Record<number, ChipStyle> = {
  [EVAL_DIFF_DIRECTION.Improved]: { label: 'İyileşti', tone: 'success' },
  [EVAL_DIFF_DIRECTION.Regressed]: { label: 'Kötüleşti', tone: 'danger' },
  [EVAL_DIFF_DIRECTION.Changed]: { label: 'Değişti', tone: 'neutral' },
};

export const directionChip = (direction: number): ChipStyle =>
  DIRECTION_CHIPS[direction] ?? DIRECTION_CHIPS[EVAL_DIFF_DIRECTION.Changed];

export type DeltaTone = 'up' | 'down' | 'none';

/** Boyut farkı: +1 geçti, −1 kaldı, 0/yok gösterilmez. */
export function deltaOf(delta: number | null): { text: string; tone: DeltaTone } {
  if (delta === null || delta === 0) return { text: '', tone: 'none' };
  return delta > 0 ? { text: `+${delta}`, tone: 'up' } : { text: `−${Math.abs(delta)}`, tone: 'down' };
}

/** 1 → "✓", 0 → "✗", null → "—" (uygulanamaz). */
export function rubricMark(value: number | null): string {
  if (value === null) return '—';
  return value === 1 ? '✓' : '✗';
}

// ── Onay formu ─────────────────────────────────────────────────────────────────

/** "fiyat, link" → ["fiyat", "link"]: virgül ya da satırla ayrılır, boşlar ve tekrarlar atılır. */
export function splitTokens(text: string): string[] {
  const seen = new Set<string>();
  return text.split(/[,\n]/)
    .map((token) => token.trim())
    .filter((token) => {
      const key = token.toLocaleLowerCase('tr-TR');
      if (!token || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// ── Veri setleri ve sayfalama ──────────────────────────────────────────────────

export const datasetTitle = (dataset: Pick<QualityDatasetDto, 'name' | 'version'>): string =>
  `${dataset.name.trim() || 'Adsız set'} · v${dataset.version}`;

export const datasetSourceLabel = (source: number): string =>
  source === QUALITY_DATASET_SOURCE.Uploaded ? 'Yüklendi' : 'Canlıdan kuruldu';

export const pageCountOf = (total: number): number => Math.max(1, Math.ceil(total / QUALITY_PAGE_SIZE));

/** Seçimi aç/kapat (değişmez küme döner). */
export function toggleId(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Kanalların ülkeleri (tekil, sıralı) — veri seti süzgecinin ülke seçenekleri. */
export function channelCountries(channels: readonly { country: string | null }[]): string[] {
  const countries = channels.map((channel) => channel.country?.trim().toUpperCase() ?? '').filter(Boolean);
  return [...new Set(countries)].sort((a, b) => a.localeCompare(b, 'tr'));
}

/** "yyyy-mm-dd" günü sonraki günün başına çevirir (bitiş günü dahil olsun diye). */
export function dayAfter(day: string): string {
  if (!day) return '';
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
