'use client';

import { Fragment, useState } from 'react';
import { Trash2, RotateCcw, Trash, ChevronRight, Search } from 'lucide-react';
import type { BaseTrackStockWarning } from '@/lib/api';
import { useBaseTrackStockWarnings, useBaseTrackSettings } from '@/hooks/basetrack/useBaseTrack';
import { ErrorState } from './shared';
import { ExportMenu, type ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';

const LEVEL_META: Record<string, { label: string; badgeClass: string }> = {
  Red: { label: 'Kritik', badgeClass: 'bg-rose-500/10 text-rose-500 border border-rose-500/20' },
  Orange: { label: 'Uyarı', badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' },
  Yellow: { label: 'Takip', badgeClass: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' },
  Green: { label: 'Güvenli', badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' },
  NoData: { label: 'Veri Yok', badgeClass: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border)]' },
};

const LEVEL_ORDER = ['Red', 'Orange', 'Yellow', 'Green'] as const;

function toExportRows(items: BaseTrackStockWarning[], depotLabel: string): ExportRow[] {
  return items.map((w) => ({
    'UK Durum': LEVEL_META[w.level]?.label ?? w.level,
    SKU: w.sku,
    'Ürün': w.productName,
    'UK Stok': w.ukStock,
    'Potansiyel Stok': w.potentialStock,
    Sevkiyat: w.inTransitQty,
    [`${depotLabel} Stok`]: w.depotQty,
    '30g Devir (adet/gün)': w.turnover30 ?? '',
    '60g Devir (adet/gün)': w.turnover60 ?? '',
    '90g Devir (adet/gün)': w.turnover90 ?? '',
    'Tükenme Riski %': w.stockoutRisk === null ? '' : Math.round(w.stockoutRisk * 100),
    'Kalan Gün': w.daysRemaining ?? '',
    'Depo Açığı': w.depotShortage > 0 ? w.depotShortage : '',
    'Çift Sipariş Riski': w.doubleOrderRisk ? 'Var' : 'Yok',
    'Önerilen Alım': w.recommendedOrderQty > 0 ? w.recommendedOrderQty : '',
  }));
}

function fmtTurnover(v: number): string {
  return Number.isInteger(v) ? String(v) : String(v);
}

function trendArrow(value: number, compareTo: number): { icon: string; textClass: string; label: string } | null {
  if (compareTo <= 0) return null;
  const ratio = value / compareTo;
  if (ratio > 1.15) return { icon: '▲', textClass: 'text-emerald-500', label: 'hızlanmış' };
  if (ratio < 0.85) return { icon: '▼', textClass: 'text-rose-500', label: 'yavaşlamış' };
  return { icon: '→', textClass: 'text-[var(--fg-muted)]', label: 'durağan' };
}

function TurnoverCell({ value, compareTo }: { value: number | null; compareTo?: number | null }) {
  if (value === null) return <span className="text-[var(--fg-muted)]">—</span>;
  if (value === 0) return <span className="text-[var(--fg-muted)]">0</span>;
  const trend = compareTo != null ? trendArrow(value, compareTo) : null;
  return (
    <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--fg)]">
      {fmtTurnover(value)}
      {trend && (
        <span title={`Bir önceki pencereye göre ${trend.label}.`} className={`text-[10px] font-bold ${trend.textClass}`}>
          {trend.icon}
        </span>
      )}
    </span>
  );
}

function ResultCell({ w }: { w: BaseTrackStockWarning }) {
  if (w.stockoutRisk === null)
    return <span className="text-[var(--fg-muted)] text-[11px]">{w.safetyNote ?? 'Veri yok'}</span>;
  const pct = Math.round(w.stockoutRisk * 100);
  const colorClass = w.stockoutRisk >= 0.5 ? 'text-rose-500' : w.stockoutRisk >= 0.25 ? 'text-amber-500' : 'text-blue-500';
  return (
    <div className="flex flex-col gap-0.5">
      <span title={w.safetyNote ?? undefined} className={`font-bold text-xs ${colorClass}`}>
        %{pct} risk{w.safetyNote && <span className="ml-1 text-[10px]">⚠</span>}
      </span>
      {w.daysRemaining !== null && w.potentialStock > 0 && (
        <span className="text-[10.5px] text-[var(--fg-muted)] font-mono">
          ~{w.daysRemaining} gün
        </span>
      )}
      {w.recommendedOrderQty > 0 && (
        <span className="text-[10.5px] font-bold text-[var(--bg)] bg-[var(--fg)] px-1.5 py-0.5 rounded-[2px] w-fit whitespace-nowrap mt-0.5">
          Alım: {w.recommendedOrderQty}
        </span>
      )}
    </div>
  );
}

function DepotWarningCell({ w, depotLabel }: { w: BaseTrackStockWarning; depotLabel: string }) {
  const pills: React.ReactNode[] = [];
  if (w.depotShortage > 0)
    pills.push(
      <span key="short" className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-rose-500/10 text-rose-500 border border-rose-500/20">
        {depotLabel}: {w.depotShortage} eksik
      </span>,
    );
  if (w.doubleOrderRisk)
    pills.push(
      <span key="double" className="font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-600 border border-amber-500/20">
        Çift sipariş riski
      </span>,
    );
  if (pills.length === 0) return <span className="text-[var(--fg-muted)]">—</span>;
  return <div className="flex flex-col gap-1">{pills}</div>;
}

export function StockWarningsTab() {
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showNoData, setShowNoData] = useState(false);
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [dismissedSkus, setDismissedSkus] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: warningsData, isLoading, error } = useBaseTrackStockWarnings({
    search: search.trim() || undefined,
    level: levelFilter ?? undefined,
  });

  const settings = useBaseTrackSettings();
  const depotLabel = settings.data?.depotLabel ?? 'DEMO UK';

  const rawItems = warningsData?.items ?? [];
  const items = rawItems
    .filter((w) => (showNoData || w.level !== 'NoData') && !dismissedSkus.has(w.sku));

  const summary = warningsData?.summary;

  const dismissSelected = () => {
    setDismissedSkus((prev) => new Set([...prev, ...selectedSkus]));
    setSelectedSkus(new Set());
  };

  const dismissAll = () => {
    setDismissedSkus((prev) => new Set([...prev, ...items.map((i) => i.sku)]));
    setSelectedSkus(new Set());
  };

  const resetDismissed = () => {
    setDismissedSkus(new Set());
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedSkus(new Set(items.map((i) => i.sku)));
    else setSelectedSkus(new Set());
  };

  const allSelected = items.length > 0 && selectedSkus.size === items.length;

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header */}
      <div data-tour="basetrack-warnings-header">
        <h2 className="text-sm font-bold text-[var(--fg)]">Stok ve Tükenme Uyarıları</h2>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Poisson tükenme risk analizine göre UK ve ara depo stoklarının kritik seviyeleri.
        </p>
      </div>

      {error && <ErrorState text={error.message} />}

      {/* KPI Cards Strip */}
      <div data-tour="basetrack-warnings-levels" className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
        {LEVEL_ORDER.map((lvl) => {
          const count = lvl === 'Red' ? summary?.redCount :
                        lvl === 'Orange' ? summary?.orangeCount :
                        lvl === 'Yellow' ? summary?.yellowCount : summary?.greenCount;
          const active = levelFilter === lvl;
          const meta = LEVEL_META[lvl];
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(active ? null : lvl)}
              className={`p-3 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between ${
                active
                  ? 'border-[var(--fg)] bg-[var(--bg-subtle)] shadow-xs'
                  : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
                <span className="font-semibold">{meta.label}</span>
                <span className={`h-2 w-2 rounded-full ${meta.badgeClass}`} />
              </div>
              <div className="text-lg font-bold text-[var(--fg)] my-1">{count ?? '—'}</div>
              <div className="text-[10px] text-[var(--fg-muted)]">Filtrelemek için tıkla</div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowNoData((p) => !p)}
          className={`p-3 rounded-[4px] border text-left transition cursor-pointer flex flex-col justify-between ${
            showNoData
              ? 'border-[var(--fg)] bg-[var(--bg-subtle)] shadow-xs'
              : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
            <span className="font-semibold">Veri Yok</span>
          </div>
          <div className="text-lg font-bold text-[var(--fg)] my-1">{summary?.noDataCount ?? '—'}</div>
          <div className="text-[10px] text-[var(--fg-muted)]">{showNoData ? 'Gösteriliyor' : 'Gizli'}</div>
        </button>
      </div>

      {/* Filter and Action Toolbar */}
      <div data-tour="basetrack-warnings-toolbar" className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SKU veya ürün adı ara..."
            className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        </div>

        {selectedSkus.size > 0 && (
          <button
            type="button"
            onClick={dismissSelected}
            className="h-8 px-3 rounded-[4px] border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-semibold hover:bg-rose-500/20 transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 size={12} />
            <span>Seçilenleri Yoksay ({selectedSkus.size})</span>
          </button>
        )}

        {items.length > 0 && (
          <button
            type="button"
            onClick={dismissAll}
            className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-rose-500 hover:border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Trash size={12} />
            <span>Hepsini Yoksay</span>
          </button>
        )}

        {dismissedSkus.size > 0 && (
          <button
            type="button"
            onClick={resetDismissed}
            className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw size={12} />
            <span>Yoksayılanları Geri Getir ({dismissedSkus.size})</span>
          </button>
        )}

        <div className="ml-auto">
          <ExportMenu
            filename="basetrack-stok-uyarilari"
            columns={[
              { key: 'UK Durum', header: 'UK Durum', type: 'text' },
              { key: 'SKU', header: 'SKU', type: 'text' },
              { key: 'Ürün', header: 'Ürün', type: 'text' },
              { key: 'UK Stok', header: 'UK Stok', type: 'int' },
              { key: 'Potansiyel Stok', header: 'Potansiyel Stok', type: 'int' },
              { key: 'Sevkiyat', header: 'Sevkiyat', type: 'int' },
              { key: `${depotLabel} Stok`, header: `${depotLabel} Stok`, type: 'int' },
              { key: '30g Devir (adet/gün)', header: '30g Devir (adet/gün)', type: 'decimal' },
              { key: '60g Devir (adet/gün)', header: '60g Devir (adet/gün)', type: 'decimal' },
              { key: '90g Devir (adet/gün)', header: '90g Devir (adet/gün)', type: 'decimal' },
              { key: 'Tükenme Riski %', header: 'Tükenme Riski %', type: 'percent' },
              { key: 'Kalan Gün', header: 'Kalan Gün', type: 'int' },
              { key: 'Depo Açığı', header: 'Depo Açığı', type: 'int' },
              { key: 'Çift Sipariş Riski', header: 'Çift Sipariş Riski', type: 'text' },
              { key: 'Önerilen Alım', header: 'Önerilen Alım', type: 'int' },
            ] satisfies ExportColumn[]}
            getData={() => toExportRows(items, depotLabel)}
          />
        </div>
      </div>

      {/* Warnings Table */}
      <div data-tour="basetrack-warnings-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                <th className="p-3 w-10 text-center">
                  <CustomCheckbox checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th className="p-3">UK Durum</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Ürün</th>
                <th className="p-3">UK Stok</th>
                <th className="p-3">Potansiyel</th>
                <th className="p-3">Sevkiyat</th>
                <th className="p-3">{depotLabel} Stok</th>
                <th className="p-3">30g Devir</th>
                <th className="p-3">60g Devir</th>
                <th className="p-3">90g Devir</th>
                <th className="p-3">Sonuç</th>
                <th className="p-3">Depo Uyarısı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {isLoading && (
                <tr><td colSpan={13} className="p-8 text-center text-xs text-[var(--fg-muted)]">Hesaplanıyor...</td></tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={13} className="p-8 text-center text-xs text-[var(--fg-muted)]">Kayıt bulunamadı.</td></tr>
              )}
              {items.map((w) => {
                const meta = LEVEL_META[w.level];
                const isSelected = selectedSkus.has(w.sku);
                const isExpanded = expandedId === w.productId;
                return (
                  <Fragment key={w.productId}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : w.productId)}
                      className={`hover:bg-[var(--bg-subtle)]/30 transition cursor-pointer ${
                        isExpanded || isSelected ? 'bg-[var(--bg-subtle)]/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={(checked) => {
                            setSelectedSkus((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(w.sku); else next.delete(w.sku);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-[var(--fg)]">{w.sku}</td>
                      <td className="p-3 max-w-[200px]">
                        <div className="flex items-center gap-1">
                          <ChevronRight
                            size={12}
                            className={`text-[var(--fg-muted)] transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                          />
                          <span className="truncate text-[var(--fg)]">{w.productName}</span>
                        </div>
                      </td>
                      <td className="p-3 text-[var(--fg)]">{w.ukStock}</td>
                      <td className="p-3 font-bold text-[var(--fg)]">{w.potentialStock}</td>
                      <td className="p-3 text-[var(--fg-muted)]">{w.inTransitQty}</td>
                      <td className="p-3 text-[var(--fg-muted)]">{w.depotQty}</td>
                      <td className="p-3"><TurnoverCell value={w.turnover30} compareTo={w.turnover60} /></td>
                      <td className="p-3"><TurnoverCell value={w.turnover60} compareTo={w.turnover90} /></td>
                      <td className="p-3"><TurnoverCell value={w.turnover90} /></td>
                      <td className="p-3"><ResultCell w={w} /></td>
                      <td className="p-3"><DepotWarningCell w={w} depotLabel={depotLabel} /></td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[var(--bg-subtle)]/40 border-b border-[var(--border-soft)]">
                        <td colSpan={13} className="p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-2.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)]">
                              <span className="text-[10px] text-[var(--fg-muted)] uppercase">Son 30 Gün Satış</span>
                              <div className="font-bold text-sm text-[var(--fg)] mt-0.5">{w.sold30} adet</div>
                            </div>
                            <div className="p-2.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)]">
                              <span className="text-[10px] text-[var(--fg-muted)] uppercase">Son 60 Gün Satış</span>
                              <div className="font-bold text-sm text-[var(--fg)] mt-0.5">{w.sold60} adet</div>
                            </div>
                            <div className="p-2.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)]">
                              <span className="text-[10px] text-[var(--fg-muted)] uppercase">Son 90 Gün Satış</span>
                              <div className="font-bold text-sm text-[var(--fg)] mt-0.5">{w.sold90} adet</div>
                            </div>
                            <div className="p-2.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)]">
                              <span className="text-[10px] text-[var(--fg-muted)] uppercase">Günlük Ortalama Talep</span>
                              <div className="font-bold text-sm text-[var(--fg)] mt-0.5">{w.dailyDemand.toFixed(2)} adet/gün</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
