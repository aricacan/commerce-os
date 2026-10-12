import type { SharedExpensePart } from '../../types/api';

// Ortak giderin TOPLAMI değiştirildiğinde payların ne olacağını KAYDETMEDEN gösteren
// önizleme hesabı.
//
// Dağıtımı sunucu yapar (SharedExpenseRedistributor.ApplyTotal). Buradaki kopya yalnızca
// ÖNİZLEME içindir; bu yüzden sunucudaki kuralın aynısını uygular — aksi halde kullanıcı
// kaydetmeden önce başka, kaydettikten sonra başka rakam görürdü:
//   • 2 basamağa, yarımlar sıfırdan UZAĞA yuvarlanır,
//   • kuruş artığı EN BÜYÜK paya yazılır,
//   • payların toplamı her zaman TAM olarak girilen toplamı verir.
//
// Hesap kuruş (tam sayı) üzerinden yapılır: 0,1 + 0,2 gibi kayan nokta hataları kuruş
// artığını yanlış paya taşıyabilirdi.

const CENTS = 100;

function toCents(value: number): number {
  return roundHalfAwayFromZero(value * CENTS);
}

function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

// Sunucudaki ExpenseTemplateExpander.DistributeEvenly karşılığı: artık SON paya yazılır.
function distributeEvenlyCents(totalCents: number, parts: number): number[] {
  const each = roundHalfAwayFromZero(totalCents / parts);
  const result = new Array<number>(parts).fill(each);
  result[parts - 1] = totalCents - each * (parts - 1);
  return result;
}

/**
 * Tutarı ağırlıklara (yüzde) göre böler — sunucudaki
 * ExpenseTemplateExpander.DistributeByWeight ile aynı sonuç.
 */
export function distributeByWeight(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];

  const totalCents = toCents(total);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  // Oranlar bir şekilde boşsa (veri hatası) dağıtım çökmez, eşit böler.
  if (weightSum <= 0) return distributeEvenlyCents(totalCents, weights.length).map((c) => c / CENTS);

  const cents = weights.map((weight) => roundHalfAwayFromZero((totalCents * weight) / weightSum));

  let largestIndex = 0;
  for (let i = 1; i < weights.length; i += 1) if (weights[i] > weights[largestIndex]) largestIndex = i;

  cents[largestIndex] += totalCents - cents.reduce((sum, value) => sum + value, 0);

  return cents.map((value) => value / CENTS);
}

/**
 * Grubun paylarını yeni toplama göre yeniden hesaplayıp döndürür. Sıra ve oranlar
 * DEĞİŞMEZ — yalnızca tutarlar güncellenir.
 */
export function previewSharedParts(parts: SharedExpensePart[], newTotal: number): SharedExpensePart[] {
  const amounts = distributeByWeight(
    newTotal,
    parts.map((part) => part.percentage)
  );
  return parts.map((part, index) => ({ ...part, amount: amounts[index] }));
}
