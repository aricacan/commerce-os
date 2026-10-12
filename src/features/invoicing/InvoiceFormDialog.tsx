'use client';

import { localDateStr } from '../../utils/date';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Receipt, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import {
  invoiceApi,
  INVOICE_TYPE_CODES,
  type InvoiceDirection,
  type InvoiceDeliveryChannel,
  type CreateInvoiceLineBody,
} from '../../lib/api/invoice';
import { supplierApi } from '../../lib/api/supplier';
import { billingEntityApi } from '../../lib/api/billing-entity';
import { taxCodeApi } from '../../lib/api/tax-code';
import { storeApi } from '../../lib/api/integrations';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { useI18n } from '../../lib/i18n';
import { Upload } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_LINE: CreateInvoiceLineBody = { description: '', quantity: 1, unit: 'Adet', unitPrice: 0, vatRate: 20 };

const LEDGER_CURRENCY = 'TRY';

// Backend (TaxEngine / InvoiceService) ile AYNI kural: her satır AYRI yuvarlanır, 2 hane,
// AwayFromZero. Önceden matrah hiç yuvarlanmadan toplanıyordu; formda görünen toplam ile
// kaydedilen satır toplamları kuruş farkı verebiliyordu. EPSILON: 1.005 gibi ikili kayan
// nokta temsilinde 1.00499… olan değerler aşağı yuvarlanmasın diye.
function roundMoney(value: number): number {
  return Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
}

export function InvoiceFormDialog({ onClose, onSaved }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [direction, setDirection] = useState<InvoiceDirection>('Outgoing');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [billingEntityId, setBillingEntityId] = useState<number | ''>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => localDateStr());
  const [currency, setCurrency] = useState(LEDGER_CURRENCY);
  // Dövizli faturada ZORUNLU — backend kursuz dövizli faturayı reddeder (UBL ve TL defter karşılığı).
  const [exchangeRate, setExchangeRate] = useState('');
  const [notes, setNotes] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerTaxNumber, setBuyerTaxNumber] = useState('');
  const [buyerTaxOffice, setBuyerTaxOffice] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [lines, setLines] = useState<CreateInvoiceLineBody[]>([{ ...EMPTY_LINE }]);
  const [amount, setAmount] = useState('');
  const [vatAmount, setVatAmount] = useState('');
  const [isCreditNote, setIsCreditNote] = useState(false);
  const [originalInvoiceId, setOriginalInvoiceId] = useState<number | ''>('');
  const [invoiceTypeCode, setInvoiceTypeCode] = useState<string>('');
  // FAZ 6 — QNB'deki "Yerel Fatura No" / şube-kasa / kağıt-elektronik karşılıkları.
  const [localInvoiceNumber, setLocalInvoiceNumber] = useState('');
  const [storeId, setStoreId] = useState<number | ''>('');
  const [cashRegisterCode, setCashRegisterCode] = useState('');
  const [deliveryChannel, setDeliveryChannel] = useState<InvoiceDeliveryChannel>('Elektronik');
  // FAZ 8 — ÖTV/ÖİV, dönem ve etiket bilgileri (bilgi amaçlı, otomotiv aksesuar için düşük
  // gerçek kullanım ama backend'de mevcut alanlar).
  const [otvAmount, setOtvAmount] = useState('');
  const [oivAmount, setOivAmount] = useState('');
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [tags, setTags] = useState('');
  // FAZ 3.4 — GİB UBL cac:LegalMonetaryTotal alanları (QNB eSolutions "Toplamlar" bölümü ile
  // aynı UX: yuvarlama + masraf + "Ödenecek Tutarı Kendim Girmek İstiyorum" checkbox'ı).
  const [roundingAmount, setRoundingAmount] = useState('');
  const [chargeTotal, setChargeTotal] = useState('');
  const [manualPayableEnabled, setManualPayableEnabled] = useState(false);
  const [manualPayableAmount, setManualPayableAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [excelWarnings, setExcelWarnings] = useState<string[]>([]);

  const suppliersQuery = useQuery({ queryKey: ['suppliers', ''], queryFn: () => supplierApi.list(), staleTime: 60_000 });
  const suppliers = suppliersQuery.data ?? [];
  const billingEntitiesQuery = useQuery({ queryKey: ['billing-entities'], queryFn: () => billingEntityApi.list(), staleTime: 60_000, enabled: direction === 'Outgoing' });
  const billingEntities = billingEntitiesQuery.data ?? [];
  const taxCodesQuery = useQuery({ queryKey: ['tax-codes', 'active'], queryFn: () => taxCodeApi.list(true), staleTime: 60_000, enabled: direction === 'Outgoing' });
  const taxCodes = taxCodesQuery.data ?? [];
  const storesQuery = useQuery({ queryKey: ['stores'], queryFn: () => storeApi.list(), staleTime: 60_000 });
  const stores = storesQuery.data ?? [];
  const outgoingInvoicesQuery = useQuery({
    queryKey: ['invoices', 'Outgoing'],
    queryFn: () => invoiceApi.list({ direction: 'Outgoing' }),
    staleTime: 30_000,
    enabled: direction === 'Outgoing' && isCreditNote,
  });

  const creditableInvoices = (outgoingInvoicesQuery.data ?? []).filter(
    (i) => !i.isCreditNote && (!billingEntityId || i.billingEntityId === Number(billingEntityId))
  );

  const validLines = lines.filter((l) => l.description.trim() !== '' && l.unitPrice > 0);

  function effectiveVatRate(l: CreateInvoiceLineBody): number {
    if (l.taxCodeId) return taxCodes.find((t) => t.id === l.taxCodeId)?.rate ?? 0;
    return l.vatRate;
  }

  const lineTaxable = (l: CreateInvoiceLineBody) => roundMoney(l.quantity * l.unitPrice - (l.discountAmount ?? 0));
  const linesTotal = roundMoney(validLines.reduce((sum, l) => sum + lineTaxable(l), 0));
  const linesVatTotal = roundMoney(
    validLines.reduce((sum, l) => sum + roundMoney((lineTaxable(l) * effectiveVatRate(l)) / 100), 0)
  );
  const isForeignCurrency = currency !== LEDGER_CURRENCY;

  function setLine(idx: number, patch: Partial<CreateInvoiceLineBody>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    setError(null);
    if (!invoiceNumber.trim()) {
      setError(tr ? 'Fatura numarası zorunludur.' : 'Invoice number is required.');
      return;
    }

    const useLines = direction === 'Outgoing' && validLines.length > 0;
    const finalAmount = useLines ? linesTotal : Number(amount);
    if (!useLines && (!amount || Number.isNaN(finalAmount) || finalAmount <= 0)) {
      setError(tr ? 'Tutar sıfırdan büyük olmalıdır.' : 'Amount must be greater than zero.');
      return;
    }
    if (direction === 'Outgoing' && useLines && (!buyerName.trim() || !buyerTaxNumber.trim())) {
      setError(tr ? 'UBL-TR XML üretebilmek için alıcı adı ve VKN/TCKN zorunludur.' : 'Buyer name and tax number are required.');
      return;
    }
    if (direction === 'Outgoing' && isCreditNote && !originalInvoiceId) {
      setError(tr ? 'İade faturası için orijinal faturayı seçin.' : 'Original invoice is required for credit note.');
      return;
    }
    const parsedRate = Number(exchangeRate);
    if (isForeignCurrency && (!exchangeRate || Number.isNaN(parsedRate) || parsedRate <= 0)) {
      setError(
        tr
          ? `${currency} faturası için döviz kuru zorunludur (1 ${currency} = ? TRY).`
          : `Exchange rate is required for a ${currency} invoice (1 ${currency} = ? TRY).`
      );
      return;
    }

    setSaving(true);
    try {
      await invoiceApi.create({
        direction,
        supplierId: direction === 'Incoming' && supplierId ? Number(supplierId) : undefined,
        billingEntityId: direction === 'Outgoing' && billingEntityId ? Number(billingEntityId) : undefined,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        amount: finalAmount,
        vatAmount: useLines ? linesVatTotal : vatAmount ? Number(vatAmount) : undefined,
        currency,
        // Kur tarihi gönderilmez: backend fatura tarihini kullanır (bkz. InvoiceService.ResolveExchangeRate).
        exchangeRate: isForeignCurrency ? parsedRate : undefined,
        notes: notes.trim() || undefined,
        lines: useLines ? validLines : undefined,
        buyerName: direction === 'Outgoing' ? buyerName.trim() || undefined : undefined,
        buyerTaxNumber: direction === 'Outgoing' ? buyerTaxNumber.trim() || undefined : undefined,
        buyerTaxOffice: direction === 'Outgoing' ? buyerTaxOffice.trim() || undefined : undefined,
        buyerAddress: direction === 'Outgoing' ? buyerAddress.trim() || undefined : undefined,
        isCreditNote: direction === 'Outgoing' ? isCreditNote : false,
        originalInvoiceId: direction === 'Outgoing' && isCreditNote && originalInvoiceId ? Number(originalInvoiceId) : undefined,
        invoiceTypeCode: direction === 'Outgoing' && invoiceTypeCode ? invoiceTypeCode : undefined,
        localInvoiceNumber: localInvoiceNumber.trim() || undefined,
        storeId: storeId ? Number(storeId) : undefined,
        cashRegisterCode: cashRegisterCode.trim() || undefined,
        deliveryChannel,
        otvAmount: otvAmount ? Number(otvAmount) : undefined,
        oivAmount: oivAmount ? Number(oivAmount) : undefined,
        periodStartDate: periodStartDate || undefined,
        periodEndDate: periodEndDate || undefined,
        tags: tags.trim() || undefined,
        roundingAmount: roundingAmount ? Number(roundingAmount) : undefined,
        chargeTotal: chargeTotal ? Number(chargeTotal) : undefined,
        manualPayableAmount: manualPayableEnabled && manualPayableAmount ? Number(manualPayableAmount) : undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Receipt size={16} className="text-[var(--fg-muted)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">
                {tr ? 'Yeni Fatura Kaydı Oluştur' : 'Create Invoice Record'}
              </h2>
              <p className="text-[11px] text-[var(--fg-muted)]">
                {tr ? 'Alış veya Satış faturası, e-Fatura XML oluşturma ve cari kayıt takibi.' : 'Sales / purchase invoice, e-Invoice UBL generation, and ledger tracking.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Direction Switcher Strip */}
        <div className="flex shrink-0 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 px-5 py-2.5 gap-2">
          <button
            type="button"
            onClick={() => setDirection('Outgoing')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3.5 text-xs font-bold transition cursor-pointer ${
              direction === 'Outgoing'
                ? 'bg-[var(--fg)] text-[var(--bg)] shadow-xs'
                : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <ArrowUpRight size={13} />
            <span>{tr ? 'Giden / Satış Faturası (Müşteriye)' : 'Outgoing / Sales Invoice'}</span>
          </button>

          <button
            type="button"
            onClick={() => setDirection('Incoming')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] px-3.5 text-xs font-bold transition cursor-pointer ${
              direction === 'Incoming'
                ? 'bg-[var(--fg)] text-[var(--bg)] shadow-xs'
                : 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <ArrowDownLeft size={13} />
            <span>{tr ? 'Gelen / Alış Faturası (Tedarikçiden)' : 'Incoming / Purchase Invoice'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Incoming: Supplier selection */}
          {direction === 'Incoming' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {tr ? 'Tedarikçi Firma *' : 'Supplier Company *'}
              </label>
              <FilterSelect
                value={supplierId ? String(supplierId) : ''}
                onChange={(v) => setSupplierId(v ? Number(v) : '')}
                placeholder={tr ? 'Tedarikçi Seçin...' : 'Select Supplier...'}
                searchable={true}
                height="h-8.5"
                options={suppliers.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  sublabel: s.shortCode || undefined,
                }))}
              />
            </div>
          )}

          {/* Outgoing: Billing Entity, Type, Credit Note */}
          {direction === 'Outgoing' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                    {tr ? 'Fatura Kesen Şirket *' : 'Billing Entity *'}
                  </label>
                  <FilterSelect
                    value={billingEntityId ? String(billingEntityId) : ''}
                    onChange={(v) => setBillingEntityId(v ? Number(v) : '')}
                    placeholder={tr ? 'Şirket Seçin...' : 'Select Entity...'}
                    searchable={true}
                    height="h-8.5"
                    options={billingEntities.map((b) => ({
                      value: String(b.id),
                      label: b.legalName,
                      sublabel: b.taxNumber,
                    }))}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                    {tr ? 'Fatura Tipi (GİB UBL)' : 'Invoice Type (GIB)'}
                  </label>
                  <FilterSelect
                    value={invoiceTypeCode}
                    onChange={(v) => setInvoiceTypeCode(v)}
                    placeholder={tr ? '— Otomatik (SATIS / IADE) —' : '— Auto —'}
                    height="h-8.5"
                    options={[
                      { value: '', label: tr ? '— Otomatik (SATIS / IADE) —' : '— Auto —' },
                      ...INVOICE_TYPE_CODES.map((t) => ({ value: t.value, label: `${t.label} (${t.value})` })),
                    ]}
                  />
                </div>
              </div>

              {/* Credit note checkbox */}
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)]">
                  <input
                    type="checkbox"
                    checked={isCreditNote}
                    onChange={(e) => {
                      setIsCreditNote(e.target.checked);
                      setOriginalInvoiceId('');
                    }}
                    className="h-4 w-4 rounded-[3px]"
                  />
                  <span>{tr ? 'Bu bir İade Faturasıdır (orijinal bir satış faturasına karşı kesilir)' : 'This is a Credit Note (return invoice)'}</span>
                </label>

                {isCreditNote && (
                  <div className="mt-2.5 pt-2.5 border-t border-[var(--border-soft)]">
                    <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                      {tr ? 'Orijinal Faturayı Seçin *' : 'Original Invoice *'}
                    </label>
                    <FilterSelect
                      value={originalInvoiceId ? String(originalInvoiceId) : ''}
                      onChange={(v) => setOriginalInvoiceId(v ? Number(v) : '')}
                      placeholder={tr ? 'Fatura seçiniz...' : 'Select invoice...'}
                      searchable={true}
                      height="h-8"
                      options={creditableInvoices.map((inv) => ({
                        value: String(inv.id),
                        label: `${inv.invoiceNumber} — ${inv.amount.toLocaleString('tr-TR')} ${inv.currency}`,
                        sublabel: inv.buyerName || undefined,
                      }))}
                    />
                  </div>
                )}
              </div>

              {/* Buyer Information Section */}
              <div className="space-y-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
                <div className="text-xs font-bold text-[var(--fg)] border-b border-[var(--border-soft)] pb-1.5">
                  {tr ? 'Alıcı / Müşteri Bilgileri' : 'Buyer Information'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                      {tr ? 'Alıcı Adı / Unvanı *' : 'Buyer Name *'}
                    </label>
                    <input
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder={tr ? 'Şirket unvanı veya müşteri adı...' : 'Buyer name...'}
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                      {tr ? 'VKN / TCKN *' : 'Tax / National ID *'}
                    </label>
                    <input
                      value={buyerTaxNumber}
                      onChange={(e) => setBuyerTaxNumber(e.target.value)}
                      placeholder="1111111111"
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                      {tr ? 'Vergi Dairesi' : 'Tax Office'}
                    </label>
                    <input
                      value={buyerTaxOffice}
                      onChange={(e) => setBuyerTaxOffice(e.target.value)}
                      placeholder={tr ? 'Vergi dairesi...' : 'Tax office...'}
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                      {tr ? 'Adres' : 'Address'}
                    </label>
                    <input
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      placeholder={tr ? 'Açık adres...' : 'Address...'}
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--fg)]">{tr ? 'Fatura Kalemleri' : 'Invoice Lines'} ({lines.length})</span>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer">
                      <Upload size={11} />
                      <span>{importingExcel ? (tr ? 'Okunuyor...' : 'Reading...') : (tr ? "Excel'den Yükle" : 'Import Excel')}</span>
                      <input
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        disabled={importingExcel}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          setImportingExcel(true);
                          setExcelWarnings([]);
                          setError(null);
                          try {
                            const result = await invoiceApi.parseLineExcel(file);
                            if (result.lines.length > 0) {
                              setLines((prev) => {
                                const base = prev.filter((l) => l.description.trim() !== '' || l.unitPrice > 0);
                                return [...base, ...result.lines];
                              });
                            }
                            setExcelWarnings(result.warnings.map((w) => `Satır ${w.rowNumber}: ${w.message}`));
                          } catch (err) {
                            setError(err instanceof Error ? err.message : (tr ? 'Excel okunamadı.' : 'Could not read Excel file.'));
                          } finally {
                            setImportingExcel(false);
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
                      className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer"
                    >
                      <Plus size={11} />
                      <span>{tr ? '+ Kalem Ekle' : '+ Add Line'}</span>
                    </button>
                  </div>
                </div>

                {excelWarnings.length > 0 && (
                  <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5">
                    {excelWarnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 p-2.5 space-y-2"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 sm:col-span-5">
                          <input
                            value={line.description}
                            onChange={(e) => setLine(idx, { description: e.target.value })}
                            placeholder={tr ? 'Ürün / Hizmet açıklaması...' : 'Line item description...'}
                            className="h-8 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })}
                            placeholder={tr ? 'Miktar' : 'Qty'}
                            className="h-8 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] font-mono outline-none"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => setLine(idx, { unitPrice: Number(e.target.value) })}
                            placeholder={tr ? 'Birim Fiyat' : 'Price'}
                            className="h-8 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] font-mono outline-none"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2">
                          <input
                            type="number"
                            value={line.vatRate}
                            disabled={!!line.taxCodeId}
                            onChange={(e) => setLine(idx, { vatRate: Number(e.target.value) })}
                            placeholder="KDV %"
                            className="h-8 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] font-mono outline-none disabled:opacity-50"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={lines.length === 1}
                            className="flex h-8 w-8 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer ml-auto disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Tax code & discount line */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <FilterSelect
                            value={line.taxCodeId ? String(line.taxCodeId) : ''}
                            onChange={(v) => setLine(idx, { taxCodeId: v ? Number(v) : undefined })}
                            placeholder={tr ? '— Standart KDV % —' : '— Manual VAT % —'}
                            height="h-7.5"
                            options={taxCodes.map((t) => ({
                              value: String(t.id),
                              label: `${t.name} (${t.code})`,
                              sublabel: `%${t.rate}`,
                            }))}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            value={line.discountAmount ?? ''}
                            onChange={(e) => setLine(idx, { discountAmount: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder={tr ? 'İskonto Tutarı (0)' : 'Discount Amount (0)'}
                            className="h-7.5 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-[11px] text-[var(--fg)] font-mono outline-none"
                          />
                        </div>
                      </div>

                      {/* Tevkifat — ACCOUNTANT_REVIEW_REQUIRED, bilgi amaçlı, toplamları otomatik netlemez */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            value={line.withholdingRate ?? ''}
                            onChange={(e) => setLine(idx, { withholdingRate: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder={tr ? 'Tevkifat Oranı % (ops.)' : 'Withholding Rate % (opt.)'}
                            className="h-7.5 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-[11px] text-[var(--fg)] font-mono outline-none"
                          />
                        </div>
                        <div>
                          <input
                            value={line.withholdingCode ?? ''}
                            onChange={(e) => setLine(idx, { withholdingCode: e.target.value || undefined })}
                            placeholder={tr ? 'Tevkifat Kodu (GİB)' : 'Withholding Code (GIB)'}
                            disabled={!line.withholdingRate}
                            className="h-7.5 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-[11px] text-[var(--fg)] font-mono outline-none disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {validLines.length > 0 && (
                  <div className="flex items-center justify-between rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3 text-xs">
                    <div>
                      <span className="text-[var(--fg-muted)] mr-1">{tr ? 'Ara Toplam:' : 'Subtotal:'}</span>
                      <span className="font-mono font-bold text-[var(--fg)]">{linesTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                      <span className="text-[var(--fg-muted)] mx-2">•</span>
                      <span className="text-[var(--fg-muted)] mr-1">{tr ? 'KDV:' : 'VAT:'}</span>
                      <span className="font-mono font-bold text-[var(--fg)]">{linesVatTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="text-[var(--fg-muted)] mr-1.5">{tr ? 'Genel Toplam:' : 'Grand Total:'}</span>
                      <span className="font-mono font-black text-sm text-[var(--fg)]">
                        {(linesTotal + linesVatTotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {currency}
                      </span>
                    </div>
                  </div>
                )}

                {/* FAZ 3.4 — Toplamlar (GİB UBL cac:LegalMonetaryTotal), QNB eSolutions "Toplamlar" karşılığı */}
                <div className="space-y-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
                  <div className="text-xs font-bold text-[var(--fg)] border-b border-[var(--border-soft)] pb-1.5">
                    {tr ? 'Toplamlar' : 'Totals'}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                        {tr ? 'Yuvarlama Tutarı' : 'Rounding Amount'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={roundingAmount}
                        onChange={(e) => setRoundingAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                        {tr ? 'Toplam Masraf' : 'Charge Total'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={chargeTotal}
                        onChange={(e) => setChargeTotal(e.target.value)}
                        placeholder="0.00"
                        className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)] pt-1">
                    <input
                      type="checkbox"
                      checked={manualPayableEnabled}
                      onChange={(e) => {
                        setManualPayableEnabled(e.target.checked);
                        if (!e.target.checked) setManualPayableAmount('');
                      }}
                      className="h-4 w-4 rounded-[3px]"
                    />
                    <span>{tr ? 'Ödenecek Tutarı Kendim Girmek İstiyorum' : 'I want to enter the payable amount myself'}</span>
                  </label>

                  {manualPayableEnabled && (
                    <div className="pt-1">
                      <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                        {tr ? 'Ödenecek Tutar (Elle)' : 'Payable Amount (Manual)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualPayableAmount}
                        onChange={(e) => setManualPayableAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Invoice Number, Date, Currency Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[var(--border-soft)] pt-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Fatura Numarası *' : 'Invoice Number *'}
              </label>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="EFT2026000000001"
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Fatura Tarihi' : 'Invoice Date'}
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Para Birimi' : 'Currency'}
              </label>
              <FilterSelect
                value={currency}
                onChange={(v) => setCurrency(v || LEDGER_CURRENCY)}
                placeholder={tr ? 'Para Birimi' : 'Currency'}
                height="h-8.5"
                options={[
                  { value: 'TRY', label: 'TRY' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                  { value: 'GBP', label: 'GBP' },
                ]}
              />
            </div>
          </div>

          {/* Dövizli fatura: kur alanı yalnızca TRY dışı seçildiğinde görünür ve zorunludur. */}
          {isForeignCurrency && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                  {tr ? `Döviz Kuru * (1 ${currency} = ? TRY)` : `Exchange Rate * (1 ${currency} = ? TRY)`}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="0.0000"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>
          )}

          {/* FAZ 6 — Yerel Fatura No / Şube / Kasa / Teslim Kanalı */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Yerel Fatura No' : 'Local Invoice No'}
              </label>
              <input
                value={localInvoiceNumber}
                onChange={(e) => setLocalInvoiceNumber(e.target.value)}
                placeholder={tr ? 'Kasa fişi / iç referans...' : 'Internal reference...'}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Şube / Mağaza' : 'Store'}
              </label>
              <FilterSelect
                value={storeId ? String(storeId) : ''}
                onChange={(v) => setStoreId(v ? Number(v) : '')}
                placeholder={tr ? '— Seçilmedi —' : '— None —'}
                searchable={true}
                height="h-8.5"
                options={stores.map((s) => ({ value: String(s.id), label: s.name, sublabel: s.code }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Kasa Kodu' : 'Cash Register'}
              </label>
              <input
                value={cashRegisterCode}
                onChange={(e) => setCashRegisterCode(e.target.value)}
                placeholder={tr ? 'Kasa kodu...' : 'Register code...'}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Teslim Kanalı' : 'Delivery Channel'}
              </label>
              <FilterSelect
                value={deliveryChannel}
                onChange={(v) => setDeliveryChannel((v || 'Elektronik') as InvoiceDeliveryChannel)}
                placeholder={tr ? 'Teslim Kanalı' : 'Delivery Channel'}
                height="h-8.5"
                options={[
                  { value: 'Elektronik', label: tr ? 'Elektronik' : 'Electronic' },
                  { value: 'Kagit', label: tr ? 'Kağıt' : 'Paper' },
                ]}
              />
            </div>
          </div>

          {/* Incoming manual amount input if no lines */}
          {(direction === 'Incoming' || validLines.length === 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'KDV Hariç Tutar *' : 'Taxable Amount *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'KDV Tutarı' : 'VAT Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={vatAmount}
                  onChange={(e) => setVatAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>
          )}

          {/* FAZ 8 — Ek Bilgiler: ÖTV/ÖİV, Dönem, Etiket (bilgi amaçlı) */}
          <div className="space-y-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 p-3.5">
            <div className="text-xs font-bold text-[var(--fg)]">
              {tr ? 'Ek Bilgiler (ÖTV/ÖİV, Dönem, Etiket)' : 'Additional Info (Excise/Consumption Taxes, Period, Tags)'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">ÖTV</label>
                <input
                  type="number"
                  step="0.01"
                  value={otvAmount}
                  onChange={(e) => setOtvAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">ÖİV</label>
                <input
                  type="number"
                  step="0.01"
                  value={oivAmount}
                  onChange={(e) => setOivAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Dönem Başlangıcı' : 'Period Start'}
                </label>
                <input
                  type="date"
                  value={periodStartDate}
                  onChange={(e) => setPeriodStartDate(e.target.value)}
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Dönem Bitişi' : 'Period End'}
                </label>
                <input
                  type="date"
                  value={periodEndDate}
                  onChange={(e) => setPeriodEndDate(e.target.value)}
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
                {tr ? 'Etiketler' : 'Tags'}
              </label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={tr ? 'virgülle-ayrılmış, etiketler...' : 'comma,separated,tags...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">
              {tr ? 'Notlar & Açıklama' : 'Notes & Description'}
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr ? 'Dahili fatura notları...' : 'Invoice notes...'}
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Faturayı Kaydet' : 'Save Invoice')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
