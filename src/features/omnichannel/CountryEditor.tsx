'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { CountryCatalogStatus, CountryDto } from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { formInputClass, labelClass } from './formClasses';

interface Props {
  // null → yeni ülke (kod girilebilir); dolu → düzenleme (kod sabit).
  initial: CountryDto | null;
  saving: boolean;
  onSave: (country: CountryDto) => void;
  onCancel: () => void;
}

const EMPTY: CountryDto = {
  code: '', name: '', defaultLanguage: 'en', currencyCode: 'EUR', timeZone: 'Europe/Istanbul',
  phonePrefixes: [], aliases: [], flagEmoji: '', catalogStatus: 'NotConfigured', isActive: true, sortOrder: 10,
};

const CATALOG_OPTIONS: { value: CountryCatalogStatus; label: string }[] = [
  { value: 'Live', label: 'Bağlı — bot stok/fiyat söyler' },
  { value: 'NotConfigured', label: 'Bağlı değil — talep temsilciye gider' },
];

const splitList = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

export function CountryEditor({ initial, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<CountryDto>(initial ?? EMPTY);
  // Liste alanları metin olarak düzenlenir; kaydederken virgülden bölünür.
  const [prefixes, setPrefixes] = useState((initial?.phonePrefixes ?? []).join(', '));
  const [aliases, setAliases] = useState((initial?.aliases ?? []).join(', '));
  const isNew = initial === null;

  const set = <K extends keyof CountryDto>(key: K, value: CountryDto[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canSave = draft.code.trim().length >= 2 && draft.name.trim().length >= 2 && !saving;

  const handleSave = () =>
    onSave({ ...draft, code: draft.code.trim().toUpperCase(), phonePrefixes: splitList(prefixes), aliases: splitList(aliases) });

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <h3 className="text-xs font-bold text-[var(--fg)]">{isNew ? 'Yeni ülke' : `${draft.name} (${draft.code})`}</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Kod *</label>
          <input value={draft.code} disabled={!isNew} maxLength={8} placeholder="Örn: KS"
            onChange={(e) => set('code', e.target.value.toUpperCase())} className={`${formInputClass} font-mono`} />
        </div>
        <div>
          <label className={labelClass}>Ad *</label>
          <input value={draft.name} maxLength={64} placeholder="Örn: Kosova"
            onChange={(e) => set('name', e.target.value)} className={formInputClass} />
        </div>
        <div>
          <label className={labelClass}>Bayrak</label>
          <input value={draft.flagEmoji} maxLength={16} placeholder="🇽🇰"
            onChange={(e) => set('flagEmoji', e.target.value)} className={formInputClass} />
        </div>
        <div>
          <label className={labelClass}>Sıra</label>
          <input type="number" min={0} max={999} value={draft.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value))} className={formInputClass} />
        </div>
        <div>
          <label className={labelClass}>Dil (tr / en / sq)</label>
          <input value={draft.defaultLanguage} maxLength={3}
            onChange={(e) => set('defaultLanguage', e.target.value.toLowerCase())} className={`${formInputClass} font-mono`} />
        </div>
        <div>
          <label className={labelClass}>Para birimi</label>
          <input value={draft.currencyCode} maxLength={3}
            onChange={(e) => set('currencyCode', e.target.value.toUpperCase())} className={`${formInputClass} font-mono`} />
        </div>
        <div>
          <label className={labelClass}>Saat dilimi (IANA)</label>
          <input value={draft.timeZone} maxLength={64} placeholder="Europe/Belgrade"
            onChange={(e) => set('timeZone', e.target.value)} className={`${formInputClass} font-mono`} />
        </div>
        <div>
          <label className={labelClass}>Telefon önekleri</label>
          <input value={prefixes} placeholder="383"
            onChange={(e) => setPrefixes(e.target.value)} className={`${formInputClass} font-mono`} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Müşterinin kullanabileceği adlar (virgülle)</label>
          <input value={aliases} placeholder="kosova, kosovo, xk"
            onChange={(e) => setAliases(e.target.value)} className={formInputClass} />
        </div>
        <div>
          <label className={labelClass}>Katalog</label>
          <FilterSelect value={draft.catalogStatus} height="h-8.5" placeholder="Katalog"
            onChange={(v) => set('catalogStatus', v as CountryCatalogStatus)} options={CATALOG_OPTIONS} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-xs text-[var(--fg)]">
          <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          Aktif (kanal ve botta seçilebilir)
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-3 text-xs text-[var(--fg)] hover:bg-[var(--bg-subtle)]">
          <X size={13} /> Vazgeç
        </button>
        <button type="button" onClick={handleSave} disabled={!canSave}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40">
          <Save size={13} /> Kaydet
        </button>
      </div>
    </div>
  );
}
