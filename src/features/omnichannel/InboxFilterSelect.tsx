'use client';

import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';

// Gelen kutusu/pano filtre çubuğundaki bütün açılır menüler aynı boyut ve yükseklikte olsun.
const INBOX_SELECT_MIN_WIDTH = 136;

interface Props {
  ariaLabel: string;
  placeholder: string;
  options: FilterSelectOption[];
  // '' = seçim yok (placeholder: "Tüm …").
  value: string;
  onChange: (value: string) => void;
}

export function InboxFilterSelect({ ariaLabel, placeholder, options, value, onChange }: Props) {
  return (
    <FilterSelect
      ariaLabel={ariaLabel}
      className="shrink-0"
      height="h-10 md:h-9"
      triggerClassName="rounded-lg"
      highlightActive
      minWidth={INBOX_SELECT_MIN_WIDTH}
      placeholder={placeholder}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
}
