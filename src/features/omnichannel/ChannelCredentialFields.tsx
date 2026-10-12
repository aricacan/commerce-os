'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CHANNEL_TYPE, type ChannelCredentialsInput, type ChannelType } from '../../lib/api/omnichannel';
import { EmailServerSections } from './EmailServerSections';
import { formInputClass, labelClass } from './formClasses';
import { CREDENTIAL_FIELDS } from './shared';

interface Props {
  type: ChannelType;
  isEdit: boolean;
  credentials: ChannelCredentialsInput;
  onChange: (patch: Partial<ChannelCredentialsInput>) => void;
}

// Gizli gösterilen (yıldızlı) kimlik alanları.
const SECRET_KEY_PARTS = ['token', 'secret', 'key', 'password'];

// Kanal türüne göre kimlik / API alanları. Düzenlemede boş bırakılan alanlar korunur (sunucu mevcut anahtarı tutar).
export function ChannelCredentialFields({ type, isEdit, credentials, onChange }: Props) {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const fields = CREDENTIAL_FIELDS[type];
  if (fields.length === 0) return null;
  // E-postanın alanları gelen/giden/hesap olarak gruplanır; genel liste kullanılmaz.
  if (type === CHANNEL_TYPE.Email) return <EmailServerSections credentials={credentials} onChange={onChange} isEdit={isEdit} />;

  const toggleVisible = (key: string) => setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3 border-t border-[var(--border-soft)] pt-2">
      <div className="text-[11px] font-bold text-[var(--fg)]">
        Kimlik &amp; API Bilgileri {isEdit && <span className="font-normal text-[var(--fg-muted)]">(Boş bırakılan alanlar korunur)</span>}
      </div>

      {type === CHANNEL_TYPE.Instagram && (
        <label className="flex cursor-pointer items-start gap-2 text-xs text-[var(--fg)]">
          <input
            type="checkbox"
            checked={credentials.useInstagramGraphHost ?? false}
            onChange={(e) => onChange({ useInstagramGraphHost: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded-[3px]"
          />
          <span>
            Instagram&apos;a doğrudan bağlı hesap (Facebook sayfası olmadan)
            <span className="block text-[10px] text-[var(--fg-muted)]">
              Instagram&apos;dan aldığınız erişim anahtarını kullanıyorsanız işaretleyin. Hesap bir Facebook
              sayfasına bağlıysa işaretlemeyin.
            </span>
          </span>
        </label>
      )}

      {fields.map((field) => {
        const isSecret = SECRET_KEY_PARTS.some((part) => field.key.toLowerCase().includes(part));
        const isVisible = visible[field.key] ?? false;
        const raw = credentials[field.key as keyof ChannelCredentialsInput];
        return (
          <div key={field.key}>
            <label className={labelClass}>{field.label}</label>
            <div className="relative">
              <input
                type={isSecret && !isVisible ? 'password' : 'text'}
                value={typeof raw === 'string' ? raw : ''}
                onChange={(e) => onChange({ [field.key]: e.target.value })}
                placeholder="Değeri girin…"
                className={`${formInputClass} pr-8 font-mono`}
              />
              {isSecret && (
                <button
                  type="button"
                  onClick={() => toggleVisible(field.key)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
                >
                  {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              )}
            </div>
            {field.hint && <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{field.hint}</div>}
          </div>
        );
      })}
    </div>
  );
}
