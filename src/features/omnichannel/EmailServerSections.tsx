'use client';

import { useState, type ReactNode } from 'react';
import {
  IMAP_SECURITY, SMTP_SECURITY,
  type ChannelCredentialsInput, type ImapSecurity, type SmtpSecurity,
} from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { formInputClass, labelClass } from './formClasses';

interface Props {
  credentials: ChannelCredentialsInput;
  onChange: (patch: Partial<ChannelCredentialsInput>) => void;
  /** Düzenlemede boş bırakılan alanlar kayıtlı değeri korur. */
  isEdit: boolean;
}

const DEFAULT_OPTION = '';
const PORT_MIN = 1;
const PORT_MAX = 65535;

const IMAP_SECURITY_OPTIONS = [
  { value: DEFAULT_OPTION, label: 'Varsayılan (SSL)' },
  { value: String(IMAP_SECURITY.SslOnConnect), label: 'SSL — port 993' },
  { value: String(IMAP_SECURITY.StartTls), label: 'STARTTLS — port 143' },
];

const SMTP_SECURITY_OPTIONS = [
  { value: DEFAULT_OPTION, label: 'Varsayılan (SSL)' },
  { value: String(SMTP_SECURITY.SslOnConnect), label: 'SSL — port 465' },
  { value: String(SMTP_SECURITY.StartTls), label: 'STARTTLS — port 587' },
];

const toPort = (raw: string): number | undefined => (raw.trim() === '' ? undefined : Number(raw));
const toOption = (value: number | undefined) => (value === undefined ? DEFAULT_OPTION : String(value));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] p-3">
      <legend className="px-1 text-[11px] font-bold text-[var(--fg)]">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function PortInput({ value, placeholder, onChange }: {
  value: number | undefined; placeholder: string; onChange: (port: number | undefined) => void;
}) {
  return (
    <input
      type="number" min={PORT_MIN} max={PORT_MAX} value={value ?? ''} placeholder={placeholder}
      onChange={(e) => onChange(toPort(e.target.value))} className={formInputClass}
    />
  );
}

// E-posta sunucu ayarları: gelen (IMAP), giden (SMTP) ve ortak hesap. IMAP ve SMTP aynı kullanıcı adı ve parolayla
// giriş yapar. Boş port/güvenlik yeni kanalda 993 SSL / 465 SSL olur, düzenlemede kayıtlı değeri korur.
export function EmailServerSections({ credentials, onChange, isEdit }: Props) {
  // Kayıtlı sunucuyu istemci bilmez (düzenlemede alanlar boş gelir): orada "aynı" varsayılmaz, yanlışlıkla ezilmesin.
  const [smtpSameAsImap, setSmtpSameAsImap] = useState(() => !isEdit);

  const changeImapHost = (host: string) =>
    onChange(smtpSameAsImap ? { imapHost: host, smtpHost: host } : { imapHost: host });
  const toggleSame = (same: boolean) => {
    setSmtpSameAsImap(same);
    if (same) onChange({ smtpHost: credentials.imapHost ?? '' });
  };

  return (
    <div className="flex flex-col gap-3">
      <Section title="Gelen posta (IMAP)">
        <Field label="IMAP sunucusu *">
          <input
            value={credentials.imapHost ?? ''} onChange={(e) => changeImapHost(e.target.value)}
            placeholder="mail.alanadi.com" className={`${formInputClass} font-mono`}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="IMAP portu">
            <PortInput value={credentials.imapPort} placeholder="993" onChange={(imapPort) => onChange({ imapPort })} />
          </Field>
          <Field label="IMAP güvenliği">
            <FilterSelect
              value={toOption(credentials.imapSecurity)} placeholder="Güvenlik" height="h-8.5" showAllOption={false}
              onChange={(v) => onChange({ imapSecurity: v === DEFAULT_OPTION ? undefined : (Number(v) as ImapSecurity) })}
              options={IMAP_SECURITY_OPTIONS}
            />
          </Field>
        </div>
      </Section>

      <Section title="Giden posta (SMTP)">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--fg)]">
          <input
            type="checkbox" checked={smtpSameAsImap} onChange={(e) => toggleSame(e.target.checked)}
            className="h-4 w-4 rounded-[3px]"
          />
          SMTP sunucusu IMAP ile aynı
        </label>
        {!smtpSameAsImap && (
          <Field label="SMTP sunucusu *">
            <input
              value={credentials.smtpHost ?? ''} onChange={(e) => onChange({ smtpHost: e.target.value })}
              placeholder="mail.alanadi.com" className={`${formInputClass} font-mono`}
            />
          </Field>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="SMTP portu">
            <PortInput value={credentials.smtpPort} placeholder="465" onChange={(smtpPort) => onChange({ smtpPort })} />
          </Field>
          <Field label="SMTP güvenliği">
            <FilterSelect
              value={toOption(credentials.smtpSecurity)} placeholder="Güvenlik" height="h-8.5" showAllOption={false}
              onChange={(v) => onChange({ smtpSecurity: v === DEFAULT_OPTION ? undefined : (Number(v) as SmtpSecurity) })}
              options={SMTP_SECURITY_OPTIONS}
            />
          </Field>
        </div>
      </Section>

      <Section title="Hesap (IMAP ve SMTP için ortak)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kullanıcı adı *">
            <input
              value={credentials.mailUsername ?? ''} onChange={(e) => onChange({ mailUsername: e.target.value })}
              placeholder="Genellikle tam e-posta adresi" autoComplete="off" className={`${formInputClass} font-mono`}
            />
          </Field>
          <Field label="Parola *">
            <input
              type="password" value={credentials.mailPassword ?? ''} autoComplete="new-password"
              onChange={(e) => onChange({ mailPassword: e.target.value })} className={`${formInputClass} font-mono`}
            />
          </Field>
        </div>
        <Field label="Gönderilmiş klasörü">
          <input
            value={credentials.sentFolder ?? ''} onChange={(e) => onChange({ sentFolder: e.target.value })}
            placeholder="Boş = otomatik bul (Plesk: INBOX.Sent ya da Sent)" className={formInputClass}
          />
          <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
            Panelden giden yanıtlar bu klasöre de eklenir; mail istemcisinden yazılan cevaplar buradan konuşmaya düşer.
          </div>
        </Field>
      </Section>
    </div>
  );
}
