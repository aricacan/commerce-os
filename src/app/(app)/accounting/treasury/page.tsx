'use client';

import { localDateStr } from '../../../../utils/date';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Plus, Wallet, X } from 'lucide-react';
import {
  treasuryAccountApi,
  type TreasuryAccount,
  type TreasuryAccountType,
} from '../../../../lib/api/pre-accounting';
import { ledgerAccountApi } from '../../../../lib/api/ledger';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { PreAccountingSubTabBar } from '../../../../components/layout/PreAccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

function fmtMoney(n: number, currency: string) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function CreateAccountDialog({
  billingEntityId,
  onClose,
  onSaved,
}: {
  billingEntityId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { data: ledgerAccounts } = useQuery({
    queryKey: ['ledger-accounts', billingEntityId],
    queryFn: () => ledgerAccountApi.list(billingEntityId),
  });
  const cashBankAccounts = (ledgerAccounts ?? []).filter(
    (a) => a.isPostable && a.isActive && (a.code.startsWith('10') || a.code.startsWith('102'))
  );

  const [name, setName] = useState('');
  const [type, setType] = useState<TreasuryAccountType>('Cash');
  const [ledgerAccountId, setLedgerAccountId] = useState<number | ''>('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError(tr ? 'Hesap adı zorunludur.' : 'Account name is required.');
      return;
    }
    if (!ledgerAccountId) {
      setError(tr ? 'Hesap Planı bağlantısı zorunludur.' : 'Ledger account link is required.');
      return;
    }
    setSaving(true);
    try {
      await treasuryAccountApi.create({
        billingEntityId,
        name: name.trim(),
        type,
        ledgerAccountId: Number(ledgerAccountId),
        iban: iban.trim() || undefined,
        bankName: bankName.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  }

  const typeOptions = [
    { value: 'Cash', label: tr ? 'Kasa' : 'Cash' },
    { value: 'Bank', label: tr ? 'Banka' : 'Bank' },
  ];

  const ledgerOptions = cashBankAccounts.map((a) => ({
    value: String(a.id),
    label: `${a.code} — ${a.name}`,
  }));

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[30001] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md flex flex-col rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden text-xs text-[var(--fg)]"
      >
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5 bg-[var(--bg-subtle)]/30">
          <h2 className="text-sm font-bold text-[var(--fg)]">
            {tr ? 'Yeni Kasa / Banka Hesabı' : 'New Cash / Bank Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--border-soft)] text-[var(--fg-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="p-5 space-y-3.5">
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Hesap Adı *' : 'Account Name *'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr ? 'Örn: Merkez Kasa / Garanti Ticari' : 'Main Cash / Bank Name'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Tür *' : 'Type *'}
              </label>
              <FilterSelect
                value={type}
                placeholder={tr ? 'Tür' : 'Type'}
                onChange={(v) => setType(v as TreasuryAccountType)}
                options={typeOptions}
                minWidth="100%"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Hesap Planı Bağlantısı * (100 Kasa / 102 Banka)' : 'General Ledger Account *'}
            </label>
            <FilterSelect
              value={ledgerAccountId ? String(ledgerAccountId) : ''}
              placeholder={tr ? '— Hesap Seçin —' : '— Select Ledger Account —'}
              onChange={(v) => setLedgerAccountId(v ? Number(v) : '')}
              options={ledgerOptions}
              searchable={true}
              minWidth="100%"
            />
          </div>

          {type === 'Bank' && (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                  {tr ? 'Banka Adı' : 'Bank Name'}
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Garanti BBVA"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                  {tr ? 'IBAN' : 'IBAN'}
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="TR00 0000..."
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 font-mono text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}
        </div>

        {/* Modal Alt Aksiyon Barı */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] px-5 py-3 bg-[var(--bg-subtle)]/20">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            {tr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-4 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : tr ? 'Hesabı Kaydet' : 'Save Account'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TransactionsPanel({ account }: { account: TreasuryAccount }) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [date, setDate] = useState(() => localDateStr());
  const [direction, setDirection] = useState<'In' | 'Out'>('In');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['treasury-transactions', account.id],
    queryFn: () => treasuryAccountApi.getTransactions(account.id),
  });

  const addTx = useMutation({
    mutationFn: () =>
      treasuryAccountApi.addManualTransaction({
        treasuryAccountId: account.id,
        transactionDate: date,
        direction,
        amount: Number(amount),
        description: description || undefined,
      }),
    onSuccess: () => {
      toast.success(tr ? 'Hareket eklendi.' : 'Transaction added.');
      setAmount('');
      setDescription('');
      void qc.invalidateQueries({ queryKey: ['treasury-transactions', account.id] });
      void qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const directionOptions = [
    { value: 'In', label: tr ? 'Giriş (Tahsilat)' : 'In (Collection)' },
    { value: 'Out', label: tr ? 'Çıkış (Ödeme)' : 'Out (Payment)' },
  ];

  return (
    <div className="space-y-4 pt-2">
      {/* Manuel Hareket Ekleme Çubuğu */}
      <div data-tour="treasury-entry-form" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
          {account.name} — {tr ? 'Manuel Hareket Girişi' : 'Add Transaction'}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Tarih' : 'Date'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Yön' : 'Direction'}
            </label>
            <FilterSelect
              value={direction}
              placeholder={tr ? 'Yön Seçin' : 'Direction'}
              onChange={(v) => setDirection(v as 'In' | 'Out')}
              options={directionOptions}
              minWidth="100%"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Tutar (₺)' : 'Amount'}
            </label>
            <input
              type="number"
              min={0.01}
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs font-mono text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 flex gap-2">
            <div className="flex-1">
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Açıklama' : 'Description'}
              </label>
              <input
                type="text"
                placeholder={tr ? 'Örn: Açılış bakiyesi / Masraf' : 'Note...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => addTx.mutate()}
              disabled={!amount || addTx.isPending}
              className="h-8 self-end inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
            >
              <Plus size={13} />
              <span>{addTx.isPending ? (tr ? 'Ekleniyor...' : 'Adding...') : tr ? 'Ekle' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hesap Ekstresi Tablosu */}
      <div data-tour="treasury-transactions" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <th className="px-4 py-2.5 w-28">{tr ? 'TARİH' : 'DATE'}</th>
                <th className="px-4 py-2.5 w-28">{tr ? 'YÖN' : 'DIRECTION'}</th>
                <th className="px-4 py-2.5 w-32">{tr ? 'TUTAR' : 'AMOUNT'}</th>
                <th className="px-4 py-2.5">{tr ? 'AÇIKLAMA' : 'DESCRIPTION'}</th>
                <th className="px-4 py-2.5 w-32">{tr ? 'KAYNAK' : 'SOURCE'}</th>
                <th className="px-4 py-2.5 text-right w-36">{tr ? 'BAKİYE' : 'RUNNING BAL'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-[var(--fg-muted)]">
                    {tr ? 'Hareketler yükleniyor...' : 'Loading transactions...'}
                  </td>
                </tr>
              ) : (transactions ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-[var(--fg-muted)]">
                    {tr ? 'Bu hesapta henüz bir kasa/banka hareketi yok.' : 'No transactions recorded.'}
                  </td>
                </tr>
              ) : (
                (transactions ?? []).map((t) => {
                  const isIn = t.direction === 'In';
                  return (
                    <tr key={t.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                      <td className="px-4 py-2.5 font-mono text-[var(--fg-muted)]">{t.transactionDate}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.2 text-[10px] font-bold ${
                            isIn
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isIn ? (tr ? 'Giriş' : 'In') : tr ? 'Çıkış' : 'Out'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold text-[var(--fg)]">
                        {fmtMoney(t.amount, account.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--fg)]">{t.description || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--fg-muted)] text-[11px]">
                        {t.sourceType === 'Payment' ? (tr ? 'Tahsilat/Ödeme' : 'Payment') : tr ? 'Manuel' : 'Manual'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-right font-bold text-[var(--fg)]">
                        {fmtMoney(t.runningBalance, account.currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TreasuryPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['treasury-accounts', billingEntityId],
    queryFn: () => treasuryAccountApi.list(billingEntityId!),
    enabled: billingEntityId !== null,
  });

  const accounts = data ?? [];
  const selected = accounts.find((a) => a.id === selectedId) ?? (accounts.length > 0 ? accounts[0] : null);

  const entityOptions = useMemo(() => {
    return entities.map((be) => ({
      value: String(be.id),
      label: be.legalName,
    }));
  }, [entities]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <PreAccountingSubTabBar />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Başlık ve Şirket Seçici Barı */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="treasury-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Kasa & Banka Hesapları' : 'Cash & Bank Accounts'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Nakit kasalar ve banka hesap bakiyeleri. Bakiyeler hareketlerden türetilir.'
                : 'Manage liquid cash vaults and bank accounts with real-time running balances.'}
            </p>
          </div>

          <div data-tour="treasury-actions" className="flex items-center gap-2 flex-wrap">
            {/* Custom FilterSelect Şirket Seçici */}
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(val) => {
                setBillingEntityId(val ? Number(val) : 0);
                setSelectedId(null);
              }}
              options={entityOptions}
              minWidth={200}
            />

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={billingEntityId === null}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} />
              <span>{tr ? 'Yeni Hesap Ekle' : 'Add Account'}</span>
            </button>
          </div>
        </div>

        {isError && (
          <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-400">
            {tr ? 'Kasa ve banka hesapları yüklenemedi.' : 'Failed to load treasury accounts.'}
          </div>
        )}

        {!isError && !isLoading && accounts.length === 0 && (
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-12 text-center shadow-xs">
            <Wallet size={32} className="mx-auto text-[var(--fg-muted)] opacity-50 mb-3" />
            <h3 className="text-sm font-bold text-[var(--fg)]">
              {tr ? 'Henüz Kasa veya Banka Hesabı Yok' : 'No Treasury Accounts'}
            </h3>
            <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-sm mx-auto">
              {tr
                ? 'Şirketiniz için kasa veya banka hesabı tanımlayarak tahsilat ve ödemelerinizi takip edebilirsiniz.'
                : 'Create a cash or bank account to manage payments and collections.'}
            </p>
          </div>
        )}

        {/* Hesap Kartları Listesi */}
        {!isError && accounts.length > 0 && (
          <div data-tour="treasury-accounts" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {accounts.map((a) => {
              const isSelected = (selected?.id ?? null) === a.id;
              const isBank = a.type === 'Bank';
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={`flex flex-col justify-between p-3.5 rounded-[4px] border text-left transition cursor-pointer shadow-xs ${
                    isSelected
                      ? 'border-[var(--fg)] bg-[var(--card)] shadow-xs ring-1 ring-[var(--fg)]/20'
                      : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--fg)]">{a.name}</span>
                      <span className="text-[10px] font-semibold text-[var(--fg-muted)] uppercase">
                        {isBank ? (tr ? 'Banka' : 'Bank') : tr ? 'Kasa' : 'Cash'}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-[var(--fg-muted)] mt-0.5">
                      {a.ledgerAccountCode} {a.bankName ? `· ${a.bankName}` : ''}
                    </div>
                  </div>

                  <div className="text-lg font-mono font-bold text-[var(--fg)] mt-3">
                    {fmtMoney(a.balance, a.currency)}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Seçili Hesabın Hareket Detayları */}
        {selected && <TransactionsPanel account={selected} />}
      </div>

      {/* Hesap Ekleme Modalı */}
      {createOpen && billingEntityId !== null && (
        <CreateAccountDialog
          billingEntityId={billingEntityId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            toast.success(tr ? 'Hesap eklendi.' : 'Account created.');
            void qc.invalidateQueries({ queryKey: ['treasury-accounts', billingEntityId] });
          }}
        />
      )}
    </div>
  );
}
