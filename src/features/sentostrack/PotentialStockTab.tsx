'use client';

import { useRef, useState } from 'react';
import { Upload, Play, FileSpreadsheet, Search, PackageCheck } from 'lucide-react';
import {
  usePotentialStock, useUploadPotentialStock, useConsume,
} from '@/hooks/sentostrack/useSentosTrack';
import { StoreSelector, ErrorState } from './shared';
import type { SentosTrackImportResult } from '@/lib/api/sentostrack';

export function PotentialStockTab() {
  const [store, setStore] = useState('storea');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<SentosTrackImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = usePotentialStock(store, search);
  const upload = useUploadPotentialStock(store);
  const consume = useConsume(store);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(file, { onSuccess: setResult });
    e.target.value = '';
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="sentostrack-potential-header">
        <div className="flex items-center gap-2">
          <PackageCheck size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Potansiyel Gerçek Stok Havuzu</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Excel ile yüklenen temel stoktan düşen siparişler sonrası kalan gerçek stok.
        </p>
      </div>

      {/* Toolbar */}
      <div data-tour="sentostrack-potential-toolbar" className="flex flex-wrap items-center gap-2">
        <StoreSelector value={store} onChange={(c) => { setStore(c); setResult(null); }} />

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
          onClick={() => consume.mutate()}
          disabled={consume.isPending}
          className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
        >
          <Play size={12} />
          <span>{consume.isPending ? 'Düşülüyor...' : 'Siparişleri Düş'}</span>
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
          className="h-8 px-3 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
        >
          <Upload size={12} />
          <span>{upload.isPending ? 'Yükleniyor...' : 'Excel Yükle'}</span>
        </button>
        <input ref={fileRef} type="file" accept=".xlsx" onChange={onFile} className="hidden" />
      </div>

      {/* Info notice */}
      <div className="flex items-center gap-2 p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[var(--fg-muted)] text-[11px]">
        <FileSpreadsheet size={14} className="shrink-0" />
        <span>Beklenen Excel formatı: <strong className="text-[var(--fg)]">SKU · Ürün Adı · Adet</strong>. Yeni yükleme, o mağazanın temel stoğunu sıfırdan kurar.</span>
      </div>

      {result && (
        <div className="p-3 rounded-[4px] border border-emerald-500/30 bg-emerald-500/10 text-[var(--fg)] text-xs">
          Yükleme tamamlandı — {result.totalRows} satır: {result.created} yeni, {result.updated} güncel, {result.skipped} sıfırlandı.
        </div>
      )}

      {/* Table */}
      <div data-tour="sentostrack-potential-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                <th className="p-3">SKU</th>
                <th className="p-3">Ürün Adı</th>
                <th className="p-3 text-right">Başlangıç (Excel)</th>
                <th className="p-3 text-right">Tüketilen Sipariş</th>
                <th className="p-3 text-right">Kalan Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {isLoading && (
                <tr><td colSpan={5} className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor...</td></tr>
              )}
              {isError && (
                <tr><td colSpan={5} className="p-8 text-center text-xs text-rose-500"><ErrorState /></td></tr>
              )}
              {!isLoading && !isError && (!data || data.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-xs text-[var(--fg-muted)]">Henüz potansiyel stok yüklenmemiş.</td></tr>
              )}
              {data?.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                  <td className="p-3 font-semibold text-[var(--fg)]">{item.sku}</td>
                  <td className="p-3 text-[var(--fg)]">{item.productName || '—'}</td>
                  <td className="p-3 text-right text-[var(--fg-muted)]">{item.baselineQty}</td>
                  <td className="p-3 text-right text-[var(--fg-muted)]">{item.consumedQty}</td>
                  <td className="p-3 text-right font-bold text-sm text-[var(--fg)]">{item.remainingQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
