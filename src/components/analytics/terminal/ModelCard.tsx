'use client';

import { Trophy, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import type { ForecastSeries } from '../../../types/forecast';
import { metric, percent } from './format';

const COVERAGE_TARGET = 90;
const COVERAGE_TOLERANCE = 3;
const GOOD_MONTHLY_MAPE = 10;

/**
 * Model Analiz Kartı — 4 Kolonlu Yönetici Dashboard Tasarımı.
 *
 * ESKİ TASARIM: Tek dikey sütunda sıkışıp alt alta kaydırma (scroll) zorunluluğu
 * yaratıyordu ve yatay alanın %80'i boş kalıyordu.
 *
 * YENİ TASARIM: Dört bağımsız fonksiyonel karta bölündü:
 *   1. Kazanan Model & Durum (Algoritma, Rejim, Taban Karşılaştırması)
 *   2. Temel Doğruluk Skorları (MASE, Aylık/Günlük/Haftalık MAPE)
 *   3. %90 Güven Aralığı & Sapma (Kapsama Sağlığı İbresi, Bias)
 *   4. Model Yarışı Leaderboard (Rolling-Origin Sıralaması)
 *
 * Sıfır dikey kaydırma ile tüm model performansı tek bakışta anlaşılır.
 */
export function ModelCard({ series }: { series: ForecastSeries }) {
  const a = series.accuracy;
  const displayedCoverage = a.coverage90Adjusted ?? a.coverage90;
  const coverageOk =
    displayedCoverage !== null && Math.abs(displayedCoverage - COVERAGE_TARGET) <= COVERAGE_TOLERANCE;
  const wasWidened =
    a.coverage90Adjusted !== null &&
    a.coverage90 !== null &&
    a.coverage90Adjusted !== a.coverage90;

  const scores = [...series.modelScores].sort((x, y) => {
    if (x.mase === null) return 1;
    if (y.mase === null) return -1;
    return x.mase - y.mase;
  });
  const worst = Math.max(...scores.map((s) => s.mase ?? 0), 1);

  const maseOk = a.mase !== null && a.mase < 1.0;
  const monthlyMapeOk = a.mapeMonthly !== null && a.mapeMonthly < GOOD_MONTHLY_MAPE;

  return (
    <div className="p-3">
      {/* Veri yetersizliği veya ölçülememe uyarısı varsa üstte net göster */}
      {a.unmeasuredReason && (
        <div className="flex items-start gap-2 mb-3 p-2.5 rounded-[6px] text-[11px] leading-relaxed text-warning bg-warning-soft border border-warning/30">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{a.unmeasuredReason}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* ── 1. KAZANAN MODEL & STATÜ ── */}
        <section className="flex flex-col justify-between rounded-[7px] border border-border-soft bg-bg-subtle/50 p-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
                Kazanan Algoritma
              </span>
              <Trophy size={14} className={series.baselineWon ? 'text-warning' : 'text-fg'} />
            </div>

            <div className="mt-1">
              <h3 className="text-lg font-extrabold text-fg tracking-tight leading-none truncate">
                {series.selectedModel || 'Hesaplanıyor…'}
              </h3>
              <span className="text-[10.5px] text-fg-subtle block mt-1">
                Rolling-Origin Backtest şampiyonu
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-3 pt-2.5 border-t border-border-soft">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-fg-muted">Taban Karşılaştırması:</span>
              <span
                className={`font-semibold px-1.5 py-0.5 rounded-[4px] text-[10px] ${
                  series.baselineWon
                    ? 'bg-warning-soft text-warning'
                    : 'bg-success-soft text-success'
                }`}
              >
                {series.baselineWon ? 'Taban Kazandı' : 'Tabandan Üstün'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-fg-muted">Test Pencereleri:</span>
              <span className="font-bold text-fg tabular-nums">
                {a.backtestWindows > 0 ? `${a.backtestWindows} Adım` : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* ── 2. DOĞRULUK SKORLARI (KPI) ── */}
        <section className="flex flex-col rounded-[7px] border border-border-soft bg-bg-subtle/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
              Hata Metrikleri
            </span>
            <Activity size={14} className="text-fg-subtle" />
          </div>

          <div className="grid grid-cols-2 gap-2 flex-1">
            {/* MASE */}
            <div className="flex flex-col justify-between p-2 rounded-[5px] bg-card border border-border-soft">
              <div>
                <span className="text-[9.5px] font-bold text-fg-subtle uppercase">MASE</span>
                <div className={`text-base font-extrabold tabular-nums leading-tight mt-0.5 ${maseOk ? 'text-success' : 'text-fg'}`}>
                  {metric(a.mase, 2)}
                </div>
              </div>
              <span className="text-[9px] text-fg-subtle leading-none mt-1">
                &lt;1.0 tabandan iyi
              </span>
            </div>

            {/* Aylık Toplam MAPE */}
            <div className="flex flex-col justify-between p-2 rounded-[5px] bg-card border border-border-soft">
              <div>
                <span className="text-[9.5px] font-bold text-fg-subtle uppercase">30G Toplam MAPE</span>
                <div className={`text-base font-extrabold tabular-nums leading-tight mt-0.5 ${monthlyMapeOk ? 'text-success' : 'text-fg'}`}>
                  {percent(a.mapeMonthly)}
                </div>
              </div>
              <span className="text-[9px] text-fg-subtle leading-none mt-1">
                Kümülatif ciro sapması
              </span>
            </div>

            {/* Günlük MAPE */}
            <div className="flex flex-col justify-between p-2 rounded-[5px] bg-card border border-border-soft">
              <div>
                <span className="text-[9.5px] font-bold text-fg-subtle uppercase">Günlük MAPE</span>
                <div className="text-sm font-bold text-fg tabular-nums leading-tight mt-0.5">
                  {percent(a.mapeDaily)}
                </div>
              </div>
              <span className="text-[9px] text-fg-subtle leading-none mt-1">
                Günlük oynaklık
              </span>
            </div>

            {/* Haftalık MAPE */}
            <div className="flex flex-col justify-between p-2 rounded-[5px] bg-card border border-border-soft">
              <div>
                <span className="text-[9.5px] font-bold text-fg-subtle uppercase">Haftalık MAPE</span>
                <div className="text-sm font-bold text-fg tabular-nums leading-tight mt-0.5">
                  {percent(a.mapeWeekly)}
                </div>
              </div>
              <span className="text-[9px] text-fg-subtle leading-none mt-1">
                Haftalık sepet sapması
              </span>
            </div>
          </div>
        </section>

        {/* ── 3. GÜVEN ARALIĞI & KAPSAMA SAĞLIĞI ── */}
        <section className="flex flex-col justify-between rounded-[7px] border border-border-soft bg-bg-subtle/50 p-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
                Bant Güvenilirliği (%90)
              </span>
              <ShieldCheck size={14} className={coverageOk ? 'text-success' : 'text-warning'} />
            </div>

            <div className="mt-1">
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-extrabold text-fg tabular-nums">
                  {percent(displayedCoverage)}
                </span>
                <span className="text-[10px] font-semibold text-fg-subtle">
                  Hedef: %90 ± 3
                </span>
              </div>

              {/* Progress Gauge */}
              <div className="h-1.5 w-full mt-2 rounded-full bg-border-soft overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    coverageOk ? 'bg-success' : 'bg-warning'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, displayedCoverage ?? 0))}%` }}
                />
              </div>

              <span className="text-[9.5px] text-fg-subtle block mt-1.5 leading-tight">
                {wasWidened
                  ? '⚠️ Ölçülen kapsama düşüktü — tahmin bandı yapay olarak genişletildi.'
                  : coverageOk
                    ? '✅ Tahmin aralığı kalibre; belirsizlik düzeyi gerçekçi.'
                    : 'Gerçekleşen değerlerin bandı karşılama oranı tolerans sınırında.'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 border-t border-border-soft text-[11px] mt-2">
            <span className="text-fg-muted">Model Sapması (Bias):</span>
            <span
              className={`font-bold tabular-nums ${
                a.bias === null || Math.abs(a.bias) <= 5
                  ? 'text-fg'
                  : a.bias > 0
                    ? 'text-warning'
                    : 'text-danger'
              }`}
            >
              {percent(a.bias)}
            </span>
          </div>
        </section>

        {/* ── 4. MODEL YARIŞI LEADERBOARD ── */}
        <section className="flex flex-col rounded-[7px] border border-border-soft bg-bg-subtle/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
              Model Yarışı (En İyi 4)
            </span>
            <span className="text-[9.5px] text-fg-subtle">MASE Sıralaması</span>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 justify-center">
            {scores.slice(0, 4).map((m, idx) => {
              const isSelected = m.name === series.selectedModel;
              const barWidth = m.mase === null ? 5 : Math.max(8, (1 - m.mase / (worst * 1.1)) * 100);

              return (
                <div key={m.name} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-[10.5px]">
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <span className={`w-3.5 text-[9.5px] font-bold ${idx === 0 ? 'text-fg' : 'text-fg-subtle'}`}>
                        #{idx + 1}
                      </span>
                      <span className={`truncate ${isSelected ? 'font-bold text-fg' : 'text-fg-muted'}`}>
                        {m.name}
                      </span>
                      {m.isBaseline && (
                        <span className="px-1 py-0.2 text-[8.5px] rounded bg-bg-subtle text-fg-subtle uppercase">
                          Taban
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums text-fg shrink-0 ml-1.5">
                      {metric(m.mase, 2)}
                    </span>
                  </div>

                  <div className="h-1 w-full rounded-full bg-border-soft overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isSelected ? 'bg-fg' : 'bg-fg-subtle/60'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
