'use client';

import { useState } from 'react';
import type { OrderDestinationOptionDto } from '../../lib/api/omnichannel-order-destinations';
import { formInputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import { findOption, optionKey } from './orderDestinationRules';

interface Props {
  options: readonly OrderDestinationOptionDto[];
  /** Mevcut seçimin anahtarı (optionKey); boş = henüz seçim yok. */
  initialKey: string;
  saving: boolean;
  onSave: (option: OrderDestinationOptionDto) => void;
  onCancel: () => void;
}

const optionText = (option: OrderDestinationOptionDto) =>
  option.disabledReason ? `${option.label} — ${option.disabledReason}` : option.label;

// Sipariş hedefi seçici: seçilemeyen hedefler sebebiyle birlikte listelenir (sessizce gizlenmez). Seçilen
// hedefin uyarıları (ör. "ERP gönderimi henüz etkin değil") kaydetmeden önce görünür.
export function OrderDestinationPicker({ options, initialKey, saving, onSave, onCancel }: Props) {
  const [key, setKey] = useState(initialKey);
  const chosen = findOption(options, key);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div>
        <label htmlFor="order-destination-select" className={labelClass}>Siparişler nereye yazılsın *</label>
        <select id="order-destination-select" className={formInputClass} value={key} onChange={(e) => setKey(e.target.value)}>
          <option value="" disabled>Hedef seçin</option>
          {options.map((option) => (
            <option key={optionKey(option.kind, option.id)} value={optionKey(option.kind, option.id)} disabled={!option.selectable}>
              {optionText(option)}
            </option>
          ))}
        </select>
      </div>

      {chosen?.warnings.map((warning) => (
        <p key={warning} role="status" className="m-0 text-[11px] text-[var(--warning)]">{warning}</p>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={saving || !chosen?.selectable}
          onClick={() => chosen && onSave(chosen)}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button type="button" className={secondaryButtonClass} disabled={saving} onClick={onCancel}>Vazgeç</button>
      </div>
    </div>
  );
}
