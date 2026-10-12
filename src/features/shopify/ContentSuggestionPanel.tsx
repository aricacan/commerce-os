'use client';

import { useState } from 'react';
import type { SaveShopifyContentBody, ShopifyContentSuggestionDto } from '../../lib/api/shopify-content';
import { surfaceCard } from '../shared/design';
import {
  CONTENT_FIELDS, buildContentBody, defaultSelection, draftFromSuggestion, isOverLimit,
  type ContentDraft, type ContentFieldKey, type ContentFieldMeta,
} from './contentRules';
import { CheckboxField } from './FormControls';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  suggestion: ShopifyContentSuggestionDto;
  productTitle: string;
  busy: boolean;
  // Başarılıysa true (panel kapanır).
  onApply: (body: SaveShopifyContentBody) => Promise<boolean>;
  onClose: () => void;
}

// AI önerisi: alan alan "mevcut → öneri" farkı. Her alan ayrı seçilir ve düzenlenebilir; hiçbir şey onaysız yazılmaz.
export function ContentSuggestionPanel({ suggestion, productTitle, busy, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<ContentDraft>(() => draftFromSuggestion(suggestion.suggested));
  const [selected, setSelected] = useState<ReadonlySet<ContentFieldKey>>(defaultSelection);

  const body = buildContentBody(draft, suggestion.current, selected);
  const toggle = (key: ContentFieldKey) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const apply = async () => {
    if (body && await onApply(body)) onClose();
  };

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="AI içerik önerisi">
      <header className="flex flex-col gap-0.5">
        <h3 className="m-0 text-ui-sm font-bold text-fg">AI önerisi: {productTitle}</h3>
        <span className="text-ui-2xs text-fg-muted">
          Dil: {suggestion.language}. Seçtiğiniz alanlar Shopify&apos;a yazılır; ürün başlığı/açıklaması Base ile de güncelleniyorsa dikkatli seçin.
        </span>
      </header>

      {CONTENT_FIELDS.map((field) => (
        <FieldRow
          key={field.key} field={field} current={suggestion.current[field.key]} value={draft[field.key]}
          checked={selected.has(field.key)} onToggle={() => toggle(field.key)}
          onChange={(value) => setDraft((d) => ({ ...d, [field.key]: value }))}
        />
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || body === null} onClick={() => void apply()}>
          {busy ? 'Yazılıyor…' : 'Seçilenleri Shopify\'a yaz'}
        </button>
        <button type="button" className={ghostButtonClass} onClick={onClose}>Vazgeç</button>
      </div>
    </section>
  );
}

interface FieldRowProps {
  field: ContentFieldMeta;
  current: string | null;
  value: string;
  checked: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}

function FieldRow({ field, current, value, checked, onToggle, onChange }: FieldRowProps) {
  const over = isOverLimit(value, field.limit);

  return (
    <div className="flex flex-col gap-1">
      <CheckboxField checked={checked} onChange={onToggle} className="items-center font-semibold">
        <span className="flex items-center gap-2">
          {field.label}
          {field.limit !== null && (
            <span className={`ml-auto text-ui-2xs font-normal ${over ? 'text-danger' : 'text-fg-muted'}`}>
              {value.trim().length}/{field.limit}
            </span>
          )}
        </span>
      </CheckboxField>
      <p className="m-0 break-words text-ui-2xs text-fg-muted">Mevcut: {current?.trim() ? current : '— boş —'}</p>
      {field.multiline ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} rows={3} aria-label={`${field.label} önerisi`}
          className={`${fieldClass} h-auto py-1.5`}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${field.label} önerisi`} className={fieldClass} />
      )}
    </div>
  );
}
