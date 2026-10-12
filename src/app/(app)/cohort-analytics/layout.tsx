'use client';
import { AnalyticsSectionTabBar } from '@/components/layout/AnalyticsSectionTabBar';
export default function CohortAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <AnalyticsSectionTabBar />
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  );
}


