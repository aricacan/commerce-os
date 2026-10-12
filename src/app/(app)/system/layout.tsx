'use client';

import { SystemSectionTabBar } from '@/components/layout/SystemSectionTabBar';

export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <SystemSectionTabBar />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-full">{children}</div>
    </div>
  );
}



