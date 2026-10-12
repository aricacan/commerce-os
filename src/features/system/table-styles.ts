import type { CSSProperties } from 'react';
import { palette } from '../shared/design';

// Sistem Ayarları tablolarının (Şifre Kasası) başlık/hücre stili. Ortak tasarımda tablo
// karşılığı olmayan tek yapı; kart/buton/input gibi geri kalanı features/shared/design.ts'ten.
export const thStyle: CSSProperties = {
  textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600,
  color: palette.textLabel, borderBottom: `1px solid ${palette.border}`,
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: '10px 12px', fontSize: 13, color: palette.text,
  borderBottom: `1px solid ${palette.borderFaint}`, verticalAlign: 'top',
};
