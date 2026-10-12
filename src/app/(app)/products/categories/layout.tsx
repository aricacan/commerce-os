'use client';

import { CategoriesSubTabBar } from '@/components/layout/CategoriesSubTabBar';

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--card)] px-4 py-2 shrink-0">
        <div data-tour="categories-tabs">
          <CategoriesSubTabBar />
        </div>
      </div>
      <div data-tour="categories-content" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4">
        {children}
      </div>
    </div>
  );
}

