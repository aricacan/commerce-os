import { CATCHUP_MAX_BATCH, type CatchupResultDto } from '../../lib/api/handoff-catchup';

// "Botla devam ettir" panelinin saf kuralları: kalan süre, seçim ve sonuç özeti.

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const MINUTE_DIGITS = 2;
const PREVIEW_MAX_CHARS = 90;

const SKIP_REASON_LABELS: Record<string, string> = {
  window_closed: "24 saat geçti, bot yazamaz — Meta'dan elle yazın",
  already_caught_up: 'Daha önce geri alındı',
  pending_consultation: 'Bekleyen danışma kartı var',
};
const GENERIC_SKIP_LABEL = 'Bu konuşma şu an geri alınamaz';

export function skipReasonLabel(reason: string): string {
  return SKIP_REASON_LABELS[reason] ?? GENERIC_SKIP_LABEL;
}

// "3 sa 05 dk" / "42 dk" / "Doldu". Dakikaya yukarı yuvarlanır: 5 sn kala bile "1 dk" yazar.
export function formatRemaining(windowEndsAt: string, now: number): string {
  const remainingMs = new Date(windowEndsAt).getTime() - now;
  if (!(remainingMs > 0)) return 'Doldu';
  const totalMinutes = Math.ceil(remainingMs / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes} dk`;
  return `${hours} sa ${String(minutes).padStart(MINUTE_DIGITS, '0')} dk`;
}

export function truncateMessage(text: string | null): string {
  if (!text) return '—';
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > PREVIEW_MAX_CHARS ? `${flat.slice(0, PREVIEW_MAX_CHARS)}…` : flat;
}

export function toggleSelection(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// Hepsi seçiliyse temizler; değilse hepsini seçer.
export function toggleAll(selected: ReadonlySet<number>, allIds: readonly number[]): Set<number> {
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  return allSelected ? new Set() : new Set(allIds);
}

// Sunucu tek seferde en çok CATCHUP_MAX_BATCH kabul eder; listedeki sırayla ilk N alınır.
export function idsToRun(selected: ReadonlySet<number>, orderedIds: readonly number[]): number[] {
  return orderedIds.filter((id) => selected.has(id)).slice(0, CATCHUP_MAX_BATCH);
}

export interface CatchupSummary {
  ok: number;
  skipped: number;
  failed: number;
  failures: CatchupResultDto[];
}

export function summarizeResults(results: readonly CatchupResultDto[]): CatchupSummary {
  const failures = results.filter((r) => r.outcome === 'failed');
  return {
    ok: results.filter((r) => r.outcome === 'ok').length,
    skipped: results.filter((r) => r.outcome === 'skipped').length,
    failed: failures.length,
    failures,
  };
}
