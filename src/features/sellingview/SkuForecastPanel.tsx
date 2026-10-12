'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, X, AlertCircle } from 'lucide-react';
import { productApi } from '../../lib/api/products';
import { forecastApi } from '../../lib/api/forecast';

const TIER_LABEL: Record<string, { label: string; className: string }> = {
  Individual: { label: 'Bağımsız model', className: 'text-success bg-success-soft' },
  Global: { label: 'Ortak model (kiracı geneli)', className: 'text-fg-muted bg-bg-subtle' },
  CategoryShare: { label: 'Kategori payı (tahmini)', className: 'text-warning bg-warning-soft' },
  ColdStart: { label: 'Soğuk başlangıç (benzer ürünler)', className: 'text-warning bg-warning-soft' },
  InsufficientData: { label: 'Yetersiz veri', className: 'text-fg-muted bg-bg-subtle' },
};

/**
 * Faz C — SKU (ürün) bazlı adet tahmini. Basit bir arama + sonuç kartı: tam
 * bir grafik/geçmiş görünümü DEĞİL, "bu üründen ufuk boyunca kaç adet"
 * sorusunun hızlı cevabı. Hangi yöntemle üretildiği (Tier) HER ZAMAN görünür —
 * kategori payı/soğuk başlangıç tahminleri bağımsız modelle KARIŞTIRILMAZ.
 */
export function SkuForecastPanel() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState('');

  const { data: candidates } = useQuery({
    queryKey: ['sellingview-sku-search', query],
    queryFn: () => productApi.list({ search: query, pageSize: 8 }),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });

  const { data: result, isLoading, isError } = useQuery({
    queryKey: ['sellingview-sku-forecast', selectedId],
    queryFn: () => forecastApi.skuForecast(selectedId!, 30),
    enabled: selectedId !== null,
  });

  const tier = result ? TIER_LABEL[result.tier] : null;

  const rangeText = useMemo(() => {
    if (!result || result.forecast.length === 0) return null;
    const lower = result.forecast.reduce((s, p) => s + p.lower90, 0);
    const upper = result.forecast.reduce((s, p) => s + p.upper90, 0);
    return `${Math.round(lower)} – ${Math.round(upper)} adet`;
  }, [result]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-ui-xs font-semibold rounded-[4px] border border-border-soft bg-bg-subtle hover:bg-bg-subtle text-fg transition-colors cursor-pointer"
      >
        <Search size={12} />
        <span>Ürün Ara</span>
        <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-30 w-[320px] rounded-[6px] border border-border-soft bg-card shadow-lg overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border-soft">
            <Search size={13} className="text-fg-subtle shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedId(null); }}
              placeholder="SKU veya ürün adı yazın…"
              className="flex-1 min-w-0 text-ui-sm bg-transparent outline-none text-fg placeholder:text-fg-subtle"
            />
            <button type="button" onClick={() => setOpen(false)} className="text-fg-subtle hover:text-fg cursor-pointer shrink-0">
              <X size={13} />
            </button>
          </div>

          {selectedId === null && query.trim().length >= 2 && (
            <div className="max-h-[220px] overflow-y-auto">
              {candidates?.items.length === 0 && (
                <div className="px-3 py-2.5 text-ui-xs text-fg-subtle">Eşleşen ürün yok.</div>
              )}
              {candidates?.items.map((p) => (
                <button
                  key={p.productId}
                  type="button"
                  onClick={() => { setSelectedId(p.productId); setSelectedName(p.productName); }}
                  className="w-full text-left px-3 py-1.5 text-ui-xs text-fg hover:bg-bg-subtle cursor-pointer truncate"
                >
                  {p.productName} <span className="text-fg-subtle">· {p.storeName}</span>
                </button>
              ))}
            </div>
          )}

          {selectedId !== null && (
            <div className="p-3 flex flex-col gap-2">
              <div className="text-ui-xs font-bold text-fg truncate">{selectedName}</div>

              {isLoading && <p className="text-ui-xs text-fg-subtle">Hesaplanıyor…</p>}
              {isError && <p className="text-ui-xs text-danger">Tahmin alınamadı.</p>}

              {result && tier && (
                <>
                  <span className={`self-start text-ui-2xs font-semibold px-1.5 py-0.5 rounded-[3px] ${tier.className}`}>
                    {tier.label}
                  </span>

                  {result.tier === 'InsufficientData' ? (
                    <div className="flex items-start gap-1.5 text-ui-xs text-fg-muted">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <span>{result.insufficientReason}</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-bold tabular-nums text-fg">
                        {Math.round(result.totalQuantity)} adet
                        <span className="text-ui-2xs font-normal text-fg-subtle ml-1">/ 30 gün</span>
                      </div>
                      {rangeText && <div className="text-ui-xs text-fg-muted">%90 aralık: {rangeText}</div>}
                      {result.categorySharePercent !== null && (
                        <div className="text-ui-xs text-fg-muted">
                          Kategorinin %{result.categorySharePercent} payı üzerinden orantı — bağımsız model DEĞİL.
                        </div>
                      )}
                      {result.mase !== null && (
                        <div className="text-ui-xs text-fg-muted">MASE: {result.mase.toFixed(2)}</div>
                      )}
                      {result.stockoutDaysCorrected > 0 && (
                        <div className="text-ui-xs text-fg-muted">
                          {result.stockoutDaysCorrected} gün stokta yokluk düzeltmesi uygulandı.
                        </div>
                      )}
                      {result.reorderPoint && (
                        <div className="mt-1 pt-1.5 border-t border-border-soft flex flex-col gap-0.5">
                          <div className="text-ui-xs font-semibold text-fg">
                            Yeniden sipariş noktası: {Math.round(result.reorderPoint.reorderPointQuantity)} adet
                          </div>
                          <div className="text-ui-2xs text-fg-subtle">
                            {result.reorderPoint.country} tedarik süresi {result.reorderPoint.leadTimeDaysUsed.toFixed(1)} gün ·
                            güvenlik stoğu {Math.round(result.reorderPoint.safetyStock)} adet
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => { setSelectedId(null); setQuery(''); }}
                className="self-start text-ui-xs text-fg hover:underline cursor-pointer mt-1"
              >
                Başka ürün ara
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
