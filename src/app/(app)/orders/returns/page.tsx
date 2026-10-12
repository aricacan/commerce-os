'use client';

import { useState } from 'react';
import { Search, X, Info } from 'lucide-react';
import { ReturnsView } from '../../../../features/orders/ReturnsView';
import { ReturnsWorkspace } from '../../../../features/orders/ReturnsWorkspace';

type Tab = 'talepler' | 'belgeler';

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'talepler', label: 'Pazaryeri Talepleri' },
  { id: 'belgeler', label: 'İade Belgeleri' },
];

export default function ReturnsPage() {
  const [tab, setTab] = useState<Tab>('talepler');
  const [search, setSearch] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [exportElement, setExportElement] = useState<React.ReactNode>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Üst Toolbar: Sekmeler, Arama ve Araçlar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-card px-4 py-2">
        <div data-tour="returns-tabs" className="flex items-center gap-1.5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`cursor-pointer rounded-[4px] px-3 py-1.5 text-ui-xs font-semibold transition-colors ${
                tab === item.id
                  ? 'bg-bg-subtle text-fg shadow-xs border border-border-soft'
                  : 'text-fg-muted hover:text-fg hover:bg-card-hover border border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Arama Çubuğu (Üst Bar) */}
          <div data-tour="returns-search" className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'talepler' ? 'Sipariş no, SKU veya sebep ara…' : 'İade no, sipariş veya sebep ara…'}
              className="h-8 w-52 sm:w-64 rounded-[4px] border border-border-soft bg-bg-subtle/70 pl-8 pr-7 text-xs text-fg outline-none transition focus:border-border focus:bg-card"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg cursor-pointer"
                title="Aramayı temizle"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {tab === 'talepler' && (
            <div data-tour="returns-export" className="inline-flex">
              {exportElement}
            </div>
          )}

          <button
            type="button"
            data-tour="returns-info"
            onClick={() => setShowInfo((prev) => !prev)}
            title="Bilgi paneli"
            className={`flex h-8 w-8 items-center justify-center rounded-[4px] border transition-colors cursor-pointer ${
              showInfo
                ? 'border-border bg-bg-subtle text-fg'
                : 'border-border-soft bg-card text-fg-muted hover:border-border hover:text-fg'
            }`}
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      <div data-tour="returns-content" className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'talepler' ? (
          <ReturnsView
            search={search}
            showInfo={showInfo}
            onCloseInfo={() => setShowInfo(false)}
            onExportReady={setExportElement}
          />
        ) : (
          <ReturnsWorkspace
            search={search}
            showInfo={showInfo}
            onCloseInfo={() => setShowInfo(false)}
          />
        )}
      </div>
    </div>
  );
}
