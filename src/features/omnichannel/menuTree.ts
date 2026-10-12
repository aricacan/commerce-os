import { BOT_MENU_ACTION, type BotMenuAction, type BotMenuOptionDto, type CustomerLanguageCode } from '../../lib/api/omnichannel';

// Menü ağacı üzerindeki saf işlemler. Sunucu tek seviye alt menüye izin verir
// (BotMenuService.ValidateTree); buradaki işlemler de yalnız bunu üretir.

export const ACTION_TITLES: Record<BotMenuAction, string> = {
  [BOT_MENU_ACTION.Stock]: 'Stok akışı',
  [BOT_MENU_ACTION.Fitment]: 'Araç uyumluluğu',
  [BOT_MENU_ACTION.Shipping]: 'Sipariş / kargo takibi',
  [BOT_MENU_ACTION.Price]: 'Fiyat bilgisi',
  [BOT_MENU_ACTION.Human]: 'Temsilciye devir',
  [BOT_MENU_ACTION.Info]: 'Sabit cevap',
  [BOT_MENU_ACTION.Submenu]: 'Alt menü',
};

// Panelde eklenip silinebilen türler; araç akışları koddan gelir, yalnız düzenlenir.
export const isCustomAction = (action: BotMenuAction) =>
  action === BOT_MENU_ACTION.Info || action === BOT_MENU_ACTION.Submenu;

const ID_LENGTH = 12;
const HEX_RADIX = 16;

// crypto.randomUUID yalnız güvenli bağlamda (HTTPS/localhost) var; LAN'dan HTTP ile açılan
// panelde getRandomValues ile aynı biçimde kimlik üretilir.
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().replace(/-/g, '').slice(0, ID_LENGTH);
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH / 2));
  return Array.from(bytes, (b) => b.toString(HEX_RADIX).padStart(2, '0')).join('');
}

// Eski kayıtlarda kimlik yoksa istemci üretir: alt menü bağı ve sıralama kimlikle yapılır.
export const withIds = (options: BotMenuOptionDto[]) =>
  options.map((o) => (o.id ? o : { ...o, id: newId() }));

export const level = (options: BotMenuOptionDto[], parentId: string | null) =>
  options.filter((o) => (o.parentId ?? null) === parentId).sort((a, b) => a.order - b.order);

export const activeLevel = (options: BotMenuOptionDto[], parentId: string | null) =>
  level(options, parentId).filter((o) => o.isActive);

export function labelFor(option: BotMenuOptionDto, language: CustomerLanguageCode): string {
  if (language === 'tr') return option.labelTr;
  if (language === 'sq') return option.labelSq || option.labelEn;
  return option.labelEn;
}

// Aynı seviyede bir yukarı/aşağı taşır (sıra numaraları yer değiştirir).
export function move(options: BotMenuOptionDto[], id: string, direction: -1 | 1): BotMenuOptionDto[] {
  const target = options.find((o) => o.id === id);
  if (!target) return options;
  const siblings = level(options, target.parentId ?? null);
  const index = siblings.findIndex((o) => o.id === id);
  const other = siblings[index + direction];
  if (!other) return options;
  return options.map((o) => {
    if (o.id === target.id) return { ...o, order: other.order };
    if (o.id === other.id) return { ...o, order: target.order };
    return o;
  });
}

const nextOrder = (options: BotMenuOptionDto[], parentId: string | null) =>
  level(options, parentId).reduce((max, o) => Math.max(max, o.order), 0) + 1;

function blankInfo(order: number, parentId: string | null): BotMenuOptionDto {
  return {
    id: newId(), parentId, action: BOT_MENU_ACTION.Info, order, isActive: true,
    labelTr: 'Yeni seçenek', labelEn: 'New option', labelSq: null,
    triggersTr: [], triggersEn: [], triggersSq: [],
    replyTr: '', replyEn: '', replySq: null,
  };
}

export const addInfo = (options: BotMenuOptionDto[], parentId: string | null) =>
  [...options, blankInfo(nextOrder(options, parentId), parentId)];

// Alt menü boş kaydedilemez (sunucu reddeder); bir alt seçenekle birlikte açılır.
export function addSubmenu(options: BotMenuOptionDto[]): BotMenuOptionDto[] {
  const submenu: BotMenuOptionDto = {
    ...blankInfo(nextOrder(options, null), null),
    action: BOT_MENU_ACTION.Submenu, labelTr: 'Yeni alt menü', labelEn: 'New submenu',
    replyTr: null, replyEn: null,
  };
  return [...options, submenu, blankInfo(1, submenu.id ?? null)];
}

// Alt menü silinince altındakiler de gider.
export const remove = (options: BotMenuOptionDto[], id: string) =>
  options.filter((o) => o.id !== id && o.parentId !== id);

// Alt menü boş kaydedilemez (sunucu reddeder): alt menünün son seçeneği silinemez —
// gerekiyorsa alt menünün kendisi silinir.
export function canRemove(options: BotMenuOptionDto[], id: string): boolean {
  const target = options.find((o) => o.id === id);
  if (!target?.parentId) return true;
  return level(options, target.parentId).length > 1;
}
