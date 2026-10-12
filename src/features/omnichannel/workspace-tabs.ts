import {
  Inbox, Bot, FlaskConical, Users, ListTodo, Activity, GraduationCap, Globe,
  LayoutDashboard, ShieldCheck, ShoppingBag, MessageSquare, KanbanSquare, UserCheck, TrendingUp,
} from 'lucide-react';
import type { WorkspaceTab } from '../shared/ModuleWorkspace';

// Üç grup: genel görünüm (Genel: özet + izleme), günlük temsilci işi (Çalışma) ve yapılandırma (Ayarlar).
// Ayarlar iki sayfadır: "Kanallar ve Profiller" (bir kanalın/profilin TÜM ayarı kendi merkezinde) ve
// "Hesap geneli" (kanala bağlı olmayan varsayılanlar + tüm kanallar görünümü). Eski adresler çalışmaya devam eder.
const GENERAL = 'Genel';
const WORK = 'Çalışma';
const SETTINGS = 'Ayarlar';

// Sekme anahtarları adrese aynen yazılır (/omnichannel/account).
export const OMNICHANNEL_TABS = [
  { key: 'overview', label: 'Genel Bakış', Icon: LayoutDashboard, group: GENERAL },
  { key: 'monitor', label: 'İzleme', Icon: Activity, group: GENERAL },

  { key: 'inbox', label: 'Gelen Kutusu', Icon: Inbox, group: WORK },
  { key: 'board', label: 'Pano', Icon: KanbanSquare, group: WORK },
  { key: 'orders', label: 'Siparişler', Icon: ShoppingBag, group: WORK },
  { key: 'handoffs', label: 'Devirler', Icon: Bot, group: WORK },
  { key: 'assignments', label: 'Atananlar', Icon: UserCheck, group: WORK },
  { key: 'customers', label: 'Müşteriler', Icon: Users, group: WORK },
  { key: 'tasks', label: 'Görevler', Icon: ListTodo, group: WORK },
  { key: 'learning', label: 'Öğrenme', Icon: GraduationCap, group: WORK },
  // FAZ 5.4: bizde olmayan ürün/araç talepleri — satın alma listesi.
  { key: 'demand', label: 'Talep Sinyalleri', Icon: TrendingUp, group: WORK },
  { key: 'sandbox', label: 'Test Alanı', Icon: FlaskConical, group: WORK },
  { key: 'quality', label: 'Kalite Merkezi', Icon: ShieldCheck, group: WORK },

  { key: 'channels', label: 'Kanallar ve Profiller', Icon: MessageSquare, group: SETTINGS },
  { key: 'account', label: 'Hesap geneli', Icon: Globe, group: SETTINGS },
] as const satisfies readonly WorkspaceTab[];

export type OmnichannelTabKey = (typeof OMNICHANNEL_TABS)[number]['key'];

export interface SettingsSubPage {
  key: string;
  label: string;
  /** Hesap geneli yan menüsünde başlık altında gruplanır. */
  group?: string;
}

const DEFAULTS_GROUP = 'Varsayılanlar ve kaynaklar';
const ALL_CHANNELS_GROUP = 'Tüm kanallar görünümü';

// Birleşik ayar sayfalarının alt bölümleri. İlk eleman sayfanın varsayılanıdır.
export const SETTINGS_PAGES = {
  channels: [
    { key: 'list', label: 'Kanallar' },
    { key: 'profiles', label: 'Profiller' },
    { key: 'countries', label: 'Ülkeler' },
  ],
  account: [
    { key: 'thresholds', label: 'Bot varsayılanları', group: DEFAULTS_GROUP },
    { key: 'menu', label: 'Menü ve metinler', group: DEFAULTS_GROUP },
    { key: 'bank', label: 'Banka', group: DEFAULTS_GROUP },
    { key: 'ignored', label: 'Yoksayılan numaralar', group: DEFAULTS_GROUP },
    { key: 'alias', label: 'Ürün sözlüğü', group: DEFAULTS_GROUP },
    { key: 'sources', label: 'Veri kaynakları', group: DEFAULTS_GROUP },
    { key: 'fitment', label: 'Araç uyumluluğu', group: DEFAULTS_GROUP },
    { key: 'taxonomy', label: 'Kategori taksonomisi', group: DEFAULTS_GROUP },
    { key: 'connections', label: 'Devir bildirim bağlantıları', group: DEFAULTS_GROUP },
    { key: 'sentemails', label: 'Gönderilen e-postalar', group: DEFAULTS_GROUP },
    { key: 'flags', label: 'Bot bayrakları', group: ALL_CHANNELS_GROUP },
    { key: 'payments', label: 'Ödeme', group: ALL_CHANNELS_GROUP },
    { key: 'orderdest', label: 'Sipariş hedefi', group: ALL_CHANNELS_GROUP },
    { key: 'crosssell', label: 'Çapraz satış', group: ALL_CHANNELS_GROUP },
    { key: 'routing', label: 'Devir kuralları', group: ALL_CHANNELS_GROUP },
  ],
} as const satisfies Record<string, readonly SettingsSubPage[]>;

export type SettingsPageKey = keyof typeof SETTINGS_PAGES;

/** Geçersiz ya da boş alt bölüm sayfanın varsayılanına düşer. */
export function resolveSubPage(page: SettingsPageKey, sub: string | null): string {
  const subs: readonly SettingsSubPage[] = SETTINGS_PAGES[page];
  return subs.find((s) => s.key === sub)?.key ?? subs[0].key;
}

export interface OmnichannelTarget {
  tab: OmnichannelTabKey;
  sub: string | null;
}

// Alt bölüm anahtarı → sahibi sayfa. Eski tekil adresler (/omnichannel/flags) ve eski ?sub= değerleri buradan çözülür.
const SUB_HOMES: Readonly<Record<string, SettingsPageKey>> = Object.fromEntries(
  (Object.keys(SETTINGS_PAGES) as SettingsPageKey[]).flatMap((page) =>
    SETTINGS_PAGES[page].map((sub): [string, SettingsPageKey] => [sub.key, page]),
  ),
);

// Menüden kalkan eski sayfa anahtarları (Bot / Katalog / Kurallar / Altın Set) → yeni yeri. Eski yer imleri, ?tab=
// bağlantıları ve Hesap Sağlığı "Düzelt" düğmeleri (sunucu hâlâ eski anahtarları gönderir) buradan çözülür.
// /omnichannel/gold yolu ayrıca next.config yönlendirmesiyle /omnichannel/quality'e gider (FAZ 7.5).
const REMOVED_PAGES: Readonly<Record<string, OmnichannelTarget>> = {
  gold: { tab: 'quality', sub: null },
  bot: { tab: 'account', sub: 'thresholds' },
  catalog: { tab: 'account', sub: 'sources' },
  rules: { tab: 'account', sub: 'flags' },
};

const TAB_KEYS: readonly string[] = OMNICHANNEL_TABS.map((tab) => tab.key);
const SUB_KEYS = Object.keys(SUB_HOMES).filter((key) => !TAB_KEYS.includes(key));

/** Adresten/`?tab=`'dan gelen anahtarın kabul edilen tüm biçimleri (güncel + eski). */
export const OMNICHANNEL_URL_KEYS: readonly string[] = [...TAB_KEYS, ...Object.keys(REMOVED_PAGES), ...SUB_KEYS];

/**
 * Anahtarı (güncel ya da eski) açılacak sekme + alt bölüme çözer; bilinmeyen anahtar null.
 * Kalkan sayfa anahtarıyla gelen eski `?sub=` değeri (ör. /omnichannel/catalog?sub=profiles) sahibi sayfaya yönlenir.
 */
export function toOmnichannelTarget(key: string, legacySub: string | null = null): OmnichannelTarget | null {
  const removed = REMOVED_PAGES[key];
  if (removed) {
    const home = legacySub === null ? undefined : SUB_HOMES[legacySub];
    return home ? { tab: home, sub: legacySub } : removed;
  }
  const subHome = SUB_HOMES[key];
  if (subHome && !TAB_KEYS.includes(key)) return { tab: subHome, sub: key };
  const tab = OMNICHANNEL_TABS.find((candidate) => candidate.key === key)?.key;
  return tab ? { tab, sub: null } : null;
}
