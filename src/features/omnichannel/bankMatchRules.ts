import {
  BANK_AMOUNT_SIGN,
  BANK_DATE_FORMAT,
  BANK_DECIMAL_SEPARATOR,
  type BankAmountSign,
  type BankDateFormat,
  type BankDecimalSeparator,
  type BankImportMapping,
  type BankImportResultDto,
  type BankOrderRefDto,
  type BankTransactionDto,
} from '../../lib/api/omnichannel-bank';
import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import { formatOrderMoney } from './chatOrderRules';

// Havale eşleşme (P34) ekranının saf kuralları: eşleme formu ↔ DTO, seçenek listeleri, özet metni.

export const BANK_CURRENCY_CODE_LENGTH = 3;

export const BANK_DATE_FORMAT_OPTIONS: FilterSelectOption[] = [
  { value: String(BANK_DATE_FORMAT.DayMonthYearDots), label: '31.12.2026' },
  { value: String(BANK_DATE_FORMAT.DayMonthYearSlashes), label: '31/12/2026' },
  { value: String(BANK_DATE_FORMAT.Iso), label: '2026-12-31' },
];

export const BANK_DECIMAL_OPTIONS: FilterSelectOption[] = [
  { value: String(BANK_DECIMAL_SEPARATOR.Comma), label: '1.234,56 (virgül ondalık)' },
  { value: String(BANK_DECIMAL_SEPARATOR.Dot), label: '1,234.56 (nokta ondalık)' },
];

export const BANK_SIGN_OPTIONS: FilterSelectOption[] = [
  { value: String(BANK_AMOUNT_SIGN.PositiveIsCredit), label: 'Artı gelen, eksi giden' },
  { value: String(BANK_AMOUNT_SIGN.NegativeIsCredit), label: 'Eksi gelen, artı giden' },
  { value: String(BANK_AMOUNT_SIGN.AllCredits), label: 'Dosyada yalnız gelenler var' },
];

export const BANK_DAYS_OPTIONS: FilterSelectOption[] = [
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: '90', label: 'Son 90 gün' },
];

export const BANK_DEFAULT_DAYS = 30;
export const BANK_PAGE_SIZE = 10;

// Form alanları metin olarak tutulur (boş bırakılabilsin); sayıya kaydederken çevrilir.
export interface BankMappingDraft {
  skipRows: string;
  dateColumn: string;
  amountColumn: string;
  currencyColumn: string;
  descriptionColumn: string;
  senderColumn: string;
  defaultCurrency: string;
  dateFormat: BankDateFormat;
  decimalSeparator: BankDecimalSeparator;
  amountSign: BankAmountSign;
}

export const EMPTY_BANK_MAPPING_DRAFT: BankMappingDraft = {
  skipRows: '1',
  dateColumn: '',
  amountColumn: '',
  currencyColumn: '',
  descriptionColumn: '',
  senderColumn: '',
  defaultCurrency: 'TRY',
  dateFormat: BANK_DATE_FORMAT.DayMonthYearDots,
  decimalSeparator: BANK_DECIMAL_SEPARATOR.Comma,
  amountSign: BANK_AMOUNT_SIGN.PositiveIsCredit,
};

// 0 = "dökümde yok": forma boş görünür.
const columnText = (column: number) => (column > 0 ? String(column) : '');
const toNumber = (text: string) => (text.trim() === '' ? 0 : Number(text));

export function bankMappingDraftFrom(mapping: BankImportMapping): BankMappingDraft {
  return {
    skipRows: String(mapping.skipRows),
    dateColumn: columnText(mapping.dateColumn),
    amountColumn: columnText(mapping.amountColumn),
    currencyColumn: columnText(mapping.currencyColumn),
    descriptionColumn: columnText(mapping.descriptionColumn),
    senderColumn: columnText(mapping.senderColumn),
    defaultCurrency: mapping.defaultCurrency,
    dateFormat: mapping.dateFormat,
    decimalSeparator: mapping.decimalSeparator,
    amountSign: mapping.amountSign,
  };
}

export function toBankMapping(draft: BankMappingDraft): BankImportMapping {
  return {
    skipRows: toNumber(draft.skipRows),
    dateColumn: toNumber(draft.dateColumn),
    amountColumn: toNumber(draft.amountColumn),
    currencyColumn: toNumber(draft.currencyColumn),
    descriptionColumn: toNumber(draft.descriptionColumn),
    senderColumn: toNumber(draft.senderColumn),
    defaultCurrency: draft.defaultCurrency.trim().toUpperCase(),
    dateFormat: draft.dateFormat,
    decimalSeparator: draft.decimalSeparator,
    amountSign: draft.amountSign,
  };
}

const isWholeNumber = (value: number) => Number.isInteger(value) && value >= 0;

// Sunucuyla aynı kurallar; ilk hatayı Türkçe döner, sorun yoksa null.
export function bankMappingDraftError(draft: BankMappingDraft): string | null {
  const mapping = toBankMapping(draft);
  const numbers = [mapping.skipRows, mapping.dateColumn, mapping.amountColumn, mapping.currencyColumn,
    mapping.descriptionColumn, mapping.senderColumn];
  if (!numbers.every(isWholeNumber)) return 'Sütun ve satır sayıları 0 ya da pozitif tam sayı olmalı.';
  if (mapping.dateColumn < 1) return 'Tarih sütununu gir.';
  if (mapping.amountColumn < 1) return 'Tutar sütununu gir.';
  if (mapping.descriptionColumn < 1) return 'Açıklama sütununu gir.';
  const validCurrency = mapping.defaultCurrency.length === BANK_CURRENCY_CODE_LENGTH;
  if (mapping.currencyColumn === 0 && !validCurrency) return 'Para birimi sütunu yoksa varsayılan para birimini gir (ör. TRY).';
  return null;
}

// "2026-09-15" → "15.09.2026". Beklenmeyen biçim olduğu gibi döner.
export function formatBankDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
}

export const formatBankAmount = (amount: number, currency: string) => formatOrderMoney(amount, currency);

export function bankPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

// Önerilen siparişin tutarı havaleyle aynı mı? Farklıysa temsilci farkı görür (onay yine de mümkün).
export function bankAmountNote(tx: Pick<BankTransactionDto, 'amount' | 'currency'>, order: BankOrderRefDto): string | null {
  if (tx.currency !== order.currency) return `Para birimi farklı (${order.currency})`;
  const difference = Math.round((tx.amount - order.total) * 100) / 100;
  if (difference === 0) return null;
  return `Sipariş tutarı ${formatBankAmount(order.total, order.currency)} (fark ${formatBankAmount(difference, tx.currency)})`;
}

// İçe aktarma sonucunun tek satırlık özeti.
export function bankImportSummary(result: BankImportResultDto): string {
  const parts = [`${result.imported} hareket eklendi`];
  if (result.duplicates > 0) parts.push(`${result.duplicates} tekrar atlandı`);
  if (result.skippedNonCredit > 0) parts.push(`${result.skippedNonCredit} giden satır atlandı`);
  if (result.badRows.length > 0) parts.push(`${result.badRows.length} satır okunamadı`);
  return parts.join(', ') + '.';
}

export function bankMatchSummary(match: BankImportResultDto['match']): string {
  return `${match.autoPaid} otomatik ödendi, ${match.suggested} öneri, ${match.unmatched} eşleşmedi.`;
}
