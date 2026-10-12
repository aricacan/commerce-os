'use client';

import { FinanceSectionTabBar } from '@/components/layout/FinanceSectionTabBar';

export default function ProductCostsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <FinanceSectionTabBar />
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  );
}
