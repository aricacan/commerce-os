import {
  FOLLOW_UP_KIND,
  FOLLOW_UP_STATUS,
  type FollowUpTaskDto,
} from '../../lib/api/omnichannel-follow-ups';

// Takip görevlerinin saf kuralları: etiketler, rozet renkleri, izinli işlemler, zaman biçimi.
// Asıl yetki/durum kontrolü sunucuda; buradaki bayraklar yalnız gereksiz düğmeyi gizler.

const KIND_LABELS: Record<number, string> = {
  [FOLLOW_UP_KIND.AgentReplyOverdue]: 'Temsilci gecikmesi',
  [FOLLOW_UP_KIND.CustomerSilent]: 'Müşteri sessiz',
  [FOLLOW_UP_KIND.OrderIncomplete]: 'Yarım sipariş',
  [FOLLOW_UP_KIND.OrderUnconfirmed]: 'Onaysız sipariş',
  [FOLLOW_UP_KIND.PaymentPending]: 'Ödeme bekliyor',
};

const STATUS_LABELS: Record<number, string> = {
  [FOLLOW_UP_STATUS.Pending]: 'Bekliyor',
  [FOLLOW_UP_STATUS.Sent]: 'Gönderildi',
  [FOLLOW_UP_STATUS.Skipped]: 'Atlandı',
  [FOLLOW_UP_STATUS.Cancelled]: 'İptal',
  [FOLLOW_UP_STATUS.Expired]: 'Süresi doldu',
  [FOLLOW_UP_STATUS.NeedsAgent]: 'Temsilci onayı bekliyor',
};

const NEUTRAL = 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]';
const AMBER = 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
const BLUE = 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
const GREEN = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';

const STATUS_CLASSES: Record<number, string> = {
  [FOLLOW_UP_STATUS.Pending]: BLUE,
  [FOLLOW_UP_STATUS.Sent]: GREEN,
  [FOLLOW_UP_STATUS.Skipped]: NEUTRAL,
  [FOLLOW_UP_STATUS.Cancelled]: NEUTRAL,
  [FOLLOW_UP_STATUS.Expired]: NEUTRAL,
  [FOLLOW_UP_STATUS.NeedsAgent]: AMBER,
};

const OUTCOME_LABELS: Record<string, string> = {
  sent: 'Müşteriye gönderildi',
  notified: 'Ekip uyarıldı',
  window_closed: 'Platform penceresi kapalı — şablon/temsilci gerekir',
  auto_send_off: 'Otomatik gönderim kapalı',
  agent_owns: 'Konuşma temsilcide',
  daily_cap: 'Günlük sınır',
  weekly_cap: 'Haftalık sınır',
  window_expired: 'Pencere tamamen kapandı',
  opt_out: 'Müşteri takibi reddetti',
  customer_replied: 'Müşteri yazdı',
  stage_changed: 'Aşama değişti',
  expired: 'Süresi doldu',
  agent_cancelled: 'Temsilci iptal etti',
  agent_sent: 'Temsilci gönderdi',
  nothing_to_say: 'Söylenecek bir şey kalmadı',
  pilot_mode: 'Pilot modu — temsilci onayı gerekir',
  send_failed: 'Gönderim başarısız oldu',
  not_sent: 'Mesaj gönderilemedi',
  dispatch_error: 'İşlenirken hata oluştu',
  sandbox: 'Test alanı',
  conversation_gone: 'Konuşma yok',
};

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const followUpKindLabel = (kind: number): string => KIND_LABELS[kind] ?? 'Takip';
export const followUpStatusLabel = (status: number): string => STATUS_LABELS[status] ?? 'Bilinmiyor';
export const followUpStatusClass = (status: number): string => STATUS_CLASSES[status] ?? NEUTRAL;

// Bilinmeyen kod ham gösterilir; boş sonuç için null.
export function followUpOutcomeLabel(outcome: string | null): string | null {
  if (!outcome) return null;
  return OUTCOME_LABELS[outcome] ?? outcome;
}

export interface FollowUpActionFlags {
  cancel: boolean;
  complete: boolean;
  showSuggestedText: boolean;
}

export function followUpActionFlags(task: Pick<FollowUpTaskDto, 'status' | 'suggestedText'>): FollowUpActionFlags {
  const needsAgent = task.status === FOLLOW_UP_STATUS.NeedsAgent;
  return {
    cancel: needsAgent || task.status === FOLLOW_UP_STATUS.Pending,
    complete: needsAgent,
    showSuggestedText: needsAgent && !!task.suggestedText,
  };
}

// "≈ 2 sa sonra" / "≈ 15 dk sonra" / "şimdi" (vakti geçmiş ya da 1 dk'dan az).
export function formatDueIn(dueAt: string, now: number): string {
  const due = Date.parse(dueAt);
  if (Number.isNaN(due)) return '';
  const minutes = Math.round((due - now) / MS_PER_MINUTE);
  if (minutes < 1) return 'şimdi';
  if (minutes < MINUTES_PER_HOUR) return `≈ ${minutes} dk sonra`;
  const hours = Math.round(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return `≈ ${hours} sa sonra`;
  return `≈ ${Math.round(hours / HOURS_PER_DAY)} gün sonra`;
}

// Görev satırının zaman metni: bekleyenlerde vade, diğerlerinde yerel tarih-saat.
export function followUpTimeLabel(task: FollowUpTaskDto, now: number): string {
  if (task.status === FOLLOW_UP_STATUS.Pending) return formatDueIn(task.dueAt, now);
  const at = Date.parse(task.completedAt ?? task.dueAt);
  if (Number.isNaN(at)) return '';
  return new Date(at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Katlı başlığın tek satırlık özeti: önce onay bekleyen, yoksa ilk bekleyen, yoksa ilk görev.
// Örn. "Müşteri sessiz · ≈ 3 sa sonra".
export function followUpsHeadline(tasks: FollowUpTaskDto[], now: number): string {
  const lead = tasks.find((t) => t.status === FOLLOW_UP_STATUS.NeedsAgent)
    ?? tasks.find((t) => t.status === FOLLOW_UP_STATUS.Pending)
    ?? tasks[0];
  if (!lead) return '';
  const detail = lead.status === FOLLOW_UP_STATUS.Pending
    ? formatDueIn(lead.dueAt, now)
    : followUpStatusLabel(lead.status);
  return `${followUpKindLabel(lead.kind)} · ${detail}`;
}
