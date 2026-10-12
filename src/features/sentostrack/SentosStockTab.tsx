'use client';

import { useState } from 'react';
import { RefreshCw, Info, Search, ServerCog } from 'lucide-react';
import { useSentosStock, useRefreshSentosStock } from '@/hooks/sentostrack/useSentosTrack';
import { StoreSelector, ErrorState } from './shared';

export function SentosStockTab() {
  const [store, setStore] = useState('storea');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useSentosStock(store, search);
  const refresh = useRefreshSentosStock(store, search);

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="sentostrack-stock-header">
        <div className="flex items-center gap-2">
          <ServerCog size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Sentos ERP Canlı Stok</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Sentos entegrasyonu üzerinden doğrudan okunan mevcut stok adetleri.
        </p>
      </div>

      {/* Toolbar */}
      <div data-tour="sentostrack-stock-toolbar" className="flex flex-wrap items-center gap-2">
        <StoreSelector value={store} onChange={setStore} />

        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            placeholder="SKU veya ürün adı ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        </div>

        <button
          type="button"
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="h-8 px-3 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
          <span>{refresh.isPending ? 'Yenileniyor...' : 'Sentos’tan Yenile'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[var(--fg-muted)] text-[11px]">
        <Info size={14} className="shrink-0" />
        <span>Bu değerler Sentos ERP’den gelir ve salt bilgi amaçlıdır. Stok kararları ve alımlar &quot;Potansiyel Stok&quot; ve &quot;Uyarılar&quot; sekmesine göre verilir.</span>
      </div>

      {/* Table */}
      <div data-tour="sentostrack-stock-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                <th className="p-3">SKU</th>
                <th className="p-3">Ürün Adı</th>
                <th className="p-3 text-right">Sentos Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {isLoading && (
                <tr><td colSpan={3} className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor...</td></tr>
              )}
              {isError && (
                <tr><td colSpan={3} className="p-8 text-center text-xs text-rose-500"><ErrorState /></td></tr>
              )}
              {!isLoading && !isError && (!data || data.length === 0) && (
                <tr><td colSpan={3} className="p-8 text-center text-xs text-[var(--fg-muted)]">Kayıt yok. Sentos’tan Yenile butonuna tıklayabilirsiniz.</td></tr>
              )}
              {data?.map((s) => (
                <tr key={s.sku} className="hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                  <td className="p-3 font-semibold text-[var(--fg)]">{s.sku}</td>
                  <td className="p-3 text-[var(--fg)]">{s.productName || '—'}</td>
                  <td className="p-3 text-right font-bold text-sm text-[var(--fg)]">{s.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
