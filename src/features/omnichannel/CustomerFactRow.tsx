'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { CustomerFactDto } from '../../lib/api/customer-crm';
import { formatRelativeTime } from './relativeTime';
import { iconButtonClass } from './CustomerPanelParts';
import { CustomerFactEditor } from './CustomerFactEditor';
import { factLabel, factSourceLabel, formatConfidence } from './customerProfileRules';

interface Props {
  fact: CustomerFactDto;
  readOnly: boolean;
  // Başarılıysa true; düzenleyici yalnız o zaman kapanır.
  onSave: (value: string) => Promise<boolean>;
  onRemove: (label: string) => void;
}

// Anahtar/değer satırı + kaynak (Bot %85 · 2sa). Kalem ikonuyla yerinde düzenlenir.
export function CustomerFactRow({ fact, readOnly, onSave, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const label = factLabel(fact);
  const confidence = formatConfidence(fact.confidence);
  const meta = [factSourceLabel(fact.source), confidence, formatRelativeTime(fact.updatedAt)].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-1 text-xs">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">{label}</dt>
      {editing ? (
        <dd>
          <CustomerFactEditor initialValue={fact.value} onCancel={() => setEditing(false)}
            onSave={async (value) => { if (await onSave(value)) setEditing(false); }} />
        </dd>
      ) : (
        <dd className="flex items-start gap-2">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="break-words text-[var(--fg)]">{fact.value}</span>
            <span className="text-[10.5px] text-[var(--fg-muted)]">{meta}</span>
          </span>
          {!readOnly && (
            <span className="flex shrink-0 gap-0.5">
              <button type="button" className={iconButtonClass} title="Düzenle" aria-label={`${label} düzenle`}
                onClick={() => setEditing(true)}>
                <Pencil size={12} />
              </button>
              <button type="button" className={iconButtonClass} title="Sil" aria-label={`${label} sil`}
                onClick={() => onRemove(label)}>
                <Trash2 size={12} />
              </button>
            </span>
          )}
        </dd>
      )}
    </div>
  );
}
