'use client';

import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// Çift tıklama = çift kayıt sorununun kökten çözümü:
// `onClick` bir Promise döndürürse buton kendi yükleme durumunu KENDİ yönetir ve
// iş bitene kadar kapalı kalır. Çağıran tarafta `const [saving, setSaving] = useState(false)`
// yazmaya gerek kalmaz — o kalıp her yerde tekrarlanıyordu ve unutulduğu yerde bug oluyordu.
//
// Dışarıdan kontrol gerekirse `loading` prop'u ile elle de sürülebilir.

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

type ButtonProps = {
  children: ReactNode;
  /** Promise döndürürse yükleme durumu otomatik yönetilir. */
  onClick?: () => void | Promise<unknown>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Dışarıdan kontrol; `onClick` zaten Promise dönüyorsa gerekmez. */
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  type?: 'button' | 'submit';
  className?: string;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-h)]',
  secondary:
    'border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--bg-subtle)]',
  ghost: 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]',
  danger: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-h)]',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  type = 'button',
  className = '',
}: ButtonProps) {
  const [selfLoading, setSelfLoading] = useState(false);

  // Dışarıdan `loading` geldiyse o kazanır; yoksa kendi takibimiz.
  const isLoading = loading ?? selfLoading;
  const isBlocked = isLoading || !!disabled;

  async function handleClick() {
    // Tıklama zaten işleniyorsa yut — ikinci istek hiç doğmaz.
    if (isBlocked || !onClick) return;

    const result = onClick();
    if (!(result instanceof Promise)) return;

    setSelfLoading(true);
    try {
      await result;
    } finally {
      // Hata olsa bile butonu serbest bırak, yoksa kullanıcı kilitli kalır.
      setSelfLoading(false);
    }
  }

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isBlocked}
      aria-busy={isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`}
    >
      {isLoading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
