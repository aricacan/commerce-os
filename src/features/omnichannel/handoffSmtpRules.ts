// Devir SMTP kartının saf kuralları (ekrandan bağımsız, test edilir).

const HEX_PAIR_LENGTH = 2;
const SHA256_HEX_LENGTH = 64;
const FINGERPRINT_SEPARATORS = /[\s:-]/g;

// Boşluk, iki nokta ve tire tolere edilir; 64 haneli hex değilse null. Backend ile aynı kural.
export function normalizeFingerprint(input: string): string | null {
  const cleaned = input.replace(FINGERPRINT_SEPARATORS, '').toUpperCase();
  return new RegExp(`^[0-9A-F]{${SHA256_HEX_LENGTH}}$`).test(cleaned) ? cleaned : null;
}

// "AB12…" → "AB:12:…" (Plesk / tarayıcı sertifika ekranındaki gösterim).
export function formatFingerprint(hex: string): string {
  return (hex.match(new RegExp(`.{1,${HEX_PAIR_LENGTH}}`, 'g')) ?? []).join(':');
}

// Boş alan geçerlidir (tam doğrulama); doluysa geçerli bir SHA-256 olmalı.
export function fingerprintDraftError(input: string): string | null {
  if (!input.trim()) return null;
  return normalizeFingerprint(input) ? null : 'Parmak izi 64 haneli SHA-256 olmalı (ör. AB:CD:…).';
}
