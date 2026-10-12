'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { BrandDto, BrandSaveDto } from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { formInputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import { countryLabel, useOmnichannelCountries } from './useOmnichannelCountries';
import { brandDraftFrom, toBrandSaveDto, type BrandDraft } from './brandDraft';

interface Props {
  // null → yeni marka; dolu → düzenleme.
  initial: BrandDto | null;
  saving: boolean;
  onSave: (body: BrandSaveDto) => void;
  onCancel: () => void;
}

const NAME_MAX_LENGTH = 64;
const SLUG_MAX_LENGTH = 64;
const SORT_ORDER_MAX = 999;

export function BrandForm({ initial, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<BrandDraft>(brandDraftFrom(initial));
  const { countries } = useOmnichannelCountries();

  const set = <K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canSave = draft.name.trim().length > 0 && !saving;

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Ad *</label>
          <input value={draft.name} maxLength={NAME_MAX_LENGTH} placeholder="Örn: StoreB"
            onChange={(e) => set('name', e.target.value)} className={formInputClass} />
        </div>
        <div>
          <label className={labelClass}>Kısa ad (slug)</label>
          <input value={draft.slug} maxLength={SLUG_MAX_LENGTH} placeholder="Boş = addan üretilir"
            onChange={(e) => set('slug', e.target.value.toLowerCase())} className={`${formInputClass} font-mono`} />
        </div>
        <div>
          <label className={labelClass}>Varsayılan ülke</label>
          <FilterSelect value={draft.defaultCountry} height="h-8.5" placeholder="Ülke seçin"
            onChange={(v) => set('defaultCountry', v)}
            options={[
              { value: '', label: 'Belirtilmemiş' },
              // Pasif ülke seçilemez; ama markanın mevcut ülkesi pasifse listede kalır.
              ...countries
                .filter((c) => c.isActive || c.code === initial?.defaultCountry)
                .map((c) => ({ value: c.code, label: countryLabel(c) })),
            ]} />
        </div>
        <div>
          <label className={labelClass}>Sıra</label>
          <input type="number" min={0} max={SORT_ORDER_MAX} value={draft.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value))} className={formInputClass} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-[var(--fg)]">
          <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} />
          Aktif (kanal formunda seçilebilir)
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            <X size={13} /> Vazgeç
          </button>
          <button type="button" onClick={() => onSave(toBrandSaveDto(draft))} disabled={!canSave} className={primaryButtonClass}>
            <Save size={13} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
