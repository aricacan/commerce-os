import {
  HANDOFF_OUTCOME, HANDOFF_OUTCOME_LABELS, HANDOFF_STATUS, HANDOFF_STATUS_LABELS,
  type HandoffOutcome, type HandoffStatus, type HandoffTicketDto,
} from '../../lib/api/handoff';
import type { BadgeTone } from '../shared/design';

// Devir v2 (FAZ 7) saf kuralları: hangi işlem hangi durumda açık, SLA geri sayımı, durum etiketi.
// Backend kuralının (HandoffStateMachine) ön yüz aynası — düğmeler geçersiz geçişi hiç önermesin.

const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
// Vadeye bu kadar dakika kala geri sayım uyarı rengine döner.
export const SLA_SOON_MINUTES = 10;

export const isOpenStatus = (status: HandoffStatus) => status !== HANDOFF_STATUS.Resolved;

const AWAITING_AGENT: readonly HandoffStatus[] = [HANDOFF_STATUS.Requested, HANDOFF_STATUS.Open, HANDOFF_STATUS.Assigned];

export interface HandoffActions {
  canTakeOver: boolean;
  canToggleWaiting: boolean;
  canResolve: boolean;
}

// "Üstlen": temsilci henüz işe başlamadıysa ya da kayıt başkasındaysa. "Müşteri bekleniyor": iş başladıktan sonra.
export function handoffActions(ticket: Pick<HandoffTicketDto, 'status' | 'assigneeUserId'>, myId: number | null): HandoffActions {
  const open = isOpenStatus(ticket.status);
  const mine = myId !== null && ticket.assigneeUserId === myId;
  return {
    canTakeOver: open && (AWAITING_AGENT.includes(ticket.status) || !mine),
    canToggleWaiting: open && !AWAITING_AGENT.includes(ticket.status),
    canResolve: open,
  };
}

// "Çözüldü" kaydında sonucu göster ("Bota geri verildi"); açık kayıtta durum etiketi. Bilinmeyen (yeni backend)
// durum boş etiket yerine sayıyla görünmesin diye "Açık" yazılır.
export function statusLabel(ticket: Pick<HandoffTicketDto, 'status' | 'resolutionOutcome'>): string {
  if (ticket.status === HANDOFF_STATUS.Resolved && ticket.resolutionOutcome != null) {
    return HANDOFF_OUTCOME_LABELS[ticket.resolutionOutcome as HandoffOutcome] ?? HANDOFF_STATUS_LABELS[ticket.status];
  }
  return HANDOFF_STATUS_LABELS[ticket.status] ?? 'Açık';
}

// Durum çipinin tonu: insan bekleyen iş uyarı, üzerinde çalışılan bilgi, müşteri bekleyen nötr, çözülen başarı.
const STATUS_TONE: Record<HandoffStatus, BadgeTone> = {
  [HANDOFF_STATUS.Requested]: 'warning',
  [HANDOFF_STATUS.Open]: 'warning',
  [HANDOFF_STATUS.Assigned]: 'info',
  [HANDOFF_STATUS.InProgress]: 'info',
  [HANDOFF_STATUS.WaitingCustomer]: 'neutral',
  [HANDOFF_STATUS.Resolved]: 'success',
};

export const statusTone = (status: HandoffStatus): BadgeTone => STATUS_TONE[status] ?? 'neutral';

export type SlaState = 'none' | 'ok' | 'soon' | 'overdue';

export interface SlaCountdown {
  state: SlaState;
  // "12 dk kaldı" / "1 sa 5 dk gecikti".
  label: string;
}

export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < HOUR_MINUTES) return `${minutes} dk`;
  const hours = Math.floor(minutes / HOUR_MINUTES);
  const rest = minutes % HOUR_MINUTES;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

// İlk cevap SLA geri sayımı. Vade yoksa (SLA tanımsız ya da temsilci cevap verdi) gösterilmez.
export function slaCountdown(dueAt: string | null | undefined, breachedAt: string | null | undefined, nowMs: number): SlaCountdown {
  if (!dueAt) return breachedAt ? { state: 'overdue', label: 'Süre aşıldı' } : { state: 'none', label: '' };
  const remaining = (Date.parse(dueAt) - nowMs) / MINUTE_MS;
  if (remaining <= 0 || breachedAt) return { state: 'overdue', label: `${formatMinutes(-remaining)} gecikti` };
  return { state: remaining <= SLA_SOON_MINUTES ? 'soon' : 'ok', label: `${formatMinutes(remaining)} kaldı` };
}

// "Ne zamandır bekliyor": devir anından bu yana.
export const waitingLabel = (sinceIso: string, nowMs: number) => formatMinutes((nowMs - Date.parse(sinceIso)) / MINUTE_MS);

export const RESOLVE_OUTCOMES: readonly { value: HandoffOutcome; label: string; hint: string }[] = [
  { value: HANDOFF_OUTCOME.Solved, label: 'Çözüldü', hint: 'Konuşma çözülür; müşteri yeniden yazarsa bot kanal ayarına göre döner.' },
  { value: HANDOFF_OUTCOME.ReturnedToBot, label: 'Bota geri ver', hint: 'Bot hemen devralır; konuşmanın bağlamı korunur.' },
  { value: HANDOFF_OUTCOME.Closed, label: 'Kapat', hint: 'İş yok (yanlış devir, spam, vazgeçti): konuşma kapanır.' },
];
