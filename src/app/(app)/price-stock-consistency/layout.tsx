'use client';
import { AnalyticsSectionTabBar } from '@/components/layout/AnalyticsSectionTabBar';
export default function PriceStockConsistencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <AnalyticsSectionTabBar />
      {/* position:relative — sayfa kendini `inset:0` ile bu kutuya sabitliyor, böylece
          kaydırma alanının yüksekliği ata flex zincirine bağlı kalmıyor. */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative' }}>{children}</div>
    </div>
  );
}
