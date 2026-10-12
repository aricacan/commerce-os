'use client';

import { useState } from 'react';
import { Clock3, AlertTriangle } from 'lucide-react';
import { useSentosTrackWarnings } from '@/hooks/sentostrack/useSentosTrack';
import { LevelBadge, ErrorState } from './shared';

const LEVELS = [
  { key: '', label: 'Tüm Seviyeler' },
  { key: 'red', label: 'Kritik (Kırmızı)' },
  { key: 'orange', label: 'Uyarı (Turuncu)' },
  { key: 'yellow', label: 'Dikkat (Sarı)' },
] as const;

export function WarningsTab() {
  const [level, setLevel] = useState('');
  const [onlyDepletionRisk, setOnlyDepletionRisk] = useState(false);
  const { data, isLoading, isError } = useSentosTrackWarnings(undefined, level || undefined);

  const summary = data?.summary;
  const allItems = data?.items ?? [];
  const depletionRiskCount = allItems.filter((i) => i.isDepletionRisk).length;
  const items = onlyDepletionRisk ? allItems.filter((i) => i.isDepletionRisk) : allItems;
  const noDataAtAll = (summary?.itemCount ?? 0) === 0;

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="sentostrack-warnings-header">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Sentos Stok ve Tükenme Uyarıları</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Sentos sipariş hacmi ve potansiyel depo stoğuna göre kritik eşik uyarıları.
        </p>
      </div>

      {/* KPI Cards Strip */}
      <div data-tour="sentostrack-warnings-kpis" className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0">
        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Kritik (Eksik)</span>
          <div className="font-mono text-xl font-bold text-rose-500 my-1">{summary?.red ?? 0}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Stok sıfır veya eksi</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Turuncu Uyarı</span>
          <div className="font-mono text-xl font-bold text-amber-500 my-1">{summary?.orange ?? 0}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Eşik seviye altı</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Sarı Dikkat</span>
          <div className="font-mono text-xl font-bold text-[var(--fg)] my-1">{summary?.yellow ?? 0}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Takip edilmeli</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Toplam Eksik Adet</span>
          <div className="font-mono text-xl font-bold text-rose-500 my-1">{summary?.totalShortage ?? 0}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Sipariş açığı</div>
        </div>

        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">Tükenme Riski</span>
          <div className="font-mono text-xl font-bold text-blue-500 my-1">{depletionRiskCount}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">Satış hızına göre</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div data-tour="sentostrack-warnings-filters" className="flex flex-wrap items-center gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setLevel(l.key)}
            className={`h-8 px-3 rounded-[4px] border text-xs font-semibold transition cursor-pointer ${
              level === l.key
                ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] shadow-xs'
                : 'border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {l.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setOnlyDepletionRisk((p) => !p)}
          className={`h-8 px-3 rounded-[4px] border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            onlyDepletionRisk
              ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)] shadow-xs'
              : 'border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
          }`}
        >
          <Clock3 size={12} />
          <span>Sadece Tükenme Riski ({depletionRiskCount})</span>
        </button>
      </div>

      {/* Table */}
      <div data-tour="sentostrack-warnings-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                <th className="p-3">Seviye</th>
                <th className="p-3">Mağaza</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Ürün Adı</th>
                <th className="p-3">Başlangıç</th>
                <th className="p-3">Tüketilen</th>
                <th className="p-3">Kalan Stok</th>
                <th className="p-3">Eksik</th>
                <th className="p-3">Tükenme Tahmini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {isLoading && (
                <tr><td colSpan={9} className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor...</td></tr>
              )}
              {isError && (
                <tr><td colSpan={9} className="p-8 text-center text-xs text-rose-500"><ErrorState /></td></tr>
              )}
              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-[var(--fg-muted)]">
                    {noDataAtAll ? 'Henüz potansiyel stok verisi yüklenmemiş.' : 'Bu filtreye uygun uyarı kaydı bulunamadı.'}
                  </td>
                </tr>
              )}
              {items.map((item, idx) => (
                <tr key={`${item.storeCode}-${item.sku}-${idx}`} className="hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                  <td className="p-3"><LevelBadge level={item.level} /></td>
                  <td className="p-3 text-[11px] text-[var(--fg-muted)]">{item.storeDisplayName}</td>
                  <td className="p-3 font-semibold text-[var(--fg)]">{item.sku}</td>
                  <td className="p-3 max-w-[220px] truncate text-[var(--fg)]">{item.productName || '—'}</td>
                  <td className="p-3 text-[var(--fg-muted)]">{item.baselineQty}</td>
                  <td className="p-3 text-[var(--fg-muted)]">{item.orderedQty}</td>
                  <td className="p-3 font-bold text-[var(--fg)]">{item.remainingQty}</td>
                  <td className="p-3 font-bold text-rose-500">
                    {item.shortageQty > 0 ? `-${item.shortageQty}` : '—'}
                  </td>
                  <td className="p-3 text-[11px] text-[var(--fg-muted)]">
                    {item.daysUntilStockout != null ? (
                      <span className={item.daysUntilStockout <= 7 ? 'text-rose-500 font-bold' : ''}>
                        ~{item.daysUntilStockout} gün
                      </span>
                    ) : '—'}
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
