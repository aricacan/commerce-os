'use client';

import { useState } from 'react';
import { FACT_VALUE_MAX_LENGTH } from '../../lib/api/customer-crm';
import { ghostButtonClass, inputClass, primaryButtonClass } from './CustomerPanelParts';

interface Props {
  initialValue: string;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
}

// Tek satırlık bilgi düzenleyici: Enter kaydeder, Esc vazgeçer. Boş değer kaydedilmez (silmek için çöp kutusu).
export function CustomerFactEditor({ initialValue, onSave, onCancel }: Props) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialValue && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}
        maxLength={FACT_VALUE_MAX_LENGTH} autoFocus aria-label="Bilgi değeri"
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
          if (e.key === 'Escape') onCancel();
        }} />
      <button type="button" className={primaryButtonClass} disabled={!canSave} onClick={() => void submit()}>Kaydet</button>
      <button type="button" className={ghostButtonClass} onClick={onCancel}>İptal</button>
    </div>
  );
}
