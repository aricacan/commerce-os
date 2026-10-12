'use client';

import type { CSSProperties } from 'react';

// Lüks, temiz cam morfolojisi ve yumuşak kurumsal kenarlıklar
export const cardStyle: CSSProperties = {
  background: 'var(--card, #ffffff)',
  border: '1px solid var(--border, #e5e7eb)',
  borderRadius: 16,
  boxShadow: 'var(--shadow-xs)',
  overflow: 'hidden',
  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

export const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px 18px',
  fontSize: 'var(--text-ui-xs)',
  fontWeight: 700,
  color: 'var(--fg-muted, var(--fg-muted))',
  borderBottom: '1px solid var(--border, #e5e7eb)',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: '14px 18px',
  fontSize: 'var(--text-ui-sm)',
  color: 'var(--fg, #111827)',
  borderBottom: '1px solid var(--border-soft, #f3f4f6)',
  verticalAlign: 'middle',
  transition: 'all 0.2s ease',
};

// Sorgu isError durumunda tablo hücrelerinde gösterilen hata satırı
export const errorTdStyle: CSSProperties = {
  ...tdStyle,
  color: 'var(--danger)',
  fontWeight: 600,
  background: 'rgba(var(--danger-rgb), 0.02)',
};

export const statTileStyle: CSSProperties = {
  ...cardStyle,
  flex: '1 1 160px',
  minWidth: 160,
  padding: '18px 22px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  position: 'relative',
  cursor: 'default',
};

export const paginationBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 10,
  padding: '12px 18px',
  background: 'var(--card)',
  borderTop: '1px solid var(--border-soft)',
};

export const pageBtnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 10,
  border: '1px solid var(--border, #e2e8f0)',
  background: 'var(--card, #ffffff)',
  color: 'var(--fg, #334155)',
  fontSize: 'var(--text-ui-sm)',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
};

// Sekme filtre satırındaki text/select girdileri
const filterInputStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--border, #e2e8f0)',
  background: 'var(--card, #ffffff)',
  color: 'var(--fg, #334155)',
  fontSize: 'var(--text-ui-sm)',
  minWidth: 180,
  outline: 'none',
  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
};

export const filterSelectStyle: CSSProperties = {
  ...filterInputStyle,
  minWidth: 150,
  cursor: 'pointer',
  paddingRight: '24px',
};

// Hata seviyesi rozetleri (exceptions / slow-requests).
// Error ve Critical AYNI görsel ağırlıkta: ikisi de --danger. Eskiden yalnızca %2 alfa
// farkı vardı, yani gözle ayırt edilemiyordu ama iki ayrı ton varmış gibi duruyordu —
// ayrımı etiket taşır, renk değil.
const LEVEL_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  Warning: { bg: 'rgba(var(--warning-rgb), 0.08)', color: 'var(--warning)', label: 'Uyarı' },
  Error: { bg: 'rgba(var(--danger-rgb), 0.08)', color: 'var(--danger)', label: 'Hata' },
  Critical: { bg: 'rgba(var(--danger-rgb), 0.08)', color: 'var(--danger)', label: 'Kritik' },
};

export function levelStyle(level: string) {
  return LEVEL_STYLES[level] ?? { bg: 'rgba(var(--fg-muted-rgb), 0.08)', color: 'var(--fg-muted)', label: level };
}

// Şık, canlı pulsing durum halkalı rozet bileşeni
export function Badge({ bg, color, label, pulse = true }: { bg: string; color: string; label: string; pulse?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 99,
        background: bg,
        color,
        fontSize: 'var(--text-ui-xs)',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        // Kenarlık/gölge için `${color}1a` yazılıyordu; color bir var(--x) olduğundan
        // "var(--success)1a" GEÇERSİZ CSS'ti ve sessizce düşüyordu. Rozetin zaten soluk
        // bir zemini var, ayrıca kenarlık/gölge gerekmiyor — geçersiz kural taşımak yerine
        // kaldırıldı (görsel sonuç aynı, kod dürüst).
      }}
    >
      {pulse && (
        <span style={{ position: 'relative', display: 'flex', width: 6, height: 6 }}>
          <span
            style={{
              position: 'absolute',
              display: 'inline-flex',
              height: '100%',
              width: '100%',
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.75,
              animation: 'demoPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          {/* Neon hale (boxShadow) kaldırıldı: dikkat çekmesi gereken şey rozetin RENGİ,
              parlaması değil. Nabız animasyonu yalnızca sağlıklı olmayan durumlarda
              zaten pulse={false} ile kapatılıyor. */}
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              borderRadius: '50%',
              width: 6,
              height: 6,
              backgroundColor: color,
            }}
          />
        </span>
      )}
      {label}
    </span>
  );
}
