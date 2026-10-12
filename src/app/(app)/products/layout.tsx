'use client';
import { ProductsSectionTabBar } from '@/components/layout/ProductsSectionTabBar';

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <ProductsSectionTabBar />
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  );
}
