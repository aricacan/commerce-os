// Backend OldOrderCompletionPolicy ile AYNI sınırlar (sunucu yine de doğrular).
export const OLD_ORDER_DEFAULT_DAYS = 90;
export const OLD_ORDER_MIN_DAYS = 30;
export const AUTO_COMPLETE_DISABLED = 0;

/** Kutudaki metni gün sayısına çevirir; geçersizse (boş, ondalık, 30'dan küçük) null. */
export function parseDays(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const days = Number(input);
  return days >= OLD_ORDER_MIN_DAYS ? days : null;
}

export function autoCompleteLabel(days: number): string {
  return days === AUTO_COMPLETE_DISABLED ? 'Kapalı' : `${days} günden eski siparişler her gün tamamlanır`;
}
