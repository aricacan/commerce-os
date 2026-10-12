// Pazaryeri rozet renkleri — TEK kaynak. Öncesinde 4 dosyada ayrı ayrı tanımlıydı ve
// aynı platform sayfaya göre FARKLI renkte görünüyordu (Trendyol: #ff6600 / #f27a1a /
// #f97316 — üç ayrı turuncu). Bunlar marka rengidir, tema token'ı DEĞİLDİR — dark modda
// da aynı kalmalı (Trendyol turuncusu her yerde Trendyol turuncusu olmalı).
//
// Anahtarlar küçük harfle normalize edilir — çağıran taraf 'Trendyol', 'TRENDYOL' veya
// 'trendyol' yazsın fark etmez.
const PLATFORM_COLORS: Record<string, string> = {
  trendyol: 'var(--platform-trendyol)',
  hepsiburada: 'var(--platform-hepsiburada)',
  amazon: 'var(--platform-amazon)',
  sentos: 'var(--platform-sentos)',
  n11: 'var(--platform-n11)',
  gittigidiyor: 'var(--platform-gittigidiyor)',
  pazarama: 'var(--platform-pazarama)',
  çiçeksepeti: 'var(--platform-ciceksepeti)',
  ciceksepeti: 'var(--platform-ciceksepeti)',
};

const FALLBACK_COLOR = 'var(--accent)';

export function platformColor(name: string | null | undefined): string {
  if (!name) return FALLBACK_COLOR;
  return PLATFORM_COLORS[name.toLocaleLowerCase('tr')] ?? FALLBACK_COLOR;
}

/**
 * Bilinmeyen platform için `null` döner (sabit fallback yerine) — grafik lejantları gibi
 * bilinmeyenleri kendi paletinden döngüsel renklendiren çağıranlar için.
 */
export function platformColorOrNull(name: string | null | undefined): string | null {
  if (!name) return null;
  return PLATFORM_COLORS[name.toLocaleLowerCase('tr')] ?? null;
}

/**
 * Alt-dize eşleşmesiyle arar (ör. "Trendyol Express" → trendyol rengini bulur).
 * Tam eşleşme yeterliyse `platformColor()` kullan.
 */
export function platformColorFuzzy(name: string | null | undefined): string {
  if (!name) return FALLBACK_COLOR;
  const key = name.toLocaleLowerCase('tr');
  for (const [k, v] of Object.entries(PLATFORM_COLORS)) {
    if (key.includes(k)) return v;
  }
  return FALLBACK_COLOR;
}
