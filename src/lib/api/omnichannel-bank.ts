import { BASE, request, throwIfNotOk, uploadHeaders } from './core';
import type { ChatOrderStatus } from './omnichannel-chat-orders';

// ─── Omnichannel › Havale otomatik eşleşme (P34) ───────────────────────────────
//
// Banka dökümü içe aktarma, banka hareketleri ve sütun eşleme şablonları.
// Backend enum'ları SAYI olarak gönderir/bekler.

export const BANK_TRANSACTION_STATUS = { Unmatched: 0, Suggested: 1, Matched: 2, Ignored: 3 } as const;
export type BankTransactionStatus = (typeof BANK_TRANSACTION_STATUS)[keyof typeof BANK_TRANSACTION_STATUS];

export const BANK_MATCH_KIND = { None: 0, ExactReference: 1, Suggestion: 2 } as const;
export type BankMatchKind = (typeof BANK_MATCH_KIND)[keyof typeof BANK_MATCH_KIND];

export const BANK_AMOUNT_SIGN = { PositiveIsCredit: 0, NegativeIsCredit: 1, AllCredits: 2 } as const;
export type BankAmountSign = (typeof BANK_AMOUNT_SIGN)[keyof typeof BANK_AMOUNT_SIGN];

export const BANK_DECIMAL_SEPARATOR = { Comma: 0, Dot: 1 } as const;
export type BankDecimalSeparator = (typeof BANK_DECIMAL_SEPARATOR)[keyof typeof BANK_DECIMAL_SEPARATOR];

export const BANK_DATE_FORMAT = { DayMonthYearDots: 0, DayMonthYearSlashes: 1, Iso: 2 } as const;
export type BankDateFormat = (typeof BANK_DATE_FORMAT)[keyof typeof BANK_DATE_FORMAT];

// Sütun numaraları 1'den başlar (1 = A); 0 = dökümde yok (yalnız para birimi ve gönderen için).
export interface BankImportMapping {
  skipRows: number;
  dateColumn: number;
  amountColumn: number;
  currencyColumn: number;
  descriptionColumn: number;
  senderColumn: number;
  defaultCurrency: string;
  dateFormat: BankDateFormat;
  decimalSeparator: BankDecimalSeparator;
  amountSign: BankAmountSign;
}

export interface BankImportTemplateDto {
  id: number;
  bankName: string;
  mapping: BankImportMapping;
}

export interface BankImportTemplateSaveDto {
  bankName: string;
  mapping: BankImportMapping;
}

export interface BankRowErrorDto { row: number; reason: string }

export interface BankMatchSummaryDto { autoPaid: number; suggested: number; unmatched: number }

export interface BankImportResultDto {
  imported: number;
  duplicates: number;
  skippedNonCredit: number;
  badRows: BankRowErrorDto[];
  match: BankMatchSummaryDto;
}

export interface BankOrderRefDto {
  id: number;
  publicNo: string | null;
  fullName: string | null;
  total: number;
  currency: string;
  status: ChatOrderStatus;
}

export interface BankTransactionDto {
  id: number;
  // "yyyy-MM-dd"
  bookingDate: string;
  amount: number;
  currency: string;
  description: string;
  senderName: string | null;
  status: BankTransactionStatus;
  matchKind: BankMatchKind;
  attentionNote: string | null;
  matchedOrder: BankOrderRefDto | null;
  suggestions: BankOrderRefDto[];
}

export interface BankStatusCountsDto { unmatched: number; suggested: number; matched: number; ignored: number }

export interface BankTransactionPageDto {
  items: BankTransactionDto[];
  total: number;
  page: number;
  pageSize: number;
  counts: BankStatusCountsDto;
}

export interface BankTransactionQuery {
  status: BankTransactionStatus;
  days: number;
  page: number;
  pageSize: number;
}

const ROOT = '/omnichannel/bank-transactions';

// Sütun eşlemesi alan alan form verisi olarak gider (backend [FromForm] bağlar).
function importForm(file: File, mapping: BankImportMapping): FormData {
  const form = new FormData();
  form.append('file', file);
  Object.entries(mapping).forEach(([key, value]) => form.append(key, String(value)));
  return form;
}

export const bankApi = {
  list: ({ status, days, page, pageSize }: BankTransactionQuery) =>
    request<BankTransactionPageDto>(`${ROOT}?status=${status}&days=${days}&page=${page}&pageSize=${pageSize}`),
  // Dosya yükleme: request() JSON başlığı ekler; FormData için başlık tarayıcıya bırakılır.
  import: async (file: File, mapping: BankImportMapping): Promise<BankImportResultDto> => {
    const res = await fetch(`${BASE}${ROOT}/import`, {
      method: 'POST', headers: uploadHeaders(), body: importForm(file, mapping), credentials: 'include',
    });
    await throwIfNotOk(res);
    return res.json();
  },
  rematch: () => request<BankMatchSummaryDto>(`${ROOT}/rematch`, { method: 'POST' }),
  confirm: (id: number, orderId: number) =>
    request<BankTransactionDto>(`${ROOT}/${id}/confirm`, { method: 'POST', body: JSON.stringify({ orderId }) }),
  ignore: (id: number) => request<BankTransactionDto>(`${ROOT}/${id}/ignore`, { method: 'POST' }),
  templates: () => request<BankImportTemplateDto[]>(`${ROOT}/templates`),
  saveTemplate: (body: BankImportTemplateSaveDto) =>
    request<BankImportTemplateDto>(`${ROOT}/templates`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTemplate: (id: number) => request<void>(`${ROOT}/templates/${id}`, { method: 'DELETE' }),
};
