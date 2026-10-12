'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Play, RefreshCw, RotateCcw, Save, X } from 'lucide-react';
import { priceIntelligenceApi, type PricePolicy } from '../../lib/api';
import { PriceComparisonPageShell } from './PriceComparisonPageShell';

export function PriceDecisionTab() {
  const qc = useQueryClient();
  const policyQuery = useQuery({ queryKey: ['price-policy'], queryFn: priceIntelligenceApi.policy });
  const recQuery = useQuery({ queryKey: ['price-recommendations'], queryFn: priceIntelligenceApi.recommendations });
  const proposalQuery = useQuery({ queryKey: ['price-proposals'], queryFn: priceIntelligenceApi.proposals });
  const ebayQuery = useQuery({ queryKey: ['ebay-sync-status'], queryFn: priceIntelligenceApi.ebayStatus });

  const [editedPolicy, setEditedPolicy] = useState<PricePolicy | null>(null);
  const policy = editedPolicy ?? policyQuery.data ?? null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['price-recommendations'] });
    qc.invalidateQueries({ queryKey: ['price-proposals'] });
    qc.invalidateQueries({ queryKey: ['ebay-sync-status'] });
  };

  const save = useMutation({
    mutationFn: priceIntelligenceApi.savePolicy,
    onSuccess: (value) => {
      setEditedPolicy(value);
      qc.setQueryData(['price-policy'], value);
    },
  });
  const calculate = useMutation({ mutationFn: priceIntelligenceApi.calculate, onSuccess: refresh });
  const sync = useMutation({ mutationFn: priceIntelligenceApi.syncEbay, onSuccess: refresh });
  const create = useMutation({ mutationFn: priceIntelligenceApi.createProposal, onSuccess: refresh });
  const approve = useMutation({ mutationFn: priceIntelligenceApi.approve, onSuccess: refresh });
  const reject = useMutation({ mutationFn: priceIntelligenceApi.reject, onSuccess: refresh });
  const rollback = useMutation({ mutationFn: priceIntelligenceApi.rollback, onSuccess: refresh });

  const error = [
    policyQuery.error,
    recQuery.error,
    proposalQuery.error,
    ebayQuery.error,
    save.error,
    calculate.error,
    sync.error,
    create.error,
    approve.error,
    reject.error,
    rollback.error,
  ].find(Boolean) as Error | undefined;

  return (
    <PriceComparisonPageShell
      toolbar={
        <>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 text-xs font-semibold text-[var(--fg)]">
            <span>eBay:</span>
            <span className={ebayQuery.data?.configured ? 'text-emerald-600/85 dark:text-emerald-400/85 font-bold' : 'text-amber-500/85'}>
              {ebayQuery.data?.configured ? 'Bağlı' : 'Bekleniyor'}
            </span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => sync.mutate()}
              disabled={sync.isPending}
              className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              <RefreshCw size={12} className={sync.isPending ? 'animate-spin' : ''} />
              <span>eBay Senkronize Et</span>
            </button>

            <button
              type="button"
              onClick={() => calculate.mutate()}
              disabled={calculate.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] hover:bg-[var(--card)] disabled:opacity-50"
            >
              <Play size={12} />
              <span>Öneri Hesapla</span>
            </button>
          </div>
        </>
      }
    >
      {/* Politika Ayarları */}
      {policy && (
        <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
              Güvenli Fiyat Politikası
            </span>
            <button
              type="button"
              onClick={() => save.mutate(policy)}
              disabled={save.isPending}
              className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-xs font-bold text-[var(--fg)] hover:bg-[var(--card)] disabled:opacity-50"
            >
              <Save size={11} />
              <span>{save.isPending ? 'Kaydediliyor…' : 'Politikayı Kaydet'}</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Toggle
              label="Otomasyon"
              value={policy.isEnabled}
              onChange={(v) => setEditedPolicy({ ...policy, isEnabled: v })}
            />
            <Toggle
              label="Yalnız Simülasyon"
              value={policy.simulationOnly}
              onChange={(v) => setEditedPolicy({ ...policy, simulationOnly: v })}
            />
            <Toggle
              label="Acil Durdurma"
              value={policy.emergencyStop}
              danger
              onChange={(v) => setEditedPolicy({ ...policy, emergencyStop: v })}
            />
            <Toggle
              label="İnsan Onayı"
              value={policy.requireApproval}
              onChange={(v) => setEditedPolicy({ ...policy, requireApproval: v })}
            />
            <NumberField
              label="Min Kâr %"
              value={policy.minimumMarginPercent}
              onChange={(v) => setEditedPolicy({ ...policy, minimumMarginPercent: v })}
            />
            <NumberField
              label="Maks Değişim %"
              value={policy.maximumChangePercent}
              onChange={(v) => setEditedPolicy({ ...policy, maximumChangePercent: v })}
            />
            <NumberField
              label="Rakip Altı İndirimi"
              value={policy.competitorUndercutAmount}
              onChange={(v) => setEditedPolicy({ ...policy, competitorUndercutAmount: v })}
            />
            <NumberField
              label="Komisyon %"
              value={policy.defaultCommissionPercent}
              onChange={(v) => setEditedPolicy({ ...policy, defaultCommissionPercent: v })}
            />
            <NumberField
              label="Kargo Maliyeti"
              value={policy.defaultShippingCost}
              onChange={(v) => setEditedPolicy({ ...policy, defaultShippingCost: v })}
            />
            <NumberField
              label="Hizmet Bedeli"
              value={policy.defaultServiceFee}
              onChange={(v) => setEditedPolicy({ ...policy, defaultServiceFee: v })}
            />
          </div>
        </section>
      )}

      {/* Fiyat Önerileri */}
      <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
          Fiyat Önerileri
        </div>
        <div className="flex flex-col divide-y divide-[var(--border-soft)] border border-[var(--border-soft)] rounded-[4px] overflow-hidden">
          {recQuery.data?.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] p-3 hover:bg-[var(--bg-subtle)]/40 transition text-xs"
            >
              <div className="min-w-[200px] flex-1">
                <span className="font-semibold text-[var(--fg-muted)]">{r.sku}</span> ·{' '}
                <span className="font-bold text-[var(--fg)]">{r.productName}</span>
                <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
                  <strong>{r.action}:</strong> {r.explanation}
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <Money label="Mevcut" value={r.currentPrice} currency={r.currency} />
                <Money label="Rakip" value={r.competitorPriceInBase} currency={r.currency} />
                <Money label="Güvenli Taban" value={r.safeFloorPrice} currency={r.currency} />
                <Money label="Öneri" value={r.recommendedPrice} currency={r.currency} highlight />
                <div className="min-w-[50px] text-xs font-bold text-[var(--fg)]">%{r.expectedMarginPercent}</div>
              </div>
              <button
                type="button"
                disabled={r.knownCost <= 0 || create.isPending}
                onClick={() => create.mutate(r.id)}
                className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card)] disabled:opacity-40"
              >
                Simüle Et
              </button>
            </div>
          ))}
          {recQuery.data?.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
              Hesaplanmış öneri yok. Önce rakip eşleşmesini onaylayıp öneri hesaplayın.
            </div>
          )}
        </div>
      </section>

      {/* Onay ve Simülasyon Geçmişi */}
      <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
        <div className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
          Onay ve Simülasyon Geçmişi
        </div>
        <div className="flex flex-col divide-y divide-[var(--border-soft)] border border-[var(--border-soft)] rounded-[4px] overflow-hidden">
          {proposalQuery.data?.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 bg-[var(--card)] p-3 hover:bg-[var(--bg-subtle)]/40 transition text-xs"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[var(--fg-muted)]">#{p.id}</span> ·{' '}
                <span className="font-bold text-[var(--fg)]">{p.sku}</span>
                <div className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
                  {p.currentPrice} → <strong>{p.proposedPrice} {p.currency}</strong> · {p.status} ·{' '}
                  {p.simulationOnly ? 'Simülasyon' : 'Gerçek'}
                </div>
              </div>
              {p.status === 'PendingApproval' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Onayla"
                    onClick={() => approve.mutate(p.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-emerald-500/10 text-emerald-600/85 hover:bg-emerald-500 hover:text-white"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    title="Reddet"
                    onClick={() => reject.mutate(p.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-[2px] bg-rose-500/10 text-rose-500/85 hover:bg-rose-500 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {p.status === 'Simulated' && (
                <button
                  type="button"
                  onClick={() => rollback.mutate(p.id)}
                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card)]"
                >
                  <RotateCcw size={11} />
                  <span>Geri Al</span>
                </button>
              )}
            </div>
          ))}
          {proposalQuery.data?.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--fg-muted)]">
              Henüz simülasyon veya onay kaydı yok.
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-[4px] border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs font-semibold text-rose-500/90">
          {error.message}
        </div>
      )}
    </PriceComparisonPageShell>
  );
}

function Toggle({
  label,
  value,
  onChange,
  danger = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <label className="flex cursor-pointer flex-col justify-between rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2 text-[11px]">
      <span className="font-semibold text-[var(--fg)]">{label}</span>
      <div className="mt-1 flex items-center justify-between">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--fg)]"
        />
        <span
          className={`text-[10px] font-bold ${
            danger && value ? 'text-rose-500/85' : value ? 'text-emerald-600/85 dark:text-emerald-400/85' : 'text-[var(--fg-muted)]'
          }`}
        >
          {value ? 'Açık' : 'Kapalı'}
        </span>
      </div>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col justify-between rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2 text-[11px]">
      <span className="font-semibold text-[var(--fg)]">{label}</span>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-7 rounded-[2px] border border-[var(--border)] bg-[var(--card)] px-1.5 text-xs font-bold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
      />
    </label>
  );
}

function Money({
  label,
  value,
  currency,
  highlight = false,
}: {
  label: string;
  value: number;
  currency: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-[70px]">
      <div className="text-[10.5px] text-[var(--fg-muted)]">{label}</div>
      <b className={`text-xs ${highlight ? 'text-emerald-600/90 dark:text-emerald-400/90 font-bold' : 'text-[var(--fg)]'}`}>
        {value.toLocaleString('tr-TR')} {currency}
      </b>
    </div>
  );
}
