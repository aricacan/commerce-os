'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Plus, BookText, X, Sparkles, Search } from 'lucide-react';
import {
  ledgerAccountApi,
  LEDGER_ACCOUNT_TYPE_LABEL,
  type LedgerAccountType,
  type LedgerAccount,
} from '../../../../lib/api/ledger';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

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

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<LedgerAccountType>('Asset');
  const [isPostable, setIsPostable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!code.trim()) {
      setError(tr ? 'Hesap kodu zorunludur.' : 'Account code is required.');
      return;
    }
    if (!name.trim()) {
      setError(tr ? 'Hesap adı zorunludur.' : 'Account name is required.');
      return;
    }
    setSaving(true);
    try {
      await ledgerAccountApi.create({
        billingEntityId,
        code: code.trim(),
        name: name.trim(),
        type,
        isPostable,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  }

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
          <div className="flex items-center gap-2">
            <BookText size={16} className="text-[var(--fg)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {tr ? 'Yeni Muhasebe Hesabı' : 'New Ledger Account'}
            </h2>
          </div>
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
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Hesap Kodu *' : 'Code *'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="100.01"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 font-mono text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Hesap Tipi *' : 'Account Type *'}
              </label>
              <FilterSelect
                value={type}
                placeholder={tr ? 'Hesap Tipi' : 'Account Type'}
                onChange={(v) => setType(v as LedgerAccountType)}
                options={(Object.keys(LEDGER_ACCOUNT_TYPE_LABEL) as LedgerAccountType[]).map((t) => ({
                  value: t,
                  label: LEDGER_ACCOUNT_TYPE_LABEL[t],
                }))}
                minWidth="100%"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Hesap Adı *' : 'Account Name *'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr ? 'Örn: Merkez Kasa Hesabı' : 'Main Cash Account'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 p-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPostable}
              onChange={(e) => setIsPostable(e.target.checked)}
              className="rounded-[2px] border-[var(--border)] accent-[var(--fg)] cursor-pointer"
            />
            <div>
              <div className="font-semibold text-[var(--fg)] text-xs">
                {tr ? 'Fiş satırında doğrudan kullanılabilir' : 'Postable account'}
              </div>
              <div className="text-[10.5px] text-[var(--fg-muted)]">
                {tr ? 'İşaretli değilse ana grup başlığı olarak kabul edilir.' : 'Uncheck for grouping headers.'}
              </div>
            </div>
          </label>

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

export default function ChartOfAccountsPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LedgerAccountType | 'All'>('All');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ledger-accounts', billingEntityId],
    queryFn: () => ledgerAccountApi.list(billingEntityId!),
    enabled: billingEntityId !== null,
    staleTime: 15_000,
  });

  const seed = useMutation({
    mutationFn: () => ledgerAccountApi.seedStandardChart(billingEntityId!),
    onSuccess: (res) => {
      toast.success(
        res.added > 0
          ? `${res.added} ${tr ? 'standart hesap eklendi.' : 'standard accounts added.'}`
          : tr
          ? 'Zaten güncel — eklenecek yeni hesap yok.'
          : 'Chart of accounts is up to date.'
      );
      void qc.invalidateQueries({ queryKey: ['ledger-accounts', billingEntityId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const accounts = useMemo(() => data ?? [], [data]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (typeFilter !== 'All' && a.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const lower = search.toLowerCase();
      return a.code.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower);
    });
  }, [accounts, search, typeFilter]);

  // KPI Hesaplamaları
  const stats = useMemo(() => {
    const total = accounts.length;
    const assets = accounts.filter((a) => a.type === 'Asset').length;
    const liabilities = accounts.filter((a) => a.type === 'Liability').length;
    const income = accounts.filter((a) => a.type === 'Revenue').length;
    const expense = accounts.filter((a) => a.type === 'Expense').length;
    return { total, assets, liabilities, income, expense };
  }, [accounts]);

  const typeOptions = [
    { value: 'All', label: tr ? 'Tüm Tipler' : 'All Types' },
    { value: 'Asset', label: LEDGER_ACCOUNT_TYPE_LABEL.Asset },
    { value: 'Liability', label: LEDGER_ACCOUNT_TYPE_LABEL.Liability },
    { value: 'Equity', label: LEDGER_ACCOUNT_TYPE_LABEL.Equity },
    { value: 'Revenue', label: LEDGER_ACCOUNT_TYPE_LABEL.Revenue },
    { value: 'Expense', label: LEDGER_ACCOUNT_TYPE_LABEL.Expense },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <AccountingSubTabBar />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Başlık ve Aksiyon Barı */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="coa-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Hesap Planı' : 'Chart of Accounts'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Tekdüzen Hesap Planı (THP) ve şirket bazlı özel muhasebe hesapları.'
                : 'Uniform chart of accounts and entity-isolated general ledger accounts.'}
            </p>
          </div>

          <div data-tour="coa-actions" className="flex items-center gap-2 flex-wrap">
            {/* Şirket Seçici FilterSelect */}
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={200}
            />

            <button
              type="button"
              onClick={() => seed.mutate()}
              disabled={billingEntityId === null || seed.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={13} />
              <span>{seed.isPending ? (tr ? 'Yükleniyor...' : 'Seeding...') : tr ? 'Standart Planı Yükle' : 'Load Standard Chart'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={billingEntityId === null}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} />
              <span>{tr ? 'Hesap Ekle' : 'Add Account'}</span>
            </button>
          </div>
        </div>

        {/* KPI Metrik Kartları */}
        <div data-tour="coa-kpi" className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Toplam Hesap' : 'Total Accounts'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.total}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Dönen/Duran Varlık' : 'Assets (1xx/2xx)'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.assets}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Yabancı Kaynak' : 'Liabilities (3xx/4xx)'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.liabilities}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Gelir Hesapları' : 'Revenue (6xx)'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.income}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Gider Hesapları' : 'Expense (7xx)'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.expense}</div>
          </div>
        </div>

        {/* Filtre ve Arama Çubuğu */}
        <div data-tour="coa-filters" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'Hesap kodu veya hesap adı ara...' : 'Search code or name...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect
              value={typeFilter === 'All' ? '' : typeFilter}
              placeholder={tr ? 'Tüm Tipler' : 'All Types'}
              onChange={(v) => setTypeFilter((v || 'All') as LedgerAccountType | 'All')}
              minWidth={150}
              options={typeOptions}
            />
          </div>
        </div>

        {/* Hesap Tablosu */}
        <div data-tour="coa-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  <th className="px-4 py-2.5 w-28">{tr ? 'HESAP KODU' : 'ACCOUNT CODE'}</th>
                  <th className="px-4 py-2.5">{tr ? 'HESAP ADI' : 'ACCOUNT NAME'}</th>
                  <th className="px-4 py-2.5">{tr ? 'HESAP TİPİ' : 'TYPE'}</th>
                  <th className="px-4 py-2.5">{tr ? 'NORMAL TARAF' : 'NORMAL SIDE'}</th>
                  <th className="px-4 py-2.5">{tr ? 'DURUM' : 'STATUS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Hesaplar yükleniyor...' : 'Loading accounts...'}
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-rose-400">
                      {tr ? 'Hesap planı yüklenirken hata oluştu.' : 'Failed to load chart of accounts.'}
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek hesap kaydı bulunamadı.' : 'No accounts found.'}
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((a: LedgerAccount) => (
                    <tr key={a.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                      {/* Kod */}
                      <td className="px-4 py-2.5 font-mono font-bold text-[var(--fg)]">
                        {a.code}
                      </td>

                      {/* Ad & Grup Rozeti */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-[var(--fg)]">{a.name}</span>
                          {!a.isPostable && (
                            <span className="rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/60 px-1.5 py-0.2 text-[10px] font-bold text-[var(--fg-muted)]">
                              {tr ? 'GRUP' : 'HEADER'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tip */}
                      <td className="px-4 py-2.5 text-[var(--fg-muted)] font-medium">
                        {LEDGER_ACCOUNT_TYPE_LABEL[a.type] ?? a.type}
                      </td>

                      {/* Normal Taraf */}
                      <td className="px-4 py-2.5 text-[var(--fg-muted)]">
                        {a.normalSide === 'Debit' ? (tr ? 'Borç' : 'Debit') : tr ? 'Alacak' : 'Credit'}
                      </td>

                      {/* Durum */}
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                            a.isActive
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400'
                          }`}
                        >
                          {a.isActive ? (tr ? 'Aktif' : 'Active') : tr ? 'Pasif' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hesap Ekleme Modalı */}
      {createOpen && billingEntityId !== null && (
        <CreateAccountDialog
          billingEntityId={billingEntityId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            toast.success(tr ? 'Hesap eklendi.' : 'Account created.');
            void qc.invalidateQueries({ queryKey: ['ledger-accounts', billingEntityId] });
          }}
        />
      )}
    </div>
  );
}
