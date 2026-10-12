'use client';
import { ProductsSectionTabBar } from '@/components/layout/ProductsSectionTabBar';

export default function FitmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ProductsSectionTabBar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
