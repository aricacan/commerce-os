'use client';

import { RADAR_COUNTRIES } from './countries';
import { FilterSelect } from '../../components/ui/FilterSelect';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'form' | 'filter';
  className?: string;
}

export function CountrySelect({ value, onChange, variant = 'filter', className }: CountrySelectProps) {
  const isForm = variant === 'form';
  const countries = isForm ? RADAR_COUNTRIES.filter((c) => c.enabled) : RADAR_COUNTRIES;

  const options = [
    ...(!isForm ? [{ value: '', label: 'Tüm Ülkeler' }] : []),
    ...countries.map((c) => ({
      value: c.code,
      label: isForm ? c.label : c.label.replace(' (yakında)', '').replace(' (halka açık şirketler)', ''),
    })),
  ];

  return (
    <div className={className || 'w-40'}>
      <FilterSelect
        value={value}
        onChange={onChange}
        placeholder={isForm ? 'Ülke Seçin' : 'Tüm Ülkeler'}
        height="h-8"
        options={options}
      />
    </div>
  );
}
