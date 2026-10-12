import DOMPurify from 'dompurify';

// E-posta gövdeleri (gelen/giden) HTML içerir: tablo, inline stil, <img>, link.
// DOMPurify'ın varsayılan/HTML profili <script>, tüm on* handler (onerror/onload/...)
// ve javascript: URL'leri temizler; <img>/link/tablo/inline CSS korunur — böylece
// "e-postayı görüntüle" deneyimi bozulmadan XSS betik çalıştırma yolları kapanır.
// Anchor'lara güvenli target/rel zorlanır (sekme-jacking'e karşı).
// ÖNEMLİ: addHook yalnız TARAYICIDA çağrılır. Sunucu prerender'ında (window yok) DOMPurify
// varsayılan örneği addHook içermez ve modül-seviyesi çağrı build'i kırardı (sanitize zaten
// yalnız client'ta çalıştığı için sunucuda hook'a gerek yok).
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export function sanitizeEmailHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  // DOMPurify tarayıcı DOM'u ister. Bu sink'ler yalnız client state dolunca render
  // edildiğinden sunucuda buraya girilmez; yine de güvenli tarafta kalırız.
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}
