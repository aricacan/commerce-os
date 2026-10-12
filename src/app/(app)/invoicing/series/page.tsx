'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Star, Trash2 } from 'lucide-react';
import {
  invoiceSeriesApi,
  SCENARIO_LABEL,
  type EInvoiceScenario,
  type InvoiceSeries,
} from '../../../../lib/api/e-belge';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

export default function InvoiceSeriesPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ code: string; scenario: EInvoiceScenario; description: string; isDefault: boolean }>({
    code: '',
    scenario: 'EFatura',
    description: '',
    isDefault: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-series', billingEntityId, year],
    queryFn: () => invoiceSeriesApi.list(billingEntityId!, year),
    enabled: billingEntityId !== null,
    staleTime: 10_000,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['invoice-series'] });

  const createSeries = useMutation({
    mutationFn: () =>
      invoiceSeriesApi.create({
        billingEntityId: billingEntityId!,
        code: form.code,
        scenario: form.scenario,
        description: form.description.trim() || null,
        isDefault: form.isDefault,
      }),
    onSuccess: () => {
      toast.success(tr ? 'Seri tanımlandı.' : 'Series created.');
      setShowForm(false);
      setForm({ code: '', scenario: 'EFatura', description: '', isDefault: true });
      invalidate();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const updateSeries = useMutation({
    mutationFn: ({ series, patch }: { series: InvoiceSeries; patch: Partial<Pick<InvoiceSeries, 'isActive' | 'isDefault'>> }) =>
      invoiceSeriesApi.update(series.id, {
        description: series.description,
        isActive: patch.isActive ?? series.isActive,
        isDefault: patch.isDefault ?? series.isDefault,
      }),
    onSuccess: () => { toast.success(tr ? 'Seri güncellendi.' : 'Series updated.'); invalidate(); },
    onError: (e) => toast.error(describeError(e)),
  });

  const deleteSeries = useMutation({
    mutationFn: (id: number) => invoiceSeriesApi.remove(id),
    onSuccess: () => { toast.success(tr ? 'Seri silindi.' : 'Series deleted.'); invalidate(); },
    onError: (e) => toast.error(describeError(e)),
  });

  const series = data ?? [];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <InvoicingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Fatura Serileri' : 'Invoice Series'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'GİB fatura numarasının ilk 3 karakteri. Müteselsillik seri bazında denetlenir.'
                : 'The first 3 characters of the GİB invoice number. Sequence integrity is checked per series.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={200}
            />
            <FilterSelect
              value={String(year)}
              placeholder={tr ? 'Yıl' : 'Year'}
              onChange={(v) => setYear(Number(v))}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
              minWidth={90}
            />
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              disabled={!billingEntityId}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
            >
              <Plus size={13} />
              <span>{tr ? 'Yeni Seri' : 'New Series'}</span>
            </button>
          </div>
        </div>

        {showForm && (
          <form
            className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 space-y-3 shadow-xs"
            onSubmit={(e) => { e.preventDefault(); createSeries.mutate(); }}
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Seri Kodu (3 karakter)' : 'Series Code'}
                </span>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().slice(0, 3) })}
                  maxLength={3}
                  required
                  placeholder="TCE"
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-mono font-bold tracking-widest text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Senaryo' : 'Scenario'}
                </span>
                <select
                  value={form.scenario}
                  onChange={(e) => setForm({ ...form, scenario: e.target.value as EInvoiceScenario })}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
                >
                  <option value="EFatura">e-Fatura</option>
                  <option value="EArsivFatura">e-Arşiv</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Açıklama' : 'Description'}
                </span>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="cursor-pointer"
                />
                {tr ? 'Bu senaryoda varsayılan seri olsun' : 'Set as default for this scenario'}
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  {tr ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={createSeries.isPending}
                  className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] transition cursor-pointer disabled:opacity-40"
                >
                  {tr ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[var(--fg-muted)]">
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Seri' : 'Series'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Senaryo' : 'Scenario'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Açıklama' : 'Description'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? `${year} Son Fatura No` : `Last No (${year})`}</th>
                  <th className="px-3 py-2 text-right font-semibold">{tr ? 'Sıra' : 'Seq'}</th>
                  <th className="px-3 py-2 text-center font-semibold">{tr ? 'Varsayılan' : 'Default'}</th>
                  <th className="px-3 py-2 text-center font-semibold">{tr ? 'Durum' : 'Status'}</th>
                  <th className="px-3 py-2 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</td></tr>
                )}
                {!isLoading && series.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[var(--fg-muted)]">
                      {tr
                        ? 'Tanımlı seri yok. Seri tanımlanmadan otomatik fatura numarası üretilemez.'
                        : 'No series defined. Automatic numbering requires at least one series.'}
                    </td>
                  </tr>
                )}
                {series.map((s) => (
                  <tr key={s.id} className={`border-b border-[var(--border-soft)] last:border-0 ${s.isActive ? '' : 'opacity-50'}`}>
                    <td className="px-3 py-2">
                      <span className="font-mono font-bold tracking-widest text-[var(--fg)]">{s.code}</span>
                    </td>
                    <td className="px-3 py-2 text-[var(--fg)]">{SCENARIO_LABEL[s.scenario]}</td>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">{s.description ?? '—'}</td>
                    <td className="px-3 py-2 font-mono tabular-nums text-[var(--fg)]">{s.lastInvoiceNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--fg-muted)]">{s.lastSequence}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        title={tr ? 'Varsayılan yap' : 'Set default'}
                        onClick={() => updateSeries.mutate({ series: s, patch: { isDefault: true } })}
                        disabled={s.isDefault || !s.isActive}
                        className="cursor-pointer disabled:cursor-default"
                      >
                        <Star
                          size={14}
                          className={s.isDefault ? 'text-amber-400 fill-amber-400' : 'text-[var(--fg-muted)] hover:text-amber-400'}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => updateSeries.mutate({ series: s, patch: { isActive: !s.isActive } })}
                        className={`rounded-[3px] px-2 py-0.5 text-[10.5px] font-bold cursor-pointer ${
                          s.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
                        }`}
                      >
                        {s.isActive ? (tr ? 'Aktif' : 'Active') : (tr ? 'Pasif' : 'Inactive')}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        title={tr ? 'Sil' : 'Delete'}
                        onClick={() => deleteSeries.mutate(s.id)}
                        disabled={s.lastSequence > 0}
                        className="text-[var(--fg-muted)] hover:text-red-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
