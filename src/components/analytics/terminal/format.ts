/**
 * Terminal ekranının ortak biçimlendiricileri.
 *
 * EN ÖNEMLİ KURAL burada: `metric()` ölçülemeyen değeri "—" gösterir, ASLA
 * uydurma bir sayı üretmez. Eski ekranın en büyük sorunu, ölçülmemiş doğruluğu
 * ölçülmüş gibi göstermesiydi.
 */

export const TRY = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

export const NUM = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** Ölçülemeyen metrik "—" olur. Sayı uydurmak yasak. */
export function metric(value: number | null | undefined, digits = 1, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${suffix}`;
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `%${value.toFixed(digits)}`;
}

export function compactTry(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return NUM.format(value);
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

/**
 * Durum → Tailwind sınıfı.
 *
 * TASARIM TEZİ: yargı rengi yalnızca yargı için. Nötr veri nötr renkte kalır;
 * yeşil/amber/kırmızı sadece "bantta / uyarı / sorun" der. Borsa terminallerinde
 * her mum kırmızı ya da yeşildir — talepte düşük ciro günü tek başına sorun değil.
 */
export const STATUS_CLASS: Record<string, string> = {
  ok: 'text-success bg-success-soft',
  warn: 'text-warning bg-warning-soft',
  bad: 'text-danger bg-danger-soft',
  neutral: 'text-fg-muted bg-bg-subtle',
};
