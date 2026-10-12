'use client';

import { FilterSelect } from '../../components/ui/FilterSelect';

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PeriodSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  tr: boolean;
}

/**
 * Yıl + ay seçici. KDV özeti, e-Defter ve pazaryeri mutabakatı ekranlarının üçü de
 * AYNI dönem kavramıyla çalışır (vergilendirme dönemi = takvim ayı).
 * Standart FilterSelect bileşeniyle modern ve tutarlı açılır menü sunar.
 */
export function PeriodSelector({ year, month, onChange, tr }: PeriodSelectorProps) {
  const months = tr ? MONTHS_TR : MONTHS_EN;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const monthOptions = months.map((name, index) => ({
    value: String(index + 1),
    label: name,
  }));

  const yearOptions = years.map((y) => ({
    value: String(y),
    label: String(y),
  }));

  return (
    <div className="flex items-center gap-1.5">
      <FilterSelect
        value={String(month)}
        options={monthOptions}
        placeholder={tr ? 'Ay' : 'Month'}
        onChange={(val) => val && onChange(year, Number(val))}
        minWidth={115}
        showAllOption={false}
      />
      <FilterSelect
        value={String(year)}
        options={yearOptions}
        placeholder={tr ? 'Yıl' : 'Year'}
        onChange={(val) => val && onChange(Number(val), month)}
        minWidth={90}
        showAllOption={false}
      />
    </div>
  );
}
