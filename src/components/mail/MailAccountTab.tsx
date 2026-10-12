'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, ChevronDown, ExternalLink, Eye, EyeOff, HelpCircle, Link2, RefreshCw, Send, Unlink, XCircle } from 'lucide-react';
import {
  MAIL_AUTH_OAUTH2,
  MAIL_AUTH_SMTP_PASSWORD,
  SMTP_PRESETS,
  userMailApi,
  type SaveUserMailAccountDto,
  type UserMailAccountDto,
  type UserMailAuthType,
} from '../../lib/api/user-mail';
import { pushAlert } from '../../stores/alert-stack';
import { FormSelect } from '../ui/FormSelect';
import { formatDateTime, mailUi, t, type Lang } from './mail-ui';

interface MailAccountTabProps {
  lang: Lang;
  account: UserMailAccountDto | null | undefined;
}

const DEFAULT_DAILY_LIMIT = 500;

/** Kayıtlı hesabın host/port değerinden hangi hazır ayara denk geldiğini bulur. */
function detectPreset(host: string, port: number): string {
  const match = SMTP_PRESETS.find((p) => p.host === host && p.port === port);
  return match ? match.key : 'custom';
}

export function MailAccountTab({ lang, account }: MailAccountTabProps) {
  const qc = useQueryClient();

  const [presetKey, setPresetKey] = useState('gmail');
  const [emailAddress, setEmailAddress] = useState('');
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [authType, setAuthType] = useState<UserMailAuthType>(MAIL_AUTH_SMTP_PASSWORD);
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [useSsl, setUseSsl] = useState(true);
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [dailySendingLimit, setDailySendingLimit] = useState(DEFAULT_DAILY_LIMIT);
  const [testRecipient, setTestRecipient] = useState('');

  useEffect(() => {
    if (!account) return;
    setEmailAddress(account.emailAddress || '');
    setSenderDisplayName(account.senderDisplayName || '');
    setAuthType(account.authType);
    setSmtpHost(account.smtpHost || 'smtp.gmail.com');
    setSmtpPort(account.smtpPort || 587);
    setUseSsl(account.useSsl);
    setDailySendingLimit(account.dailySendingLimit || DEFAULT_DAILY_LIMIT);
    setPresetKey(detectPreset(account.smtpHost, account.smtpPort));
  }, [account]);

  const { data: providers } = useQuery({
    queryKey: ['user-mail-oauth-providers'],
    queryFn: userMailApi.oauthProviders,
    staleTime: 5 * 60_000,
  });

  const saveAccount = useMutation({
    mutationFn: (dto: SaveUserMailAccountDto) => userMailApi.saveAccount(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-mail-account'] });
      pushAlert(t(lang, 'Mail hesabı kaydedildi', 'Mail account saved'), 'success');
      setSecret('');
    },
    onError: (err: unknown) =>
      pushAlert(t(lang, 'Hesap kaydedilemedi: ', 'Failed to save account: ') + errorText(err), 'error'),
  });

  const testAccount = useMutation({
    mutationFn: () => userMailApi.testAccount({ targetEmail: testRecipient.trim() || undefined }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['user-mail-account'] });
      pushAlert(res.message, res.success ? 'success' : 'error');
    },
    onError: (err: unknown) => pushAlert(t(lang, 'Test başarısız: ', 'Test failed: ') + errorText(err), 'error'),
  });

  const disconnect = useMutation({
    mutationFn: () => userMailApi.disconnectAccount(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-mail-account'] });
      pushAlert(t(lang, 'Hesap bağlantısı kaldırıldı', 'Account disconnected'), 'success');
      setSecret('');
    },
  });

  const startOAuth = useMutation({
    mutationFn: (provider: 'google' | 'microsoft') => userMailApi.oauthStart(provider),
    onSuccess: (res) => {
      window.location.href = res.authorizationUrl;
    },
    onError: (err: unknown) =>
      pushAlert(t(lang, 'Bağlantı başlatılamadı: ', 'Could not start sign-in: ') + errorText(err), 'error'),
  });

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const preset = SMTP_PRESETS.find((p) => p.key === key);
    if (!preset || preset.key === 'custom') return;
    setSmtpHost(preset.host);
    setSmtpPort(preset.port);
    setUseSsl(preset.useSsl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim()) {
      pushAlert(t(lang, 'Lütfen e-posta adresinizi girin', 'Please enter your email'), 'error');
      return;
    }
    if (!smtpHost.trim()) {
      pushAlert(t(lang, 'SMTP sunucusu boş bırakılamaz', 'SMTP host is required'), 'error');
      return;
    }
    if (!account?.hasSecret && !secret.trim()) {
      pushAlert(t(lang, 'Uygulama şifresini girmelisiniz', 'App password is required'), 'error');
      return;
    }
    saveAccount.mutate({
      emailAddress: emailAddress.trim(),
      senderDisplayName: senderDisplayName.trim() || emailAddress.trim(),
      authType,
      smtpHost: smtpHost.trim(),
      smtpPort,
      useSsl,
      secret: secret.trim() || undefined,
      dailySendingLimit,
    });
  };

  const isOAuthConnected = !!account && account.oAuthProvider !== 0;
  const quotaPercent = Math.round(
    ((account?.currentDailyCount ?? 0) / (account?.dailySendingLimit || DEFAULT_DAILY_LIMIT)) * 100
  );
  const activePreset = SMTP_PRESETS.find((p) => p.key === presetKey);

  return (
    <div className="space-y-5">
      {/* Durum kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${mailUi.card} p-3 shadow-xs`}>
          <div className="text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            {t(lang, 'Hesap Durumu', 'Account Status')}
          </div>
          <div className="mt-1 text-xs font-semibold">
            {!account ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" /> {t(lang, 'Henüz Ayarlanmadı', 'Not Configured')}
              </span>
            ) : isOAuthConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {account.oAuthProvider === 1 ? 'Google OAuth' : 'Microsoft OAuth'}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t(lang, 'SMTP Şifresi', 'SMTP Password')}
              </span>
            )}
          </div>
        </div>

        <div className={`${mailUi.card} p-3 shadow-xs`}>
          <div className="text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            {t(lang, 'Günlük Kota', 'Daily Quota')}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-bold font-mono text-[var(--fg)]">{account?.currentDailyCount ?? 0}</span>
            <span className="text-xs text-[var(--fg-muted)]">/ {account?.dailySendingLimit ?? dailySendingLimit}</span>
            <span
              className={`ml-auto text-[10px] font-medium ${
                quotaPercent >= 90 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              %{quotaPercent}
            </span>
          </div>
        </div>

        <div className={`${mailUi.card} p-3 shadow-xs`}>
          <div className="text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            {t(lang, 'Son Test', 'Last Tested')}
          </div>
          <div className="mt-1 text-xs truncate" title={account?.lastTestStatus ?? ''}>
            {!account?.lastTestedAt ? (
              <span className="text-[var(--fg-muted)]">{t(lang, 'Test yapılmadı', 'Never tested')}</span>
            ) : account.lastTestSucceeded ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {formatDateTime(account.lastTestedAt)}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{account.lastTestStatus}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* OAuth ile bağlan */}
      {(providers?.google || providers?.microsoft) && (
        <div className={`${mailUi.card} p-4 space-y-2`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[var(--fg)]">
                {t(lang, 'Tek Tıkla Bağlan (Önerilen)', 'One-click Connect (Recommended)')}
              </h3>
              <p className="text-[11px] text-[var(--fg-muted)]">
                {t(
                  lang,
                  'Şifre girmezsiniz. Yetki sağlayıcıdan alınır ve süresi dolduğunda otomatik yenilenir.',
                  'No password needed. Access is refreshed automatically when it expires.'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {providers?.google && (
                <button
                  type="button"
                  disabled={startOAuth.isPending}
                  onClick={() => startOAuth.mutate('google')}
                  className={mailUi.buttonGhost}
                >
                  <Link2 className="h-3 w-3 text-sky-600" />
                  <span>{t(lang, 'Google ile Bağlan', 'Connect Google')}</span>
                </button>
              )}
              {providers?.microsoft && (
                <button
                  type="button"
                  disabled={startOAuth.isPending}
                  onClick={() => startOAuth.mutate('microsoft')}
                  className={mailUi.buttonGhost}
                >
                  <Link2 className="h-3 w-3 text-sky-600" />
                  <span>{t(lang, 'Microsoft ile Bağlan', 'Connect Microsoft')}</span>
                </button>
              )}
            </div>
          </div>

          {isOAuthConnected && account?.accessTokenExpiresAtUtc && (
            <p className="text-[10px] text-[var(--fg-muted)]">
              {t(lang, 'Erişim anahtarı geçerlilik sonu: ', 'Access token expires: ')}
              {formatDateTime(account.accessTokenExpiresAtUtc)}
              {t(lang, ' — dolduğunda otomatik yenilenir.', ' — refreshed automatically.')}
            </p>
          )}
        </div>
      )}

      {/* SMTP Yardım Rehberi */}
      <SmtpGuide lang={lang} onApplyPreset={applyPreset} />

      {/* Elle SMTP formu */}
      <form onSubmit={handleSubmit} className={`${mailUi.card} space-y-4 p-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={mailUi.label}>
              {t(lang, 'E-Posta Adresiniz', 'Your Email Address')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="ornegin@gmail.com"
              className={mailUi.input}
            />
          </div>
          <div>
            <label className={mailUi.label}>{t(lang, 'Gönderen Görünüm Adı', 'Sender Display Name')}</label>
            <input
              type="text"
              value={senderDisplayName}
              onChange={(e) => setSenderDisplayName(e.target.value)}
              placeholder="Ad Soyad - Demo Oto"
              className={mailUi.input}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={mailUi.label}>{t(lang, 'Sağlayıcı', 'Provider')}</label>
            <FormSelect
              value={presetKey}
              options={SMTP_PRESETS.map((p) => ({ value: p.key, label: p.label }))}
              onChange={applyPreset}
              triggerClassName="h-[30px] rounded-[2px]"
            />
          </div>
          <div>
            <label className={mailUi.label}>{t(lang, 'SMTP Sunucusu', 'SMTP Host')}</label>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => {
                setSmtpHost(e.target.value);
                setPresetKey('custom');
              }}
              placeholder="smtp.gmail.com"
              className={mailUi.inputMono}
            />
          </div>
          <div>
            <label className={mailUi.label}>{t(lang, 'Port & Şifreleme', 'Port & Encryption')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                className="w-20 rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[var(--card)] px-2.5 py-1.5 text-xs text-[var(--fg)] focus:border-sky-500 focus:outline-none font-mono"
              />
              <label className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useSsl}
                  onChange={(e) => setUseSsl(e.target.checked)}
                  className="rounded-[2px]"
                />
                <span>{smtpPort === 465 ? 'SSL' : 'STARTTLS'}</span>
              </label>
            </div>
            <p className={mailUi.hint}>
              {smtpPort === 465
                ? t(lang, '465: bağlantı anında şifrelenir.', '465: implicit TLS.')
                : t(lang, '587/25: bağlantı sonrası STARTTLS.', '587/25: STARTTLS upgrade.')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={mailUi.label}>{t(lang, 'Doğrulama Yöntemi', 'Authentication')}</label>
            <FormSelect
              value={authType}
              options={[
                { value: MAIL_AUTH_SMTP_PASSWORD, label: t(lang, 'Uygulama Şifresi', 'App Password') },
                { value: MAIL_AUTH_OAUTH2, label: 'OAuth2' },
              ]}
              onChange={(next) => setAuthType(next)}
              triggerClassName="h-[30px] rounded-[2px]"
            />
          </div>

          <div>
            <label className={mailUi.label}>
              {authType === MAIL_AUTH_OAUTH2
                ? t(lang, 'OAuth2 Erişim Anahtarı', 'OAuth2 Access Token')
                : t(lang, 'Uygulama Şifresi', 'App Password')}
              {account?.hasSecret && (
                <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                  ({t(lang, 'kayıtlı — değiştirmeyecekseniz boş bırakın', 'saved — leave empty to keep')})
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={account?.hasSecret ? '••••••••••••••••' : 'xxxx xxxx xxxx xxxx'}
                className="w-full rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[var(--card)] pl-3 pr-8 py-1.5 text-xs text-[var(--fg)] focus:border-sky-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className={mailUi.hint}>{activePreset?.hint}</p>
          </div>

          <div>
            <label className={mailUi.label}>{t(lang, 'Günlük Gönderim Limiti', 'Daily Sending Limit')}</label>
            <input
              type="number"
              min={1}
              value={dailySendingLimit}
              onChange={(e) => setDailySendingLimit(Number(e.target.value))}
              className={mailUi.inputMono}
            />
            <p className={mailUi.hint}>
              {t(
                lang,
                'Sağlayıcı kotasını aşmamak için üst sınır (Gmail ~500/gün).',
                'Cap to stay under provider quota (Gmail ~500/day).'
              )}
            </p>
          </div>
        </div>

        <div className={`flex flex-wrap items-center justify-between gap-3 pt-2 border-t ${mailUi.divider}`}>
          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder={t(lang, 'Test alıcısı (boşsa kendinize)', 'Test recipient (defaults to you)')}
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="w-56 rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--fg)]"
            />
            <button
              type="button"
              disabled={testAccount.isPending || !account}
              onClick={() => testAccount.mutate()}
              className={mailUi.buttonGhost}
            >
              {testAccount.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3 text-sky-600" />
              )}
              <span>{t(lang, 'Bağlantıyı Test Et', 'Test Connection')}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {account && (
              <button
                type="button"
                disabled={disconnect.isPending}
                onClick={() => {
                  if (confirm(t(lang, 'Mail hesabı bağlantısı kaldırılsın mı?', 'Disconnect this mail account?'))) {
                    disconnect.mutate();
                  }
                }}
                className="flex items-center gap-1 rounded-[2px] border border-[#cbd5e1] dark:border-[#475569] px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
              >
                <Unlink className="h-3 w-3" />
                <span>{t(lang, 'Bağlantıyı Kaldır', 'Disconnect')}</span>
              </button>
            )}
            <button type="submit" disabled={saveAccount.isPending} className={mailUi.buttonPrimary}>
              {saveAccount.isPending ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> {t(lang, 'Kaydediliyor...', 'Saving...')}
                </span>
              ) : (
                t(lang, 'Ayarları Kaydet', 'Save Settings')
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function errorText(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function SmtpGuide({
  lang,
  onApplyPreset,
}: {
  lang: Lang;
  onApplyPreset: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gmail' | 'yandex' | 'outlook' | 'custom'>('gmail');

  return (
    <div className="rounded-[4px] border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3 text-left transition hover:bg-sky-100/40 dark:hover:bg-sky-900/30 cursor-pointer"
      >
        <div className="flex items-center gap-2 font-bold text-sky-900 dark:text-sky-200">
          <HelpCircle className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>{t(lang, 'SMTP & Uygulama Şifresi Nasıl Alınır? (Kurulum Rehberi)', 'How to get SMTP & App Password? (Setup Guide)')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
          <span>{open ? t(lang, 'Kılavuzu Kapat', 'Hide Guide') : t(lang, 'Adım Adım Gör', 'View Steps')}</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="p-3.5 pt-1 border-t border-sky-200/60 dark:border-sky-900/40 space-y-3">
          <div className="flex flex-wrap gap-1.5 border-b border-sky-200/50 dark:border-sky-900/40 pb-2">
            {[
              { id: 'gmail', label: 'Gmail / Google' },
              { id: 'yandex', label: 'Yandex / Yandex 360' },
              { id: 'outlook', label: 'Microsoft 365 / Outlook' },
              { id: 'custom', label: t(lang, 'Kurumsal Hosting / cPanel', 'Custom Hosting / cPanel') },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'gmail' | 'yandex' | 'outlook' | 'custom')}
                className={`px-2.5 py-1 rounded-[3px] font-semibold transition text-xs cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-sky-900 dark:text-sky-200 hover:bg-sky-100/70 dark:hover:bg-slate-700 border border-sky-200/70 dark:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'gmail' && (
            <div className="space-y-2 text-[12px] text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {t(
                  lang,
                  'Gmail ve kurumsal Google Workspace hesaplarında normal e-posta şifreniz güvenlik nedeniyle reddedilir. 16 haneli bir "Uygulama Şifresi" oluşturmanız gerekir:',
                  'For Gmail and Google Workspace, your regular password is blocked for security. You must generate a 16-character "App Password":'
                )}
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
                <li>
                  {t(lang, 'Google Hesabınızda ', 'In your Google Account, ensure ')}
                  <a
                    href="https://myaccount.google.com/signinoptions/two-step-verification"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-600 dark:text-sky-400 inline-flex items-center gap-0.5 hover:underline"
                  >
                    {t(lang, '2 Adımlı Doğrulama', '2-Step Verification')} <ExternalLink className="h-3 w-3 inline" />
                  </a>
                  {t(lang, '\'nın açık olduğundan emin olun.', ' is turned on.')}
                </li>
                <li>
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-600 dark:text-sky-400 inline-flex items-center gap-0.5 hover:underline"
                  >
                    myaccount.google.com/apppasswords <ExternalLink className="h-3 w-3 inline" />
                  </a>{' '}
                  {t(lang, 'sayfasına gidin.', 'page.')}
                </li>
                <li>
                  {t(
                    lang,
                    'Uygulama adı olarak "DEMO Dashboard" yazın ve "Oluştur" düğmesine basın.',
                    'Enter "DEMO Dashboard" as app name and click "Create".'
                  )}
                </li>
                <li>
                  {t(
                    lang,
                    'Ekranda açılan sarı kutucuktaki 16 haneli kodu (boşluksuz) kopyalayın ve aşağıdaki "Uygulama Şifresi" alanına yapıştırın.',
                    'Copy the 16-character code and paste it into the "App Password" field below.'
                  )}
                </li>
              </ol>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-500">Host: smtp.gmail.com · Port: 587 (STARTTLS)</span>
                <button
                  type="button"
                  onClick={() => onApplyPreset('gmail')}
                  className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                >
                  {t(lang, 'Gmail ayarlarını forma aktar →', 'Fill Gmail settings in form →')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'yandex' && (
            <div className="space-y-2 text-[12px] text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {t(
                  lang,
                  'Yandex Mail ve Yandex 360 için Uygulama Şifresi adımları:',
                  'Steps to generate App Password for Yandex Mail & Yandex 360:'
                )}
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
                <li>
                  <a
                    href="https://id.yandex.com.tr/security"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-600 dark:text-sky-400 inline-flex items-center gap-0.5 hover:underline"
                  >
                    Yandex ID Güvenlik Sayfası <ExternalLink className="h-3 w-3 inline" />
                  </a>
                  {' '}{t(lang, 'üzerine gidin.', 'go to security portal.')}
                </li>
                <li>
                  {t(lang, '"Uygulama şifreleri" bölümünü seçin ve yeni şifre ekleyin.', 'Select "App passwords" and create a new password.')}
                </li>
                <li>
                  {t(lang, 'Tür olarak "Posta (Mail)" seçin ve adı "DEMO Dashboard" verin.', 'Select "Mail" as type and name it "DEMO Dashboard".')}
                </li>
                <li>
                  {t(lang, 'Oluşturulan şifreyi kopyalayıp aşağıdaki şifre alanına girin.', 'Copy the generated password into the field below.')}
                </li>
              </ol>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-500">Host: smtp.yandex.com · Port: 465 (SSL)</span>
                <button
                  type="button"
                  onClick={() => onApplyPreset('yandex')}
                  className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                >
                  {t(lang, 'Yandex ayarlarını forma aktar →', 'Fill Yandex settings in form →')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'outlook' && (
            <div className="space-y-2 text-[12px] text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {t(
                  lang,
                  'Microsoft 365, Outlook ve Hotmail hesaplarında uygulama parolası:',
                  'App password for Microsoft 365, Outlook and Hotmail:'
                )}
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
                <li>
                  <a
                    href="https://account.microsoft.com/security"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-600 dark:text-sky-400 inline-flex items-center gap-0.5 hover:underline"
                  >
                    account.microsoft.com/security <ExternalLink className="h-3 w-3 inline" />
                  </a>
                  {' '}{t(lang, 'sayfasına gidin.', 'go to security.')}
                </li>
                <li>
                  {t(lang, 'Gelişmiş güvenlik seçenekleri > "Uygulama parolaları" > "Yeni parola oluştur" tıklayın.', 'Go to Advanced Security > "App passwords" > "Create a new app password".')}
                </li>
                <li>
                  {t(lang, 'Oluşturulan parolayı aşağıdaki alana yapıştırın.', 'Paste generated password into field below.')}
                </li>
                <li>
                  {t(lang, 'İpucu: Dilerseniz doğrudan yukarıdaki "Microsoft ile Bağlan (OAuth)" düğmesini de kullanabilirsiniz.', 'Tip: You can also just click "Connect with Microsoft (OAuth)" above.')}
                </li>
              </ol>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-500">Host: smtp.office365.com · Port: 587 (STARTTLS)</span>
                <button
                  type="button"
                  onClick={() => onApplyPreset('office365')}
                  className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                >
                  {t(lang, 'Outlook ayarlarını forma aktar →', 'Fill Outlook settings in form →')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-2 text-[12px] text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {t(
                  lang,
                  'Şirketinize ait kurumsal mail sunucuları (cPanel, Plesk, Natro, Turhost vb.):',
                  'Company-hosted mail servers (cPanel, Plesk, etc.):'
                )}
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
                <li>
                  {t(lang, 'Hosting kontrol panelinize girip E-Posta Hesapları bölümünü açın.', 'Open your hosting panel (cPanel) and visit Email Accounts.')}
                </li>
                <li>
                  {t(lang, 'E-posta adresinizi ve normal e-posta şifrenizi kullanın (uygulama şifresi gerekmez).', 'Use your email address and normal mailbox password.')}
                </li>
                <li>
                  {t(lang, 'SMTP Host genelde "mail.siteniz.com" veya sunucu adıdır.', 'SMTP Host is typically "mail.yourdomain.com" or server host.')}
                </li>
                <li>
                  {t(lang, 'Port: SSL için 465 (SSL işaretleyin) veya STARTTLS için 587.', 'Port: 465 for SSL or 587 for STARTTLS.')}
                </li>
              </ol>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onApplyPreset('custom')}
                  className="text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:underline cursor-pointer"
                >
                  {t(lang, 'Özel sunucu moduna geç →', 'Switch to custom mode →')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
