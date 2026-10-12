import type { AgentConsultationDto } from '../../lib/api/omnichannel-consult';
import { httpStatusOf, describeError } from '../../lib/errors';

// Temsilci Danışma kartının saf kuralları: geri sayım ve cevap hatalarının sınıflandırılması.

// Backend AgentConsultationRules.InstructionMaxLength ile aynı.
export const CONSULT_INSTRUCTION_MAX_LENGTH = 500;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECOND_DIGITS = 2;
// Cevap verildikten sonra "müşteriye gitti" onayı bu kadar görünür kalır.
export const CONSULT_SENT_NOTICE_MS = 8000;

export function consultRemainingMs(expiresAt: string, now: number): number {
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

// 9:42 biçimi. Süre dolduysa 0:00.
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / MS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = String(totalSeconds % SECONDS_PER_MINUTE).padStart(SECOND_DIGITS, '0');
  return `${minutes}:${seconds}`;
}

export interface ConsultAutoReply {
  at: string;
  labelTr: string;
}

// Temsilci seçmezse botun kendisi göndereceği seçenek. Zamanlayıcı yoksa (devir sonrası, ayar kapalı, eski
// backend) ya da seçenek bulunamazsa null: kartta bilgi gösterilmez.
export function consultAutoReplyOf(consultation: AgentConsultationDto): ConsultAutoReply | null {
  const { autoReplyAt, autoReplyOptionIndex } = consultation;
  if (!autoReplyAt || autoReplyOptionIndex == null) return null;
  const option = consultation.options.find((o) => o.index === autoReplyOptionIndex);
  return option ? { at: autoReplyAt, labelTr: option.labelTr } : null;
}

// 'gone': kart artık yok (zaten cevaplanmış / süresi dolmuş / erişim yok) — kart kapanır.
// Diğerleri kartı AÇIK bırakır, temsilci yeniden dener ya da başka yol seçer.
export type ConsultFailureKind = 'gone' | 'rejected' | 'unavailable' | 'other';

export interface ConsultFailure {
  kind: ConsultFailureKind;
  message: string;
}

const GONE_STATUSES: ReadonlySet<number> = new Set([403, 404, 409]);
const STATUS_REJECTED = 422;
const STATUS_UNAVAILABLE = 503;

export const CONSULT_GONE_MESSAGE = 'Bu soru artık açık değil: başkası cevaplamış ya da süresi dolmuş.';
const REJECTED_MESSAGE = 'Güvenli bir cevap üretilemedi; talimatı daha açık yazın ya da bir seçenek seçin.';
const UNAVAILABLE_MESSAGE = 'Cevap şu an hazırlanamıyor; tekrar deneyin ya da bir seçenek seçin.';

export function classifyConsultError(error: unknown): ConsultFailure {
  const status = httpStatusOf(error);
  if (status !== null && GONE_STATUSES.has(status)) return { kind: 'gone', message: CONSULT_GONE_MESSAGE };
  if (status === STATUS_REJECTED) return { kind: 'rejected', message: REJECTED_MESSAGE };
  if (status === STATUS_UNAVAILABLE) return { kind: 'unavailable', message: UNAVAILABLE_MESSAGE };
  return { kind: 'other', message: describeError(error) };
}
