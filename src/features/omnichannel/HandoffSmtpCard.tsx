'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import {
  handoffDeliveryApi, HANDOFF_SMTP_PORT_MAX, HANDOFF_SMTP_PORT_MIN, HANDOFF_SMTP_SECURITY, HANDOFF_SMTP_SECURITY_LABELS,
  type HandoffDeliverySettingsDto, type HandoffDeliverySettingsSaveBody, type HandoffSmtpSecurity, type HandoffSmtpTestResultDto,
} from '../../lib/api/omnichannel-handoff-delivery';
import { chipClass, inputClass, labelClass, primaryButtonClass } from './formClasses';
import { fingerprintDraftError, normalizeFingerprint } from './handoffSmtpRules';
import { ConnectionCard, SecretField, TestRow } from './HandoffConnectionParts';
import { HandoffSmtpCertificateField } from './HandoffSmtpCertificateField';
import { HandoffSmtpHints } from './HandoffSmtpHints';

interface Props {
  settings: HandoffDeliverySettingsDto;
  saving: boolean;
  onSave: (patch: Partial<HandoffDeliverySettingsSaveBody>) => Promise<boolean>;
}

const SECURITY_OPTIONS = Object.values(HANDOFF_SMTP_SECURITY) as HandoffSmtpSecurity[];

const orNull = (value: string) => value.trim() || null;

// Devir e-postalarının kendi SMTP hesabı. Sunucu + gönderen boşsa genel e-posta ayarı kullanılır.
export function HandoffSmtpCard({ settings, saving, onSave }: Props) {
  const [host, setHost] = useState(settings.smtpHost ?? '');
  const [port, setPort] = useState(String(settings.smtpPort));
  const [security, setSecurity] = useState<HandoffSmtpSecurity>(settings.smtpSecurity);
  const [username, setUsername] = useState(settings.smtpUsername ?? '');
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [fromAddress, setFromAddress] = useState(settings.smtpFromAddress ?? '');
  const [fromName, setFromName] = useState(settings.smtpFromName ?? '');
  const [certificate, setCertificate] = useState(settings.smtpTrustedCertificateSha256 ?? '');
  const [presentedCertificate, setPresentedCertificate] = useState<string | null>(null);

  const portNumber = Number(port);
  const portValid = Number.isInteger(portNumber) && portNumber >= HANDOFF_SMTP_PORT_MIN && portNumber <= HANDOFF_SMTP_PORT_MAX;
  const hostAndFromPaired = !host.trim() === !fromAddress.trim();
  const certificateValid = fingerprintDraftError(certificate) === null;

  const submit = async () => {
    const ok = await onSave({
      smtpHost: orNull(host), smtpPort: portNumber, smtpSecurity: security, smtpUsername: orNull(username),
      smtpPassword: orNull(password), clearSmtpPassword: clearPassword,
      smtpFromAddress: orNull(fromAddress), smtpFromName: orNull(fromName),
      smtpTrustedCertificateSha256: normalizeFingerprint(certificate),
    });
    if (!ok) return;
    setPassword('');
    setClearPassword(false);
  };

  return (
    <ConnectionCard title="E-posta (SMTP)" icon={<Mail size={14} className="text-[var(--fg-muted)]" />} custom={settings.usesCustomSmtp}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_96px]">
        <div>
          <label className={labelClass}>Sunucu</label>
          <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.firma.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Port</label>
          <input type="number" inputMode="numeric" min={HANDOFF_SMTP_PORT_MIN} max={HANDOFF_SMTP_PORT_MAX}
            value={port} onChange={(e) => setPort(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Güvenlik</label>
        <div className="flex flex-wrap gap-2">
          {SECURITY_OPTIONS.map((option) => (
            <label key={option} className={chipClass}>
              <input type="radio" checked={security === option} onChange={() => setSecurity(option)} className="h-3.5 w-3.5" />
              <span>{HANDOFF_SMTP_SECURITY_LABELS[option]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Kullanıcı adı</label>
          <input value={username} autoComplete="off" onChange={(e) => setUsername(e.target.value)}
            placeholder="devir@firma.com" className={inputClass} />
        </div>
        <SecretField label="Şifre" value={password} onChange={setPassword} stored={settings.hasSmtpPassword}
          clear={clearPassword} onClearChange={setClearPassword} placeholder="Uygulama şifresi" />
        <div>
          <label className={labelClass}>Gönderen adresi</label>
          <input type="email" value={fromAddress} onChange={(e) => setFromAddress(e.target.value)}
            placeholder="devir@firma.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Gönderen adı</label>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Müşteri Destek" className={inputClass} />
        </div>
      </div>

      <HandoffSmtpCertificateField value={certificate} onChange={setCertificate} presented={presentedCertificate} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {!portValid && (
          <span className="mr-auto text-[11px] text-rose-500">Port {HANDOFF_SMTP_PORT_MIN}–{HANDOFF_SMTP_PORT_MAX} arasında olmalı.</span>
        )}
        {portValid && !hostAndFromPaired && (
          <span className="mr-auto text-[11px] text-[var(--fg-muted)]">Sunucu ve gönderen adresi birlikte girilmeli.</span>
        )}
        <button type="button" onClick={() => void submit()} disabled={saving || !portValid || !hostAndFromPaired || !certificateValid}
          className={primaryButtonClass}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>

      <TestRow placeholder="Test adresi (ör. siz@firma.com)" buttonLabel="Test e-postası gönder"
        successMessage="Test e-postası gönderildi." onTest={handoffDeliveryApi.testEmail}
        onResult={(result: HandoffSmtpTestResultDto) => setPresentedCertificate(result.certificateSha256)} />

      <HandoffSmtpHints />
    </ConnectionCard>
  );
}
