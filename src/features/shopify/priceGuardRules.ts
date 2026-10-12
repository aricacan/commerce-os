import { describeError, httpStatusOf } from '../../lib/errors';
import type { ShopifyWriteResultDto } from '../../lib/api/shopify-explorer';

// Fiyat güvenlik eşiği (mağaza ayarı) — saf kurallar. Asıl karar sunucuda (ShopifyPriceChangeRules).

export const GUARD_MIN_PERCENT = 1;
export const GUARD_MAX_PERCENT = 1000;
const HTTP_CONFLICT = 409;
// Sunucunun onay isteyen 409 mesajında geçen sabit ifade (diğer 409'lardan ayırır).
const GUARD_MESSAGE_MARKER = 'güvenlik eşiğini aşıyor';

// "" → null (kapalı); geçerli yüzde → sayı; geçersiz → undefined.
export function parseGuardPercent(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  const valid = Number.isInteger(value) && value >= GUARD_MIN_PERCENT && value <= GUARD_MAX_PERCENT;
  return valid ? value : undefined;
}

export function isPriceGuardRejection(error: unknown): boolean {
  return httpStatusOf(error) === HTTP_CONFLICT && describeError(error).includes(GUARD_MESSAGE_MARKER);
}

export type PriceGuardConfirmation = (message: string) => Promise<boolean>;

const DECLINED: ShopifyWriteResultDto = { applied: false, id: null, errors: ['Fiyat değişimi onaylanmadı; hiçbir şey yazılmadı.'] };

// Yazmayı dener; sunucu eşik aşımı için onay isterse kullanıcıya sorar, onaylarsa onayla yeniden gönderir.
export async function writeWithPriceGuard(
  write: (confirmLargePriceChange: boolean) => Promise<ShopifyWriteResultDto>,
  ask: PriceGuardConfirmation,
): Promise<ShopifyWriteResultDto> {
  try {
    return await write(false);
  } catch (error) {
    if (!isPriceGuardRejection(error)) throw error;
    return (await ask(describeError(error))) ? write(true) : DECLINED;
  }
}
