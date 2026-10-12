'use client';

import { FilterSelect } from '../../components/ui/FilterSelect';
import {
  ERPIS_FIELDS, ERPIS_FIELD_LABELS,
  type ErpisFieldKey, type ErpisMappingDefinition,
} from '@/lib/api';

const UNMAPPED = '';

interface Props {
  headers: string[];
  mapping: ErpisMappingDefinition;
  onChange: (mapping: ErpisMappingDefinition) => void;
  /** Rapor tipine göre zorunlu alanlar (bkz. erpisRequiredFields). */
  requiredFields: ErpisFieldKey[];
}

// Hangi Excel kolonunun ne anlama geldiğini kullanıcı burada söyler.
//
// Erpis'in rapor formatı kurulumdan kuruluma değiştiği için kolon adlarına göre sabit bir
// şema yazılamıyor; eşleme bir kez yapılıp şablon olarak saklanıyor.
export function ColumnMappingStep({ headers, mapping, onChange, requiredFields }: Props) {
  const columnOptions = [
    { value: UNMAPPED, label: '— eşlenmedi —' },
    ...headers.map((h) => ({ value: h, label: h })),
  ];

  function setColumn(field: ErpisFieldKey, column: string) {
    const fields = { ...mapping.fields };
    if (column === UNMAPPED) delete fields[field];
    else fields[field] = { ...fields[field], column };
    onChange({ ...mapping, fields });
  }

  function setDecimalSeparator(field: ErpisFieldKey, separator: string) {
    const current = mapping.fields[field];
    if (!current) return;
    onChange({
      ...mapping,
      fields: { ...mapping.fields, [field]: { ...current, decimalSeparator: separator || null } },
    });
  }

  const missingRequired = requiredFields.filter((f) => !mapping.fields[f]);

  return (
    <div className="flex flex-col gap-3">
      {missingRequired.length > 0 && (
        <p className="rounded-[4px] bg-[var(--bg-subtle)] px-3 py-2 text-[11.5px] font-semibold text-[var(--fg-muted)]">
          Zorunlu alanlar eşlenmeden yükleme yapılamaz:{' '}
          {missingRequired.map((f) => ERPIS_FIELD_LABELS[f]).join(', ')}
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ERPIS_FIELDS.map((field) => {
          const required = requiredFields.includes(field);
          const current = mapping.fields[field];

          return (
            <div
              key={field}
              className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5"
            >
              <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
                {ERPIS_FIELD_LABELS[field]}
                {required && <span className="ml-1 text-[var(--fg)]">*</span>}
              </span>

              <FilterSelect
                value={current?.column ?? UNMAPPED}
                options={columnOptions}
                placeholder="Kolon seç"
                onChange={(v) => setColumn(field, v)}
                searchable={headers.length > 8}
                minWidth="100%"
              />

              {/* Ondalık ayracı yalnızca sayısal alanlarda sorulur — TR "1.234,56" biçimini
                  yanlış ayrıştırmak tutarı 10.000 katına çıkarabiliyor. */}
              {current && (field === 'Amount' || field === 'Quantity') && (
                <FilterSelect
                  value={current.decimalSeparator ?? UNMAPPED}
                  options={[
                    { value: UNMAPPED, label: 'Ondalık ayracı: otomatik' },
                    { value: ',', label: 'Ondalık ayracı: virgül (1.234,56)' },
                    { value: '.', label: 'Ondalık ayracı: nokta (1,234.56)' },
                  ]}
                  placeholder="Ondalık ayracı"
                  onChange={(v) => setDecimalSeparator(field, v)}
                  minWidth="100%"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
