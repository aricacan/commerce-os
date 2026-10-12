'use client';

import React from 'react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Yanındaki metnin id'si: ekran okuyucu kutunun adını oradan okur. */
  ariaLabelledBy?: string;
  style?: React.CSSProperties;
}

export function CustomCheckbox({ checked, onChange, disabled, ariaLabelledBy, style }: CustomCheckboxProps) {
  const toggle = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-labelledby={ariaLabelledBy}
      tabIndex={disabled ? -1 : 0}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      onKeyDown={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        toggle();
      }}
      style={{
        width: 17,
        height: 17,
        borderRadius: 4,
        border: checked ? '1.5px solid var(--fg)' : '1.5px solid var(--border-strong)',
        background: checked ? 'var(--fg)' : 'var(--card)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.12s ease-in-out',
        userSelect: 'none',
        flexShrink: 0,
        ...style,
      }}
    >
      {checked && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="var(--card)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="10 3 4.5 8.5 2 6" />
        </svg>
      )}
    </div>
  );
}
