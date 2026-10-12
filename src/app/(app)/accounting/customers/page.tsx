'use client';

import { localDateStr } from '../../../../utils/date';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Users, Download, X, Search } from 'lucide-react';
import {
  customerApi,
  customerLedgerApi,
  type Customer,
  type LedgerEntryType,
  type CustomerLedgerEntry,
} from '../../../../lib/api/pre-accounting';
import { PreAccountingSubTabBar } from '../../../../components/layout/PreAccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

function fmtMoney(n: number, currency: string) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function CreateCustomerDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError(tr ? 'Müşteri adı zorunludur.' : 'Customer name is required.');
      return;
    }
    setSaving(true);
    try {
      const created = await customerApi.create({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
      });
      onSaved(created.id);
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
          <h2 className="text-sm font-bold text-[var(--fg)]">
            {tr ? 'Yeni Müşteri Tanımla' : 'New Customer'}
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
              {tr ? 'Müşteri Adı / Unvanı *' : 'Name / Company Title *'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr ? 'Örn: Ahmet Yılmaz / ABC Ltd.' : 'Customer name...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Telefon' : 'Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5xx xxx xx xx"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'VKN / TCKN' : 'Tax / National ID'}
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="1234567890"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 font-mono text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'E-posta' : 'Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="musteri@firma.com"
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
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : tr ? 'Müşteriyi Kaydet' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AddEntryForm({ customerId, onAdded }: { customerId: number; onAdded: () => void }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [entryDate, setEntryDate] = useState(() => localDateStr());
  const [type, setType] = useState<LedgerEntryType>('Debit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      customerLedgerApi.addEntry({
        customerId,
        entryDate,
        type,
        amount: Number(amount),
        description: description.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(tr ? 'Cari hareket eklendi.' : 'Entry added.');
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      onAdded();
    },
    onError: (e) => setError(describeError(e)),
  });

  function handleSubmit() {
    setError(null);
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || n <= 0) {
      setError(tr ? 'Tutar sıfırdan büyük olmalıdır.' : 'Amount must be greater than 0.');
      return;
    }
    add.mutate();
  }

  const typeOptions = [
    { value: 'Debit', label: tr ? 'Borç (Fatura / Satış)' : 'Debit (Invoice)' },
    { value: 'Credit', label: tr ? 'Alacak (Tahsilat / İade)' : 'Credit (Collection)' },
  ];

  return (
    <div data-tour="customers-entry-form" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs space-y-3">
      <div className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
        {tr ? 'Manuel Cari Hareket Ekle' : 'Add Manual Ledger Entry'}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
            {tr ? 'Tarih' : 'Date'}
          </label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
            {tr ? 'Hareket Türü' : 'Type'}
          </label>
          <FilterSelect
            value={type}
            placeholder={tr ? 'Tür Seçin' : 'Select Type'}
            onChange={(v) => setType(v as LedgerEntryType)}
            options={typeOptions}
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

        <div>
          <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
            {tr ? 'Referans No' : 'Reference No'}
          </label>
          <input
            type="text"
            placeholder={tr ? 'Örn: EFT-9281' : 'REF-123'}
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
          {tr ? 'Açıklama' : 'Description'}
        </label>
        <input
          type="text"
          placeholder={tr ? 'Hareket açıklaması...' : 'Entry note...'}
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

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={add.isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-4 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
        >
          <Plus size={13} />
          <span>{add.isPending ? (tr ? 'Ekleniyor...' : 'Adding...') : tr ? 'Hareketi Kaydet' : 'Add Entry'}</span>
        </button>
      </div>
    </div>
  );
}

export default function CustomerLedgerPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerApi.list(),
    staleTime: 30_000,
  });

  const entriesQuery = useQuery({
    queryKey: ['customer-ledger', 'entries', customerId],
    queryFn: () => customerLedgerApi.getEntries(customerId!),
    enabled: customerId !== null,
  });

  const balanceQuery = useQuery({
    queryKey: ['customer-ledger', 'balance', customerId],
    queryFn: () => customerLedgerApi.getBalance(customerId!),
    enabled: customerId !== null,
  });

  const agingQuery = useQuery({
    queryKey: ['customer-ledger', 'aging', customerId],
    queryFn: () => customerLedgerApi.getAging(customerId!),
    enabled: customerId !== null,
  });

  const removeEntry = useMutation({
    mutationFn: (id: number) => customerLedgerApi.removeEntry(id),
    onSuccess: () => {
      toast.success(tr ? 'Hareket silindi.' : 'Entry removed.');
      invalidate();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const exportStatement = useMutation({
    mutationFn: (id: number) => customerLedgerApi.exportStatement(id),
    onSuccess: ({ fileName, blob }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(tr ? 'Ekstre Excel dosyası indirildi.' : 'Statement exported.');
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['customer-ledger'] });

  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery]);
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery]);
  const balances = balanceQuery.data?.balances ?? [];
  const aging = agingQuery.data;

  const customerOptions = useMemo(() => {
    return customers.map((c: Customer) => ({
      value: String(c.id),
      label: c.name,
      sublabel: c.phone || c.email || undefined,
    }));
  }, [customers]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const lower = search.toLowerCase();
    return entries.filter(
      (e) =>
        (e.description && e.description.toLowerCase().includes(lower)) ||
        (e.referenceNumber && e.referenceNumber.toLowerCase().includes(lower))
    );
  }, [entries, search]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <PreAccountingSubTabBar />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Başlık ve Müşteri Seçici Barı */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="customers-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Müşteri Cari Hesapları' : 'Customer Ledger'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Müşteri bazlı hesap ekstresi, yaşlandırma raporu ve tahsilat takibi.'
                : 'Customer statement, aging buckets, and collection tracking.'}
            </p>
          </div>

          <div data-tour="customers-select" className="flex items-center gap-2 flex-wrap">
            {/* Custom FilterSelect Müşteri Seçici */}
            <FilterSelect
              value={customerId ? String(customerId) : ''}
              placeholder={tr ? '— Müşteri Seçin —' : '— Select Customer —'}
              onChange={(val) => setCustomerId(val ? Number(val) : null)}
              options={customerOptions}
              searchable={true}
              minWidth={220}
            />

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer"
            >
              <Plus size={14} />
              <span>{tr ? 'Yeni Müşteri Ekle' : 'New Customer'}</span>
            </button>
          </div>
        </div>

        {/* Müşteri Seçilmediğinde Gösterilen Boş Durum */}
        {customerId === null && (
          <div data-tour="customers-empty" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-12 text-center shadow-xs">
            <Users size={32} className="mx-auto text-[var(--fg-muted)] opacity-50 mb-3" />
            <h3 className="text-sm font-bold text-[var(--fg)]">
              {tr ? 'Cari Hareketleri Görüntülemek İçin Müşteri Seçin' : 'Select a Customer'}
            </h3>
            <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-sm mx-auto">
              {tr
                ? 'Yukarıdaki açılır menüden bir müşteri seçerek hesap ekstresi, bakiye ve yaşlandırma detaylarını inceleyebilirsiniz.'
                : 'Choose a customer from the dropdown above to view statement and balance details.'}
            </p>
          </div>
        )}

        {/* Seçili Müşteri Alanı */}
        {customerId !== null && (
          <div className="space-y-4">
            {/* Müşteri Finansal Durum & Yaşlandırma Kartı */}
            <div data-tour="customers-balance" className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Bakiye Özeti */}
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Müşteri Güncel Bakiyesi' : 'Current Balance'}
                </div>
                {balances.length === 0 ? (
                  <div className="text-lg font-bold text-[var(--fg)] mt-1">0,00 ₺</div>
                ) : (
                  balances.map((b) => (
                    <div key={b.currency} className="mt-1">
                      <div className="text-xl font-mono font-bold text-[var(--fg)]">
                        {fmtMoney(b.balance, b.currency)}
                      </div>
                      <div className="text-[11px] text-[var(--fg-muted)] mt-1 flex gap-3">
                        <span>{tr ? 'Borç' : 'Debit'}: <strong className="font-mono text-[var(--fg)]">{fmtMoney(b.totalDebit, b.currency)}</strong></span>
                        <span>{tr ? 'Alacak' : 'Credit'}: <strong className="font-mono text-[var(--fg)]">{fmtMoney(b.totalCredit, b.currency)}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Yaşlandırma Grupları */}
              <div className="md:col-span-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col justify-between">
                <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Vade Yaşlandırma Özeti' : 'Aging Summary'}
                </div>
                {aging && aging.balances.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-3">
                    {aging.balances.map((currencyAging) => (
                      <div key={currencyAging.currency}>
                        {aging.balances.length > 1 && (
                          <div className="text-[10px] font-bold text-[var(--fg-muted)] mb-1">{currencyAging.currency}</div>
                        )}
                        <div className="grid grid-cols-4 gap-2">
                          {currencyAging.buckets.map((b) => (
                            <div key={b.label} className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2 text-center">
                              <div className="text-[10px] font-bold text-[var(--fg-muted)] uppercase">{b.label}</div>
                              <div className="text-xs font-mono font-bold text-[var(--fg)] mt-0.5">
                                {fmtMoney(b.amount, currencyAging.currency)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--fg-muted)] mt-2">
                    {tr ? 'Vadesi geçmiş alacak kaydı bulunmuyor.' : 'No overdue records.'}
                  </div>
                )}
              </div>
            </div>

            {/* Manuel Hareket Ekleme Kartı */}
            <AddEntryForm customerId={customerId} onAdded={invalidate} />

            {/* Ekstre Tablosu ve Dışa Aktar Barı */}
            <div data-tour="customers-statement" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border-b border-[var(--border-soft)] gap-2">
                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr ? 'Ekstrede ara...' : 'Search statement...'}
                    className="h-7 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg-muted)] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => exportStatement.mutate(customerId)}
                  disabled={exportStatement.isPending}
                  className="inline-flex h-7 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
                >
                  <Download size={12} />
                  <span>{exportStatement.isPending ? (tr ? 'İndiriliyor...' : 'Downloading...') : tr ? 'Ekstre İndir (.xlsx)' : 'Export Statement'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                      <th className="px-4 py-2.5 w-28">{tr ? 'TARİH' : 'DATE'}</th>
                      <th className="px-4 py-2.5 w-32">{tr ? 'TÜR' : 'TYPE'}</th>
                      <th className="px-4 py-2.5 w-36">{tr ? 'TUTAR' : 'AMOUNT'}</th>
                      <th className="px-4 py-2.5">{tr ? 'AÇIKLAMA' : 'DESCRIPTION'}</th>
                      <th className="px-4 py-2.5 w-36">{tr ? 'REFERANS NO' : 'REF NO'}</th>
                      <th className="px-4 py-2.5 text-right w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {entriesQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-[var(--fg-muted)]">
                          {tr ? 'Hareketler yükleniyor...' : 'Loading entries...'}
                        </td>
                      </tr>
                    ) : filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-[var(--fg-muted)]">
                          {tr ? 'Bu müşteri için henüz cari hareket kaydı bulunamadı.' : 'No entries found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry: CustomerLedgerEntry) => {
                        const isDebit = entry.type === 'Debit';
                        return (
                          <tr key={entry.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                            <td className="px-4 py-2.5 font-mono text-[var(--fg-muted)]">{entry.entryDate}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.2 text-[10px] font-bold ${
                                    isDebit
                                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                  }`}
                                >
                                  {isDebit ? (tr ? 'Borç' : 'Debit') : tr ? 'Alacak' : 'Credit'}
                                </span>
                                {entry.paymentId && (
                                  <span className="rounded-[2px] border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.2 text-[9.5px] font-bold text-blue-400">
                                    {tr ? 'Tahsilat' : 'Payment'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono font-bold text-[var(--fg)]">
                              {fmtMoney(entry.amount, entry.currency)}
                            </td>
                            <td className="px-4 py-2.5 text-[var(--fg)]">{entry.description || '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-[var(--fg-muted)]">{entry.referenceNumber || '—'}</td>
                            <td className="px-4 py-2.5 text-right">
                              {!entry.paymentId && (
                                <button
                                  type="button"
                                  onClick={() => removeEntry.mutate(entry.id)}
                                  disabled={removeEntry.isPending}
                                  title={tr ? 'Hareketi sil' : 'Delete entry'}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-[3px] text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
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
        )}
      </div>

      {/* Müşteri Oluşturma Modalı */}
      {createOpen && (
        <CreateCustomerDialog
          onClose={() => setCreateOpen(false)}
          onSaved={(id) => {
            toast.success(tr ? 'Müşteri eklendi.' : 'Customer created.');
            void qc.invalidateQueries({ queryKey: ['customers'] });
            setCustomerId(id);
          }}
        />
      )}
    </div>
  );
}
