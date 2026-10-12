import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  children: ReactNode;
}

// Ağaç dalının genişlet/daralt animasyonu: satır yüksekliği 0fr↔1fr + opaklık geçişi (200ms).
// Kapalıyken içerik DOM'da kalır (animasyon için) ama `inert`: odak almaz, ekran okuyucudan gizlenir.
// prefers-reduced-motion'da geçiş kapanır (motion-reduce + globals.css'in genel kuralı).
export function TreeCollapsible({ open, children }: Props) {
  const state = open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0';
  return (
    <div inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${state}`}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
