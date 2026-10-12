'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, Info, Pencil, X } from 'lucide-react';
import {
  addressBookApi,
  ADDRESS_BOOK_TYPE_LABEL,
  type AddressBookEntry,
  type AddressBookEntryType,
  type SaveAddressBookEntryBody,
} from '../../../../lib/api/e-belge';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const EMPTY_FORM: Omit<SaveAddressBookEntryBody, 'billingEntityId'> = {
  entryType: 'Alici',
  taxNumber: '',
  title: '',
  firstName: '',
  lastName: '',
  alias: '',
  taxOffice: '',
  streetName: '',
  buildingName: '',
  buildingNumber: '',
  doorNumber: '',
  citySubdivisionName: '',
  district: '',
  cityName: '',
  postalZone: '',
  country: 'Türkiye',
  phone: '',
  email: '',
  webSite: '',
  notes: '',
  isActive: true,
};

export default function AddressBookPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['address-book', billingEntityId, typeFilter, search],
    queryFn: () => addressBookApi.list(billingEntityId!, typeFilter || undefined, search || undefined),
    enabled: billingEntityId !== null,
    staleTime: 10_000,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['address-book'] });

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const save = useMutation({
    mutationFn: () => {
      const body: SaveAddressBookEntryBody = { ...form, billingEntityId: billingEntityId! };
      return editingId ? addressBookApi.update(editingId, body) : addressBookApi.create(body);
    },
    onSuccess: () => {
      toast.success(editingId ? (tr ? 'Kayıt güncellendi.' : 'Updated.') : (tr ? 'Kayıt eklendi.' : 'Created.'));
      closeForm();
      invalidate();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => addressBookApi.remove(id),
    onSuccess: () => { toast.success(tr ? 'Kayıt silindi.' : 'Deleted.'); invalidate(); },
    onError: (e) => toast.error(describeError(e)),
  });

  const startEdit = (entry: AddressBookEntry) => {
    const { id: _id, displayName: _displayName, billingEntityId: _be, ...rest } = entry;
    setForm({ ...EMPTY_FORM, ...rest });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const entries = data ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <InvoicingSubTabBar />

      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Adres Defteri' : 'Address Book'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Alıcı, yabancı firma ve nakliye bilgileri. Fatura keserken buradan doldurulur.'
                : 'Buyer, foreign company and carrier records used when issuing invoices.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={200}
            />
            <FilterSelect
              value={typeFilter}
              placeholder={tr ? 'Tüm Türler' : 'All Types'}
              onChange={setTypeFilter}
              options={[
                { value: '', label: tr ? 'Tüm Türler' : 'All Types' },
                { value: 'Alici', label: tr ? 'Alıcı' : 'Buyer' },
                { value: 'YabanciFirma', label: tr ? 'Yabancı Firma' : 'Foreign' },
                { value: 'Nakliye', label: tr ? 'Nakliye' : 'Carrier' },
              ]}
              minWidth={140}
            />
            <div className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 py-1 shadow-xs">
              <Search size={13} className="text-[var(--fg-muted)] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr ? 'VKN / unvan ara' : 'Search'}
                className="w-36 bg-transparent text-xs text-[var(--fg)] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }}
              disabled={!billingEntityId}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
            >
              <Plus size={13} />
              <span>{tr ? 'Yeni Kayıt' : 'New'}</span>
            </button>
          </div>
        </div>

        {showForm && (
          <form
            className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 space-y-3 shadow-xs"
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[var(--fg)]">
                {editingId ? (tr ? 'Kaydı Düzenle' : 'Edit Entry') : (tr ? 'Yeni Kayıt' : 'New Entry')}
              </h2>
              <button type="button" onClick={closeForm} className="text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                  {tr ? 'Tür' : 'Type'}
                </span>
                <select
                  value={form.entryType}
                  onChange={(e) => setForm({ ...form, entryType: e.target.value as AddressBookEntryType })}
                  className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
                >
                  <option value="Alici">{tr ? 'Alıcı' : 'Buyer'}</option>
                  <option value="YabanciFirma">{tr ? 'Yabancı Firma' : 'Foreign Company'}</option>
                  <option value="Nakliye">{tr ? 'Nakliye' : 'Carrier'}</option>
                </select>
              </label>

              {([
                ['taxNumber', tr ? 'VKN / TCKN' : 'Tax No'],
                ['title', tr ? 'Unvan' : 'Title'],
                ['alias', tr ? 'GİB Etiketi' : 'GİB Alias'],
                ['firstName', tr ? 'Ad' : 'First Name'],
                ['lastName', tr ? 'Soyad' : 'Last Name'],
                ['taxOffice', tr ? 'Vergi Dairesi' : 'Tax Office'],
                ['streetName', tr ? 'Cadde / Sokak' : 'Street'],
                ['buildingName', tr ? 'Bina Adı' : 'Building'],
                ['buildingNumber', tr ? 'Bina No' : 'Bldg No'],
                ['doorNumber', tr ? 'Kapı No' : 'Door No'],
                ['citySubdivisionName', tr ? 'Mahalle' : 'Subdivision'],
                ['district', tr ? 'İlçe' : 'District'],
                ['cityName', tr ? 'İl' : 'City'],
                ['postalZone', tr ? 'Posta Kodu' : 'Postal Code'],
                ['country', tr ? 'Ülke' : 'Country'],
                ['phone', tr ? 'Telefon' : 'Phone'],
                ['email', tr ? 'e-Posta' : 'Email'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">{label}</span>
                  <input
                    value={(form[key] as string | null) ?? ''}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] focus:outline-none focus:border-[var(--fg-muted)]"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="cursor-pointer"
                />
                {tr ? 'Aktif' : 'Active'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  {tr ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] transition cursor-pointer disabled:opacity-40"
                >
                  {tr ? 'Kaydet' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-[var(--fg-muted)]">
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Tür' : 'Type'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'Unvan / Ad' : 'Name'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'VKN / TCKN' : 'Tax No'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'GİB Etiketi' : 'Alias'}</th>
                  <th className="px-3 py-2 text-left font-semibold">{tr ? 'İl / İlçe' : 'City'}</th>
                  <th className="px-3 py-2 text-center font-semibold">{tr ? 'Durum' : 'Status'}</th>
                  <th className="px-3 py-2 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-[var(--fg-muted)]">{tr ? 'Yükleniyor…' : 'Loading…'}</td></tr>
                )}
                {!isLoading && entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[var(--fg-muted)]">
                      {tr ? 'Kayıt yok.' : 'No entries.'}
                    </td>
                  </tr>
                )}
                {entries.map((e) => (
                  <tr key={e.id} className={`border-b border-[var(--border-soft)] last:border-0 ${e.isActive ? '' : 'opacity-50'}`}>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">{ADDRESS_BOOK_TYPE_LABEL[e.entryType]}</td>
                    <td className="px-3 py-2 font-semibold text-[var(--fg)]">{e.displayName}</td>
                    <td className="px-3 py-2 tabular-nums text-[var(--fg)]">{e.taxNumber ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[var(--fg-muted)] break-all">{e.alias ?? '—'}</td>
                    <td className="px-3 py-2 text-[var(--fg-muted)]">
                      {[e.cityName, e.district].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-[3px] px-2 py-0.5 text-[10.5px] font-bold ${
                        e.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
                      }`}>
                        {e.isActive ? (tr ? 'Aktif' : 'Active') : (tr ? 'Pasif' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          title={tr ? 'Düzenle' : 'Edit'}
                          onClick={() => startEdit(e)}
                          className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          title={tr ? 'Sil' : 'Delete'}
                          onClick={() => remove.mutate(e.id)}
                          className="text-[var(--fg-muted)] hover:text-red-400 transition cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
          <Info size={14} className="text-[var(--fg-muted)] mt-0.5 shrink-0" />
          <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">
            {tr
              ? 'GİB etiketi, e-Fatura zarfının adreslendiği posta kutusudur — yanlışsa belge alıcıya ULAŞMAZ. Etiket, mükellef sorgusundan öğrenilir. Yurt içi alıcıda VKN/TCKN zorunludur; aynı VKN aynı defterde iki kez kaydedilemez.'
              : 'The GİB alias is the mailbox the envelope is addressed to — a wrong alias means the document never arrives.'}
          </p>
        </div>
      </div>
    </div>
  );
}
