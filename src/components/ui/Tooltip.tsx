'use client';

import { useState, useRef, type ReactNode } from 'react';
import { text } from '../../features/shared/design';

// Basit hover tooltip — tarayıcının yerleşik `title` özniteliği yavaş açılıyor
// (~1sn gecikme) ve stilsiz. Daralmış (pinlenmiş) kenar menüsündeki ikonların
// ne anlama geldiği bu yüzden fark edilmiyordu. Bu bileşen anında, tutarlı
// biçimde görünür ve tasarım sistemindeki nötr tonları kullanır — renkli
// ikon/rozet YOK, yalnızca tek bir nötr yüzey rengi.
type TooltipProps = {
  label: string;
  children: ReactNode;
  /** Varsayılan: sağ. Sol kenar menüsü gibi dar alanlarda ikon sağa açılmalı. */
  side?: 'right' | 'top' | 'bottom';
  disabled?: boolean;
};

export function Tooltip({ label, children, side = 'right', disabled = false }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (disabled || !label) return <>{children}</>;

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 150);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const positionStyle: React.CSSProperties =
    side === 'right'
      ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
      : side === 'top'
        ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
        : { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 50,
            whiteSpace: 'nowrap',
            padding: '5px 9px',
            borderRadius: 6,
            fontSize: text.sm,
            fontWeight: 500,
            background: 'var(--fg)',
            color: 'var(--bg)',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            ...positionStyle,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
