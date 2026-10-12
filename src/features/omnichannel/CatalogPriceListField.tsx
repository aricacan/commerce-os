'use client';

import {
  CATALOG_UNLISTED_PRICE_MODE, type CatalogUnlistedPriceMode,
} from '../../lib/api/omnichannel-catalog';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { labelClass } from './formClasses';
import { CatalogPriceRulesTable } from './CatalogPriceRulesTable';
import { CatalogPriceRulePreview } from './CatalogPriceRulePreview';

const UNLISTED_OPTIONS = [
  { value: String(CATALOG_UNLISTED_PRICE_MODE.UseSourcePrice), label: 'Sitenin fiyatını söyle' },
  { value: String(CATALOG_UNLISTED_PRICE_MODE.AskAgent), label: 'Fiyatı temsilci versin' },
];

interface Props {
  // Yeni profilde null: kurallar profil kaydedildikten sonra eklenir.
  profileId: number | null;
  mode: CatalogUnlistedPriceMode;
  onModeChange: (mode: CatalogUnlistedPriceMode) => void;
}

// Profil fiyat listesi: kaynağın fiyatının üstüne yazılan, ürün türüne göre fiyatlar
// (ör. Kosova sitesi her ürüne yer tutucu fiyat gösteriyor).
export function CatalogPriceListField({ profileId, mode, onModeChange }: Props) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4">
      <div>
        <label className={labelClass}>Fiyat listesi</label>
        <p className="text-[10.5px] text-[var(--fg-muted)]">
          Kural, anahtar kelimelerin hepsi ürün adında geçiyorsa uygulanır; en çok kelimesi tutan kural kazanır.
          Fiyat, profilin fiyat kaynağının para birimindedir.
        </p>
      </div>

      <div className="sm:w-1/2">
        <label className={labelClass}>Listede olmayan ürünlerde</label>
        <FilterSelect
          value={String(mode)}
          onChange={(v) => onModeChange(Number(v) as CatalogUnlistedPriceMode)}
          placeholder="Seçin"
          height="h-8.5"
          options={UNLISTED_OPTIONS}
        />
        <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
          Listede hiç kural yoksa bot her zaman kaynağın fiyatını söyler.
        </div>
      </div>

      {profileId === null ? (
        <div className="text-[11px] text-[var(--fg-muted)]">Fiyat kurallarını profili kaydettikten sonra ekleyebilirsiniz.</div>
      ) : (
        <>
          <CatalogPriceRulesTable profileId={profileId} />
          <CatalogPriceRulePreview profileId={profileId} />
        </>
      )}
    </div>
  );
}
