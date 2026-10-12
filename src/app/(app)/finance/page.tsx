'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const VIEW_TO_ROUTE: Record<string, string> = {
  platforms: '/finance/platforms',
  expenses: '/finance/expenses',
  shipping: '/finance/shipping',
  pnl: '/finance/pnl',
};

export default function FinanceRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  useEffect(() => {
    router.replace(VIEW_TO_ROUTE[view ?? ''] ?? '/finance/platforms');
  }, [view, router]);

  return null;
}
