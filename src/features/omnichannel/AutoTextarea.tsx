'use client';

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> & { value: string };

// İçeriğe göre uzayan metin alanı: uzun bot metni kutuda kesilmez, kaydırma çubuğu çıkmaz.
export function AutoTextarea({ value, className = '', rows = 2, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      className={`resize-none overflow-hidden break-words ${className}`}
      {...rest}
    />
  );
}
