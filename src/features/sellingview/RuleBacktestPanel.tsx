'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { forecastApi } from '../../lib/api/forecast';
import type { ScreenerCondition, ScreenerField, ScreenerOperator } from '../../types/forecast';
import { Dropdown, type DropdownOption } from '../../components/analytics/terminal/Dropdown';

const FIELD_OPTIONS: DropdownOption<ScreenerField>[] = [
  { value: 'Units', label: 'Adet' },
  { value: 'Revenue', label: 'Ciro' },
  { value: 'DeltaPercent', label: 'Değişim %' },
  { value: 'MarginPercent', label: 'Marj %' },
  { value: 'DaysOfSupply', label: 'Stok kapsama günü', hint: 'geçmişe uygulanamaz — stok görüntüsü gerekir' },
  { value: 'Stock', label: 'Stok adedi', hint: 'geçmişe uygulanamaz — stok görüntüsü gerekir' },
];

const OPERATOR_OPTIONS: DropdownOption<ScreenerOperator>[] = [
  { value: 'GreaterThan', label: 'büyüktür  >' },
  { value: 'LessThan', label: 'küçüktür  <' },
];

const MONTHS_OPTIONS: DropdownOption<string>[] = [
  { value: '3', label: 'Son 3 ay' },
  { value: '6', label: 'Son 6 ay' },
  { value: '12', label: 'Son 12 ay' },
];

const STEP_OPTIONS: DropdownOption<string>[] = [
  { value: '7', label: 'Haftalık örnekle' },
  { value: '14', label: '2 haftada bir' },
  { value: '30', label: 'Aylık örnekle' },
];

/**
 * H3 — kural backtest'i.
 *
 * "Bu alarmı kursaydım son 6 ayda kaç kez öterdi?" — alarm yorgunluğuna karşı
 * en somut savunma: kural kurulmadan ÖNCE davranışını görmek.
 *
 * ⛔ TAHMİN BACKTEST'İ DEĞİLDİR (o ModelCard'daki MASE/MAPE'dir). Bu, KARAR
 * KURALININ geçmişteki davranışını ölçer.
 *
 * ⛔ Stok koşulları geçmişe uygulanamaz — stok anlık görüntüsü yeni toplanmaya
 * başladı. O noktalar SIFIR değil "ölçülemedi" olarak çizilir; grafikte boşluk
 * olarak görünür ve sebebi yazar.
 */
export function RuleBacktestContent() {
  const [conditions, setConditions] = useState<ScreenerCondition[]>([
    { field: 'MarginPercent', operator: 'LessThan', value: 15 },
  ]);
  const [windowDays, setWindowDays] = useState(30);
  const [monthsBack, setMonthsBack] = useState('6');
  const [stepDays, setStepDays] = useState('7');

  const run = useMutation({
    mutationFn: () =>
      forecastApi.ruleBacktest({
        conditions,
        windowDays,
        monthsBack: Number(monthsBack),
        stepDays: Number(stepDays),
      }),
  });

  const update = (i: number, patch: Partial<ScreenerCondition>) =>
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const result = run.data;
  const maxMatches = result
    ? Math.max(1, ...result.points.map((p) => p.matchCount ?? 0))
    : 1;

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2.5 flex flex-col gap-2 border-b border-border-soft shrink-0">
        {conditions.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-ui-2xs font-bold text-fg-subtle w-6 shrink-0">{i === 0 ? '' : 'VE'}</span>
            <Dropdown
              options={FIELD_OPTIONS}
              value={c.field}
              onChange={(field) => update(i, { field })}
              widthClass="w-[190px]"
            />
            <Dropdown
              options={OPERATOR_OPTIONS}
              value={c.operator}
              onChange={(operator) => update(i, { operator })}
              widthClass="w-[124px]"
            />
            <input
              type="number"
              value={c.value}
              onChange={(e) => update(i, { value: Number(e.target.value) })}
              className="h-7 w-20 px-1.5 text-ui-xs text-right tabular-nums rounded-[5px] border border-border-soft bg-bg-subtle outline-none focus:border-fg text-fg"
            />
            {conditions.length > 1 && (
              <button
                type="button"
                onClick={() => setConditions((p) => p.filter((_, idx) => idx !== i))}
                className="text-fg-subtle hover:text-danger cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onClick={() =>
              setConditions((p) => [...p, { field: 'Units', operator: 'GreaterThan', value: 5 }])
            }
            className="flex items-center gap-1 text-ui-xs font-semibold text-fg hover:underline cursor-pointer"
          >
            <Plus size={11} /> koşul ekle
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <Dropdown options={MONTHS_OPTIONS} value={monthsBack} onChange={setMonthsBack} widthClass="w-[118px]" />
            <Dropdown options={STEP_OPTIONS} value={stepDays} onChange={setStepDays} widthClass="w-[136px]" />
            <label className="flex items-center gap-1 text-ui-xs text-fg-muted">
              pencere
              <input
                type="number"
                min={1}
                max={365}
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                className="h-7 w-14 px-1.5 text-ui-xs text-right tabular-nums rounded-[5px] border border-border-soft bg-bg-subtle outline-none focus:border-fg text-fg"
              />
              g
            </label>
            <button
              type="button"
              onClick={() => run.mutate()}
              disabled={run.isPending}
              className="px-3 py-1.5 rounded-[5px] bg-fg hover:bg-fg text-bg text-ui-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors"
            >
              {run.isPending ? 'Test ediliyor…' : 'Geçmişe uygula'}
            </button>
          </div>
        </div>
      </div>

      <div>
        {run.isError && <p className="px-3 py-4 m-0 text-ui-xs text-danger">Backtest çalıştırılamadı.</p>}

        {!result && !run.isError && (
          <p className="px-3 py-6 m-0 text-ui-xs text-fg-subtle text-center max-w-[62ch] mx-auto">
            Bir kural yazıp "Geçmişe uygula"ya basın. Bu, alarm kurmadan önce
            "günde kaç kez öteceğim" sorusunun cevabıdır — tahmin doğruluğu testi DEĞİL.
          </p>
        )}

        {result && (
          <div className="p-3 flex flex-col gap-3">
            {result.notice && (
              <div className="flex items-start gap-2 px-2.5 py-2 rounded-[5px] border border-warning bg-warning-soft text-ui-xs text-warning">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{result.notice}</span>
              </div>
            )}

            <div className="flex items-baseline gap-4 flex-wrap">
              <Metric
                label="Ortalama eşleşme"
                value={result.averageMatches === null ? '—' : result.averageMatches.toFixed(1)}
              />
              <Metric label="Ölçülen nokta" value={String(result.measuredPoints)} />
              <Metric
                label="Ölçülemeyen"
                value={String(result.unmeasurablePoints)}
                tone={result.unmeasurablePoints > 0 ? 'warn' : undefined}
              />
            </div>

            {/* Basit sütun grafiği — ölçülemeyen nokta BOŞLUK olarak çizilir,
                sıfır sütun olarak DEĞİL. Sıfır çizmek "kural o gün ötmedi"
                demekti; oysa bilmiyoruz. */}
            <div className="flex items-end gap-[3px] h-[120px] px-1 border-b border-border-soft">
              {result.points.map((p) => {
                const measured = p.matchCount !== null;
                const height = measured ? Math.max(2, (p.matchCount! / maxMatches) * 100) : 100;
                return (
                  <div
                    key={p.asOfUtc}
                    title={
                      measured
                        ? `${new Date(p.asOfUtc).toLocaleDateString('tr-TR')} · ${p.matchCount} eşleşme · ${p.totalCandidates} aday`
                        : `${new Date(p.asOfUtc).toLocaleDateString('tr-TR')} · ${p.unmeasurableReason}`
                    }
                    style={{ height: `${height}%` }}
                    className={`flex-1 min-w-[4px] rounded-t-[2px] ${
                      measured
                        ? 'bg-fg hover:bg-fg'
                        : 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(161,161,170,0.35)_3px,rgba(161,161,170,0.35)_6px)]'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-ui-2xs text-fg-subtle">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-fg" /> eşleşme sayısı
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(161,161,170,0.35)_3px,rgba(161,161,170,0.35)_6px)] border border-border" />
                ölçülemedi (sıfır değil)
              </span>
              <span className="ml-auto">
                {result.points.length} nokta · {new Date(result.points[0]?.asOfUtc).toLocaleDateString('tr-TR')} →{' '}
                {new Date(result.points[result.points.length - 1]?.asOfUtc).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <span className="flex flex-col">
      <span className="text-ui-2xs font-semibold uppercase tracking-wider text-fg-subtle">{label}</span>
      <span
        className={`text-ui-lg font-bold tabular-nums ${
          tone === 'warn' ? 'text-warning' : 'text-fg'
        }`}
      >
        {value}
      </span>
    </span>
  );
}
