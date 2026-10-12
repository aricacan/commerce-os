import type { ErpisBucket } from '@/lib/api';

// Grafiklerin zaman çözünürlüğü SEÇİLİ TARİH ARALIĞINDAN türetilir.
//
// Kullanıcıya ayrıca "kova" sormak, zaten tarihten belli olan bir şeyi ikinci kez
// sormaktı — ve yanlış seçildiğinde grafik tek noktaya düşüp anlamsızlaşıyordu.
//
// Kural: aralık kaç gün sürüyorsa o kadar dilime böl; dilim sayısı okunabilir bir
// aralıkta kalsın diye eşikler var. "Bu ay" 8 gündür → 8 gün; "son 3 ay" 92 gündür →
// haftalık 13 dilim; "son 1 yıl" → aylık 12 dilim.
const MAX_DAILY_POINTS = 62;
const MAX_WEEKLY_POINTS = 26;

export function resolveErpisBucket(from: string | null, to: string | null): ErpisBucket {
  // Yalnız başlangıç seçiliyse aralık BUGÜNE kadar sayılır ("şu tarihten beri"). Önceden
  // bitiş yok diye "ay"a düşüyordu ve iki haftalık bir dönem trend grafiğinde tek nokta
  // olarak çiziliyordu. Yalnız bitiş seçiliyse başlangıç belirsiz — "ay" doğru varsayılan.
  const days = rangeDays(from, to ?? (from ? todayIso() : null));
  if (days === null) return 'month';

  if (days <= MAX_DAILY_POINTS) return 'day';
  if (days <= MAX_WEEKLY_POINTS * 7) return 'week';
  return 'month';
}

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Grafik başlığında gösterilen çözünürlük adı — kullanıcı neyin çizildiğini bilsin.
export function erpisBucketLabel(bucket: ErpisBucket): string {
  return { day: 'Günlük', week: 'Haftalık', month: 'Aylık', year: 'Yıllık' }[bucket];
}

export function rangeDays(from: string | null | undefined, to: string | null | undefined): number | null {
  if (!from || !to) return null;

  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

// "2026-09-03" → "3 Eyl", "2026-09" → "Eyl 26", "2026" → "2026".
//
// Eksen etiketleri ham kova anahtarıyla ("2026-09-03") okunmuyordu; kısa ve yerel
// biçim, dar bir eksende çok daha fazla nokta sığdırıyor.
export function formatBucketLabel(bucket: string): string {
  const parts = bucket.split('-');

  if (parts.length === 3) {
    const date = new Date(bucket);
    return Number.isNaN(date.getTime())
      ? bucket
      : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  }

  if (parts.length === 2) {
    const date = new Date(`${bucket}-01`);
    return Number.isNaN(date.getTime())
      ? bucket
      : date.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
  }

  return bucket;
}
