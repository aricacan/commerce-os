import { request } from './core';

// ─── Omnichannel › Banka ekstre posta kutusu (P34) ─────────────────────────────
//
// Bankanın zamanlanmış ekstre e-postasını IMAP'tan otomatik alma ayarı. Parola asla geri
// dönmez (yalnız hasPassword). Backend enum'ları SAYI olarak gönderir/bekler.

// Backend BankMailboxSecurity ile birebir.
export const BANK_MAILBOX_SECURITY = { SslOnConnect: 0, StartTls: 1 } as const;
export type BankMailboxSecurity = (typeof BANK_MAILBOX_SECURITY)[keyof typeof BANK_MAILBOX_SECURITY];

export const BANK_MAILBOX_SECURITY_LABELS: Record<BankMailboxSecurity, string> = {
  [BANK_MAILBOX_SECURITY.SslOnConnect]: 'SSL (993)',
  [BANK_MAILBOX_SECURITY.StartTls]: 'STARTTLS (143)',
};

// Backend BankMailboxLimits ile birebir.
export const BANK_MAILBOX_PORT_MIN = 1;
export const BANK_MAILBOX_PORT_MAX = 65535;
export const BANK_MAILBOX_PORT_SSL = 993;
export const BANK_MAILBOX_PORT_STARTTLS = 143;

export interface BankMailboxSettingsDto {
  isEnabled: boolean;
  imapHost: string | null;
  imapPort: number;
  security: BankMailboxSecurity;
  username: string | null;
  hasPassword: boolean;
  allowedSenders: string[];
  importTemplateId: number | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastImportedCount: number;
}

// Parola boş/null = kayıtlı değer korunur; silmek için clearPassword.
export interface BankMailboxSaveBody {
  isEnabled: boolean;
  imapHost: string | null;
  imapPort: number;
  security: BankMailboxSecurity;
  username: string | null;
  password: string | null;
  clearPassword: boolean;
  allowedSenders: string[];
  importTemplateId: number | null;
}

export interface BankMailboxTestResultDto {
  ok: boolean;
  error: string | null;
  unreadCount: number;
}

const BASE = '/omnichannel/bank-mailbox';

export const bankMailboxApi = {
  get: () => request<BankMailboxSettingsDto>(BASE),
  save: (body: BankMailboxSaveBody) =>
    request<BankMailboxSettingsDto>(BASE, { method: 'PUT', body: JSON.stringify(body) }),
  // KAYITLI ayarla dener: giriş yapar, INBOX'taki okunmamışı sayar, hiçbir şeyi işaretlemez.
  test: () => request<BankMailboxTestResultDto>(`${BASE}/test`, { method: 'POST' }),
};
