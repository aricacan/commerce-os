'use client';

import { useState } from 'react';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { resolveDatePreset, type DatePreset } from '../../utils/date';
import { FilterField } from './FilterField';

interface Props {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
}

// Süzgeç satırındaki tarih aralığı: ortak DateRangePicker (hazır aralıklar + takvim).
// Seçici hazır aralığı (bu hafta…) tarihe çevirir; "Tümü" iki ucu da boşaltır.
// Dışarıdan temizlemek için üst bileşen `key`'i değiştirip seçiciyi yeniden kurar.
export function DateRangeFilter({ from, to, onChange }: Props) {
  const [preset, setPreset] = useState<DatePreset>(from || to ? 'custom' : 'all');

  const pickPreset = (next: DatePreset) => {
    setPreset(next);
    if (next === 'custom') return;
    const range = resolveDatePreset(next);
    onChange({ from: range.from, to: range.to });
  };

  const pickCustom = (customFrom: string, customTo: string) => {
    setPreset('custom');
    onChange({ from: customFrom, to: customTo });
  };

  return (
    <FilterField label="Tarih">
      <DateRangePicker
        value={preset} onChange={pickPreset} customFrom={from} customTo={to} onCustomChange={pickCustom} includeAll
        className="[&>.dropdown-trigger]:!h-8 [&>.dropdown-trigger]:!rounded-md [&>.dropdown-trigger]:!px-2 [&>.dropdown-trigger]:!text-ui-xs"
      />
    </FilterField>
  );
}
