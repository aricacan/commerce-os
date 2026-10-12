'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, Download, Copy, Check } from 'lucide-react';
import { forecastApi } from '../../lib/api/forecast';

/**
 * I2 — Satın Alma Danışmanı.
 *
 * ⛔ SAYILAR YAPAY ZEKÂDAN GELMEZ. Miktar ve aciliyet deterministik envanter
 * modelinden ((R,Q) + tarayıcı verisi) gelir; yapay zekâ yalnızca listeyi
 * gerekçelendirir. Bu ayrım ekranda AÇIKÇA yazar — kullanıcı hangi sayıya
 * güvenebileceğini bilmeli.
 */
export function PurchaseAdvisorContent() {
  const [copied, setCopied] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [urgentOnly, setUrgentOnly] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['forecast-purchase-advice'],
    queryFn: () => forecastApi.purchaseAdvice(30, 15),
    staleTime: 10 * 60_000,
  });

  const suggestions = data?.suggestions ?? [];
  const filteredSuggestions = urgentOnly
    ? suggestions.filter((s) => s.urgency >= 80)
    : suggestions;

  const targetList = selectedIds.size > 0
    ? suggestions.filter((s) => selectedIds.has(s.productId))
    : filteredSuggestions;

  const isAllSelected =
    filteredSuggestions.length > 0 &&
    filteredSuggestions.every((s) => selectedIds.has(s.productId));

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSuggestions.map((s) => s.productId)));
    }
  }

  function toggleItem(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    if (targetList.length === 0) return;
    const headers = [
      'Ürün Adı',
      'Tedarik Ülkesi',
      'Tedarik Süresi (Gün)',
      'Yeniden Sipariş Noktası',
      'Aciliyet Skoru',
      'Önerilen Sipariş Miktarı',
      'Son 30 Gün Satış (Adet)',
      'Mevcut Stok',
      'Stok Kapsama (Gün)',
      'Brüt Marj (%)',
    ];
    const rows = targetList.map((s) => [
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.reorderPoint?.country ?? '—'}"`,
      s.reorderPoint?.leadTimeDaysUsed ? s.reorderPoint.leadTimeDaysUsed.toFixed(1) : '—',
      s.reorderPoint ? Math.round(s.reorderPoint.reorderPointQuantity) : '—',
      s.urgency,
      s.suggestedQuantity,
      s.recentUnits,
      s.stock ?? '—',
      s.daysOfSupply !== null ? s.daysOfSupply.toFixed(1) : '—',
      s.marginPercent !== null ? s.marginPercent.toFixed(1) : '—',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `satin-alma-onerileri-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function copySummary() {
    if (targetList.length === 0) return;
    const dateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const lines = [
      `📦 *Demo Oto — Satın Alma Sipariş Listesi* (${dateStr})`,
      `Seçilen: ${targetList.length} ürün önerisi\n`,
    ];

    targetList.forEach((s, idx) => {
      const stockInfo = s.daysOfSupply !== null ? `${s.daysOfSupply.toFixed(0)} gün` : 'belirsiz';
      lines.push(
        `${idx + 1}. *${s.name}*`,
        `   • Önerilen Sipariş: *${s.suggestedQuantity} adet* (Aciliyet: ${s.urgency}/100)`,
        `   • Stok Durumu: ${s.stock ?? 0} adet (Kapsama: ${stockInfo})`,
        `   • Son 30 Gün Satış: ${s.recentUnits} adet`,
        '',
      );
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col">
      {isLoading && <p className="px-3 py-6 m-0 text-ui-xs text-fg-subtle text-center">Hesaplanıyor…</p>}
      {isError && <p className="px-3 py-6 m-0 text-ui-xs text-danger">Öneri üretilemedi.</p>}

      {data && (
        <>
          {data.narrative && (
            <div className="px-3 py-3 border-b border-border-soft bg-bg-subtle">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-fg" />
                <span className="text-ui-2xs font-bold uppercase tracking-wider text-fg">
                  Yapay zekâ yorumu — sayılar yapay zekâdan DEĞİL, aşağıdaki hesaptan
                </span>
              </div>
              <p className="m-0 text-ui-xs leading-relaxed text-fg whitespace-pre-wrap">
                {data.narrative}
              </p>
            </div>
          )}

          {data.notice && (
            <div className="flex items-start gap-2 px-3 py-2 border-b border-border-soft text-ui-xs text-warning bg-warning-soft">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{data.notice}</span>
            </div>
          )}

          {filteredSuggestions.length === 0 ? (
            <p className="px-3 py-6 m-0 text-ui-xs text-fg-subtle text-center">
              {urgentOnly
                ? 'Şu an 80+ aciliyet seviyesinde ürün yok.'
                : 'Şu an sipariş önerisi yok — stok kapsaması dar ürün bulunamadı.'}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-soft bg-bg-subtle/50">
                <div className="flex items-center gap-2">
                  <span className="text-ui-2xs font-bold uppercase tracking-wider text-fg-subtle">
                    {filteredSuggestions.length} Öneri {selectedIds.size > 0 && `(${selectedIds.size} seçildi)`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUrgentOnly((v) => !v)}
                    className={`px-2 py-0.5 text-ui-2xs font-semibold rounded-[4px] border transition-colors cursor-pointer ${
                      urgentOnly
                        ? 'border-danger text-danger bg-danger-soft'
                        : 'border-border-soft text-fg-muted hover:bg-card'
                    }`}
                  >
                    {urgentOnly ? 'Tümünü Göster' : 'Yalnızca Acil (80+)'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={copySummary}
                    className="flex items-center gap-1 px-2 py-1 text-ui-xs font-semibold rounded-[5px] border border-border-soft bg-card hover:bg-bg-subtle text-fg transition-colors cursor-pointer"
                    title="WhatsApp / Slack mesajı olarak kopyala"
                  >
                    {copied ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    <span>{copied ? 'Kopyalandı' : selectedIds.size > 0 ? `Seçilenleri Kopyala (${selectedIds.size})` : 'Özeti Kopyala'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={exportCsv}
                    className="flex items-center gap-1 px-2 py-1 text-ui-xs font-semibold rounded-[5px] border border-border-soft bg-card hover:bg-bg-subtle text-fg transition-colors cursor-pointer"
                    title="Excel uyumlu CSV indir"
                  >
                    <Download size={11} />
                    <span>{selectedIds.size > 0 ? `Seçilenleri İndir (${selectedIds.size})` : 'CSV İndir'}</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto terminal-scroll">
                <table className="w-full border-collapse table-fixed min-w-[640px]">
                  <thead className="sticky top-0 bg-bg-subtle backdrop-blur z-10">
                    <tr>
                      <th className="w-8 px-2 py-1.5 text-center border-b border-border-soft">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="cursor-pointer rounded border-border-soft"
                        />
                      </th>
                      <Th>Ürün</Th>
                      <Th right width="w-[52px]">Acil</Th>
                      <Th right width="w-[64px]">Sipariş</Th>
                      <Th right width="w-[64px]">Satılan</Th>
                      <Th right width="w-[56px]">Stok</Th>
                      <Th right width="w-[62px]">Stok g.</Th>
                      <Th right width="w-[56px]">Marj</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuggestions.map((s) => {
                      const isChecked = selectedIds.has(s.productId);
                      return (
                        <tr key={s.productId} className={`border-b border-border-soft ${isChecked ? 'bg-bg-subtle/70' : ''}`}>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItem(s.productId)}
                              className="cursor-pointer rounded border-border-soft"
                            />
                          </td>
                          <td className="px-2 py-1.5 max-w-0">
                            <div className="truncate text-ui-xs text-fg">{s.name}</div>
                            {s.reorderPoint ? (
                              <div className="text-ui-2xs text-fg-subtle truncate">
                                {s.reorderPoint.country} · {s.reorderPoint.leadTimeDaysUsed.toFixed(1)} gün tedarik ·
                                yeniden sipariş noktası {Math.round(s.reorderPoint.reorderPointQuantity)}
                              </div>
                            ) : (
                              <div className="text-ui-2xs text-warning truncate">
                                tedarik süresi girilmemiş — miktar kaba tahmin
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <span
                              className={`text-ui-2xs font-bold px-1.5 py-0.5 rounded-[3px] tabular-nums ${
                                s.urgency >= 80
                                  ? 'text-danger bg-danger-soft'
                                  : s.urgency >= 50
                                    ? 'text-warning bg-warning-soft'
                                    : 'text-fg-muted bg-bg-subtle'
                              }`}
                            >
                              {s.urgency}
                            </span>
                          </td>
                          <Td strong>{s.suggestedQuantity}</Td>
                          <Td>{s.recentUnits}</Td>
                          <Td>{s.stock ?? '—'}</Td>
                          <Td>{s.daysOfSupply === null ? '—' : s.daysOfSupply.toFixed(0)}</Td>
                          <Td>{s.marginPercent === null ? '—' : `%${s.marginPercent.toFixed(0)}`}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
        </>
        )}

          <div className="px-3 py-2 text-ui-2xs text-fg-subtle border-t border-border-soft">
            Miktar = yeniden sipariş noktası − eldeki stok. Tedarik süresi girilmemişse
            30 günlük talep esas alınır ve satırda öyle işaretlenir. Bu bir ÖNERİDİR —
            sipariş otomatik verilmez.
          </div>
        </>
      )}
    </div>
  );
}

function Th({ children, right, width }: { children: React.ReactNode; right?: boolean; width?: string }) {
  return (
    <th
      className={`px-2 py-1.5 text-ui-2xs font-semibold uppercase tracking-wider text-fg-subtle border-b border-border-soft ${
        right ? 'text-right' : 'text-left'
      } ${width ?? ''}`}
    >
      {children}
    </th>
  );
}

function Td({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <td
      className={`px-2 py-1.5 text-ui-xs text-right tabular-nums whitespace-nowrap ${
        strong ? 'font-bold text-fg' : 'text-fg-muted'
      }`}
    >
      {children}
    </td>
  );
}
