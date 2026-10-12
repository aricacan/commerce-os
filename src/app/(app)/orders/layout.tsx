'use client';

import { OrdersSectionTabBar } from '@/components/layout/OrdersSectionTabBar';

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <OrdersSectionTabBar />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
