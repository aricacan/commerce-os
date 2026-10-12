'use client';

import { RotateCcw } from 'lucide-react';
import {
  CUSTOMER_LANGUAGE_LABELS, CUSTOMER_LANGUAGES, type BotTextEntryDto, type CustomerLanguageCode,
} from '../../lib/api/omnichannel';
import { AutoTextarea } from './AutoTextarea';
import { isLanguageCustomised, isTextCustomised, shownTextOf } from './botTextRules';
import { labelClass, textareaClass } from './formClasses';

type Language = CustomerLanguageCode;
type TextPatch = Partial<Pick<BotTextEntryDto, Language>>;
const LANGUAGES = CUSTOMER_LANGUAGES.map((key) => ({ key, label: CUSTOMER_LANGUAGE_LABELS[key] }));
const RESET_ALL: TextPatch = { tr: null, en: null, sq: null };

// Karşılama / devir / mesai metinleri. Alanlar varsayılan metinle dolu gelir ve doğrudan düzenlenir;
// yalnız varsayılandan farklı dil saklanır (kayıtta botTextRules.toTextOverride).
export function BotTextsEditor({ entries, onChange }: {
  entries: BotTextEntryDto[];
  onChange: (key: BotTextEntryDto['key'], patch: TextPatch) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <BotTextCard key={entry.key} entry={entry} onChange={(patch) => onChange(entry.key, patch)} />
      ))}
    </div>
  );
}

function BotTextCard({ entry, onChange }: { entry: BotTextEntryDto; onChange: (patch: TextPatch) => void }) {
  const customised = isTextCustomised(entry);
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[var(--fg)]">{entry.title}</span>
            {customised && <ChangedBadge />}
          </div>
          <p className="m-0 break-words text-[11px] text-[var(--fg-muted)]">{entry.description}</p>
        </div>
        {customised && (
          <button
            type="button"
            onClick={() => onChange(RESET_ALL)}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-2 text-[11px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
          >
            <RotateCcw size={12} aria-hidden /> Varsayılana dön
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {LANGUAGES.map(({ key, label }) => (
          <div key={key} className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`bot-text-${entry.key}-${key}`} className={labelClass}>{label}</label>
              {isLanguageCustomised(entry, key) && (
                <button
                  type="button"
                  onClick={() => onChange({ [key]: null })}
                  className="mb-1 cursor-pointer text-[10.5px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
                >
                  Bu dili sıfırla
                </button>
              )}
            </div>
            <AutoTextarea
              id={`bot-text-${entry.key}-${key}`}
              value={shownTextOf(entry, key)}
              placeholder="Boş bırakılırsa varsayılan metin gider"
              onChange={(e) => onChange({ [key]: e.target.value })}
              className={textareaClass}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangedBadge() {
  return (
    <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--fg)]">
      Değiştirildi
    </span>
  );
}
