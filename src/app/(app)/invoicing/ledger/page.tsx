'use client';

import { localDateStr } from '../../../../utils/date';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, BookOpen, Upload, FileDown, RefreshCw, ArrowDownLeft, ArrowUpRight, Building2 } from 'lucide-react';
import { supplierApi } from '../../../../lib/api/supplier';
import { supplierLedgerApi, type LedgerEntry, type LedgerEntryType } from '../../../../lib/api/supplier-ledger';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../../lib/export';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

function AddEntryForm({ supplierId, onAdded }: { supplierId: number; onAdded: () => void }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [entryDate, setEntryDate] = useState(() => localDateStr());
  const [type, setType] = useState<LedgerEntryType>('Credit');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () =>
      supplierLedgerApi.addEntry({
        supplierId,
        entryDate,
        type,
        amount: Number(amount),
        currency,
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
    const numAmount = Number(amount);
    if (!amount || Number.isNaN(numAmount) || numAmount <= 0) {
      setError(tr ? 'Tutar sıfırdan büyük olmalıdır.' : 'Amount must be greater than zero.');
      return;
    }
    add.mutate();
  }

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
        <span className="font-bold text-[var(--fg)]">{tr ? 'Yeni Cari Hareket Ekle' : 'Add Ledger Entry'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Tarih' : 'Date'}</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'İşlem Türü' : 'Type'}</label>
          <FilterSelect
            value={type}
            onChange={(v) => setType((v || 'Credit') as LedgerEntryType)}
            placeholder={tr ? 'Tür Seçin' : 'Select Type'}
            height="h-8.5"
            options={[
              { value: 'Credit', label: tr ? 'Alacak (Borçlandık)' : 'Credit' },
              { value: 'Debit', label: tr ? 'Borç (Ödeme Yaptık)' : 'Debit' },
            ]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Tutar *' : 'Amount *'}</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Para Birimi' : 'Currency'}</label>
          <FilterSelect
            value={currency}
            onChange={(v) => setCurrency(v || 'TRY')}
            placeholder={tr ? 'Para Birimi' : 'Currency'}
            height="h-8.5"
            options={[
              { value: 'TRY', label: 'TRY' },
              { value: 'GBP', label: 'GBP' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Referans / Fatura No' : 'Ref / Invoice No'}</label>
          <input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="EFT2026001"
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Açıklama' : 'Description'}</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tr ? 'Örn: Mal alımı faturası, banka EFT ödemesi...' : 'Description...'}
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={add.isPending}
          className="inline-flex h-8.5 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Plus size={12} />
          <span>{add.isPending ? (tr ? 'Ekleniyor...' : 'Adding...') : (tr ? 'Hareket Ekle' : 'Add Entry')}</span>
        </button>
      </div>

      {error && <div className="text-[11px] text-rose-500 font-medium">{error}</div>}
    </div>
  );
}

export default function SupplierLedgerPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [supplierId, setSupplierId] = useState<number | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', ''],
    queryFn: () => supplierApi.list(),
    staleTime: 60_000,
  });

  const entriesQuery = useQuery({
    queryKey: ['supplier-ledger', 'entries', supplierId],
    queryFn: () => supplierLedgerApi.getEntries(supplierId!),
    enabled: supplierId !== null,
  });

  const balanceQuery = useQuery({
    queryKey: ['supplier-ledger', 'balance', supplierId],
    queryFn: () => supplierLedgerApi.getBalance(supplierId!),
    enabled: supplierId !== null,
  });

  const removeEntry = useMutation({
    mutationFn: (id: number) => supplierLedgerApi.removeEntry(id),
    onSuccess: () => {
      toast.success(tr ? 'Hareket silindi.' : 'Entry deleted.');
      void qc.invalidateQueries({ queryKey: ['supplier-ledger'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['supplier-ledger'] });

  const importExcel = useMutation({
    mutationFn: (file: File) => supplierLedgerApi.importExcel(supplierId!, file),
    onSuccess: (result) => {
      toast.success(
        tr
          ? `İçe aktarıldı: ${result.inserted} hareket eklendi, ${result.skipped} atlandı.`
          : `Imported: ${result.inserted} entries added.`
      );
      if (result.warnings.length > 0) toast.error(result.warnings.slice(0, 3).join(' '));
      invalidate();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const suppliers = suppliersQuery.data ?? [];
  const entries = entriesQuery.data ?? [];
  const balances = balanceQuery.data?.balances ?? [];

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Excel Export
  const handleExportExcel = () => {
    if (entries.length === 0 || !selectedSupplier) {
      toast.error(tr ? 'Dışa aktarılacak cari hareket yok.' : 'No entries to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Tarih' : 'Date', key: 'entryDate', type: 'text' },
      { header: tr ? 'İşlem Türü' : 'Type', key: 'type', type: 'text' },
      { header: tr ? 'Tutar' : 'Amount', key: 'amount', type: 'money' },
      { header: tr ? 'Para Birimi' : 'Currency', key: 'currency', type: 'text' },
      { header: tr ? 'Referans No' : 'Ref No', key: 'referenceNumber', type: 'text' },
      { header: tr ? 'Açıklama' : 'Description', key: 'description', type: 'text' },
    ];

    const rows = entries.map((e) => ({
      entryDate: e.entryDate,
      type: e.type === 'Credit' ? (tr ? 'Alacak' : 'Credit') : tr ? 'Borç' : 'Debit',
      amount: e.amount,
      currency: e.currency,
      referenceNumber: e.referenceNumber || '—',
      description: e.description || '—',
    }));

    void downloadExcel(
      `cari_ekstre_${selectedSupplier.shortCode || selectedSupplier.id}_${new Date().toISOString().slice(0, 10)}`,
      rows,
      cols,
      'CariEkstre'
    );
    toast.success(tr ? 'Cari ekstre Excel olarak indirildi.' : 'Ledger exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Sub Tab Navigation ── */}
      <InvoicingSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* Supplier Selector Bar */}
        <div data-tour="invoicing-ledger-supplier" className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)] shrink-0">
              <Building2 size={15} className="text-[var(--fg-muted)]" />
              <span>{tr ? 'Cari Hesap / Tedarikçi:' : 'Ledger Account:'}</span>
            </div>
            <FilterSelect
              value={supplierId ? String(supplierId) : ''}
              onChange={(v) => setSupplierId(v ? Number(v) : null)}
              placeholder={tr ? '— Tedarikçi Seçiniz —' : '— Select Supplier —'}
              searchable={true}
              minWidth={280}
              height="h-8.5"
              options={suppliers.map((s) => ({
                value: String(s.id),
                label: s.name,
                sublabel: s.shortCode || undefined,
              }))}
            />
          </div>

          {supplierId !== null && (
            <div data-tour="invoicing-ledger-actions" className="flex items-center gap-2 ml-auto">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importExcel.mutateAsync(file);
                  e.target.value = '';
                }}
              />

              <button
                type="button"
                onClick={handleExportExcel}
                disabled={entries.length === 0}
                title={tr ? 'Ekstre İndir' : 'Export Ledger'}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
              >
                <FileDown size={13} />
                <span className="hidden sm:inline">{tr ? 'Ekstre İndir' : 'Export'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={importExcel.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
              >
                <Upload size={13} />
                <span className="hidden sm:inline">{importExcel.isPending ? (tr ? 'Yükleniyor...' : 'Importing...') : (tr ? 'Ekstre Yükle' : 'Import')}</span>
              </button>

              <button
                type="button"
                onClick={invalidate}
                title={tr ? 'Yenile' : 'Refresh'}
                className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          )}
        </div>

        {supplierId === null ? (
          <div data-tour="invoicing-ledger-placeholder" className="flex flex-col items-center justify-center py-28 text-center gap-2.5 text-[var(--fg-muted)] rounded-[4px] border border-dashed border-[var(--border)] bg-[var(--card)]">
            <BookOpen size={36} strokeWidth={1.5} />
            <h4 className="text-sm font-bold text-[var(--fg)]">{tr ? 'Cari Hesap Defteri' : 'Supplier Ledger'}</h4>
            <p className="text-xs max-w-sm">
              {tr
                ? 'Borç, alacak ve bakiye hareketlerini görüntülemek için yukarıdan bir tedarikçi firma seçin.'
                : 'Select a supplier account above to view transaction history and balance.'}
            </p>
          </div>
        ) : (
          <>
            {/* Currency Balances Strip */}
            {balances.length > 0 && (
              <div data-tour="invoicing-ledger-balances" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {balances.map((b) => (
                  <div key={b.currency} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
                    <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{b.currency} {tr ? 'Net Bakiye' : 'Balance'}</div>
                    <div className={`mt-1 text-lg font-mono font-bold ${b.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {b.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {b.currency}
                    </div>
                    <div className="mt-1 text-[10.5px] text-[var(--fg-muted)] flex items-center justify-between border-t border-[var(--border-soft)]/50 pt-1">
                      <span>{tr ? 'Alacak:' : 'Credit:'} {b.totalCredit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                      <span>{tr ? 'Borç:' : 'Debit:'} {b.totalDebit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Entry Form */}
            <div data-tour="invoicing-ledger-form">
              <AddEntryForm supplierId={supplierId} onAdded={invalidate} />
            </div>

            {/* Ledger Transactions Table */}
            <div data-tour="invoicing-ledger-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                    <tr>
                      <th className="px-4 py-3">{tr ? 'TARİH' : 'DATE'}</th>
                      <th className="px-4 py-3">{tr ? 'İŞLEM TÜRÜ' : 'TYPE'}</th>
                      <th className="px-4 py-3">{tr ? 'TUTAR' : 'AMOUNT'}</th>
                      <th className="px-4 py-3">{tr ? 'REFERANS NO' : 'REF NUMBER'}</th>
                      <th className="px-4 py-3">{tr ? 'AÇIKLAMA' : 'DESCRIPTION'}</th>
                      <th className="px-4 py-3 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {entriesQuery.isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                          {tr ? 'Cari hareketler yükleniyor...' : 'Loading entries...'}
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                          {tr ? 'Bu cari hesap için henüz bir hareket kaydı bulunamadı.' : 'No entries found for this ledger.'}
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry: LedgerEntry) => (
                        <tr key={entry.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                          <td className="px-4 py-3 text-[var(--fg-muted)]">{entry.entryDate}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                                entry.type === 'Credit'
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {entry.type === 'Credit' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                              <span>{entry.type === 'Credit' ? (tr ? 'Alacak (Borçlandık)' : 'Credit') : tr ? 'Borç (Ödeme)' : 'Debit'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">
                            {entry.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                            {entry.currency}
                          </td>
                          <td className="px-4 py-3 font-mono text-[var(--fg-muted)]">{entry.referenceNumber || '—'}</td>
                          <td className="px-4 py-3 text-[var(--fg)] max-w-sm truncate">{entry.description || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeEntry.mutate(entry.id)}
                              disabled={removeEntry.isPending}
                              title={tr ? 'Hareketi Sil' : 'Delete Entry'}
                              className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer ml-auto disabled:opacity-40"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
