import type { OverviewPeriodParams } from '../../lib/api/omnichannel';
import { TASK_STATUS, type CrmTaskDto } from '../../lib/api/customers';
import { OUTBOUND_EMAIL_KIND, type OutboundEmailKind } from '../../lib/api/omnichannel-email-outbound';

// Genel Bakış'ın liste widget'ları (görevler, e-posta) için saf kurallar.

const TURKEY_OFFSET = '+03:00';
const DAY_MS = 86_400_000;
const PERCENT = 100;

// Seçili Türkiye takvim aralığı → UTC an aralığı (from dahil, to hariç). E-posta kaydı bu biçimi ister.
export function toUtcRange(period: OverviewPeriodParams, now: Date = new Date()): { from: string; to: string } {
  if (!period.from || !period.to) return { from: new Date(now.getTime() - period.days * DAY_MS).toISOString(), to: now.toISOString() };
  const start = new Date(`${period.from}T00:00:00${TURKEY_OFFSET}`);
  const end = new Date(`${period.to}T00:00:00${TURKEY_OFFSET}`);
  return { from: start.toISOString(), to: new Date(end.getTime() + DAY_MS).toISOString() };
}

// Açık görevler vadesi en yakın olandan başlar; vadesizler sona. Süresi geçenler doğal olarak en üstte kalır.
export function sortOpenTasks(tasks: CrmTaskDto[]): CrmTaskDto[] {
  return tasks
    .filter((t) => t.status === TASK_STATUS.Open)
    .sort((a, b) => dueTime(a) - dueTime(b));
}

const dueTime = (task: CrmTaskDto) => (task.dueAt ? new Date(task.dueAt).getTime() : Number.POSITIVE_INFINITY);

export const isOverdue = (task: CrmTaskDto, now: Date = new Date()) =>
  task.dueAt !== null && new Date(task.dueAt).getTime() < now.getTime();

// Gönderilen e-postaların başarı yüzdesi (tam sayı). Hiç gönderim yoksa null — %100 uydurulmaz.
export function emailSuccessPercent(sent: number, failed: number): number | null {
  const total = sent + failed;
  return total === 0 ? null : Math.round((sent / total) * PERCENT);
}

export function tasksCaption(tasks: CrmTaskDto[], now: Date = new Date()): string {
  if (tasks.length === 0) return 'Açık göreviniz yok.';
  const overdue = tasks.filter((t) => isOverdue(t, now)).length;
  return overdue > 0 ? `${tasks.length} açık görev, ${overdue} tanesinin vadesi geçti.` : `${tasks.length} açık görev, vadesi geçen yok.`;
}

export const EMAIL_KIND_LABELS: Record<OutboundEmailKind, string> = {
  [OUTBOUND_EMAIL_KIND.Handoff]: 'Devir',
  [OUTBOUND_EMAIL_KIND.Order]: 'Sipariş',
  [OUTBOUND_EMAIL_KIND.Notification]: 'Bildirim',
  [OUTBOUND_EMAIL_KIND.Reply]: 'Cevap',
};
