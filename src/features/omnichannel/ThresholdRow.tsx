'use client';

import { useState } from 'react';
import type { BotThresholdValues } from '../../lib/api/omnichannel-channel-bot';
import { formatThreshold, parseThresholdInput, type ThresholdField } from './channelBotRules';
import { compactInputClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import { ScopeBadge } from './ScopeBadge';

interface Props {
  field: ThresholdField;
  account: BotThresholdValues;
  effective: BotThresholdValues;
  /** null = hesap genelini izliyor. */
  override: number | null;
  busy: boolean;
  /** Başarıda true; value null ise “genele dön”. */
  onSave: (value: number | null) => Promise<boolean>;
}

// Tek eşik satırı: etkin değer + “Hesap geneli / Bu kanala özel” rozeti + özelleştir / düzenle / genele dön.
export function ThresholdRow({ field, account, effective, override, busy, onSave }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const custom = override !== null;
  const inputId = `channel-threshold-${field.key}`;

  const startEditing = () => { setError(null); setDraft(String(effective[field.key])); };
  const cancel = () => { setError(null); setDraft(null); };

  const save = async () => {
    const parsed = parseThresholdInput(field, draft ?? '');
    if ('error' in parsed) { setError(parsed.error); return; }
    if (await onSave(parsed.value)) setDraft(null);
  };

  return (
    <li className="flex min-w-0 flex-col gap-2 border-t border-[var(--border-soft)] pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="text-xs font-semibold text-[var(--fg)]">{field.label}</label>
          <ScopeBadge label={custom ? 'Bu kanala özel' : 'Hesap geneli'} tone={custom ? 'bot' : 'neutral'} />
        </div>
        <p className="m-0 mt-0.5 break-words text-[11px] text-[var(--fg-muted)]">{field.hint}</p>
        {custom && (
          <p className="m-0 mt-0.5 text-[10.5px] text-[var(--fg-muted)]">
            Hesap geneli: {formatThreshold(field, account[field.key])}
          </p>
        )}
      </div>

      {draft === null ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="min-w-14 text-right font-mono text-xs font-bold text-[var(--fg)]">
            {formatThreshold(field, effective[field.key])}
          </span>
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={startEditing}>
            {custom ? 'Düzenle' : 'Özelleştir'}
          </button>
          {custom && (
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void onSave(null)}>
              Genele dön
            </button>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 flex-col gap-1 sm:items-end">
          <div className="flex items-center gap-2">
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              min={field.min}
              max={field.max}
              step={field.step}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className={`${compactInputClass} w-24`}
            />
            <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void save()}>Kaydet</button>
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={cancel}>Vazgeç</button>
          </div>
          {error && <span role="alert" className="text-[10.5px] text-rose-500">{error}</span>}
        </div>
      )}
    </li>
  );
}
