import type { CatalogSourceDto } from '../../lib/api/omnichannel-catalog';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { chipClass, labelClass } from './formClasses';

// Ürünlerin arandığı katalog: ERP kaynakları (bir ya da birkaç) ya da tek bir web sitesi
// (ERP'si olmayan ülke, ör. Kosova). Site seçilince fiyat/stok/link de o siteden okunur.
export type ProductSourceKind = 'erp' | 'site';

const KIND_OPTIONS: { value: ProductSourceKind; label: string }[] = [
  { value: 'erp', label: 'ERP kaynakları' },
  { value: 'site', label: 'Web sitesi' },
];

interface Props {
  kind: ProductSourceKind;
  // Ülkede iki tür de varsa seçim gösterilir; yalnız biri varsa o kullanılır.
  showKindChoice: boolean;
  onKindChange: (kind: ProductSourceKind) => void;
  erpSources: CatalogSourceDto[];
  selectedErpIds: number[];
  onToggleErp: (id: number) => void;
  siteOptions: { value: string; label: string }[];
  siteId: number | null;
  onSiteChange: (id: number | null) => void;
}

export function CatalogProductSourceField({
  kind, showKindChoice, onKindChange, erpSources, selectedErpIds, onToggleErp, siteOptions, siteId, onSiteChange,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>Ürün kaynağı * (bot ürünleri burada arar)</label>

      {showKindChoice && (
        <div className="flex flex-wrap gap-2">
          {KIND_OPTIONS.map((o) => (
            <label key={o.value} className={chipClass}>
              <input type="radio" checked={kind === o.value} onChange={() => onKindChange(o.value)} className="h-3.5 w-3.5" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      )}

      {kind === 'erp' ? (
        <div className="flex flex-wrap gap-2">
          {erpSources.map((s) => (
            <label key={s.id} className={chipClass}>
              <input
                type="checkbox"
                checked={selectedErpIds.includes(s.id)}
                onChange={() => onToggleErp(s.id)}
                className="h-3.5 w-3.5"
              />
              <span>{s.displayName} · {s.kind}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1 sm:w-1/2">
          <FilterSelect
            value={siteId === null ? '' : String(siteId)}
            onChange={(v) => onSiteChange(v === '' ? null : Number(v))}
            placeholder="Site seçin"
            height="h-8.5"
            options={siteOptions}
          />
          <div className="text-[10.5px] text-[var(--fg-muted)]">Ürün, fiyat, stok ve link bu siteden okunur.</div>
        </div>
      )}
    </div>
  );
}
