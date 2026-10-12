import type { ReactNode } from 'react';
import { FilterSelect } from '../../components/ui/FilterSelect';
import type { FilterOption } from './explorerRules';

// Süzgeç satırında alanlar yan yana akar: mobilde iki sütun, geniş ekranda içeriğe göre ~9-14rem.
const NARROW_FIELD_CLASS = 'basis-[calc(50%-0.25rem)] sm:max-w-56 sm:flex-1 sm:basis-36';
const WIDE_FIELD_CLASS = 'basis-full sm:max-w-80 sm:flex-[2] sm:basis-56';

interface FieldProps {
  label: string;
  /** Arama kutusu gibi geniş alanlar için. */
  wide?: boolean;
  children: ReactNode;
}

// Etiket ayrı <span>: içindeki kontrol (input ya da açılır liste) kendi `aria-label`'ını taşır.
export function FilterField({ label, wide = false, children }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${wide ? WIDE_FIELD_CLASS : NARROW_FIELD_CLASS}`}>
      <span className="text-ui-2xs font-semibold text-fg-muted">{label}</span>
      {children}
    </div>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  allLabel: string;
  onChange: (value: string) => void;
}

// "Tümü" seçeneği boş değerdir (süzme yok).
export function FilterSelectField({ label, value, options, allLabel, onChange }: SelectProps) {
  return (
    <FilterField label={label}>
      <FilterSelect
        value={value} options={options} placeholder={allLabel} onChange={onChange}
        ariaLabel={label} minWidth={0} triggerClassName="rounded-md"
      />
    </FilterField>
  );
}
