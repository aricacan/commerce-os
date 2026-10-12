import { BOT_RUN_MODE, BOT_TURN_OUTCOME } from '../../lib/api/omnichannel-eval';
import { httpStatusOf } from '../../lib/errors';
import type { ChipStyle } from './evalRules';

// Bot tur izinin ve gölge karşılaştırmanın saf kuralları: yol etiketi, sonuç/mod çipi, süre/jeton biçimi,
// "sunucu henüz güncel değil" hatası.

const MS_PER_SECOND = 1000;
const MISSING_ENDPOINT_STATUSES = new Set([404, 405, 501]);

export const SERVER_UPDATE_PENDING_TEXT = 'Sunucu güncelleniyor olabilir; bu bölüm yeni sürüm yayına çıkınca dolacak.';

// Ön yüz backend'den önce yayına çıkar: uç yoksa (404/405) ya da istek hiç ulaşamadıysa sakin boş durum gösterilir.
export function isServerUpdatePending(error: unknown): boolean {
  const status = httpStatusOf(error);
  if (status !== null) return MISSING_ENDPOINT_STATUSES.has(status);
  return error instanceof TypeError;
}

// Anahtarların tek kaynağı backend'deki BotDecisionPath; yeni anahtar eklenirse burada etiketlenir.
const PATH_LABELS: Record<string, string> = {
  'guard.reply_limit': 'Bekçi: cevap sınırı',
  'guard.prompt_attack': 'Bekçi: istem saldırısı',
  'guard.abuse': 'Bekçi: kötüye kullanım',
  'guard.complaint': 'Bekçi: şikâyet',
  'guard.human_request': 'Bekçi: temsilci isteği',
  'guard.feature_disabled': 'Bekçi: özellik kapalı',
  'guard.ai_disabled': 'Bekçi: yapay zekâ kapalı',
  'menu.greeting': 'Menü: karşılama',
  'menu.request': 'Menü: istendi',
  'menu.selection': 'Menü: seçim',
  'menu.option': 'Menü: seçenek akışı',
  'menu.human': 'Menü: temsilci',
  'menu.submenu_repeat': 'Menü: alt menü tekrarı',
  'smalltalk': 'Sohbet',
  'closing': 'Kapanış',
  'faq.shop_location': 'SSS: mağaza konumu',
  'photo.lookup': 'Fotoğrafla ürün arama',
  'media.ack': 'Medya alındı',
  'order.flow': 'Sipariş akışı',
  'order.start': 'Sipariş başlatma',
  'shipping.reference_request': 'Kargo: numara istendi',
  'shipping.reference_retry': 'Kargo: numara tekrar istendi',
  'shipping.lookup': 'Kargo sorgusu',
  'choice.out_of_range': 'Seçim: aralık dışı',
  'choice.declined': 'Seçim: reddedildi',
  'choice.reprompt': 'Seçim: yeniden soruldu',
  'choice.unresolved_handoff': 'Seçim: çözülemedi, devir',
  'choice.followup': 'Seçim: devam',
  'choice.price': 'Seçim: fiyat',
  'vehicle.list': 'Araç: ürün listesi',
  'vehicle.part_search': 'Araç + parça araması',
  'agent.model': 'Model cevabı',
  'agent.outcome_guard': 'Model: sonuç bekçisi',
  'agent.repeat_question': 'Model: tekrar soru engeli',
  'v4.selection': 'v4: liste seçimi',
  'v4.agent': 'v4: ajan cevabı',
  'v4.greeting': 'v4: karşılama menüsü',
  'v4.fact_blocked': 'v4: dayanaksız bilgi engellendi',
  'skip.handed_off': 'Atlandı: temsilcide',
  'error': 'Hata',
};

const PATH_PREFIX_LABELS: Record<string, string> = {
  agent: 'Model',
  guard: 'Bekçi',
  menu: 'Menü',
  choice: 'Seçim',
  order: 'Sipariş',
  shipping: 'Kargo',
  vehicle: 'Araç',
  v4: 'v4',
};

// Bilinen yol → Türkçe etiket; bilinmeyen alt yol "Önek: kalan", hiç bilinmeyen ham anahtar olarak kalır.
export function tracePathLabel(path: string): string {
  if (!path) return '—';
  const exact = PATH_LABELS[path];
  if (exact) return exact;
  const [prefix, ...rest] = path.split('.');
  const prefixLabel = PATH_PREFIX_LABELS[prefix];
  return prefixLabel && rest.length > 0 ? `${prefixLabel}: ${rest.join('.')}` : path;
}

// Araç satırı olarak yazılan bağlam işaretleri (backend BotTraceMarkers) ve tekrar engeli; gerçek araç adları ham kalır.
const TOOL_LABELS: Record<string, string> = {
  'v4.approved_answer': 'Onaylı cevap rehberi',
  'v4.skill': 'Beceri seçimi',
  'v4.duplicate_suppressed': 'Tekrar cevap engellendi',
};

export const traceToolLabel = (name: string): string => TOOL_LABELS[name] ?? name;

const OUTCOME_CHIPS: Record<number, ChipStyle> = {
  [BOT_TURN_OUTCOME.Sent]: { label: 'Gönderildi', tone: 'success' },
  [BOT_TURN_OUTCOME.Handoff]: { label: 'Devredildi', tone: 'warning' },
  [BOT_TURN_OUTCOME.Failed]: { label: 'Başarısız', tone: 'danger' },
  [BOT_TURN_OUTCOME.Skipped]: { label: 'Atlandı', tone: 'neutral' },
  [BOT_TURN_OUTCOME.Silent]: { label: 'Sessiz', tone: 'neutral' },
};

const MODE_CHIPS: Record<number, ChipStyle> = {
  [BOT_RUN_MODE.Live]: { label: 'Canlı', tone: 'info' },
  [BOT_RUN_MODE.Shadow]: { label: 'Gölge', tone: 'bot' },
  [BOT_RUN_MODE.Replay]: { label: 'Tekrar', tone: 'neutral' },
};

export const outcomeChip = (outcome: number): ChipStyle => OUTCOME_CHIPS[outcome] ?? { label: `Sonuç ${outcome}`, tone: 'neutral' };
export const modeChip = (mode: number): ChipStyle => MODE_CHIPS[mode] ?? { label: `Mod ${mode}`, tone: 'neutral' };

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  return ms < MS_PER_SECOND ? `${ms} ms` : `${(ms / MS_PER_SECOND).toFixed(1)} sn`;
}

// "1.800 + 120 jeton"; ikisi de yoksa "—".
export function formatTokens(prompt: number | null, completion: number | null): string {
  if (prompt === null && completion === null) return '—';
  const format = (value: number | null) => (value === null ? '?' : value.toLocaleString('tr-TR'));
  return `${format(prompt)} + ${format(completion)} jeton`;
}

export const formatTraceTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
