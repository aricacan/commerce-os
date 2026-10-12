'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { stockReconciliationApi, type StockReconciliationRow } from '../../lib/api';

export function MutabakatTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stock-reconciliation'],
    queryFn: () => stockReconciliationApi.overview(),
  });
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleAccept(row: StockReconciliationRow) {
    if (!window.confirm(`ERP stoğu (${row.erpStock}) fiziksel sayıma (${row.physicalStock}) göre güncellensin mi?`)) return;
    setBusyId(row.id);
    try {
      await stockReconciliationApi.acceptPhysical(row.id, row.physicalStock);
      queryClient.invalidateQueries({ queryKey: ['stock-reconciliation'] });
    } catch (err) {
      console.error('Düzeltme başarısız:', err);
      alert('Düzeltme başarısız, tekrar deneyin.');
    } finally {
      setBusyId(null);
    }
  }

  const surplus = data?.rows.filter((r) => r.difference > 0).length ?? 0;
  const deficit = data?.rows.filter((r) => r.difference < 0).length ?? 0;

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div>
        <div className="flex items-center gap-2">
          <Scale size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Fiziksel Sayım & ERP Stok Mutabakatı</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Fiziksel depo stoğu ile ERP’den senkronize edilen stok arasındaki farklar ve eşitleme.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Toplam Uyuşmazlık</span>
          <div className="text-xl font-bold text-[var(--fg)] my-1">{data?.totalMismatches ?? '—'}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Farklı kayıt sayısı</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-[10.5px] uppercase">
            <TrendingUp size={12} /> ERP Fazla Gösteriyor
          </div>
          <div className="text-xl font-bold text-amber-500 my-1">{surplus}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Fizikselde eksik</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-rose-500 font-semibold text-[10.5px] uppercase">
            <TrendingDown size={12} /> ERP Eksik Gösteriyor
          </div>
          <div className="text-xl font-bold text-rose-500 my-1">{deficit}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Fizikselde fazla</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                <th className="p-3">Ürün Adı</th>
                <th className="p-3">SKU</th>
                <th className="p-3">ERP Stok</th>
                <th className="p-3">Fiziksel Stok</th>
                <th className="p-3">Fark</th>
                <th className="p-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {isLoading && (
                <tr><td colSpan={6} className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor...</td></tr>
              )}
              {isError && (
                <tr><td colSpan={6} className="p-8 text-center text-xs text-rose-500">Mutabakat verileri alınamadı.</td></tr>
              )}
              {!isLoading && !isError && data?.rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-xs text-emerald-600 font-semibold">Tüm fiziksel ve ERP stokları birebir eşleşiyor.</td></tr>
              )}
              {data?.rows.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                  <td className="p-3 font-semibold text-[var(--fg)]">{row.name}</td>
                  <td className="p-3 text-[var(--fg-muted)]">{row.supplierSKU}</td>
                  <td className="p-3 text-[var(--fg-muted)]">{row.erpStock}</td>
                  <td className="p-3 font-bold text-[var(--fg)]">{row.physicalStock}</td>
                  <td className="p-3 font-bold">
                    <span className={row.difference > 0 ? 'text-amber-500' : 'text-rose-500'}>
                      {row.difference > 0 ? `+${row.difference}` : row.difference}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleAccept(row)}
                      disabled={busyId === row.id}
                      className="h-7 px-2.5 rounded-[3px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] hover:opacity-90 transition cursor-pointer disabled:opacity-40"
                    >
                      {busyId === row.id ? 'Eşitleniyor...' : 'Fizikseli Kabul Et'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
