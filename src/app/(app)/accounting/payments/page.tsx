'use client';

import { localDateStr } from '../../../../utils/date';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Plus, X, Search } from 'lucide-react';
import {
  paymentApi,
  customerApi,
  treasuryAccountApi,
  type PaymentDirection,
  type Payment,
} from '../../../../lib/api/pre-accounting';
import { supplierApi } from '../../../../lib/api/supplier';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { PreAccountingSubTabBar } from '../../../../components/layout/PreAccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

function fmtMoney(n: number, currency: string) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function CreatePaymentDialog({
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

  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => customerApi.list() });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers', ''], queryFn: () => supplierApi.list() });
  const { data: treasuryAccounts } = useQuery({
    queryKey: ['treasury-accounts', billingEntityId],
    queryFn: () => treasuryAccountApi.list(billingEntityId),
  });

  const [direction, setDirection] = useState<PaymentDirection>('Collection');
  const [partyId, setPartyId] = useState<number | ''>('');
  const [treasuryAccountId, setTreasuryAccountId] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(() => localDateStr());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!partyId) {
      setError(
        direction === 'Collection'
          ? (tr ? 'Lütfen müşteri seçin.' : 'Please select a customer.')
          : tr ? 'Lütfen tedarikçi seçin.' : 'Please select a supplier.'
      );
      return;
    }
    if (!treasuryAccountId) {
      setError(tr ? 'Kasa veya banka hesabı seçin.' : 'Please select a cash/bank account.');
      return;
    }
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || n <= 0) {
      setError(tr ? 'Tutar sıfırdan büyük olmalıdır.' : 'Amount must be greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await paymentApi.create(billingEntityId, {
        direction,
        paymentDate,
        amount: n,
        customerId: direction === 'Collection' ? Number(partyId) : undefined,
        supplierId: direction === 'Disbursement' ? Number(partyId) : undefined,
        treasuryAccountId: Number(treasuryAccountId),
        method: method || undefined,
        description: description || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  }

  const directionOptions = [
    { value: 'Collection', label: tr ? 'Tahsilat (Müşteriden Giriş)' : 'Collection (From Customer)' },
    { value: 'Disbursement', label: tr ? 'Ödeme (Tedarikçiye Çıkış)' : 'Disbursement (To Supplier)' },
  ];

  const partyOptions = (direction === 'Collection' ? customers ?? [] : suppliers ?? []).map((p) => ({
    value: String(p.id),
    label: p.name,
  }));

  const treasuryOptions = (treasuryAccounts ?? []).map((t) => ({
    value: String(t.id),
    label: `${t.name} (${t.type === 'Cash' ? (tr ? 'Kasa' : 'Cash') : tr ? 'Banka' : 'Bank'})`,
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
            {tr ? 'Yeni Tahsilat / Ödeme Kaydı' : 'New Payment / Collection'}
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
          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'İşlem Yönü *' : 'Direction *'}
            </label>
            <FilterSelect
              value={direction}
              placeholder={tr ? 'Yön' : 'Direction'}
              onChange={(v) => {
                setDirection(v as PaymentDirection);
                setPartyId('');
              }}
              options={directionOptions}
              minWidth="100%"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {direction === 'Collection' ? (tr ? 'Müşteri *' : 'Customer *') : tr ? 'Tedarikçi *' : 'Supplier *'}
            </label>
            <FilterSelect
              value={partyId ? String(partyId) : ''}
              placeholder={tr ? '— Seçin —' : '— Select —'}
              onChange={(v) => setPartyId(v ? Number(v) : '')}
              options={partyOptions}
              searchable={true}
              minWidth="100%"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Kasa / Banka Hesabı *' : 'Treasury Account *'}
            </label>
            <FilterSelect
              value={treasuryAccountId ? String(treasuryAccountId) : ''}
              placeholder={tr ? '— Hesap Seçin —' : '— Select Account —'}
              onChange={(v) => setTreasuryAccountId(v ? Number(v) : '')}
              options={treasuryOptions}
              minWidth="100%"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'İşlem Tarihi' : 'Date'}
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Tutar (₺) *' : 'Amount *'}
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
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Ödeme Yöntemi' : 'Method'}
            </label>
            <input
              type="text"
              placeholder={tr ? 'Nakit / Havale / EFT / Kredi Kartı' : 'Cash / Wire / Card'}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Açıklama' : 'Description'}
            </label>
            <input
              type="text"
              placeholder={tr ? 'İşlem açıklaması...' : 'Payment note...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

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
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : tr ? 'Kaydı Oluştur' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<PaymentDirection | 'All'>('All');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payments', billingEntityId],
    queryFn: () => paymentApi.list(billingEntityId!),
    enabled: billingEntityId !== null,
  });

  const payments = useMemo(() => data ?? [], [data]);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['payments', billingEntityId] });

  const entityOptions = useMemo(() => {
    return entities.map((be) => ({
      value: String(be.id),
      label: be.legalName,
    }));
  }, [entities]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (directionFilter !== 'All' && p.direction !== directionFilter) return false;
      if (!search.trim()) return true;
      const lower = search.toLowerCase();
      return (
        (p.customerName && p.customerName.toLowerCase().includes(lower)) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(lower)) ||
        (p.treasuryAccountName && p.treasuryAccountName.toLowerCase().includes(lower)) ||
        (p.journalEntryNumber && p.journalEntryNumber.toLowerCase().includes(lower))
      );
    });
  }, [payments, search, directionFilter]);

  const directionOptions = [
    { value: 'All', label: tr ? 'Tüm Hareketler' : 'All' },
    { value: 'Collection', label: tr ? 'Tahsilat' : 'Collection' },
    { value: 'Disbursement', label: tr ? 'Ödeme' : 'Disbursement' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <PreAccountingSubTabBar />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Başlık ve Aksiyon Barı */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="payments-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Tahsilat & Ödeme Kayıtları' : 'Payments & Collections'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Cari hesap, kasa/banka ve yevmiye fişini aynı anda güncelleyen entegre para hareketleri.'
                : 'Integrated treasury movements updating customer balance, bank, and journal entries.'}
            </p>
          </div>

          <div data-tour="payments-actions" className="flex items-center gap-2 flex-wrap">
            {/* Custom FilterSelect Şirket Seçici */}
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(val) => setBillingEntityId(val ? Number(val) : 0)}
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
              <span>{tr ? 'Yeni Kayıt Ekle' : 'New Payment'}</span>
            </button>
          </div>
        </div>

        {/* Filtre ve Arama Çubuğu */}
        <div data-tour="payments-filters" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'Müşteri, tedarikçi veya hesap adı ara...' : 'Search customer, supplier...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect
              value={directionFilter === 'All' ? '' : directionFilter}
              placeholder={tr ? 'Tüm Hareketler' : 'All'}
              onChange={(v) => setDirectionFilter((v || 'All') as PaymentDirection | 'All')}
              minWidth={140}
              options={directionOptions}
            />
          </div>
        </div>

        {/* Tahsilat / Ödeme Tablosu */}
        <div data-tour="payments-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  <th className="px-4 py-2.5 w-28">{tr ? 'TARİH' : 'DATE'}</th>
                  <th className="px-4 py-2.5 w-32">{tr ? 'YÖN' : 'DIRECTION'}</th>
                  <th className="px-4 py-2.5">{tr ? 'TARAF (MÜŞTERİ / TEDARİKÇİ)' : 'PARTY'}</th>
                  <th className="px-4 py-2.5">{tr ? 'KASA / BANKA' : 'TREASURY ACCOUNT'}</th>
                  <th className="px-4 py-2.5 text-right w-36">{tr ? 'TUTAR' : 'AMOUNT'}</th>
                  <th className="px-4 py-2.5 text-right w-32">{tr ? 'FİŞ NO' : 'JOURNAL NO'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Kayıtlar yükleniyor...' : 'Loading payments...'}
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-rose-400">
                      {tr ? 'Kayıtlar yüklenirken hata oluştu.' : 'Failed to load payments.'}
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek tahsilat veya ödeme kaydı bulunamadı.' : 'No payment records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p: Payment) => {
                    const isCollection = p.direction === 'Collection';
                    return (
                      <tr key={p.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                        <td className="px-4 py-2.5 font-mono text-[var(--fg-muted)]">{p.paymentDate}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                              isCollection
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {isCollection ? (tr ? 'Tahsilat' : 'Collection') : tr ? 'Ödeme' : 'Disbursement'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-[var(--fg)]">
                          {p.customerName ?? p.supplierName ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--fg-muted)]">{p.treasuryAccountName}</td>
                        <td className="px-4 py-2.5 font-mono text-right font-bold text-[var(--fg)]">
                          {fmtMoney(p.amount, p.currency)}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-right text-[var(--fg-muted)]">
                          {p.journalEntryNumber ?? <span className="text-[var(--fg-subtle)] italic">{tr ? 'Taslak' : 'Draft'}</span>}
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

      {/* Tahsilat / Ödeme Ekleme Modalı */}
      {createOpen && billingEntityId !== null && (
        <CreatePaymentDialog
          billingEntityId={billingEntityId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            toast.success(tr ? 'Kayıt oluşturuldu.' : 'Payment created.');
            refresh();
          }}
        />
      )}
    </div>
  );
}
