'use client';

import { FormSelect, type FormSelectOption } from '../../components/ui/FormSelect';
import { IMPORT_FIELDS, type ColumnMapping, type ImportField, type ParsedSheet } from './importRules';
import { primaryButtonClass, ghostButtonClass } from './styles';

interface Props {
  sheet: ParsedSheet;
  mapping: ColumnMapping;
  catalogLocked: boolean;
  busy: boolean;
  onChange: (mapping: ColumnMapping) => void;
  onPreview: () => void;
  onCancel: () => void;
}

const NOT_MAPPED = -1;

function columnOptions(headers: string[]): FormSelectOption<number>[] {
  return [
    { value: NOT_MAPPED, label: '— eşleme yok —' },
    ...headers.map((header, index) => ({ value: index, label: header || `(Sütun ${index + 1})` })),
  ];
}

// Sütun eşleme: SKU zorunlu, diğerleri isteğe bağlı. Katalog yetkisi ERP ise fiyat/stok kapalıdır (sunucu da reddeder).
export function ImportMappingStep({ sheet, mapping, catalogLocked, busy, onChange, onPreview, onCancel }: Props) {
  const options = columnOptions(sheet.headers);
  const set = (field: ImportField, value: number) => onChange({ ...mapping, [field]: value === NOT_MAPPED ? null : value });

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-ui-xs text-fg-muted">
        {sheet.rows.length} veri satırı bulundu. Her alan için dosyadaki sütunu seçin; boş bırakılan alan Shopify&apos;da değişmez.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {IMPORT_FIELDS.map((field) => {
          const locked = catalogLocked && field.catalogOnly;
          return (
            <div key={field.key} className="flex min-w-0 flex-col gap-1">
              <span className="text-ui-2xs font-semibold text-fg-muted">
                {field.label}{field.required && ' *'}{locked && ' (ERP yetkisi: yazılamaz)'}
              </span>
              <FormSelect<number>
                value={locked ? NOT_MAPPED : (mapping[field.key] ?? NOT_MAPPED)} options={options}
                disabled={locked || busy} onChange={(value) => set(field.key, value)}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={onPreview}>Önizle</button>
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={onCancel}>Vazgeç</button>
      </div>
    </div>
  );
}
