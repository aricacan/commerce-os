'use client';

// Bayrak emojisi (🇹🇷/🇬🇧) Windows'ta çoğu tarayıcıda flag glyph'i olmadığı için
// düz "TR"/"GB" harfleriyle render ediliyor. SVG ikon platformdan bağımsız aynı görünür.
const FLAGS = {
  TR: (
    <svg viewBox="0 0 3 2" role="img" aria-label="Türkiye">
      <rect width="3" height="2" fill="#e30a17" />
      <circle cx="1.1" cy="1" r="0.5" fill="#fff" />
      <circle cx="1.25" cy="1" r="0.4" fill="#e30a17" />
      <path
        fill="#fff"
        d="M1.55,1 L1.98,0.85 L1.7,1.19 L1.7,0.81 L1.98,1.15 Z"
      />
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 60 30" role="img" aria-label="Birleşik Krallık">
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 60,30 M60,0 0,30" stroke="#c8102e" strokeWidth="2" />
      <path d="M30,0 30,30 M0,15 60,15" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 30,30 M0,15 60,15" stroke="#c8102e" strokeWidth="6" />
    </svg>
  ),
  // Kosova: mavi zemin, altın harita silueti, altı beyaz yıldız (sadeleştirilmiş).
  XK: (
    <svg viewBox="0 0 84 60" role="img" aria-label="Kosova">
      <rect width="84" height="60" fill="#244aa5" />
      <path d="M33,24 L40,21 L47,23 L52,29 L50,36 L45,42 L38,43 L33,38 L31,31 Z" fill="#d0a650" />
      {[18, 26, 34, 42, 50, 58].map((x, i) => (
        <circle key={x} cx={x + 4} cy={i === 0 || i === 5 ? 17 : 13} r="2.4" fill="#fff" />
      ))}
    </svg>
  ),
} as const;

// Uygulamadaki ülke kodları ISO değil ("UK", "KS") — bayrak eşlemesi burada.
const CODE_ALIASES: Record<string, keyof typeof FLAGS> = { TR: 'TR', GB: 'GB', UK: 'GB', XK: 'XK', KS: 'XK' };

export function CountryFlag({ code, size = 24 }: { code: string; size?: number }) {
  const flag = CODE_ALIASES[code.toUpperCase()];
  if (!flag) return null;
  return (
    <span style={{ display: 'inline-flex', width: size, height: size * 0.67, borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
      {FLAGS[flag]}
    </span>
  );
}
