'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink, Lightbulb, Loader2, RefreshCw, RotateCcw, Save, Sparkles, X } from 'lucide-react';
import { channelFeesApi, type ChannelFeeRow, type FeeRefreshResult, type MarketplaceFeeSuggestion } from '../../lib/api/channel-fees';
import { pushAlert } from '../../stores/alert-stack';
import { useBackgroundJobs } from '../../stores/background-jobs';

const PERCENT = 100;

const toPercentText = (fraction: number) => String(Math.round(fraction * PERCENT * 100) / 100);
const parseNumber = (text: string) => {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || !Number.isFinite(value) ? null : value;
};
const FEE_REFRESH_JOB = 'channel-fees';
const startedLabel = (startedAt: number) =>
  `${new Date(startedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'de başladı`;
const rowKey = (row: ChannelFeeRow) => `${row.dataSourceId}-${row.platformId}-${row.storeId}`;

/**
 * Oranı girilmemiş ve gerçek kesinti de bildirmeyen kanal: komisyonu kâra hiç yansımıyor.
 * Kanala bilerek %0 kaydedildiyse (doğrudan satış: Sentos, elle sipariş) eksik değildir.
 */
export const isRateMissing = (row: ChannelFeeRow) =>
  row.commissionRate <= 0 && row.ordersWithReportedFees === 0 && !row.hasOverride;

// Kanal (ERP kaynağı × pazaryeri × marka) bazlı kesinti oranları. Kanallar siparişlerden
// türetilir: yeni bir ERP ya da pazaryeri satış yaptığında kod değişmeden burada belirir.
export function ChannelFeesCard() {
  const channels = useQuery({ queryKey: ['channel-fees'], queryFn: channelFeesApi.list });
  // İş arka planda sürer; durumu store'da tutulur — sayfadan çıkıp dönünce de görünür.
  const runningJob = useBackgroundJobs((s) => s.running[FEE_REFRESH_JOB]);
  const finishedJob = useBackgroundJobs((s) => s.finished[FEE_REFRESH_JOB]);
  const trackJob = useBackgroundJobs((s) => s.track);
  const dismissJob = useBackgroundJobs((s) => s.dismiss);
  const results = finishedJob?.ok ? (finishedJob.result as FeeRefreshResult[] | null) : null;

  const refresh = useMutation({
    mutationFn: channelFeesApi.refresh,
    onSuccess: ({ jobId }) => trackJob({
      key: FEE_REFRESH_JOB, jobId, kind: 'channel-fees', label: 'Kesinti yenileme', startedAt: Date.now(),
    }),
    onError: (err) => pushAlert(err instanceof Error ? err.message : 'Kesintiler yenilenemedi.', 'error', 6000),
  });
  const refreshing = refresh.isPending || !!runningJob;

  const missingCount = (channels.data ?? []).filter(isRateMissing).length;

  return (
    <section data-tour="platforms-channels" className="flex flex-col gap-4 rounded-[8px] border border-[var(--border-soft)] bg-[var(--card)] p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="m-0 text-[13px] font-semibold text-[var(--fg)]">Kanal kesintileri</h2>
        <button
          type="button"
          data-tour="platforms-refresh"
          onClick={() => refresh.mutate()}
          disabled={refreshing}
          title="Gerçek kesinti bildiren ERP'lerden kesintileri şimdi çeker (arka planda çalışır)"
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
        >
          {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {runningJob ? `Yenileniyor · ${startedLabel(runningJob.startedAt)}` : 'Kesintileri ERP\'den yenile'}
        </button>
      </header>

      {results && <RefreshResults results={results} onClose={() => dismissJob(FEE_REFRESH_JOB)} />}

      {missingCount > 0 && (
        <div className="flex items-start gap-2 rounded-[6px] border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-[var(--fg)]">
          <AlertTriangle size={14} className="mt-px shrink-0 text-amber-500" />
          <span>
            <b>{missingCount} kanalın</b> oranı yok — komisyonu kâra yansımıyor. Öneri varsa tıklayıp kaydedin.
          </span>
        </div>
      )}

      {channels.isLoading ? (
        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-[var(--fg-muted)]" size={18} /></div>
      ) : !channels.data?.length ? (
        <p className="m-0 text-xs text-[var(--fg-muted)]">Son bir yılda satış yapan kanal yok.</p>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-[var(--border-soft)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="bg-[var(--bg-subtle)] text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
              <tr>
                <th className="px-3 py-2.5">Kanal</th>
                <th className="px-3 py-2.5 text-right">Sipariş</th>
                <th className="px-3 py-2.5 text-right">Gerçek kesinti</th>
                <th className="px-3 py-2.5 text-right">Komisyon</th>
                <th className="px-3 py-2.5 text-right">Hizmet bedeli</th>
                <th className="px-3 py-2.5 text-right">KDV</th>
                <th className="w-20 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {channels.data.map((row) => <ChannelFeeTableRow key={rowKey(row)} row={row} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RefreshResults({ results, onClose }: { results: FeeRefreshResult[]; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--fg)]">Yenileme sonucu</span>
        <button type="button" aria-label="Kapat" onClick={onClose} className="text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
          <X size={14} />
        </button>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-xs">
        {results.map((r) => (
          <li key={r.dataSourceId} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-[var(--fg)]">{r.sourceName} <span className="text-[var(--fg-muted)]">· {r.erp}</span></span>
            <span className={r.supported && r.ordersWithFees > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--fg-muted)]'}>
              {r.supported && r.ordersFetched > 0
                ? `${r.ordersFetched} sipariş okundu · ${r.ordersWithFees} kesintili · ${r.ordersUpdated} güncellendi`
                : null}
              {r.message && <span className="ml-1">{r.message}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SuffixInput({ value, onChange, suffix, label, warn }: { value: string; onChange: (v: string) => void; suffix: string; label: string; warn?: boolean }) {
  return (
    <div className="relative ml-auto w-24">
      <input
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 w-full rounded-[6px] border bg-[var(--bg)] pl-2 pr-6 text-right font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)] ${
          warn ? 'border-amber-500/60' : 'border-[var(--border)]'
        }`}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--fg-muted)]">{suffix}</span>
    </div>
  );
}

function ChannelFeeTableRow({ row }: { row: ChannelFeeRow }) {
  const queryClient = useQueryClient();
  const [commission, setCommission] = useState(toPercentText(row.commissionRate));
  const [serviceFee, setServiceFee] = useState(String(row.serviceFee));
  const [vat, setVat] = useState(toPercentText(row.vatRate));
  const missing = isRateMissing(row);
  // Öneri: araştırılmış katalogdan gelir; yoksa kullanıcı isterse yapay zekâdan alınır.
  const [aiSuggestion, setAiSuggestion] = useState<MarketplaceFeeSuggestion | null>(null);
  const reference = row.suggestion ?? aiSuggestion;
  const suggestion = reference && Math.abs(reference.commissionPercent - (parseNumber(commission) ?? -1)) > 0.001 ? reference : null;
  const askAi = useMutation({
    mutationFn: () => channelFeesApi.suggest(row.platformName, row.country),
    onSuccess: setAiSuggestion,
    onError: (err) => pushAlert(err instanceof Error ? err.message : 'Öneri alınamadı.', 'info', 6000),
  });
  const applySuggestion = (s: MarketplaceFeeSuggestion) => {
    setCommission(String(s.commissionPercent));
    if (s.serviceFee > 0) setServiceFee(String(s.serviceFee));
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['channel-fees'] });
  const onError = (err: unknown) => pushAlert(err instanceof Error ? err.message : 'Kaydedilemedi.', 'error', 6000);

  const save = useMutation({
    mutationFn: channelFeesApi.save,
    onSuccess: () => { pushAlert(`${row.dataSourceName} · ${row.platformName} oranı kaydedildi.`, 'success', 4000); refresh(); },
    onError,
  });
  const reset = useMutation({ mutationFn: channelFeesApi.reset, onSuccess: refresh, onError });

  const submit = () => {
    const values = [parseNumber(commission), parseNumber(serviceFee), parseNumber(vat)];
    if (values.some((v) => v === null)) {
      pushAlert('Oranlar sayı olmalı.', 'error', 5000);
      return;
    }
    const [commissionValue, serviceFeeValue, vatValue] = values as number[];
    save.mutate({
      platformId: row.platformId,
      storeId: row.storeId,
      dataSourceId: row.dataSourceId,
      commissionRate: commissionValue / PERCENT,
      serviceFee: serviceFeeValue,
      vatRate: vatValue / PERCENT,
    });
  };

  return (
    <tr className={missing ? 'bg-amber-500/[0.04]' : 'hover:bg-[var(--bg-subtle)]/40'}>
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-[var(--fg)]">{row.platformName} · {row.storeName}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-[var(--fg-muted)]">
            {row.country} · {row.dataSourceName}
            {suggestion && (
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applySuggestion(suggestion)}
                  title={`${suggestion.note}${suggestion.sourceName ? `\nKaynak: ${suggestion.sourceName}` : ''} · ${suggestion.checkedOn}`}
                  className="inline-flex items-center gap-1 rounded-[4px] bg-violet-500/10 px-1.5 py-px text-[10px] font-semibold text-violet-600 transition hover:bg-violet-500/20 dark:text-violet-400 cursor-pointer"
                >
                  {suggestion.kind === 'Ai' ? <Sparkles size={10} /> : <Lightbulb size={10} />}
                  {suggestion.kind === 'Ai' ? 'AI tahmini' : 'Öneri'} %{suggestion.commissionPercent.toLocaleString('tr-TR')}
                  {suggestion.serviceFee > 0 && ` + ${suggestion.serviceFee.toLocaleString('tr-TR')}`}
                </button>
                {suggestion.sourceUrl && (
                  <a
                    href={suggestion.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Oranın kaynağı"
                    className="text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  >
                    <ExternalLink size={10} />
                  </a>
                )}
              </span>
            )}
            {!reference && (
              <button
                type="button"
                onClick={() => askAi.mutate()}
                disabled={askAi.isPending}
                title="Bu pazaryeri araştırılmış listede yok — yapay zekâdan tahmini oran iste"
                className="inline-flex items-center gap-1 rounded-[4px] border border-violet-500/30 px-1.5 py-px text-[10px] font-semibold text-violet-600 transition hover:bg-violet-500/10 disabled:opacity-50 dark:text-violet-400 cursor-pointer"
              >
                {askAi.isPending ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} AI ile öner
              </button>
            )}
            {missing ? (
              <span className="rounded-[4px] bg-amber-500/15 px-1.5 py-px text-[10px] font-semibold text-amber-700 dark:text-amber-400">Oran yok</span>
            ) : (
              <span className={`rounded-[4px] px-1.5 py-px text-[10px] font-semibold ${
                row.hasOverride ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
              }`}
              >
                {row.hasOverride ? 'Kanala özel' : 'Genel oran'}
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--fg-muted)]">{row.orderCount.toLocaleString('tr-TR')}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--fg-muted)]">
        {row.ordersWithReportedFees > 0 ? `${row.ordersWithReportedFees}/${row.orderCount}` : '—'}
      </td>
      <td className="px-3 py-2"><SuffixInput label="Komisyon yüzdesi" value={commission} onChange={setCommission} suffix="%" warn={missing} /></td>
      <td className="px-3 py-2"><SuffixInput label="Adet başı hizmet bedeli" value={serviceFee} onChange={setServiceFee} suffix="₺" /></td>
      <td className="px-3 py-2"><SuffixInput label="KDV yüzdesi" value={vat} onChange={setVat} suffix="%" /></td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          {row.hasOverride && (
            <button
              type="button"
              aria-label="Genel orana dön"
              title="Genel orana dön"
              onClick={() => reset.mutate(row)}
              disabled={reset.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            type="button"
            aria-label="Kaydet"
            title="Bu kanala özel kaydet"
            onClick={submit}
            disabled={save.isPending}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border)] text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-40 cursor-pointer"
          >
            {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          </button>
        </div>
      </td>
    </tr>
  );
}
