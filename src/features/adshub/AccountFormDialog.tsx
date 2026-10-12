'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Megaphone, Globe2, Music2, Link2 } from 'lucide-react';
import {
  adsHubApi, AD_PLATFORM, type AdAccountDto, type AdPlatform,
} from '../../lib/api/adshub';
import type { PendingAdsHubOAuthSession } from '../../stores/workspace-panel';
import type { ErpSourceCode } from '../../stores/store-selector';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { ErpSourceFilterBar } from './ErpSourceFilterBar';

interface Props {
  account: AdAccountDto | null;
  oauthSession?: PendingAdsHubOAuthSession | null;
  onClose: () => void;
  onSaved: () => void;
}

const PLATFORM_OPTIONS: { value: AdPlatform; label: string; live: boolean }[] = [
  { value: AD_PLATFORM.Meta, label: 'Meta (Facebook / Instagram)', live: true },
  { value: AD_PLATFORM.Google, label: 'Google Ads', live: true },
  { value: AD_PLATFORM.TikTok, label: 'TikTok Ads', live: false },
];

const MIN_BACKFILL_DAYS = 7;
const MAX_BACKFILL_DAYS = 730;
const DEFAULT_BACKFILL_DAYS = 90;

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={visible ? 'text' : 'password'}
          autoComplete="off"
          placeholder={placeholder}
          className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-2.5 pr-8 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
        >
          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      {hint && <div className="text-[10.5px] text-[var(--fg-muted)] mt-1">{hint}</div>}
    </div>
  );
}

function ConnectButton({
  Icon,
  label,
  onClick,
}: {
  Icon: typeof Megaphone;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--fg)] transition cursor-pointer"
    >
      <Icon size={14} className="text-[var(--fg-muted)]" />
      <span>{label}</span>
    </button>
  );
}

export function AccountFormDialog({ account, oauthSession = null, onClose, onSaved }: Props) {
  const isEdit = account !== null;
  const isOAuthMode = oauthSession !== null;

  // OAuth başlatma: state önce oturumdaki kullanıcıya bağlanır (bearer'lı istek),
  // ardından dönen consent URL'ine tam sayfa yönlenilir.
  const [oauthStartError, setOauthStartError] = useState<string | null>(null);
  const startOAuth = async (target: AdPlatform) => {
    setOauthStartError(null);
    try {
      const { url } = await adsHubApi.startOAuth(target);
      window.location.href = url;
    } catch (error) {
      setOauthStartError(error instanceof Error ? error.message : 'Bağlantı başlatılamadı.');
    }
  };

  const sessionQuery = useQuery({
    queryKey: ['adshub', 'oauth-session', oauthSession?.sessionId],
    queryFn: () => adsHubApi.getOAuthSession(oauthSession!.sessionId),
    enabled: isOAuthMode,
    retry: false,
  });
  const [selectedOAuthAccountId, setSelectedOAuthAccountId] = useState('');

  const [platform, setPlatform] = useState<AdPlatform>(account?.platform ?? oauthSession?.platform ?? AD_PLATFORM.Meta);
  const [externalAccountId, setExternalAccountId] = useState(account?.externalAccountId ?? '');
  const [displayName, setDisplayName] = useState(account?.displayName ?? '');
  const [erpSourceCodes, setErpSourceCodes] = useState<ErpSourceCode[]>(account?.erpSourceCodes ?? []);
  const [backfillDays, setBackfillDays] = useState(account?.backfillDays ?? DEFAULT_BACKFILL_DAYS);
  const [isActive, setIsActive] = useState(account?.isActive ?? true);

  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [developerToken, setDeveloperToken] = useState('');
  const [loginCustomerId, setLoginCustomerId] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMeta = platform === AD_PLATFORM.Meta;
  const isGoogle = platform === AD_PLATFORM.Google;
  const isTikTok = platform === AD_PLATFORM.TikTok;
  const platformMeta = PLATFORM_OPTIONS.find((p) => p.value === platform);

  const sessionAccounts = sessionQuery.data?.accounts ?? [];

  useEffect(() => {
    if (isOAuthMode && sessionAccounts.length > 0 && selectedOAuthAccountId === '') {
      const firstSelectable = sessionAccounts.find((a) => !a.isManagerAccount) ?? sessionAccounts[0];
      setSelectedOAuthAccountId(firstSelectable.externalAccountId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOAuthMode, sessionAccounts]);

  const selectedOAuthAccount = sessionAccounts.find((a) => a.externalAccountId === selectedOAuthAccountId) ?? null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isOAuthMode) {
        if (!oauthSession || !selectedOAuthAccountId) throw new Error('Bir hesap seçilmedi.');
        await adsHubApi.completeOAuthSession(oauthSession.sessionId, {
          externalAccountId: selectedOAuthAccountId,
          displayName: displayName.trim() || null,
          erpSourceCodes,
          backfillDays,
          isActive,
        });
        onSaved();
        onClose();
        return;
      }

      const credentialsPayload = {
        accessToken: accessToken.trim() || null,
        refreshToken: refreshToken.trim() || null,
        clientId: clientId.trim() || null,
        clientSecret: clientSecret.trim() || null,
        developerToken: developerToken.trim() || null,
        loginCustomerId: loginCustomerId.trim() || null,
        appId: appId.trim() || null,
        appSecret: appSecret.trim() || null,
      };

      if (isEdit) {
        await adsHubApi.updateAccount(account.id, {
          displayName: displayName.trim() || null,
          erpSourceCodes,
          backfillDays,
          isActive,
          resume: accessToken.trim() !== '' || refreshToken.trim() !== '',
          ...credentialsPayload,
        });
      } else {
        await adsHubApi.createAccount({
          platform,
          externalAccountId: externalAccountId.trim(),
          displayName: displayName.trim() || null,
          erpSourceCodes,
          backfillDays,
          isActive,
          ...credentialsPayload,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const credentialsFilled = isMeta
    ? accessToken.trim() !== ''
    : isTikTok
      ? accessToken.trim() !== '' && appId.trim() !== '' && appSecret.trim() !== ''
      : refreshToken.trim() !== '' && developerToken.trim() !== '';

  const canSave = isOAuthMode
    ? selectedOAuthAccountId !== '' && !sessionQuery.isLoading && !sessionQuery.isError
    : isEdit
      ? true
      : externalAccountId.trim() !== '' && credentialsFilled;

  if (typeof document === 'undefined') return null;

  // z-[40000] = layers.modal (features/shared/design.ts): modül tam ekran katmanı (20000) üstünde
  // kalmalı; z-50 iken pencere arkada açılıyor ve tıklanamıyordu.
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[40000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-[var(--fg-muted)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">
                {isEdit ? 'Reklam Hesabını Düzenle' : isOAuthMode ? 'Bağlanacak Hesabı Seç' : 'Yeni Reklam Hesabı Bağla'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {!isEdit && !isOAuthMode && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <ConnectButton
                  Icon={Megaphone}
                  label="Meta ile Bağlan"
                  onClick={() => { void startOAuth(AD_PLATFORM.Meta); }}
                />
                <ConnectButton
                  Icon={Globe2}
                  label="Google Ads ile"
                  onClick={() => { void startOAuth(AD_PLATFORM.Google); }}
                />
                <ConnectButton
                  Icon={Music2}
                  label="TikTok ile"
                  onClick={() => { void startOAuth(AD_PLATFORM.TikTok); }}
                />
              </div>
              {oauthStartError && (
                <p className="text-[11px] text-[var(--danger)]">{oauthStartError}</p>
              )}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[var(--border-soft)]"></div>
                <span className="flex-shrink mx-3 text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Veya Manuel API Girişi</span>
                <div className="flex-grow border-t border-[var(--border-soft)]"></div>
              </div>
            </div>
          )}

          {isOAuthMode && (
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                Bağlanacak Hesap
              </label>
              {sessionQuery.isLoading && <div className="text-xs text-[var(--fg-muted)] py-2">Hesap listesi yükleniyor…</div>}
              {sessionQuery.isError && (
                <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">
                  Oturum bulunamadı ya da süresi doldu — pencereyi kapatıp bağlantıyı yeniden başlatın.
                </div>
              )}
              {sessionAccounts.length > 0 && (
                <FilterSelect
                  value={selectedOAuthAccountId}
                  onChange={(v) => setSelectedOAuthAccountId(v)}
                  placeholder="Hesap Seçin"
                  height="h-8.5"
                  options={sessionAccounts.map((a) => ({
                    value: a.externalAccountId,
                    label: `${a.displayName} (${a.externalAccountId})`,
                    sublabel: a.currencyCode || undefined,
                  }))}
                />
              )}
            </div>
          )}

          {!isEdit && !isOAuthMode && (
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                Platform
              </label>
              <FilterSelect
                value={String(platform)}
                onChange={(v) => setPlatform(Number(v) as AdPlatform)}
                placeholder="Platform Seçin"
                height="h-8.5"
                options={PLATFORM_OPTIONS.map((o) => ({
                  value: String(o.value),
                  label: o.label,
                  sublabel: o.live ? undefined : 'yakında',
                }))}
              />
              {platformMeta && !platformMeta.live && (
                <div className="text-[10.5px] text-amber-500 mt-1">
                  Seçilen platform henüz canlı kimlik bilgisiyle doğrulanmadı — hesap kaydedilebilir fakat veri akışı adaptör açılınca başlayacaktır.
                </div>
              )}
            </div>
          )}

          {isEdit && (
            <div className="flex items-center justify-between p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40">
              <span className="font-bold text-xs text-[var(--fg)]">{account.displayName}</span>
              <span className="font-mono text-xs text-[var(--fg-muted)]">
                {account.externalAccountId} • {account.currencyCode}
              </span>
            </div>
          )}

          {!isEdit && !isOAuthMode && (
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {isMeta ? 'Reklam Hesabı ID (act_...)' : isTikTok ? 'Reklamveren ID' : 'Müşteri ID'}
              </label>
              <input
                value={externalAccountId}
                onChange={(e) => setExternalAccountId(e.target.value)}
                placeholder={isMeta ? 'act_123456789 veya 123456789' : isTikTok ? '7123456789012345678' : '123-456-7890'}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              Görünen Hesap Adı
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={selectedOAuthAccount?.displayName || 'StoreB Car Parts UK'}
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          {isMeta && !isOAuthMode && (
            <SecretField
              label={`Erişim Jetonu (System User Token) ${isEdit ? '— boş bırakılırsa değişmez' : ''}`}
              value={accessToken}
              onChange={setAccessToken}
              placeholder={isEdit && account.hasCredentials ? '••••••••••••' : 'EAAG...'}
              hint="Business Manager → Sistem Kullanıcıları'ndan üretilir (ads_read izniyle)."
            />
          )}

          {isTikTok && !isOAuthMode && (
            <>
              <SecretField
                label={`Erişim Jetonu (Access Token) ${isEdit ? '— boş bırakılırsa değişmez' : ''}`}
                value={accessToken}
                onChange={setAccessToken}
                placeholder={isEdit && account.hasCredentials ? '••••••••••••' : 'act.example...'}
              />
              <div className="grid grid-cols-2 gap-3">
                <SecretField label="App ID" value={appId} onChange={setAppId} placeholder="712345..." />
                <SecretField label="App Secret" value={appSecret} onChange={setAppSecret} />
              </div>
            </>
          )}

          {isGoogle && !isOAuthMode && (
            <>
              <SecretField
                label={`Refresh Token ${isEdit ? '— boş bırakılırsa değişmez' : ''}`}
                value={refreshToken}
                onChange={setRefreshToken}
                placeholder={isEdit && account.hasCredentials ? '••••••••••••' : '1//0g...'}
              />
              <div className="grid grid-cols-2 gap-3">
                <SecretField label="Client ID" value={clientId} onChange={setClientId} placeholder="xxx.apps..." />
                <SecretField label="Client Secret" value={clientSecret} onChange={setClientSecret} placeholder="GOCSPX-..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SecretField label="Developer Token" value={developerToken} onChange={setDeveloperToken} />
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                    Yönetici (MCC) ID
                  </label>
                  <input
                    value={loginCustomerId}
                    onChange={(e) => setLoginCustomerId(e.target.value)}
                    placeholder="123-456-7890"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              Eşleşen ERP Kaynakları (Opsiyonel)
            </label>
            <ErpSourceFilterBar selected={erpSourceCodes} onChange={setErpSourceCodes} />
          </div>

          {!isEdit && (
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                Geçmiş Veri Senkronizasyonu (Gün)
              </label>
              <input
                type="number"
                min={MIN_BACKFILL_DAYS}
                max={MAX_BACKFILL_DAYS}
                value={backfillDays}
                onChange={(e) => setBackfillDays(Number(e.target.value))}
                className="h-8.5 w-32 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)] cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded-[3px]"
            />
            <span>Aktif Hesap (Otomatik periyodik senkrona dahil edilsin)</span>
          </label>

          {error && <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">{error}</div>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canSave}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
