'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { StockRiskWorkspace } from '@/features/products/StockRiskWorkspace';
import { StockHealthWorkspace } from '@/features/reports/StockHealthWorkspace';
import { HeartPulse, AlertTriangle } from 'lucide-react';

export default function StockHubPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = searchParams.get('tab') === 'risk' ? 'risk' : 'health';

  const setTab = (tab: 'health' | 'risk') => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'health') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-bg">
      {/* Üst Sekme Barı */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-soft bg-card px-4 py-2">
        <div data-tour="stock-tabs" className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab('health')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-ui-xs font-semibold transition-colors ${
              currentTab === 'health'
                ? 'bg-bg-subtle text-fg shadow-xs border border-border-soft'
                : 'text-fg-muted hover:text-fg hover:bg-card-hover border border-transparent'
            }`}
          >
            <HeartPulse size={13} className="text-emerald-500" />
            <span>Stok Sağlığı</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('risk')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-ui-xs font-semibold transition-colors ${
              currentTab === 'risk'
                ? 'bg-bg-subtle text-fg shadow-xs border border-border-soft'
                : 'text-fg-muted hover:text-fg hover:bg-card-hover border border-transparent'
            }`}
          >
            <AlertTriangle size={13} className="text-warning" />
            <span>Stok Riski & Eşikler</span>
          </button>
        </div>
      </div>

      {/* Sekme İçeriği */}
      <div data-tour="stock-content" className="flex-1 min-h-0 overflow-y-auto">
        {currentTab === 'health' ? <StockHealthWorkspace /> : <StockRiskWorkspace />}
      </div>
    </div>
  );
}
