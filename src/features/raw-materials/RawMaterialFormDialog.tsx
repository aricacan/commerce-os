'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FlaskConical } from 'lucide-react';
import { rawMaterialApi, type RawMaterial, type RawMaterialFormValues } from '../../lib/api/raw-material';
import { supplierApi, type Supplier } from '../../lib/api/supplier';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../lib/i18n';

interface Props {
  material: RawMaterial | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: RawMaterialFormValues = {
  name: '',
  code: null,
  unit: 'Adet',
  unitCost: 0,
  currency: 'TRY',
  supplierId: null,
  notes: null,
};

export function RawMaterialFormDialog({ material, onClose, onSaved }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const isEdit = material !== null;

  const [form, setForm] = useState<RawMaterialFormValues>(
    material
      ? {
          name: material.name,
          code: material.code,
          unit: material.unit,
          unitCost: material.unitCost,
          currency: material.currency,
          supplierId: material.supplierId,
          notes: material.notes,
        }
      : EMPTY
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', ''],
    queryFn: () => supplierApi.list(),
    staleTime: 60_000,
  });

  const suppliers: Supplier[] = suppliersQuery.data ?? [];

  function set<K extends keyof RawMaterialFormValues>(key: K, value: RawMaterialFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const s = (v: string) => (v.trim() === '' ? null : v.trim());

  async function handleSave() {
    if (form.name.trim() === '') {
      setError(tr ? 'Hammadde adı zorunludur.' : 'Name is required.');
      return;
    }
    if (form.unitCost < 0) {
      setError(tr ? 'Birim maliyet negatif olamaz.' : 'Unit cost cannot be negative.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: RawMaterialFormValues = {
        ...form,
        name: form.name.trim(),
        code: form.code ? form.code.trim() : null,
      };

      if (isEdit) {
        await rawMaterialApi.update(material.id, payload);
      } else {
        await rawMaterialApi.create(payload);
      }
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
        className="w-full max-w-lg rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <FlaskConical size={16} className="text-[var(--fg-muted)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">
                {isEdit ? (tr ? 'Hammaddeyi Düzenle' : 'Edit Raw Material') : (tr ? 'Yeni Hammadde Kartı' : 'New Raw Material')}
              </h2>
              <p className="text-[11px] text-[var(--fg-muted)]">
                {tr ? 'BOM reçetelerinde ve üretimde kullanılacak hammadde/parça tanımı.' : 'Define material used in BOM recipes and manufacturing.'}
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
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              {tr ? 'Hammadde / Parça Adı *' : 'Material Name *'}
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={tr ? 'Örn: ABS Plastik Granül, Çelik Vida M4x20' : 'e.g. ABS Granule, Steel Bolt'}
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Stok / Parça Kodu' : 'Part / SKU Code'}
              </label>
              <input
                value={form.code ?? ''}
                onChange={(e) => set('code', s(e.target.value))}
                placeholder="HAM-001"
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Ölçü Birimi' : 'Unit'}
              </label>
              <FilterSelect
                value={form.unit ?? 'Adet'}
                onChange={(v) => set('unit', v || 'Adet')}
                placeholder={tr ? 'Birim Seçin' : 'Select Unit'}
                height="h-8.5"
                options={[
                  { value: 'Adet', label: tr ? 'Adet (pcs)' : 'Piece (pcs)' },
                  { value: 'Kg', label: 'Kilogram (kg)' },
                  { value: 'Gr', label: 'Gram (gr)' },
                  { value: 'Metre', label: 'Metre (m)' },
                  { value: 'Litre', label: 'Litre (lt)' },
                  { value: 'Paket', label: tr ? 'Paket / Kutu' : 'Pack / Box' },
                  { value: 'Rulo', label: tr ? 'Rulo' : 'Roll' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Birim Maliyet' : 'Unit Cost'}
              </label>
              <input
                type="number"
                step="0.0001"
                value={form.unitCost}
                onChange={(e) => set('unitCost', Number(e.target.value))}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Para Birimi' : 'Currency'}
              </label>
              <FilterSelect
                value={form.currency ?? 'TRY'}
                onChange={(v) => set('currency', v || 'TRY')}
                placeholder="TRY"
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

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              {tr ? 'Ana Tedarikçi' : 'Primary Supplier'}
            </label>
            <FilterSelect
              value={form.supplierId ? String(form.supplierId) : ''}
              onChange={(v) => set('supplierId', v ? Number(v) : null)}
              placeholder={tr ? 'Tedarikçi atanmamış' : 'No supplier assigned'}
              searchable={true}
              height="h-8.5"
              options={suppliers.map((s) => ({
                value: String(s.id),
                label: s.name,
                sublabel: s.shortCode || undefined,
              }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
              {tr ? 'Notlar' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => set('notes', s(e.target.value))}
              placeholder={tr ? 'Teknik özellikler, tolerans vb...' : 'Technical specifications...'}
              className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
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
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : isEdit ? (tr ? 'Güncelle' : 'Update') : (tr ? 'Hammaddeyi Kaydet' : 'Save Material')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
