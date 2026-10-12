'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import type { BrandDto, CrossSellRuleDto, CrossSellRuleSaveDto } from '../../lib/api/omnichannel';
import type { Category } from '../../types/api';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { formInputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import {
  crossSellDraftError,
  crossSellDraftFrom,
  toCrossSellSaveDto,
  type CrossSellRuleDraft,
} from './crossSellRuleDraft';

interface Props {
  // null → yeni kural; dolu → düzenleme.
  initial: CrossSellRuleDto | null;
  /** Yeni kuralda ön seçili marka (Kanal Merkezi'nde kanalın markası). */
  defaultBrandId?: number | null;
  brands: BrandDto[];
  categories: Category[];
  saving: boolean;
  onSave: (body: CrossSellRuleSaveDto) => void;
  onCancel: () => void;
}

const SORT_ORDER_MAX = 999;

export function CrossSellRuleForm({ initial, defaultBrandId = null, brands, categories, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<CrossSellRuleDraft>(crossSellDraftFrom(initial, defaultBrandId));

  const set = <K extends keyof CrossSellRuleDraft>(key: K, value: CrossSellRuleDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));
  const validationError = crossSellDraftError(draft);

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Sepette olan kategori *</label>
          <FilterSelect value={draft.fromCategoryId} height="h-8.5" placeholder="Kategori seçin"
            onChange={(v) => set('fromCategoryId', v)} options={categoryOptions} />
        </div>
        <div>
          <label className={labelClass}>Önerilecek kategori *</label>
          <FilterSelect value={draft.toCategoryId} height="h-8.5" placeholder="Kategori seçin"
            onChange={(v) => set('toCategoryId', v)} options={categoryOptions} />
        </div>
        <div>
          <label className={labelClass}>Marka</label>
          <FilterSelect value={draft.brandId} height="h-8.5" placeholder="Marka seçin"
            onChange={(v) => set('brandId', v)}
            options={[{ value: '', label: 'Tüm markalar' }, ...brands.map((b) => ({ value: String(b.id), label: b.name }))]} />
        </div>
        <div>
          <label className={labelClass}>Öncelik</label>
          <input type="number" min={0} max={SORT_ORDER_MAX} value={draft.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value))} className={formInputClass} />
          <p className="mt-1 text-[10.5px] text-[var(--fg-muted)]">Küçük sayı önce denenir; müşteri yalnız bir teklif görür.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--fg)]">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Aktif (bot önerir)
          </label>
          {validationError && <span className="text-[11px] text-rose-500">{validationError}</span>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            <X size={13} /> Vazgeç
          </button>
          <button type="button" onClick={() => onSave(toCrossSellSaveDto(draft))}
            disabled={saving || validationError !== null} className={primaryButtonClass}>
            <Save size={13} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
