'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  financeReportsApi,
  type AgingReport,
  type AgingRow,
  type AgingTotals,
} from '@/lib/api/finance-reports';
import { ErrorState } from '@/components/ui/ErrorState';
import * as ui from '@/features/shared/panel';

// ─── Saf yardımcılar (vitest bunları test eder) ───────────────────────────────

export const AGING_BUCKETS = ['notDue', 'days0To30', 'days31To60', 'days61To90', 'days90Plus'] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

const BUCKET_LABELS: Record<AgingBucket, string> = {
  notDue: 'Vadesi gelmemiş',
  days0To30: '0–30 gün',
  days31To60: '31–60 gün',
  days61To90: '61–90 gün',
  days90Plus: '90+ gün',
};

export function bucketLabel(bucket: AgingBucket): string {
  return BUCKET_LABELS[bucket];
}

/** Tutarı para birimiyle biçimler. Backend TUTARI ÇEVİRMEZ, birim satırla birlikte gelir. */
export function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/**
 * Gecikmenin toplam bakiyeye oranı (0–1). Toplam sıfırsa **null**.
 *
 * 0 döndürmek, bakiyesi olmayan bir cariyi "hiç gecikmesi yok" gibi gösterirdi —
 * oysa orada ölçülecek bir şey yok. Backend'deki marj yüzdesiyle aynı karar.
 */
export function overdueRatio(row: Pick<AgingRow, 'totalOverdue' | 'total'>): number | null {
  if (row.total <= 0) return null;
  return row.totalOverdue / row.total;
}

/** En riskli kova: dolu olan EN YAŞLI kova. Hiçbiri yoksa null. */
export function worstBucket(row: AgingRow): AgingBucket | null {
  if (row.days90Plus > 0) return 'days90Plus';
  if (row.days61To90 > 0) return 'days61To90';
  if (row.days31To60 > 0) return 'days31To60';
  if (row.days0To30 > 0) return 'days0To30';
  if (row.notDue > 0) return 'notDue';
  return null;
}

// ─── Ekran ────────────────────────────────────────────────────────────────────

function TotalsCard({ totals }: { totals: AgingTotals }) {
  return (
    <div className={`${ui.card} flex flex-col gap-2`}>
      <span className="text-xs font-bold text-[var(--fg)]">{totals.currency}</span>
      <div className="flex flex-wrap gap-3 text-xs">
        {AGING_BUCKETS.map((bucket) => (
          <span key={bucket} className="flex flex-col">
            <span className="text-[var(--fg-muted)]">{bucketLabel(bucket)}</span>
            <span className="tabular-nums">{formatAmount(totals[bucket], totals.currency)}</span>
          </span>
        ))}
        <span className="ml-auto flex flex-col">
          <span className="text-[var(--fg-muted)]">Gecikmiş toplam</span>
          <span className="font-bold tabular-nums text-[var(--danger)]">
            {formatAmount(totals.totalOverdue, totals.currency)}
          </span>
        </span>
      </div>
    </div>
  );
}

export function AgingWorkspace() {
  const [report, setReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [asOf, setAsOf] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await financeReportsApi.aging(asOf || undefined));
      setFailed(false);
    } catch {
      // Sessiz sıfır YOK: basarisiz sorgu "hiç alacak yok" gibi görünmemeli.
      setFailed(true);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className={ui.page}>
      <div data-tour="aging-header" className="flex items-start justify-between gap-4">
        <div>
          <h1 className={ui.pageTitle}>Cari Yaşlandırma</h1>
          <p className={ui.pageHint}>
          Alacaklar, <strong>FIFO mahsup</strong> ile yaşlandırılır: tahsilatlar en eski borçtan
          başlayarak kapatılır. Vade, müşterinin <strong>ödeme vadesi</strong> gününden sayılır;
          tanımlı değilse hareket peşin kabul edilir. <strong>Para birimleri çevrilmez</strong> —
          her biri kendi satırında.
          </p>
        </div>
      </div>

      <label data-tour="aging-date" className="flex w-fit items-center gap-2 text-[11px] font-semibold text-[var(--fg-muted)]">
        TARİH İTİBARIYLA
        <input
          type="date"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
          className={ui.input}
        />
      </label>

      {failed && <ErrorState title="Yaşlandırma raporu yüklenemedi" onRetry={() => void load()} />}
      {loading && <p className={ui.emptyText}>Yükleniyor…</p>}

      {!loading && !failed && report && (
        <>
          <div data-tour="aging-totals" className="flex flex-col gap-2">
            {report.totals.map((totals) => (
              <TotalsCard key={totals.currency} totals={totals} />
            ))}
          </div>

          {report.rows.length === 0 ? (
            <p className={ui.emptyText}>Açık alacak yok.</p>
          ) : (
            <div data-tour="aging-table" className={`${ui.cardFlush} overflow-x-auto`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className={ui.tableHead}>
                    <th className={ui.th}>Müşteri</th>
                    <th className={ui.th}>Para birimi</th>
                    {AGING_BUCKETS.map((bucket) => (
                      <th key={bucket} className={`${ui.th} text-right`}>
                        {bucketLabel(bucket)}
                      </th>
                    ))}
                    <th className={`${ui.th} text-right`}>Toplam</th>
                    <th className={`${ui.th} text-right`}>Gecikmiş %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => {
                    const worst = worstBucket(row);
                    const ratio = overdueRatio(row);
                    return (
                      <tr key={`${row.customerId}-${row.currency}`} className={ui.tableRow}>
                        <td className={ui.td}>{row.customerName}</td>
                        <td className={`${ui.td} text-[var(--fg-muted)]`}>{row.currency}</td>
                        {AGING_BUCKETS.map((bucket) => (
                          <td
                            key={bucket}
                            className={`${ui.td} ${ui.numeric} ${
                              worst === bucket && bucket !== 'notDue'
                                ? 'font-bold text-[var(--danger)]'
                                : ''
                            }`}
                          >
                            {row[bucket] === 0 ? '—' : formatAmount(row[bucket], row.currency)}
                          </td>
                        ))}
                        <td className={`${ui.td} ${ui.numeric} font-bold`}>
                          {formatAmount(row.total, row.currency)}
                        </td>
                        {/* Bakiyenin ne kadarinin gecikmis oldugu: tahsilat onceligini
                            tutardan bagimsiz gosterir (kucuk ama tamamen gecikmis bir cari,
                            buyuk ama vadesi gelmemis bir cariden daha acildir). */}
                        <td className={`${ui.td} ${ui.numeric}`}>
                          {ratio === null ? '—' : `%${Math.round(ratio * 100)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
