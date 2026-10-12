import type { ReactNode } from 'react';
import { labelClass } from './formClasses';

// Kalite Merkezi formlarının etiketli alanı (etiket üstte, girdi altta).
export function QualityField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
