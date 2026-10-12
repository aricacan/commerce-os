'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X, Building2, Phone, CreditCard, KeyRound, ExternalLink, Loader2 } from 'lucide-react';
import {
  supplierApi,
  type Supplier,
  type SupplierFormValues,
  type SupplierStatus,
  type SupplierType,
} from '../../lib/api/supplier';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { SearchableSelect, type SearchableSelectOption } from '../../components/ui/SearchableSelect';
import { TURKEY_CITIES, getDistrictsByCity } from '../../lib/turkey-locations';
import { useI18n } from '../../lib/i18n';

const SUPPLIER_TYPES: readonly SupplierType[] = ['RawMaterial', 'Product', 'Service'];
const SUPPLIER_STATUSES: readonly SupplierStatus[] = ['Candidate', 'Active', 'Inactive', 'Blacklisted'];

function asSupplierType(value: string): SupplierType | null {
  return SUPPLIER_TYPES.find((t) => t === value) ?? null;
}

function asSupplierStatus(value: string): SupplierStatus {
  return SUPPLIER_STATUSES.find((s) => s === value) ?? 'Active';
}

export function formatTrPhone(val: string): string {
  if (!val) return '';
  let digits = val.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length > 10) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length > 10) {
    digits = digits.slice(1);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 10);

  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
  if (digits.length <= 8) return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
}

interface ParsedSupplierNotes {
  b2bUsername: string;
  b2bPassword: string;
  b2bUrl: string;
  generalNotes: string;
}

export function parseSupplierNotes(rawNotes: string | null | undefined): ParsedSupplierNotes {
  if (!rawNotes) {
    return { b2bUsername: '', b2bPassword: '', b2bUrl: '', generalNotes: '' };
  }
  const trimmed = rawNotes.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          b2bUsername: String(parsed.b2bUsername ?? parsed.b2bUser ?? ''),
          b2bPassword: String(parsed.b2bPassword ?? parsed.b2bPass ?? ''),
          b2bUrl: String(parsed.b2bUrl ?? ''),
          generalNotes: String(parsed.generalNotes ?? parsed.notes ?? parsed.note ?? ''),
        };
      }
    } catch {
      // fallback to plain text below
    }
  }
  return { b2bUsername: '', b2bPassword: '', b2bUrl: '', generalNotes: rawNotes };
}

export function serializeSupplierNotes(data: ParsedSupplierNotes): string | null {
  const hasB2b = data.b2bUsername.trim() || data.b2bPassword.trim() || data.b2bUrl.trim();
  const notes = data.generalNotes.trim();

  if (!hasB2b && !notes) return null;
  if (!hasB2b && notes) return notes;

  return JSON.stringify({
    b2bUsername: data.b2bUsername.trim() || undefined,
    b2bPassword: data.b2bPassword.trim() || undefined,
    b2bUrl: data.b2bUrl.trim() || undefined,
    generalNotes: notes || undefined,
  });
}

interface Props {
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY: SupplierFormValues = {
  name: '', shortCode: null, taxNumber: null, taxOffice: null, tradeRegistryNumber: null, industry: null,
  contactPerson: null, phone: null, email: null, website: null, accountingContactEmail: null, accountingContactPhone: null,
  country: 'TR', city: null, district: null, addressLine: null, postCode: null,
  paymentTermDays: null, currency: 'TRY', leadTimeDays: null, minimumOrderQuantity: null, discountRate: null, creditLimit: null,
  contractStartDate: null, contractEndDate: null, priceListValidUntil: null, accountingExternalCode: null,
  iban: null, bankName: null, bankBranchCode: null, bankAccountNumber: null, swift: null,
  type: null, tags: null, riskLevel: null, priority: null, certifications: null,
  status: 'Active', performanceRating: null, notes: null,
};

type FormTab = 'general' | 'contact' | 'b2b' | 'commercial';

export function SupplierFormDialog({ supplier, onClose, onSaved }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const isEdit = supplier !== null;

  const [activeTab, setActiveTab] = useState<FormTab>('general');
  const [form, setForm] = useState<SupplierFormValues>(EMPTY);
  const [b2bInfo, setB2bInfo] = useState<ParsedSupplierNotes>({
    b2bUsername: '',
    b2bPassword: '',
    b2bUrl: '',
    generalNotes: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Veritabanından güncel veriyi çekerek düzenlemede hiçbir alanın boş kalmamasını garanti ediyoruz
  const { data: freshSupplier, isLoading: loadingDetails } = useQuery({
    queryKey: ['supplier-detail', isEdit ? supplier?.id : null],
    queryFn: () => (supplier?.id ? supplierApi.getById(supplier.id) : null),
    enabled: isEdit && !!supplier?.id,
    staleTime: 0,
  });

  useEffect(() => {
    const s = freshSupplier ?? supplier;
    if (s) {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = s;
      setForm({ ...EMPTY, ...rest });
      const parsed = parseSupplierNotes(s.notes);
      setB2bInfo(parsed);
    } else {
      setForm(EMPTY);
      setB2bInfo({ b2bUsername: '', b2bPassword: '', b2bUrl: '', generalNotes: '' });
    }
  }, [freshSupplier, supplier]);

  function set<K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Yazarken boşluk karakterinin silinmemesi için trim onChange içinde ASLA yapılmaz
  const cleanStr = (v: string | null | undefined): string | null => {
    if (!v) return null;
    const t = v.trim();
    return t === '' ? null : t;
  };

  const cleanNum = (v: number | string | null | undefined): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Türkiye il ve ilçe seçenekleri
  const cityOptions: SearchableSelectOption[] = useMemo(
    () => TURKEY_CITIES.map((c) => ({ value: c.name, label: c.name })),
    []
  );

  const districtOptions: SearchableSelectOption[] = useMemo(() => {
    if (!form.city) return [];
    const districts = getDistrictsByCity(form.city);
    return districts.map((d) => ({ value: d, label: d }));
  }, [form.city]);

  const supplierTypeOptions: SearchableSelectOption[] = useMemo(
    () => [
      { value: 'Product', label: tr ? 'Ürün Tedarikçisi (Ticari Mal)' : 'Product Supplier' },
      { value: 'RawMaterial', label: tr ? 'Hammadde / Yarı Mamul' : 'Raw Material' },
      { value: 'Service', label: tr ? 'Hizmet / Lojistik / Koli' : 'Service / Logistics' },
    ],
    [tr]
  );

  async function handleSave() {
    if (!form.name || form.name.trim() === '') {
      setError(tr ? 'Firma adı alanı zorunludur.' : 'Company name is required.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const finalNotes = serializeSupplierNotes(b2bInfo);

      const payload: SupplierFormValues = {
        ...form,
        name: form.name.trim(),
        shortCode: cleanStr(form.shortCode),
        taxNumber: cleanStr(form.taxNumber),
        taxOffice: cleanStr(form.taxOffice),
        tradeRegistryNumber: cleanStr(form.tradeRegistryNumber),
        industry: cleanStr(form.industry),
        contactPerson: cleanStr(form.contactPerson),
        phone: cleanStr(form.phone),
        email: cleanStr(form.email),
        website: cleanStr(form.website),
        accountingContactEmail: cleanStr(form.accountingContactEmail),
        accountingContactPhone: cleanStr(form.accountingContactPhone),
        city: cleanStr(form.city),
        district: cleanStr(form.district),
        addressLine: cleanStr(form.addressLine),
        postCode: cleanStr(form.postCode),
        paymentTermDays: cleanNum(form.paymentTermDays),
        leadTimeDays: cleanNum(form.leadTimeDays),
        accountingExternalCode: cleanStr(form.accountingExternalCode),
        iban: cleanStr(form.iban),
        bankName: cleanStr(form.bankName),
        bankBranchCode: cleanStr(form.bankBranchCode),
        bankAccountNumber: cleanStr(form.bankAccountNumber),
        swift: cleanStr(form.swift),
        notes: finalNotes,
      };

      if (isEdit && supplier?.id) {
        await supplierApi.update(supplier.id, payload);
      } else {
        await supplierApi.create(payload);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-[6px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)] flex items-center gap-2">
                <span>{isEdit ? (tr ? 'Tedarikçi Bilgilerini Düzenle' : 'Edit Supplier') : (tr ? 'Yeni Tedarikçi Kartı' : 'New Supplier Card')}</span>
                {loadingDetails && <Loader2 size={13} className="animate-spin text-[var(--fg-muted)]" />}
              </h2>
              <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                {isEdit ? form.name || '...' : (tr ? 'Tedarikçi genel, iletişim, B2B ve finansal şartlarını tanımlayın.' : 'Define supplier master, contact, B2B and commercial terms.')}
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

        {/* Tab Selection */}
        <div className="flex shrink-0 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 px-5 gap-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'general' ? 'border-slate-800 text-[var(--fg)] font-bold dark:border-slate-300' : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <Building2 size={13} />
            <span>{tr ? 'Genel & Kurumsal' : 'General & Corporate'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'contact' ? 'border-slate-800 text-[var(--fg)] font-bold dark:border-slate-300' : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <Phone size={13} />
            <span>{tr ? 'İletişim & Adres' : 'Contact & Address'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('b2b')}
            className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'b2b' ? 'border-slate-800 text-[var(--fg)] font-bold dark:border-slate-300' : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <KeyRound size={13} />
            <span>{tr ? 'B2B Giriş & Notlar' : 'B2B & Notes'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('commercial')}
            className={`flex items-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'commercial' ? 'border-slate-800 text-[var(--fg)] font-bold dark:border-slate-300' : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            <CreditCard size={13} />
            <span>{tr ? 'Ticari Şartlar & Banka' : 'Commercial & Bank'}</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* TAB 1: GENEL & KURUMSAL */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Firma / Tedarikçi Adı *' : 'Company / Supplier Name *'}
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder={tr ? 'Örn: ABC Otomotiv San. Tic. Ltd. Şti.' : 'Company name...'}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Kısa Kod / Rumuz' : 'Short Code'}
                </label>
                <input
                  value={form.shortCode ?? ''}
                  onChange={(e) => set('shortCode', e.target.value)}
                  placeholder="ABC-OTO"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Tedarikçi Türü' : 'Supplier Type'}
                </label>
                <SearchableSelect
                  value={form.type ?? ''}
                  onChange={(val) => set('type', asSupplierType(val))}
                  options={supplierTypeOptions}
                  placeholder={tr ? 'Tedarikçi türü seçin...' : 'Select supplier type...'}
                  searchPlaceholder={tr ? 'Tür ara...' : 'Search type...'}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Vergi Dairesi' : 'Tax Office'}
                </label>
                <input
                  value={form.taxOffice ?? ''}
                  onChange={(e) => set('taxOffice', e.target.value)}
                  placeholder={tr ? 'Örn: Boğaziçi VD' : 'Tax office...'}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Vergi Kimlik No (VKN / TCKN)' : 'Tax Number (VKN)'}
                </label>
                <input
                  value={form.taxNumber ?? ''}
                  onChange={(e) => set('taxNumber', e.target.value)}
                  placeholder="1234567890"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Durum' : 'Status'}
                </label>
                <FilterSelect
                  value={form.status}
                  onChange={(v) => set('status', asSupplierStatus(v))}
                  placeholder={tr ? 'Durum Seçin' : 'Select Status'}
                  height="h-8.5"
                  options={[
                    { value: 'Active', label: tr ? 'Aktif' : 'Active' },
                    { value: 'Candidate', label: tr ? 'Aday Tedarikçi' : 'Candidate' },
                    { value: 'Inactive', label: tr ? 'Pasif' : 'Inactive' },
                    { value: 'Blacklisted', label: tr ? 'Kara Liste (Yasaklı)' : 'Blacklisted' },
                  ]}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Sektör / Faaliyet Alanı' : 'Industry'}
                </label>
                <input
                  value={form.industry ?? ''}
                  onChange={(e) => set('industry', e.target.value)}
                  placeholder={tr ? 'Otomotiv Yan Sanayi, Plastik Enjeksiyon...' : 'Industry...'}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>
            </div>
          )}

          {/* TAB 2: İLETİŞİM & ADRES */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'İlgili Kişi / Satış Temsilcisi' : 'Contact Person'}
                </label>
                <input
                  value={form.contactPerson ?? ''}
                  onChange={(e) => set('contactPerson', e.target.value)}
                  placeholder="Ahmet Yılmaz"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Telefon Numarası' : 'Phone'}
                </label>
                <input
                  value={form.phone ?? ''}
                  onChange={(e) => set('phone', formatTrPhone(e.target.value))}
                  placeholder="(555)-555-55-55"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'E-posta Adresi' : 'Email'}
                </label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="siparis@tedarikci.com"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Web Sitesi' : 'Website'}
                </label>
                <input
                  value={form.website ?? ''}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder="https://www.tedarikci.com"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              {/* Türkiye İl Seçimi */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Şehir / İl' : 'City / Province'}
                </label>
                <SearchableSelect
                  value={form.city ?? ''}
                  onChange={(val) => {
                    set('city', val);
                    set('district', '');
                  }}
                  options={cityOptions}
                  placeholder={tr ? 'İl seçin (Örn: Bursa, İstanbul)...' : 'Select city...'}
                  searchPlaceholder={tr ? 'İl ara (harf yazın)...' : 'Search city...'}
                  allowCustom
                  emptyMessage={tr ? 'İl bulunamadı' : 'City not found'}
                />
              </div>

              {/* Türkiye İlçe Seçimi */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'İlçe' : 'District'}
                </label>
                <SearchableSelect
                  value={form.district ?? ''}
                  onChange={(val) => set('district', val)}
                  options={districtOptions}
                  placeholder={form.city ? (tr ? 'İlçe seçin...' : 'Select district...') : (tr ? 'Önce il seçiniz' : 'Select city first')}
                  searchPlaceholder={tr ? 'İlçe ara...' : 'Search district...'}
                  disabled={!form.city}
                  allowCustom
                  emptyMessage={tr ? 'İlçe bulunamadı' : 'District not found'}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Açık Adres' : 'Address Line'}
                </label>
                <textarea
                  rows={2}
                  value={form.addressLine ?? ''}
                  onChange={(e) => set('addressLine', e.target.value)}
                  placeholder={tr ? 'Organize Sanayi Bölgesi, Mahalle, Cadde, No...' : 'Address...'}
                  className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>
            </div>
          )}

          {/* TAB 3: B2B BİLGİLERİ & ÖZEL NOTLAR (OPSİYONEL) */}
          {activeTab === 'b2b' && (
            <div className="space-y-4">
              <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3.5 space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-2 text-[var(--fg)] font-semibold text-xs">
                  <KeyRound size={13} className="text-[var(--fg-muted)]" />
                  <span>{tr ? 'Tedarikçi B2B Portalı & Giriş Bilgileri (Opsiyonel)' : 'Supplier B2B Portal & Credentials (Optional)'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                      {tr ? 'B2B Kullanıcı Adı / Bayi Kodu' : 'B2B Username'}
                    </label>
                    <input
                      value={b2bInfo.b2bUsername}
                      onChange={(e) => setB2bInfo((prev) => ({ ...prev, b2bUsername: e.target.value }))}
                      placeholder={tr ? 'Örn: DEMO_OTOMOTIV veya 10243' : 'B2B username / code'}
                      className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs font-mono text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                      {tr ? 'B2B Şifresi' : 'B2B Password'}
                    </label>
                    <input
                      type="text"
                      value={b2bInfo.b2bPassword}
                      onChange={(e) => setB2bInfo((prev) => ({ ...prev, b2bPassword: e.target.value }))}
                      placeholder={tr ? 'B2B portal şifresi...' : 'B2B password...'}
                      className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs font-mono text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                      {tr ? 'B2B Web Portalı / Giriş URL (Opsiyonel)' : 'B2B Portal URL (Optional)'}
                    </label>
                    <div className="relative">
                      <input
                        value={b2bInfo.b2bUrl}
                        onChange={(e) => setB2bInfo((prev) => ({ ...prev, b2bUrl: e.target.value }))}
                        placeholder="https://b2b.tedarikci.com"
                        className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-3 pr-8 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                      />
                      {b2bInfo.b2bUrl.trim() && (
                        <a
                          href={b2bInfo.b2bUrl.startsWith('http') ? b2bInfo.b2bUrl : `https://${b2bInfo.b2bUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dahili Özel Notlar */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Tedarikçi Özel Notları (Dahili & Opsiyonel)' : 'Supplier Internal Notes (Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={b2bInfo.generalNotes}
                  onChange={(e) => setB2bInfo((prev) => ({ ...prev, generalNotes: e.target.value }))}
                  placeholder={tr ? 'Bu tedarikçiyle ilgili dahili notlar, anlaşma detayları, özel teslimat koşulları...' : 'Internal notes, special delivery terms...'}
                  className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2.5 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>
            </div>
          )}

          {/* TAB 4: TİCARİ ŞARTLAR & BANKA */}
          {activeTab === 'commercial' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Ödeme Vadesi (Gün)' : 'Payment Term (Days)'}
                </label>
                <input
                  type="number"
                  value={form.paymentTermDays ?? ''}
                  onChange={(e) => set('paymentTermDays', e.target.value ? Number(e.target.value) : null)}
                  placeholder="30"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Para Birimi' : 'Currency'}
                </label>
                <FilterSelect
                  value={form.currency}
                  onChange={(v) => set('currency', v || 'TRY')}
                  placeholder="TRY"
                  height="h-8.5"
                  options={[
                    { value: 'TRY', label: 'TRY (Türk Lirası)' },
                    { value: 'USD', label: 'USD (Amerikan Doları)' },
                    { value: 'EUR', label: 'EUR (Euro)' },
                    { value: 'GBP', label: 'GBP (İngiliz Sterlini)' },
                  ]}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Ortalama Tedarik Süresi (Gün)' : 'Lead Time (Days)'}
                </label>
                <input
                  type="number"
                  value={form.leadTimeDays ?? ''}
                  onChange={(e) => set('leadTimeDays', e.target.value ? Number(e.target.value) : null)}
                  placeholder="7"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Muhasebe Dış Cari Kodu (ERP)' : 'External ERP Code'}
                </label>
                <input
                  value={form.accountingExternalCode ?? ''}
                  onChange={(e) => set('accountingExternalCode', e.target.value)}
                  placeholder="120.01.001"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'Banka Adı' : 'Bank Name'}
                </label>
                <input
                  value={form.bankName ?? ''}
                  onChange={(e) => set('bankName', e.target.value)}
                  placeholder={tr ? 'Garanti BBVA, İş Bankası, Yapı Kredi...' : 'Bank name...'}
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                  {tr ? 'IBAN Numarası' : 'IBAN'}
                </label>
                <input
                  value={form.iban ?? ''}
                  onChange={(e) => set('iban', e.target.value)}
                  placeholder="TR00 0000 0000 0000 0000 00"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-slate-800 dark:focus:border-slate-400"
                />
              </div>
            </div>
          )}
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
            className="inline-flex h-8 items-center rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-4 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : isEdit ? (tr ? 'Güncelle' : 'Update') : (tr ? 'Tedarikçiyi Kaydet' : 'Save Supplier')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

