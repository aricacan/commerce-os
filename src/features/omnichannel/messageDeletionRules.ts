import { DELIVERY_STATUS, type MessageDto } from '../../lib/api/omnichannel';
import { describeError, httpStatusOf } from '../../lib/errors';
import { senderKindOf } from './messageSender';

// Başarısız mesajı silmenin saf kuralları.

// Yalnız gönderilemeyen (ör. Meta 24 saat penceresini reddetti) TEMSİLCİ mesajı silinebilir;
// backend de diğerlerine 409 döner.
export function canDeleteMessage(message: MessageDto): boolean {
  return message.deliveryStatus === DELIVERY_STATUS.Failed && senderKindOf(message) === 'agent';
}

const STATUS_CONFLICT = 409;
// Uç olmayan eski backend 404, yöntemi tanımayan 405 döner.
const MISSING_ENDPOINT_STATUSES: ReadonlySet<number> = new Set([404, 405]);

export const DELETE_UNSUPPORTED_MESSAGE = 'Bu sürümde silme yok.';
export const DELETE_NOT_ALLOWED_MESSAGE = 'Yalnız gönderilemeyen temsilci mesajları silinebilir.';

export function describeDeleteError(error: unknown): string {
  const status = httpStatusOf(error);
  if (status !== null && MISSING_ENDPOINT_STATUSES.has(status)) return DELETE_UNSUPPORTED_MESSAGE;
  if (status === STATUS_CONFLICT) return DELETE_NOT_ALLOWED_MESSAGE;
  return describeError(error);
}
