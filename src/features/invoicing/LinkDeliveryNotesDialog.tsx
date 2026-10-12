'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, Link2, AlertCircle } from 'lucide-react';
import { deliveryNoteApi, type DeliveryNote } from '../../lib/api/delivery-note';
import { invoiceApi } from '../../lib/api/invoice';
import { useI18n } from '../../lib/i18n';

interface Props {
  selected: DeliveryNote[];
  onClose: () => void;
  onLinked: () => void;
}

export function LinkDeliveryNotesDialog({ selected, onClose, onLinked }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [invoiceId, setInvoiceId] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'Outgoing', 'Draft'],
    queryFn: () => invoiceApi.list({ direction: 'Outgoing', status: 'Draft' }),
    staleTime: 15_000,
  });
  const invoices = invoicesQuery.data ?? [];

  async function handleLink() {
    if (!invoiceId) {
      setError(tr ? 'Lütfen bağlanacak faturayı seçin.' : 'Please select an invoice.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await deliveryNoteApi.linkToInvoice(
        selected.map((n) => n.id),
        Number(invoiceId)
      );
      onLinked();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr ? 'Bağlanamadı.' : 'Failed to link.');
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
            <Link2 size={16} className="text-[var(--fg)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {tr ? 'İrsaliyeleri Faturaya Bağla' : 'Link Notes to Invoice'}
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
        <div className="p-5 space-y-4">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3 space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-[var(--fg-muted)]">
              {tr ? 'Seçilen İrsaliyeler' : 'Selected Delivery Notes'} ({selected.length})
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono">
              {selected.map((n) => (
                <span
                  key={n.id}
                  className="rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[11px] font-bold text-[var(--fg)]"
                >
                  {n.deliveryNoteNumber}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
              {tr ? 'Hedef Fatura (Taslak, Satış Faturası) *' : 'Target Draft Outgoing Invoice *'}
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value ? Number(e.target.value) : '')}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none cursor-pointer"
            >
              <option value="">— {tr ? 'Fatura Seçin' : 'Select Invoice'} —</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}{' '}
                  {inv.currency} ({inv.buyerName || 'Müşteri'})
                </option>
              ))}
            </select>

            {invoices.length === 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-1.5">
                <AlertCircle size={12} />
                <span>
                  {tr
                    ? 'Taslak durumda giden fatura bulunamadı. Önce Faturalar sayfasından taslak fatura oluşturun.'
                    : 'No draft outgoing invoice found. Create a draft invoice first.'}
                </span>
              </div>
            )}
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
            onClick={() => void handleLink()}
            disabled={saving || !invoiceId}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-4 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
          >
            <Link2 size={13} />
            <span>{saving ? (tr ? 'Bağlanıyor...' : 'Linking...') : tr ? 'Faturaya Bağla' : 'Link to Invoice'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
