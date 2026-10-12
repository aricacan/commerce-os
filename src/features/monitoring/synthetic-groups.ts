import type { SyntheticCheckDto, SyntheticCheckStatus, SyntheticLayer } from '../../lib/api';
import type { TranslationKey } from '../../lib/translations/tr';
import { parseWorkspacePath, WORKSPACE_ROUTES } from '../../lib/workspace-routes';
import type { WorkspaceKey } from '../../stores/workspace-panel';
import { NAV_PAGES, resolveNavPage, type NavPage } from './page-map';
import { sortChecks } from './synthetic';

// Sentetik sonuçların MODÜL → İÇ SEKME gruplaması ve süzgeçleri (saf, test edilebilir).
//
// Grup ayrı bir listede TUTULMAZ, kontrolün yolundan türer: "/b2b-outreach/companies" → Radar ›
// Şirketler (workspace-routes.ts), "/invoicing/series" → Faturalama › Fatura serileri
// (nav-groups.ts). Tarayıcı satırı modül/sekmeyi kendisi getirirse o kullanılır.

export const ALL = 'all';
export type LayerFilter = SyntheticLayer | typeof ALL;
export type StatusFilter = SyntheticCheckStatus | typeof ALL;

export interface SyntheticFilters {
  layer: LayerFilter;
  status: StatusFilter;
  /** Grup anahtarı ya da "all". */
  group: string;
}

export const DEFAULT_FILTERS: SyntheticFilters = { layer: ALL, status: ALL, group: ALL };

export interface TabGroup {
  key: string;
  label: string;
  checks: SyntheticCheckDto[];
  failedCount: number;
}

export interface ModuleGroup {
  key: string;
  label: string;
  tabs: TabGroup[];
  total: number;
  failedCount: number;
}

export interface GroupLabels {
  translate: (key: TranslationKey) => string;
  /** Workspace anahtarından modül adı (backend kataloğu); bilinmiyorsa null. */
  moduleName: (workspace: WorkspaceKey) => string | null;
  pages?: readonly NavPage[];
}

const OTHER_GROUP = 'other';
const OTHER_LABEL = 'Genel';
const MODULE_ROOT_TAB = 'Modül';
// Sayfa yoklamasının adı "Radar › Şirketler" biçiminde: sekme adı ayıracın sağında.
const NAME_SEPARATOR = ' › ';

interface Place {
  groupKey: string;
  groupLabel: string;
  tabKey: string;
  tabLabel: string;
}

function isWorkspaceKey(value: string | null | undefined): value is WorkspaceKey {
  return !!value && value in WORKSPACE_ROUTES;
}

function tabLabelFromName(name: string): string | null {
  const index = name.lastIndexOf(NAME_SEPARATOR);
  return index < 0 ? null : name.slice(index + NAME_SEPARATOR.length);
}

/** Aynı yolun (ör. /radar/companies) okunabilir sekme adı: sayfa yoklamasının adından ya da tarayıcı satırından. */
export function buildTabLabels(checks: readonly SyntheticCheckDto[]): Map<string, string> {
  const labels = new Map<string, string>();
  for (const check of checks) {
    if (!check.path || labels.has(check.path)) continue;
    const label = check.layer === 'browser' && check.tab ? check.name : tabLabelFromName(check.name);
    if (label) labels.set(check.path, label);
  }
  return labels;
}

function placeOf(check: SyntheticCheckDto, labels: GroupLabels, tabLabels: Map<string, string>): Place {
  const route = check.path ? parseWorkspacePath(check.path) : null;
  const workspace = isWorkspaceKey(check.module) ? check.module : route?.key ?? null;

  if (workspace) {
    const tab = check.tab ?? route?.section ?? null;
    return {
      groupKey: `ws:${workspace}`,
      groupLabel: labels.moduleName(workspace) ?? workspace,
      tabKey: tab ?? '',
      tabLabel: tab ? (check.path && tabLabels.get(check.path)) || tab : MODULE_ROOT_TAB,
    };
  }

  const page = check.path ? resolveNavPage(check.path, labels.pages ?? NAV_PAGES) : null;
  if (page) {
    const groupKey = page.groupKey ?? page.labelKey;
    return {
      groupKey: `nav:${groupKey}`,
      groupLabel: labels.translate(groupKey),
      tabKey: page.href,
      tabLabel: labels.translate(page.labelKey),
    };
  }

  return { groupKey: OTHER_GROUP, groupLabel: OTHER_LABEL, tabKey: check.layer, tabLabel: OTHER_LABEL };
}

export function filterChecks(checks: readonly SyntheticCheckDto[], filters: SyntheticFilters): SyntheticCheckDto[] {
  return checks.filter((check) =>
    (filters.layer === ALL || check.layer === filters.layer)
    && (filters.status === ALL || check.status === filters.status));
}

/**
 * Kontrolleri modül → sekme olarak gruplar. Bozuk grubu olan modül üstte; sekmeler ve
 * satırlar da "önce bozuk" sıralanır.
 */
export function groupChecksByModule(checks: readonly SyntheticCheckDto[], labels: GroupLabels): ModuleGroup[] {
  const tabLabels = buildTabLabels(checks);
  const modules = new Map<string, { label: string; tabs: Map<string, TabGroup> }>();

  for (const check of checks) {
    const place = placeOf(check, labels, tabLabels);
    const entry = modules.get(place.groupKey) ?? { label: place.groupLabel, tabs: new Map<string, TabGroup>() };
    modules.set(place.groupKey, entry);
    const tab = entry.tabs.get(place.tabKey) ?? { key: place.tabKey, label: place.tabLabel, checks: [], failedCount: 0 };
    entry.tabs.set(place.tabKey, tab);
    tab.checks.push(check);
    if (check.status === 'failed') tab.failedCount++;
  }

  return [...modules].map(([key, entry]) => {
    const tabs = [...entry.tabs.values()]
      .map((tab) => ({ ...tab, checks: sortChecks(tab.checks) }))
      .sort((a, b) => b.failedCount - a.failedCount || a.label.localeCompare(b.label, 'tr'));
    return {
      key,
      label: entry.label,
      tabs,
      total: tabs.reduce((sum, tab) => sum + tab.checks.length, 0),
      failedCount: tabs.reduce((sum, tab) => sum + tab.failedCount, 0),
    };
  }).sort((a, b) => b.failedCount - a.failedCount || a.label.localeCompare(b.label, 'tr'));
}

const FLOW_KEY_PREFIX = 'browser:/flows/';

/**
 * Sekme grubunun İÇİNDE satırın adı: grup zaten "Radar › Şirketler" dediği için satır yalnız
 * NE denendiğini söyler — sayfa verisi mi, tarayıcı mı, hangi senaryo.
 */
export function rowLabel(check: SyntheticCheckDto): string {
  if (check.layer === 'pages') return 'Sayfa verisi (API yoklaması)';
  if (check.layer === 'browser') {
    return check.key.startsWith(FLOW_KEY_PREFIX) ? check.name : 'Tarayıcı: açılış + etkileşim';
  }
  return check.name;
}

/** Süzgeçteki modül seçenekleri (tüm kontrollerden — süzgeç değişince seçenek kaybolmasın). */
export function moduleOptions(groups: readonly ModuleGroup[]): { value: string; label: string }[] {
  return [...groups]
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
    .map((group) => ({ value: group.key, label: group.label }));
}
