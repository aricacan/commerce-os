'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, AlertTriangle, CheckCircle2, FileCode } from 'lucide-react';
import { incomingInvoiceImportApi, type ImportUblInvoicePreview } from '../../lib/api/incoming-invoice-import';
import { useI18n } from '../../lib/i18n';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export function ImportIncomingInvoiceDialog({ onClose, onSaved }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportUblInvoicePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [force, setForce] = useState(false);

  async function handleFileSelected(selected: File) {
    setFile(selected);
    setPreview(null);
    setError(null);
    setForce(false);
    setLoading(true);
    try {
      const result = await incomingInvoiceImportApi.preview(selected);
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'XML ayrıştırılamadı.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    if (preview?.isDuplicate && !force) {
      setError(tr ? 'Bu fatura zaten sistemde kayıtlı. Devam etmek için kutucuğu onaylayın.' : 'Invoice is already registered. Please check force box.');
      return;
    }
    setError(null);
    setConfirming(true);
    try {
      await incomingInvoiceImportApi.confirm(file, preview?.matchedSupplierId ?? undefined, force);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fatura kaydedilemedi.');
    } finally {
      setConfirming(false);
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
        className="w-full max-w-lg rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <FileCode size={16} className="text-[var(--fg-muted)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">
                {tr ? 'Gelen e-Fatura / e-Arşiv İçe Aktar' : 'Import Incoming e-Invoice'}
              </h2>
              <p className="text-[11px] text-[var(--fg-muted)]">
                {tr ? 'Tedarikçiden alınan UBL-TR XML formatındaki faturayı sisteme yükleyin.' : 'Upload supplier UBL-TR XML e-Invoice.'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-[4px] border-2 border-dashed border-[var(--border)] bg-[var(--bg-subtle)]/30 p-6 text-center hover:bg-[var(--bg-subtle)]/60 transition cursor-pointer"
          >
            <Upload size={24} className="text-[var(--fg-muted)]" />
            <div>
              <div className="font-bold text-[var(--fg)]">
                {file ? file.name : tr ? 'UBL-TR XML Fatura Dosyası Seçin' : 'Select UBL-TR XML file'}
              </div>
              <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : tr ? 'veya dosyayı buraya sürükleyip bırakın (.xml)' : 'or drag and drop (.xml)'}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileSelected(f);
              }}
              className="hidden"
            />
          </div>

          {loading && (
            <div className="py-6 text-center text-xs text-[var(--fg-muted)]">
              {tr ? 'UBL-TR XML ayrıştırılıyor ve doğrulanıyor...' : 'Parsing UBL-TR XML...'}
            </div>
          )}

          {preview && (
            <div className="space-y-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 p-3.5">
              <div className="text-xs font-bold text-[var(--fg)] border-b border-[var(--border-soft)] pb-2">
                {tr ? 'Fatura Önizleme Bilgileri' : 'Invoice Preview'}
              </div>

              {preview.isDuplicate && (
                <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <div>{tr ? `Bu fatura zaten sistemde kayıtlı (Fatura #${preview.duplicateInvoiceId}).` : `This invoice is already registered (#${preview.duplicateInvoiceId}).`}</div>
                    <label className="flex items-center gap-1.5 mt-2 font-semibold text-[var(--fg)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={force}
                        onChange={(e) => setForce(e.target.checked)}
                        className="h-3.5 w-3.5 rounded-[2px]"
                      />
                      <span>{tr ? 'Yine de mükerrer kaydetmeye zorla' : 'Force import duplicate'}</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10.5px] text-[var(--fg-muted)] block">{tr ? 'Tedarikçi / Satıcı:' : 'Supplier / Vendor:'}</span>
                  <span className="font-bold text-[var(--fg)]">{preview.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-[var(--fg-muted)] block">{tr ? 'Vergi No (VKN):' : 'Tax Number:'}</span>
                  <span className="font-mono font-semibold text-[var(--fg)]">{preview.supplierTaxNumber}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-[var(--fg-muted)] block">{tr ? 'Fatura No:' : 'Invoice No:'}</span>
                  <span className="font-mono font-bold text-[var(--fg)]">{preview.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-[var(--fg-muted)] block">{tr ? 'Fatura Tarihi:' : 'Invoice Date:'}</span>
                  <span className="font-semibold text-[var(--fg)]">{preview.invoiceDate}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-[var(--fg-muted)] block">{tr ? 'Kalem Sayısı:' : 'Line Items:'}</span>
                  <span className="font-semibold text-[var(--fg)]">{preview.lines.length} {tr ? 'kalem' : 'items'}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-[var(--fg-muted)] block">{tr ? 'Toplam Tutar:' : 'Total Payable:'}</span>
                  <span className="font-mono font-bold text-[var(--fg)]">
                    {(preview.taxExclusiveAmount + preview.taxAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {preview.currency}
                  </span>
                </div>
              </div>

              {preview.matchedSupplierName ? (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium pt-1">
                  <CheckCircle2 size={13} />
                  <span>{tr ? `Sistemdeki tedarikçiyle eşleşti: ${preview.matchedSupplierName}` : `Matched supplier: ${preview.matchedSupplierName}`}</span>
                </div>
              ) : (
                <div className="text-[11px] text-amber-500 pt-1">
                  {tr ? 'ℹ️ Sistemde bu VKN ile kayıtlı tedarikçi bulunamadı, yeni cari/tedarikçi kaydı açılacak.' : 'No existing supplier matched, will create record.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!preview || confirming}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {confirming ? (tr ? 'Kaydediliyor...' : 'Importing...') : (tr ? 'Faturayı İçe Aktar ve Kaydet' : 'Confirm & Import')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
