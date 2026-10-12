'use client';

import { useCallback, useEffect, useState } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import * as ui from '@/features/shared/panel';
import {
  reportsApi,
  type OperationsSummary,
  type StockHealthClass,
  type StockHealthReport,
} from '@/lib/api/reports';

// ─── Saf yardımcılar (vitest bunları test eder) ───────────────────────────────

/** Backend `StockHealthClass` enum sırasıyla AYNI: en acil önce. */
export const HEALTH_ORDER: readonly StockHealthClass[] = [
  'OutOfStock', 'Dead', 'Critical', 'Low', 'Overstock', 'Healthy',
];

const HEALTH_LABELS: Record<StockHealthClass, string> = {
  OutOfStock: 'Stok yok',
  Dead: 'Ölü stok',
  Critical: 'Kritik',
  Low: 'Azalıyor',
  Overstock: 'Fazla stok',
  Healthy: 'Sağlıklı',
};

export function healthLabel(value: StockHealthClass): string {
  return HEALTH_LABELS[value];
}

/** Renk tonu: yalnızca gerçekten aksiyon gerektirenler kırmızı. */
export function healthTone(value: StockHealthClass): 'danger' | 'warning' | 'muted' | 'ok' {
  if (value === 'OutOfStock' || value === 'Critical') return 'danger';
  if (value === 'Dead' || value === 'Low') return 'warning';
  if (value === 'Overstock') return 'muted';
  return 'ok';
}

/**
 * Yeterlilik günü metni.
 *
 * null = satış yok, yeterlilik HESAPLANAMAZ. "∞" veya "0" yazmak ölü stoğu ya sonsuz
 * sağlıklı ya kritik gösterirdi; ikisi de yanlış. Ölü stoğun mesajı sınıfın kendisinde.
 */
export function formatCoverage(days: number | null): string {
  if (days === null) return '—';
  if (days < 1) return '<1 gün';
  return `${Math.round(days)} gün`;
}

/** Özet şeridi için sıralı sayımlar. Sıfır olan sınıflar gösterilmez. */
export function summaryCounts(
  counts: Record<string, number>,
): Array<{ key: StockHealthClass; count: number }> {
  return HEALTH_ORDER
    .map((key) => ({ key, count: counts[key] ?? 0 }))
    .filter((entry) => entry.count > 0);
}

/** Oranı yüzde metnine çevirir. null = ölçülecek sipariş yok. */
export function formatRate(percent: number | null): string {
  return percent === null ? '—' : `%${percent.toFixed(1)}`;
}

// ─── Ekran ────────────────────────────────────────────────────────────────────

const TONE_CLASS: Record<ReturnType<typeof healthTone>, string> = {
  danger: 'text-[var(--danger)]',
  warning: 'text-[var(--warning)]',
  muted: 'text-[var(--fg-muted)]',
  ok: 'text-[var(--success)]',
};

export function StockHealthWorkspace() {
  const [report, setReport] = useState<StockHealthReport | null>(null);
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [health, ops] = await Promise.all([
        reportsApi.stockHealth(days),
        reportsApi.operationsSummary(),
      ]);
      setReport(health);
      setSummary(ops);
      setFailed(false);
    } catch {
      // Sessiz sıfır YOK: başarısız sorgu "hiç ürün yok" gibi görünmemeli.
      setFailed(true);
      setReport(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className={ui.page}>
      <div>
        <h1 className={ui.pageTitle}>Stok Sağlığı</h1>
        <p className={ui.pageHint}>
          Son <strong>{days} gün</strong> satışına göre günlük hız ve kaç günlük stok kaldığı.
          İptal ve iade siparişler satış sayılmaz.
        </p>
      </div>

      <label className="flex w-fit items-center gap-2 text-[11px] font-semibold text-[var(--fg-muted)]">
        PENCERE
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className={ui.input}
        >
          <option value={7}>7 gün</option>
          <option value={30}>30 gün</option>
          <option value={90}>90 gün</option>
          <option value={180}>180 gün</option>
        </select>
      </label>

      {failed && <ErrorState title="Rapor yüklenemedi" onRetry={() => void load()} />}
      {loading && <p className={ui.emptyText}>Yükleniyor…</p>}

      {!loading && !failed && summary && (
        <div className={`${ui.card} flex flex-wrap gap-4`}>
          <Metric label="Sipariş" value={String(summary.orderCount)} />
          <Metric
            label="Sepet ortalaması"
            value={summary.averageBasket === null
              ? '—'
              : summary.averageBasket.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            hint="iptal ve iade hariç"
          />
          <Metric label="İptal oranı" value={formatRate(summary.cancellationRatePercent)} />
          <Metric label="İade oranı" value={formatRate(summary.returnRatePercent)} />
        </div>
      )}

      {!loading && !failed && report && (
        <>
          {/* Sayımlar TÜM katalogu kapsar; alttaki tablo yalnızca ilk N satırı gösterir. */}
          <div className={`${ui.card} flex flex-wrap gap-3`}>
            {summaryCounts(report.classCounts).map(({ key, count }) => (
              <span key={key} className="flex flex-col">
                <span className={`font-medium ${TONE_CLASS[healthTone(key)]}`}>
                  {healthLabel(key)}
                </span>
                <span className="tabular-nums">{count} ürün</span>
              </span>
            ))}
          </div>

          {report.rows.length === 0 ? (
            <p className={ui.emptyText}>Ürün bulunamadı.</p>
          ) : (
            <div className={`${ui.cardFlush} overflow-x-auto`}>
              <table className="w-full">
                <thead>
                  <tr className={ui.tableHead}>
                    <th className={ui.th}>Ürün</th>
                    <th className={ui.th}>SKU</th>
                    <th className={`${ui.th} text-right`}>Stok</th>
                    <th className={`${ui.th} text-right`}>Satış ({days}g)</th>
                    <th className={`${ui.th} text-right`}>Günlük hız</th>
                    <th className={`${ui.th} text-right`}>Yeterlilik</th>
                    <th className={ui.th}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.productId} className={ui.tableRow}>
                      <td className={`${ui.td} max-w-[280px] truncate`}>{row.productName}</td>
                      <td className={`${ui.td} font-mono text-[10.5px] text-[var(--fg-muted)]`}>
                        {row.sku}
                      </td>
                      <td className={`${ui.td} ${ui.numeric}`}>{row.stockQuantity}</td>
                      <td className={`${ui.td} ${ui.numeric}`}>{row.soldQuantity}</td>
                      <td className={`${ui.td} ${ui.numeric}`}>
                        {row.dailyVelocity.toFixed(2)}
                      </td>
                      <td className={`${ui.td} ${ui.numeric}`}>
                        {formatCoverage(row.coverageDays)}
                      </td>
                      <td className={`${ui.td} font-bold ${TONE_CLASS[healthTone(row.healthClass)]}`}>
                        {healthLabel(row.healthClass)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <span className="flex flex-col">
      <span className={ui.label}>{label}</span>
      <span className="text-xs font-bold tabular-nums text-[var(--fg)]">{value}</span>
      {hint && <span className="text-[10px] text-[var(--fg-muted)]">{hint}</span>}
    </span>
  );
}
