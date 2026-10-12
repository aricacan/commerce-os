'use client';

import { AnalyticsSectionTabBar } from '@/components/layout/AnalyticsSectionTabBar';
import { PriceComparisonSubTabBar } from '@/components/layout/PriceComparisonSubTabBar';

export default function PriceComparisonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AnalyticsSectionTabBar />
      <PriceComparisonSubTabBar />
      <div data-tour="price-comparison-content" className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
