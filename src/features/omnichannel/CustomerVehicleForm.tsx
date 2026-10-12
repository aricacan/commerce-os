'use client';

import { useState } from 'react';
import type { CustomerVehicleInput } from '../../lib/api/customers';
import { ghostButtonClass, inputClass, primaryButtonClass } from './CustomerPanelParts';
import { BODY_TYPE_OPTIONS } from './customerProfileRules';

interface Props {
  isPrimary: boolean;
  onSave: (vehicle: CustomerVehicleInput) => Promise<void>;
  onCancel: () => void;
}

const MIN_YEAR = 1950;
const MAX_YEAR = new Date().getFullYear() + 1;
const TEXT_MAX_LENGTH = 64;
const GENERATION_MAX_LENGTH = 32;

// Araç ekleme formu: marka zorunlu; model, nesil (B7, Mk7), yıl ve gövde tipi isteğe bağlı.
export function CustomerVehicleForm({ isPrimary, onSave, onCancel }: Props) {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [generation, setGeneration] = useState('');
  const [year, setYear] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [saving, setSaving] = useState(false);

  const parsedYear = year.trim() === '' ? null : Number(year);
  const yearValid = parsedYear === null || (Number.isInteger(parsedYear) && parsedYear >= MIN_YEAR && parsedYear <= MAX_YEAR);

  const submit = async () => {
    setSaving(true);
    await onSave({
      make: make.trim(),
      model: model.trim() || null,
      generation: generation.trim() || null,
      year: parsedYear,
      bodyType: bodyType || null,
      isPrimary,
    });
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <input value={make} onChange={(e) => setMake(e.target.value)} className={inputClass} placeholder="Marka"
          aria-label="Marka" maxLength={TEXT_MAX_LENGTH} autoFocus />
        <input value={model} onChange={(e) => setModel(e.target.value)} className={inputClass} placeholder="Model"
          aria-label="Model" maxLength={TEXT_MAX_LENGTH} />
        <input value={generation} onChange={(e) => setGeneration(e.target.value)} className={inputClass}
          placeholder="Nesil (B7, Mk7)" aria-label="Nesil" maxLength={GENERATION_MAX_LENGTH} />
        <input value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} placeholder="Yıl"
          aria-label="Yıl" inputMode="numeric" aria-invalid={!yearValid} />
      </div>
      <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className={inputClass} aria-label="Gövde tipi">
        <option value="">Gövde tipi (bilinmiyor)</option>
        {BODY_TYPE_OPTIONS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
      </select>
      <div className="flex justify-end gap-1.5">
        <button type="button" className={ghostButtonClass} onClick={onCancel}>İptal</button>
        <button type="button" className={primaryButtonClass} disabled={!make.trim() || !yearValid || saving}
          onClick={() => void submit()}>
          Kaydet
        </button>
      </div>
    </div>
  );
}
