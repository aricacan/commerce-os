'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  accountingPeriodApi,
  accountMappingApi,
  ledgerAccountApi,
  ACCOUNT_MAPPING_LABEL,
  type AccountMappingPurpose,
} from '../../../../lib/api/ledger';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const MAPPING_PURPOSES: AccountMappingPurpose[] = [
  'AccountsReceivable',
  'SalesRevenue',
  'SalesVatPayable',
  'AccountsPayable',
  'PurchaseExpense',
  'PurchaseVatReceivable',
];

function PeriodsSection({ billingEntityId }: { billingEntityId: number }) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-periods', billingEntityId],
    queryFn: () => accountingPeriodApi.list(billingEntityId),
  });
  const periods = data ?? [];

  const close = useMutation({
    mutationFn: (id: number) => accountingPeriodApi.close(id),
    onSuccess: () => {
      toast.success(tr ? 'Mali dönem kapatıldı.' : 'Period closed.');
      void qc.invalidateQueries({ queryKey: ['accounting-periods', billingEntityId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const reopen = useMutation({
    mutationFn: (id: number) => accountingPeriodApi.reopen(id),
    onSuccess: () => {
      toast.success(tr ? 'Mali dönem yeniden açıldı.' : 'Period reopened.');
      void qc.invalidateQueries({ queryKey: ['accounting-periods', billingEntityId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  return (
    <div data-tour="settings-periods" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
          {tr ? 'Mali Dönem Yönetimi' : 'Accounting Periods'}
        </h2>
        <span className="text-[11px] text-[var(--fg-muted)]">
          {periods.length} {tr ? 'dönem kayıtlı' : 'periods recorded'}
        </span>
      </div>

      <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
        {tr
          ? 'Bir fiş kesinleştirildiğinde ilgili ay otomatik oluşturulur. Kapalı dönemlere geriye dönük yeni yevmiye fişi işlenemez.'
          : 'Periods are created automatically when the first entry is posted. Closed periods prevent retroactive entries.'}
      </p>

      <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-[var(--fg-muted)]">
            {tr ? 'Dönemler yükleniyor...' : 'Loading periods...'}
          </div>
        ) : periods.length === 0 ? (
          <div className="p-6 text-center text-xs text-[var(--fg-muted)]">
            {tr
              ? 'Henüz açılmış bir mali dönem yok — ilk yevmiye fişi kesinleştirildiğinde otomatik oluşturulur.'
              : 'No accounting periods yet — automatically created when the first entry is posted.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <th className="px-4 py-2.5 w-32">{tr ? 'DÖNEM' : 'PERIOD'}</th>
                <th className="px-4 py-2.5">{tr ? 'TARİH ARALIĞI' : 'DATE RANGE'}</th>
                <th className="px-4 py-2.5 w-28">{tr ? 'DURUM' : 'STATUS'}</th>
                <th className="px-4 py-2.5 text-right w-36">{tr ? 'İŞLEM' : 'ACTION'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {periods.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                  <td className="px-4 py-2.5 font-mono font-bold text-[var(--fg)]">
                    {p.year} / {String(p.month).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--fg-muted)] font-mono">
                    {p.startDate} — {p.endDate}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                        p.status === 'Open'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400'
                      }`}
                    >
                      {p.status === 'Open' ? (tr ? 'Açık' : 'Open') : tr ? 'Kapalı' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {p.status === 'Open' ? (
                      <button
                        type="button"
                        onClick={() => close.mutate(p.id)}
                        disabled={close.isPending}
                        className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                      >
                        <Lock size={11} />
                        <span>{tr ? 'Dönemi Kapat' : 'Close Period'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reopen.mutate(p.id)}
                        disabled={reopen.isPending}
                        className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        <Unlock size={11} />
                        <span>{tr ? 'Yeniden Aç' : 'Reopen'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MappingsSection({ billingEntityId }: { billingEntityId: number }) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { data: accounts } = useQuery({
    queryKey: ['ledger-accounts', billingEntityId],
    queryFn: () => ledgerAccountApi.list(billingEntityId),
  });
  const { data: mappings } = useQuery({
    queryKey: ['account-mappings', billingEntityId],
    queryFn: () => accountMappingApi.list(billingEntityId),
  });
  const postable = (accounts ?? []).filter((a) => a.isPostable && a.isActive);

  const upsert = useMutation({
    mutationFn: (body: { purpose: AccountMappingPurpose; ledgerAccountId: number }) =>
      accountMappingApi.upsert(billingEntityId, body),
    onSuccess: () => {
      toast.success(tr ? 'Hesap eşlemesi kaydedildi.' : 'Account mapping updated.');
      void qc.invalidateQueries({ queryKey: ['account-mappings', billingEntityId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const accountOptions = postable.map((a) => ({
    value: String(a.id),
    label: `${a.code} — ${a.name}`,
  }));

  return (
    <div data-tour="settings-mappings" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
          {tr ? 'Otomatik Muhasebeleştirme Hesap Eşlemeleri' : 'Automatic Ledger Mappings'}
        </h2>
      </div>

      <div className="flex items-start gap-2 rounded-[4px] border border-blue-500/20 bg-blue-500/5 p-3 text-[11.5px] text-[var(--fg-muted)]">
        <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <span>
          {tr
            ? 'Faturalar modülündeki "Muhasebeleştir" butonu faturayı yevmiye fişine dönüştürürken bu hesapları otomatik kullanır.'
            : 'When an invoice is posted to the ledger, the system automatically routes entries to these configured accounts.'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {MAPPING_PURPOSES.map((purpose) => {
          const current = mappings?.find((m) => m.purpose === purpose);
          return (
            <div
              key={purpose}
              className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--fg)]">
                  {ACCOUNT_MAPPING_LABEL[purpose]}
                </span>
                {current && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 size={11} /> {tr ? 'Tanımlı' : 'Mapped'}
                  </span>
                )}
              </div>

              <FilterSelect
                value={current?.ledgerAccountId ? String(current.ledgerAccountId) : ''}
                placeholder={tr ? '— Hesap Seçin —' : '— Select Account —'}
                onChange={(val) => {
                  const id = Number(val);
                  if (id) upsert.mutate({ purpose, ledgerAccountId: id });
                }}
                options={accountOptions}
                searchable={true}
                minWidth="100%"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AccountingSettingsPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();

  const entityOptions = entities.map((be) => ({
    value: String(be.id),
    label: be.legalName,
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <AccountingSubTabBar />

      {/* Ana İçerik Alanı - Ortalanmış Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Başlık ve Şirket Seçici Barı */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
            <div data-tour="settings-header">
              <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
                {tr ? 'Muhasebe Ayarları' : 'General Ledger Settings'}
              </h1>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                {tr
                  ? 'Mali dönem kilitleri ve otomatik yevmiye fişi hesap eşlemeleri.'
                  : 'Accounting period locks and automatic invoice-to-ledger mapping rules.'}
              </p>
            </div>

            <div data-tour="settings-entity" className="flex items-center gap-2">
              <FilterSelect
                value={billingEntityId ? String(billingEntityId) : ''}
                placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
                onChange={(val) => setBillingEntityId(val ? Number(val) : 0)}
                options={entityOptions}
                minWidth={220}
              />
            </div>
          </div>

          {billingEntityId !== null && (
            <div className="space-y-5">
              <PeriodsSection billingEntityId={billingEntityId} />
              <MappingsSection billingEntityId={billingEntityId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
