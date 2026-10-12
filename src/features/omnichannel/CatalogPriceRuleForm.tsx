'use client';

import { useState } from 'react';
import type { CatalogPriceRuleDto, CatalogPriceRuleSaveBody } from '../../lib/api/omnichannel-catalog';

// Sunucudaki sınırların aynısı (CatalogPriceRuleConfiguration / CatalogPriceRuleService).
const KEYWORDS_MAX_LENGTH = 200;
const MAX_PRICE = 100_000;
const MAX_SORT_ORDER = 9_999;
const PRICE_STEP = 0.01;

const inputClass =
  'h-7.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-[11px] text-[var(--fg)] outline-none focus:border-[var(--fg)]';

interface Props {
  initial: CatalogPriceRuleDto | null;
  defaultSortOrder?: number;
  saving: boolean;
  onSave: (body: CatalogPriceRuleSaveBody) => void;
  onCancel: () => void;
}

// Fiyat listesinde satır içi ekleme/düzenleme (tablo satırı olarak çizilir).
export function CatalogPriceRuleForm({ initial, defaultSortOrder = 1, saving, onSave, onCancel }: Props) {
  const [keywords, setKeywords] = useState(initial?.keywords ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? defaultSortOrder));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const priceValue = Number(price.replace(',', '.'));
  const sortValue = Number(sortOrder);
  const valid = keywords.trim().length > 0
    && Number.isFinite(priceValue) && priceValue > 0 && priceValue <= MAX_PRICE
    && Number.isInteger(sortValue) && sortValue >= 0 && sortValue <= MAX_SORT_ORDER;

  const submit = () => {
    if (!valid) return;
    onSave({ keywords: keywords.trim(), price: priceValue, sortOrder: sortValue, isActive });
  };

  return (
    <tr className="border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]">
      <td className="px-2.5 py-1.5">
        <input value={keywords} maxLength={KEYWORDS_MAX_LENGTH} onChange={(e) => setKeywords(e.target.value)}
          placeholder="bonnet deflector 3mm" aria-label="Anahtar kelimeler" className={inputClass} autoFocus />
      </td>
      <td className="px-2.5 py-1.5">
        <input value={price} inputMode="decimal" type="number" min={PRICE_STEP} max={MAX_PRICE} step={PRICE_STEP}
          onChange={(e) => setPrice(e.target.value)} placeholder="38" aria-label="Fiyat" className={inputClass} />
      </td>
      <td className="px-2.5 py-1.5">
        <input value={sortOrder} type="number" min={0} max={MAX_SORT_ORDER} step={1}
          onChange={(e) => setSortOrder(e.target.value)} aria-label="Sıra" className={inputClass} />
      </td>
      <td className="px-2.5 py-1.5">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
          aria-label="Aktif" className="h-3.5 w-3.5" />
      </td>
      <td className="px-2.5 py-1.5">
        <div className="flex justify-end gap-1">
          <button type="button" onClick={onCancel} disabled={saving}
            className="inline-flex h-7 items-center rounded-[3px] border border-[var(--border)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--card)]">
            Vazgeç
          </button>
          <button type="button" onClick={submit} disabled={saving || !valid}
            className="inline-flex h-7 items-center rounded-[3px] bg-[var(--fg)] px-2.5 text-[11px] font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40">
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </td>
    </tr>
  );
}
