'use client';

import { localDateStr } from '../../utils/date';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Truck, AlertCircle, Upload, FileDown } from 'lucide-react';
import { deliveryNoteApi, type CreateDeliveryNoteLineBody } from '../../lib/api/delivery-note';
import { billingEntityApi } from '../../lib/api/billing-entity';
import { useI18n } from '../../lib/i18n';
import { downloadExcel, type ExportColumn } from '../../lib/export';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_LINE: CreateDeliveryNoteLineBody = { description: '', quantity: 1, unit: 'Adet' };

// Excel şablonundaki sütun başlıkları — DeliveryNoteLineExcelParser'ın tanıdığı KANONİK
// adlarla BİREBİR aynı olmalı (bkz. backend DeliveryNoteLineExcelParser.DescriptionHeaders/...).
const TEMPLATE_COLUMNS: ExportColumn[] = [
  { key: 'aciklama', header: 'Açıklama', type: 'text' },
  { key: 'miktar', header: 'Miktar', type: 'int' },
  { key: 'birim', header: 'Birim', type: 'text' },
];

export function DeliveryNoteFormDialog({ onClose, onSaved }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [billingEntityId, setBillingEntityId] = useState<number | ''>('');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => localDateStr());
  const [recipientName, setRecipientName] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<CreateDeliveryNoteLineBody[]>([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingExcel, setImportingExcel] = useState(false);
  const [excelWarnings, setExcelWarnings] = useState<string[]>([]);

  const billingEntitiesQuery = useQuery({
    queryKey: ['billing-entities'],
    queryFn: () => billingEntityApi.list(),
    staleTime: 60_000,
  });
  const billingEntities = billingEntitiesQuery.data ?? [];

  const validLines = lines.filter((l) => l.description.trim() !== '');

  function setLine(idx: number, patch: Partial<CreateDeliveryNoteLineBody>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function handleTemplateDownload() {
    void downloadExcel('irsaliye_sablonu', [], TEMPLATE_COLUMNS, 'Şablon');
  }

  async function handleImportExcel(file: File) {
    setImportingExcel(true);
    setExcelWarnings([]);
    setError(null);
    try {
      const result = await deliveryNoteApi.parseLineExcel(file);
      if (result.lines.length > 0) {
        setLines((prev) => {
          const base = prev.filter((l) => l.description.trim() !== '');
          return [...base, ...result.lines];
        });
      }
      setExcelWarnings(result.warnings.map((w) => `Satır ${w.rowNumber}: ${w.message}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : (tr ? 'Excel okunamadı.' : 'Could not read Excel file.'));
    } finally {
      setImportingExcel(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!deliveryNoteNumber.trim()) {
      setError(tr ? 'İrsaliye numarası zorunludur.' : 'Note number is required.');
      return;
    }
    if (!recipientName.trim()) {
      setError(tr ? 'Alıcı adı zorunludur.' : 'Recipient name is required.');
      return;
    }
    if (validLines.length === 0) {
      setError(tr ? 'En az bir kalem açıklama girin.' : 'At least one line item is required.');
      return;
    }

    setSaving(true);
    try {
      await deliveryNoteApi.create({
        billingEntityId: billingEntityId ? Number(billingEntityId) : undefined,
        deliveryNoteNumber: deliveryNoteNumber.trim(),
        deliveryDate,
        recipientName: recipientName.trim(),
        recipientAddress: recipientAddress.trim() || undefined,
        notes: notes.trim() || undefined,
        lines: validLines,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr ? 'Kaydedilemedi.' : 'Failed to save.');
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
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden text-xs text-[var(--fg)]"
      >
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5 bg-[var(--bg-subtle)]/30">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-[var(--fg)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {tr ? 'Yeni İrsaliye Oluştur' : 'New Delivery Note'}
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-start gap-2 rounded-[4px] border border-blue-500/20 bg-blue-500/5 p-3 text-[11.5px] text-[var(--fg-muted)]">
            <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <span>
              {tr
                ? 'Dahili sevkiyat takibi — GİB gönderimi yapılmaz. Birden çok irsaliye daha sonra tek faturaya bağlanabilir.'
                : 'Internal delivery tracking. Multiple notes can later be linked and consolidated into an invoice.'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'İrsaliye Numarası *' : 'Note Number *'}
              </label>
              <input
                type="text"
                value={deliveryNoteNumber}
                onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                placeholder="IRS-2026-001"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 font-mono text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Tarih' : 'Date'}
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Fatura Kesen Şirket (Opsiyonel)' : 'Billing Entity (Optional)'}
            </label>
            <select
              value={billingEntityId}
              onChange={(e) => setBillingEntityId(e.target.value ? Number(e.target.value) : '')}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none cursor-pointer"
            >
              <option value="">— {tr ? 'Şirket Seçin' : 'Select Entity'} —</option>
              {billingEntities.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legalName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Alıcı Adı / Unvanı *' : 'Recipient Name *'}
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={tr ? 'Örn: Ahmet Yılmaz / ABC Ltd.' : 'Recipient name...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Teslimat Adresi' : 'Delivery Address'}
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder={tr ? 'Mahalle, Cadde, İl/İlçe' : 'Address details...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
          </div>

          {/* Kalemler / Satırlar */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-soft)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'İrsaliye Kalemleri' : 'Line Items'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTemplateDownload}
                  title={tr ? 'Boş Excel şablonu indir' : 'Download blank Excel template'}
                  className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  <FileDown size={11} /> {tr ? 'Şablon İndir' : 'Template'}
                </button>
                <label className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer">
                  <Upload size={11} />
                  <span>{importingExcel ? (tr ? 'Okunuyor...' : 'Reading...') : (tr ? "Excel'den Yükle" : 'Import Excel')}</span>
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    disabled={importingExcel}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleImportExcel(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
                  className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  <Plus size={11} /> {tr ? 'Kalem Ekle' : 'Add Item'}
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
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => setLine(idx, { description: e.target.value })}
                      placeholder={tr ? 'Ürün/malzeme adı veya açıklama' : 'Item description'}
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={line.quantity}
                      onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })}
                      placeholder={tr ? 'Miktar' : 'Qty'}
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-mono text-center text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="text"
                      value={line.unit ?? 'Adet'}
                      onChange={(e) => setLine(idx, { unit: e.target.value })}
                      placeholder={tr ? 'Birim' : 'Unit'}
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-center text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={lines.length === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border-soft)] text-rose-400 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-30"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Notlar & Açıklama' : 'Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr ? 'Teslimat ile ilgili ek notlar...' : 'Delivery notes...'}
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
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : tr ? 'İrsaliyeyi Kaydet' : 'Save Delivery Note'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
