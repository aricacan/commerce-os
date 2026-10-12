'use client';

import { CustomizeSectionTabBar } from '@/components/layout/CustomizeSectionTabBar';

export default function CustomizeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full overflow-hidden w-full">
      <CustomizeSectionTabBar />
      <div className="flex-1 overflow-hidden min-h-0 w-full flex flex-col">{children}</div>
    </div>
  );
}
