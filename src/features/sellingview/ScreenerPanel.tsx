'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, BellPlus, Bell, BellOff, Trash2 } from 'lucide-react';
import { forecastApi } from '../../lib/api/forecast';
import type { AlertRule, ScreenerCondition, ScreenerField, ScreenerOperator } from '../../types/forecast';
import { MoversTable } from '../../components/analytics/terminal/MoversTable';
import { Dropdown, type DropdownOption } from '../../components/analytics/terminal/Dropdown';

const FIELD_OPTIONS: DropdownOption<ScreenerField>[] = [
  { value: 'Units', label: 'Adet', hint: 'pencerede satılan toplam adet' },
  { value: 'Revenue', label: 'Ciro', hint: 'pencerede oluşan ciro (TL)' },
  { value: 'DeltaPercent', label: 'Değişim %', hint: 'önceki eşit pencereye göre adet değişimi' },
  { value: 'MarginPercent', label: 'Marj %', hint: 'brüt marj — alış fiyatı bilinmiyorsa elenir' },
  { value: 'DaysOfSupply', label: 'Stok kapsama günü', hint: 'stok ÷ günlük ortalama talep' },
  { value: 'Stock', label: 'Stok adedi', hint: 'eldeki güncel stok' },
];

const OPERATOR_OPTIONS: DropdownOption<ScreenerOperator>[] = [
  { value: 'GreaterThan', label: 'büyüktür  >' },
  { value: 'LessThan', label: 'küçüktür  <' },
];

/**
 * H1 — Tarayıcı. "Çok satanlar" sabit listesinin genelleştirilmiş hâli:
 * kullanıcı kendi sorusunu sorar.
 *
 *   "stok kapsaması < 10 gün VE marj > %20"
 *
 * ÖLÇÜLEMEYEN DEĞER HİÇBİR KOŞULU GEÇMEZ (backend kuralı) ve kaç satırın bu
 * yüzden elendiği ekranda AÇIKÇA yazar — aksi halde kullanıcı "sadece 23 ürünüm
 * var" diye yanlış sonuç çıkarır.
 */
export function ScreenerContent() {
  const [conditions, setConditions] = useState<ScreenerCondition[]>([
    { field: 'DaysOfSupply', operator: 'LessThan', value: 10 },
  ]);
  const [windowDays, setWindowDays] = useState(30);
  const [alertName, setAlertName] = useState('');
  const qc = useQueryClient();

  const run = useMutation({
    mutationFn: () =>
      forecastApi.screen({ conditions, windowDays, sortBy: 'Units', sortAscending: false, limit: 50 }),
  });

  // H2 — alarm = KAYDEDİLMİŞ TARAMA. Ayrı bir ekran değil, taramanın devamı:
  // kullanıcı sonucu görür, beğenirse "her gün beni uyar" der.
  const { data: rules } = useQuery({
    queryKey: ['forecast-alert-rules'],
    queryFn: () => forecastApi.alertRules.list(),
  });

  const saveAlert = useMutation({
    mutationFn: () =>
      forecastApi.alertRules.upsert({
        id: 0,
        name: alertName.trim(),
        conditions,
        windowDays,
        isEnabled: true,
        cooldownHours: 24,
        lastFiredAtUtc: null,
        lastMatchCount: null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forecast-alert-rules'] });
      setAlertName('');
    },
  });

  const toggleAlert = useMutation({
    mutationFn: (r: AlertRule) => forecastApi.alertRules.upsert({ ...r, isEnabled: !r.isEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecast-alert-rules'] }),
  });

  const removeAlert = useMutation({
    mutationFn: (id: number) => forecastApi.alertRules.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forecast-alert-rules'] }),
  });

  const update = (i: number, patch: Partial<ScreenerCondition>) =>
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

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
                title="Koşulu kaldır"
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
              setConditions((p) => [...p, { field: 'MarginPercent', operator: 'GreaterThan', value: 20 }])
            }
            className="flex items-center gap-1 text-ui-xs font-semibold text-fg hover:underline cursor-pointer"
          >
            <Plus size={11} /> koşul ekle
          </button>

          <label className="ml-auto flex items-center gap-1.5 text-ui-xs text-fg-muted">
            pencere
            <input
              type="number"
              min={1}
              max={365}
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="h-7 w-14 px-1.5 text-ui-xs text-right tabular-nums rounded-[5px] border border-border-soft bg-bg-subtle outline-none focus:border-fg text-fg"
            />
            gün
          </label>

          <button
            type="button"
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="px-3 py-1.5 rounded-[5px] bg-fg hover:bg-fg text-bg text-ui-xs font-semibold disabled:opacity-50 cursor-pointer transition-colors"
          >
            {run.isPending ? 'Taranıyor…' : 'Tara'}
          </button>
        </div>

        {/* H2 - alarm = kaydedilmiş tarama. Ayrı ekran değil, taramanın devamı. */}
        <div className="flex items-center gap-1.5 pt-2 mt-1 border-t border-border-soft">
          <BellPlus size={12} className="text-fg-subtle shrink-0" />
          <input
            value={alertName}
            onChange={(e) => setAlertName(e.target.value)}
            placeholder="Bu taramayı alarm olarak kaydet (ad verin)…"
            className="flex-1 min-w-0 h-7 px-1.5 text-ui-xs rounded-[5px] border border-border-soft bg-bg-subtle outline-none focus:border-fg text-fg placeholder:text-fg-subtle"
          />
          <button
            type="button"
            disabled={alertName.trim().length === 0 || saveAlert.isPending}
            onClick={() => saveAlert.mutate()}
            className="px-2.5 py-1.5 rounded-[5px] border border-border-soft text-ui-xs font-semibold text-fg hover:bg-bg-subtle disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {saveAlert.isPending ? 'Kaydediliyor…' : 'Alarm kur'}
          </button>
        </div>
        {saveAlert.isError && (
          <div className="text-ui-xs text-danger">
            {(saveAlert.error as Error)?.message ?? 'Alarm kaydedilemedi.'}
          </div>
        )}

        {rules && rules.length > 0 && (
          <div className="flex flex-col gap-1 pt-1.5">
            <span className="text-ui-2xs font-semibold uppercase tracking-wider text-fg-subtle">
              Kurulu alarmlar · her gün 04:50'de taranır
            </span>
            {rules.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-ui-xs">
                <button
                  type="button"
                  onClick={() => toggleAlert.mutate(r)}
                  title={r.isEnabled ? 'Devre dışı bırak' : 'Etkinleştir'}
                  className={`shrink-0 cursor-pointer ${
                    r.isEnabled ? 'text-success' : 'text-fg-subtle'
                  }`}
                >
                  {r.isEnabled ? <Bell size={12} /> : <BellOff size={12} />}
                </button>
                <span
                  className={`truncate ${
                    r.isEnabled ? 'text-fg' : 'text-fg-subtle line-through'
                  }`}
                >
                  {r.name}
                </span>
                <span className="ml-auto shrink-0 text-ui-2xs text-fg-subtle tabular-nums">
                  {r.lastMatchCount === null ? 'henüz taranmadı' : `son tarama: ${r.lastMatchCount} eşleşme`}
                </span>
                <button
                  type="button"
                  onClick={() => removeAlert.mutate(r.id)}
                  title="Alarmı sil"
                  className="shrink-0 text-fg-subtle hover:text-danger cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        {run.isError && <p className="px-3 py-4 m-0 text-ui-xs text-danger">Tarama başarısız oldu.</p>}
        {run.data && (
          <>
            <div className="px-3 py-2 text-ui-xs text-fg-muted border-b border-border-soft">
              <strong className="text-fg">{run.data.rows.length}</strong> sonuç ·{' '}
              {run.data.totalCandidates} aday üründen · son {run.data.windowDays} gün
              {run.data.excludedUnknown > 0 && (
                <span className="text-warning">
                  {' '}
                  · {run.data.excludedUnknown} ürün ölçülemeyen değer yüzünden elendi
                </span>
              )}
            </div>
            <MoversTable rows={run.data.rows} emptyText="Koşullara uyan ürün yok." />
          </>
        )}
        {!run.data && !run.isError && (
          <p className="px-3 py-6 m-0 text-ui-xs text-fg-subtle text-center">
            Koşulları belirleyip "Tara"ya basın.
          </p>
        )}
      </div>
    </div>
  );
}
