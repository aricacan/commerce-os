import type {
  SyntheticCheckDto,
  SyntheticCheckStatus,
  SyntheticLayer,
  SyntheticLayerRunDto,
  SyntheticQuietHoursDto,
  SyntheticRunnableLayer,
  SyntheticTrigger,
} from '../../lib/api';
import type { TranslationKey } from '../../lib/translations/tr';
import { NAV_PAGES, resolveNavPage, type NavPage } from './page-map';
import type { PillTone } from './ui';

// Sentetik Kontroller sekmesinin saf yardımcıları (DOM/ağ yok, test edilebilir).

export const LAYER_ORDER: readonly SyntheticLayer[] = ['pages', 'workflows', 'modules', 'browser'];

export const LAYER_LABELS: Record<SyntheticLayer, string> = {
  pages: 'Sayfalar',
  workflows: 'İş akışları',
  modules: 'Modüller',
  browser: 'Tarayıcı',
};

export const STATUS_META: Record<SyntheticCheckStatus, { tone: PillTone; label: string }> = {
  failed: { tone: 'danger', label: 'Kaldı' },
  slow: { tone: 'warning', label: 'Yavaş' },
  skipped: { tone: 'muted', label: 'Atlandı' },
  passed: { tone: 'success', label: 'Geçti' },
};

export const TRIGGER_LABELS: Record<SyntheticTrigger, string> = {
  schedule: 'Zamanlanmış',
  manual: 'Elle',
  github: 'GitHub',
};

// Ekranı açan kişi önce bozuğu görmeli: kalan → yavaş → atlanan → geçen.
const STATUS_RANK: Record<SyntheticCheckStatus, number> = { failed: 0, slow: 1, skipped: 2, passed: 3 };

/** Ayarlardaki aç/kapa anahtarları (mesai saati nesnesi hariç). */
export type SyntheticSwitchKey = 'enabled' | 'pagesEnabled' | 'workflowsEnabled' | 'modulesEnabled';

const LAYER_SETTING: Record<SyntheticRunnableLayer, SyntheticSwitchKey> = {
  pages: 'pagesEnabled',
  workflows: 'workflowsEnabled',
  modules: 'modulesEnabled',
};

const MS_PER_SECOND = 1_000;
const HOURS_PER_DAY = 24;

/** Mesai saati seçicisinin saatleri (0-23). */
export const HOURS_OF_DAY: readonly number[] = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

/** 8 → "08:00". */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Sunucudaki SyntheticQuietHours.Validate ile aynı kural; geçerliyse null. */
export function quietHoursError(hours: SyntheticQuietHoursDto): string | null {
  const valid = (hour: number) => Number.isInteger(hour) && hour >= 0 && hour < HOURS_PER_DAY;
  if (!valid(hours.startHour) || !valid(hours.endHour)) return 'Saatler 00:00-23:00 arasında olmalı.';
  return hours.startHour === hours.endHour ? 'Başlangıç ile bitiş aynı olamaz.' : null;
}

/** Kontrol süresi saniyenin altında da anlamlı: 420 → "420 ms", 2350 → "2,4 sn". */
export function formatCheckDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < MS_PER_SECOND) return `${Math.round(ms)} ms`;
  return `${(ms / MS_PER_SECOND).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sn`;
}

/** Tarayıcı katmanı GitHub iş akışından koşar; panelden tetiklenemez. */
export function isRunnableLayer(layer: SyntheticLayer): layer is SyntheticRunnableLayer {
  return layer !== 'browser';
}

export function layerSettingKey(layer: SyntheticRunnableLayer): SyntheticSwitchKey {
  return LAYER_SETTING[layer];
}

export function sortChecks(checks: readonly SyntheticCheckDto[]): SyntheticCheckDto[] {
  return [...checks].sort(
    (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name, 'tr'),
  );
}

/** Katmanın EN SON başlayan çalışması — atlandıysa nedeni başlıkta gösterilir. */
export function lastRunFor(runs: readonly SyntheticLayerRunDto[], layer: SyntheticLayer): SyntheticLayerRunDto | null {
  let latest: SyntheticLayerRunDto | null = null;
  for (const run of runs) {
    if (run.layer !== layer) continue;
    if (!latest || Date.parse(run.startedAt) > Date.parse(latest.startedAt)) latest = run;
  }
  return latest;
}

/** Sayfa/tarayıcı kontrolünde sol paneldeki ad ("Siparişler"); bulunamazsa sunucunun verdiği ad. */
export function checkLabel(
  check: SyntheticCheckDto,
  translate: (key: TranslationKey) => string,
  pages: readonly NavPage[] = NAV_PAGES,
): string {
  if ((check.layer !== 'pages' && check.layer !== 'browser') || !check.path) return check.name;
  const page = resolveNavPage(check.path, pages);
  return (page && translate(page.labelKey)) || check.name;
}
