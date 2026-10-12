'use client';

// Tasarım sisteminin açılır menüsü.
//
// `design.ts`'teki `select` primitive'i tarayıcının kendi okunu gizler
// (`appearance: none`), çünkü o ok her platformda farklı çiziliyor ve ölçüsü
// kontrol edilemiyor. Yerine konan chevron her çağrı yerinde elle yazılıyordu;
// üç modülde üç kopya oluşmuştu. Sarmalayıcı o tekrarı kaldırıyor.

import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { select as selectStyle, palette, icon } from './design';

interface Props {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Sarmalayıcıya uygulanır (genişlik/hizalama), <select>'e değil. */
  style?: CSSProperties;
  children: ReactNode;
  'aria-label'?: string;
}

export function Select({ value, onChange, disabled, style, children, ...rest }: Props) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', ...style }}>
      <select
        {...rest}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...selectStyle, opacity: disabled ? 0.6 : 1 }}
      >
        {children}
      </select>
      {/* pointerEvents:none — chevron tıklamayı yutmasın, <select> kendisi açılsın. */}
      <ChevronDown
        size={icon.sm}
        strokeWidth={icon.stroke}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: palette.textMuted,
        }}
      />
    </div>
  );
}
