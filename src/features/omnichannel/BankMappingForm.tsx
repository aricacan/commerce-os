'use client';

import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';
import type { BankAmountSign, BankDateFormat, BankDecimalSeparator } from '../../lib/api/omnichannel-bank';
import {
  BANK_CURRENCY_CODE_LENGTH,
  BANK_DATE_FORMAT_OPTIONS,
  BANK_DECIMAL_OPTIONS,
  BANK_SIGN_OPTIONS,
  type BankMappingDraft,
} from './bankMatchRules';
import { formInputClass, labelClass } from './formClasses';

type ColumnKey = 'skipRows' | 'dateColumn' | 'amountColumn' | 'currencyColumn' | 'descriptionColumn' | 'senderColumn';

const COLUMN_FIELDS: { key: ColumnKey; label: string; hint?: string }[] = [
  { key: 'skipRows', label: 'Üstte atlanacak satır', hint: 'Başlık dahil' },
  { key: 'dateColumn', label: 'Tarih sütunu', hint: '1 = A' },
  { key: 'amountColumn', label: 'Tutar sütunu' },
  { key: 'descriptionColumn', label: 'Açıklama sütunu' },
  { key: 'senderColumn', label: 'Gönderen sütunu', hint: 'Yoksa boş' },
  { key: 'currencyColumn', label: 'Para birimi sütunu', hint: 'Yoksa boş' },
];

interface Props {
  draft: BankMappingDraft;
  onChange: (draft: BankMappingDraft) => void;
}

// Bankanın dökümünde hangi sütunun ne olduğu (P34). Kaydedilen şablon bu formu bir tıkla doldurur.
export function BankMappingForm({ draft, onChange }: Props) {
  const set = <K extends keyof BankMappingDraft>(key: K, value: BankMappingDraft[K]) => onChange({ ...draft, [key]: value });

  const select = (label: string, value: number, options: FilterSelectOption[], apply: (value: number) => void) => (
    <label className="flex min-w-0 flex-col">
      <span className={labelClass}>{label}</span>
      <FilterSelect value={String(value)} options={options} placeholder={label} showAllOption={false}
        height="h-8.5" minWidth="100%" onChange={(v) => apply(Number(v))} />
    </label>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {COLUMN_FIELDS.map(({ key, label, hint }) => (
        <label key={key} className="flex min-w-0 flex-col">
          <span className={labelClass}>{label}</span>
          <input inputMode="numeric" value={draft[key]} placeholder={hint} className={formInputClass}
            onChange={(e) => set(key, e.target.value)} />
        </label>
      ))}
      <label className="flex min-w-0 flex-col">
        <span className={labelClass}>Varsayılan para birimi</span>
        <input value={draft.defaultCurrency} maxLength={BANK_CURRENCY_CODE_LENGTH} placeholder="TRY" className={formInputClass}
          onChange={(e) => set('defaultCurrency', e.target.value.toUpperCase())} />
      </label>
      {select('Tarih biçimi', draft.dateFormat, BANK_DATE_FORMAT_OPTIONS, (v) => set('dateFormat', v as BankDateFormat))}
      {select('Tutar biçimi', draft.decimalSeparator, BANK_DECIMAL_OPTIONS, (v) => set('decimalSeparator', v as BankDecimalSeparator))}
      {select('Tutar işareti', draft.amountSign, BANK_SIGN_OPTIONS, (v) => set('amountSign', v as BankAmountSign))}
    </div>
  );
}
