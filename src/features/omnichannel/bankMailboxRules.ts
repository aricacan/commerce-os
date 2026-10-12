import {
  BANK_MAILBOX_PORT_MAX, BANK_MAILBOX_PORT_MIN, BANK_MAILBOX_PORT_SSL, BANK_MAILBOX_PORT_STARTTLS,
  BANK_MAILBOX_SECURITY, type BankMailboxSecurity, type BankMailboxSettingsDto,
} from '../../lib/api/omnichannel-bank-mailbox';

// Posta kutusu kartının saf kuralları (ekrandan bağımsız, test edilir).

// Formun yazılabilir hâli: sayılar ve izinli gönderen listesi metin olarak tutulur.
export interface BankMailboxDraft {
  enabled: boolean;
  host: string;
  port: string;
  security: BankMailboxSecurity;
  username: string;
  password: string;
  clearPassword: boolean;
  senders: string;
  templateId: string;
}

export function draftFromSettings(settings: BankMailboxSettingsDto): BankMailboxDraft {
  return {
    enabled: settings.isEnabled,
    host: settings.imapHost ?? '',
    port: String(settings.imapPort),
    security: settings.security,
    username: settings.username ?? '',
    password: '',
    clearPassword: false,
    senders: settings.allowedSenders.join('\n'),
    templateId: settings.importTemplateId === null ? '' : String(settings.importTemplateId),
  };
}

// Satır, virgül, noktalı virgül ya da boşlukla ayrılmış girdiyi tekil, küçük harfli listeye çevirir.
export function parseSenders(text: string): string[] {
  const entries = text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  return [...new Set(entries)];
}

// Güvenlik türü değişince standart portu önerir; kullanıcının yazdığı özel porta dokunmaz.
export function portForSecurity(currentPort: string, security: BankMailboxSecurity): string {
  const standard = [String(BANK_MAILBOX_PORT_SSL), String(BANK_MAILBOX_PORT_STARTTLS)];
  if (!standard.includes(currentPort)) return currentPort;
  return String(security === BANK_MAILBOX_SECURITY.SslOnConnect ? BANK_MAILBOX_PORT_SSL : BANK_MAILBOX_PORT_STARTTLS);
}

// Kaydetmeyi engelleyen ilk sorun (Türkçe) ya da null. Açıkken sunucu/kullanıcı/gönderen/şablon zorunlu.
export function bankMailboxDraftError(draft: BankMailboxDraft, passwordStored: boolean): string | null {
  const port = Number(draft.port);
  if (!Number.isInteger(port) || port < BANK_MAILBOX_PORT_MIN || port > BANK_MAILBOX_PORT_MAX) {
    return `Port ${BANK_MAILBOX_PORT_MIN}–${BANK_MAILBOX_PORT_MAX} arasında olmalı.`;
  }
  if (!draft.enabled) return null;
  if (!draft.host.trim() || !draft.username.trim()) return 'Açmak için sunucu ve kullanıcı adı gerekli.';
  if (!draft.password.trim() && (!passwordStored || draft.clearPassword)) return 'Açmak için parola gerekli.';
  if (parseSenders(draft.senders).length === 0) return 'Açmak için en az bir izinli gönderen gerekli (ör. ekstre@banka.com.tr).';
  if (!draft.templateId) return 'Açmak için ekin okunacağı banka şablonunu seçin.';
  return null;
}
