'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2 } from 'lucide-react';
import { billingEntityApi, type BillingEntity, type BillingEntityFormValues } from '../../lib/api/billing-entity';
import { useI18n } from '../../lib/i18n';

interface Props {
  entity: BillingEntity | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: BillingEntityFormValues = {
  legalName: '',
  taxNumber: '',
  taxOffice: null,
  mersisNumber: null,
  tradeRegistryNumber: null,
  addressLine: null,
  city: null,
  district: null,
  postCode: null,
  phone: null,
  email: null,
  iban: null,
  bankName: null,
  authorizedPersonName: null,
  authorizedPersonTitle: null,
  isActive: true,
  requireApprovalBeforeIssue: false,
};

export function BillingEntityFormDialog({ entity, onClose, onSaved }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const isEdit = entity !== null;

  const [form, setForm] = useState<BillingEntityFormValues>(
    entity
      ? (({ id: _id, storeCodes: _sc, documents: _d, createdAt: _c, updatedAt: _u, ...rest }) => rest)(entity)
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof BillingEntityFormValues>(key: K, value: BillingEntityFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const s = (v: string) => (v.trim() === '' ? null : v.trim());

  async function handleSave() {
    if (form.legalName.trim() === '') {
      setError(tr ? 'Resmi şirket unvanı zorunludur.' : 'Legal company name is required.');
      return;
    }
    if (form.taxNumber.trim() === '') {
      setError(tr ? 'Vergi Kimlik Numarası (VKN) zorunludur.' : 'Tax number (VKN) is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: BillingEntityFormValues = {
        ...form,
        legalName: form.legalName.trim(),
        taxNumber: form.taxNumber.trim(),
      };
      if (isEdit) {
        await billingEntityApi.update(entity.id, payload);
      } else {
        await billingEntityApi.create(payload);
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
        className="w-full max-w-2xl rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Building2 size={16} className="text-[var(--fg-muted)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">
                {isEdit ? (tr ? 'Fatura Kesen Şirketi Düzenle' : 'Edit Billing Entity') : (tr ? 'Yeni Fatura Kesen Şirket' : 'New Billing Entity')}
              </h2>
              <p className="text-[11px] text-[var(--fg-muted)]">
                {tr ? 'Resmi e-Fatura / e-Arşiv faturası kesecek tüzel kişilik tanımları.' : 'Corporate entity used for issuing e-Invoices.'}
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

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Section 1: Resmi Şirket Bilgileri */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5 border-b border-[var(--border-soft)] pb-1.5">
              <span>{tr ? '1. Resmi Kurumsal Bilgiler' : '1. Corporate Information'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Resmi Şirket Unvanı *' : 'Legal Company Name *'}
                </label>
                <input
                  value={form.legalName}
                  onChange={(e) => set('legalName', e.target.value)}
                  placeholder={tr ? 'Örn: Demo Oto Sanayi ve Ticaret A.Ş.' : 'Company name...'}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Vergi Kimlik Numarası (VKN) *' : 'Tax Number (VKN) *'}
                </label>
                <input
                  value={form.taxNumber}
                  onChange={(e) => set('taxNumber', e.target.value)}
                  placeholder="1234567890"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Vergi Dairesi' : 'Tax Office'}
                </label>
                <input
                  value={form.taxOffice ?? ''}
                  onChange={(e) => set('taxOffice', s(e.target.value))}
                  placeholder={tr ? 'Boğaziçi VD' : 'Tax office...'}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'MERSİS Numarası' : 'MERSIS Number'}
                </label>
                <input
                  value={form.mersisNumber ?? ''}
                  onChange={(e) => set('mersisNumber', s(e.target.value))}
                  placeholder="0123456789000001"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Ticaret Sicil Numarası' : 'Trade Registry No'}
                </label>
                <input
                  value={form.tradeRegistryNumber ?? ''}
                  onChange={(e) => set('tradeRegistryNumber', s(e.target.value))}
                  placeholder="123456"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Adres & İletişim */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5 border-b border-[var(--border-soft)] pb-1.5">
              <span>{tr ? '2. Adres ve İletişim' : '2. Address & Contact'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Açık Adres' : 'Address Line'}
                </label>
                <input
                  value={form.addressLine ?? ''}
                  onChange={(e) => set('addressLine', s(e.target.value))}
                  placeholder={tr ? 'Mahalle, Cadde, Sokak, No...' : 'Address...'}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Şehir / İl' : 'City'}
                </label>
                <input
                  value={form.city ?? ''}
                  onChange={(e) => set('city', s(e.target.value))}
                  placeholder="İstanbul"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'İlçe' : 'District'}
                </label>
                <input
                  value={form.district ?? ''}
                  onChange={(e) => set('district', s(e.target.value))}
                  placeholder="Başakşehir"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Telefon' : 'Phone'}
                </label>
                <input
                  value={form.phone ?? ''}
                  onChange={(e) => set('phone', s(e.target.value))}
                  placeholder="+90 212 000 00 00"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'E-posta' : 'Email'}
                </label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => set('email', s(e.target.value))}
                  placeholder="muhasebe@sirket.com"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Banka & Yetkili */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)] flex items-center gap-1.5 border-b border-[var(--border-soft)] pb-1.5">
              <span>{tr ? '3. Banka & Yetkili Bilgileri' : '3. Bank & Authorized Person'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Banka Adı' : 'Bank Name'}
                </label>
                <input
                  value={form.bankName ?? ''}
                  onChange={(e) => set('bankName', s(e.target.value))}
                  placeholder="Garanti BBVA"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'IBAN Numarası' : 'IBAN'}
                </label>
                <input
                  value={form.iban ?? ''}
                  onChange={(e) => set('iban', s(e.target.value))}
                  placeholder="TR00 0000 0000 0000 0000 00"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Yetkili Kişi Adı' : 'Authorized Person Name'}
                </label>
                <input
                  value={form.authorizedPersonName ?? ''}
                  onChange={(e) => set('authorizedPersonName', s(e.target.value))}
                  placeholder="Ad Soyad"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)]">
                  {tr ? 'Yetkili Unvanı' : 'Authorized Person Title'}
                </label>
                <input
                  value={form.authorizedPersonTitle ?? ''}
                  onChange={(e) => set('authorizedPersonTitle', s(e.target.value))}
                  placeholder="Genel Müdür / Şirket Müdürü"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Operasyonel Seçenekler */}
          <div className="flex flex-wrap items-center gap-6 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)]">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="h-4 w-4 rounded-[3px] border-[var(--border)]"
              />
              <span>{tr ? 'Şirket Aktif Olarak Kullanılsın' : 'Active Entity'}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)]">
              <input
                type="checkbox"
                checked={form.requireApprovalBeforeIssue}
                onChange={(e) => set('requireApprovalBeforeIssue', e.target.checked)}
                className="h-4 w-4 rounded-[3px] border-[var(--border)]"
              />
              <span>{tr ? 'Fatura Kesilmeden Önce Onay Zorunlu Olsun' : 'Require approval before issue'}</span>
            </label>
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
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : isEdit ? (tr ? 'Güncelle' : 'Update') : (tr ? 'Şirketi Kaydet' : 'Save Entity')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
