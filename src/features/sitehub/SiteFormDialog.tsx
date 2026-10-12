'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, Globe } from 'lucide-react';
import {
  siteHubApi, SITE_PROVIDER,
  type SiteConnectionDto, type SiteProvider, type SiteContentLanguage,
} from '../../lib/api/sitehub';
import { STOREB_ADAPTER_CONFIG, DEMO_LEVHA_ADAPTER_CONFIG,
  INTHERMFORM_ADAPTER_CONFIG, parseAdapterConfig, siteSupportsBlog, type AdapterConfig,
} from './adapter-config';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { SiteBlogSettings } from './SiteBlogSettings';

interface Props {
  site: SiteConnectionDto | null;
  onClose: () => void;
  onSaved: () => void;
}

const PROVIDER_OPTIONS = [
  { value: String(SITE_PROVIDER.Generic), label: 'Genel Eşlemeli API (Generic)' },
  { value: String(SITE_PROVIDER.AdmPlastik), label: 'ADM Plastik (Sabit API)' },
];

const KNOWN_SITES = {
  adm: {
    label: 'ADM Plastik', provider: SITE_PROVIDER.AdmPlastik, config: null as AdapterConfig | null,
    baseUrl: 'https://www.example.com/adminx/system', websiteUrl: 'www.example.com',
  },
  storeb: {
    label: 'StoreB', provider: SITE_PROVIDER.Generic, config: STOREB_ADAPTER_CONFIG as AdapterConfig | null,
    baseUrl: 'https://www.example.com', websiteUrl: 'www.example.com',
  },
  demolevha: {
    label: 'DEMO Levha', provider: SITE_PROVIDER.Generic, config: DEMO_LEVHA_ADAPTER_CONFIG as AdapterConfig | null,
    baseUrl: 'https://example.com/api', websiteUrl: 'www.example.com',
  },
  inthermform: {
    label: 'Inthermform', provider: SITE_PROVIDER.Generic, config: INTHERMFORM_ADAPTER_CONFIG as AdapterConfig | null,
    baseUrl: 'https://example.com/api.php', websiteUrl: 'example.com',
  },
} as const;
type KnownSiteKey = keyof typeof KNOWN_SITES;

const DEFAULT_PERIOD_DAYS = 30;

export function SiteFormDialog({ site, onClose, onSaved }: Props) {
  const isEdit = site !== null;

  const [provider, setProvider] = useState<SiteProvider>(site?.provider ?? SITE_PROVIDER.Generic);
  const [displayName, setDisplayName] = useState(site?.displayName ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(site?.websiteUrl ?? '');
  const [baseUrl, setBaseUrl] = useState(site?.baseUrl ?? '');
  const [storeCode, setStoreCode] = useState(site?.storeCode ?? '');
  const [contentLanguage, setContentLanguage] = useState<SiteContentLanguage>(site?.contentLanguage ?? 'tr');
  const [statsPeriodDays, setStatsPeriodDays] = useState(site?.statsPeriodDays ?? DEFAULT_PERIOD_DAYS);
  const [isActive, setIsActive] = useState(site?.isActive ?? true);
  // Yeni sitede açık gelir: bilinen şablonların hepsi blog sunuyor.
  const [supportsBlog, setSupportsBlog] = useState(site ? siteSupportsBlog(site) : true);

  const [apiKey, setApiKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);

  const [config, setConfig] = useState<AdapterConfig>(() => parseAdapterConfig(site?.adapterConfigJson));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGeneric = provider === SITE_PROVIDER.Generic;
  const [selectedKnown, setSelectedKnown] = useState<KnownSiteKey | 'other' | null>(isEdit ? 'other' : null);

  const pickKnownSite = (key: KnownSiteKey) => {
    const known = KNOWN_SITES[key];
    setProvider(known.provider);
    setBaseUrl(known.baseUrl);
    setWebsiteUrl(known.websiteUrl);
    if (known.config) setConfig(known.config);
    setSelectedKnown(key);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await siteHubApi.updateSite(site.id, {
          displayName,
          websiteUrl: websiteUrl.trim() || null,
          baseUrl,
          adapterConfigJson: isGeneric ? JSON.stringify(config) : null,
          apiKey: apiKey.trim() || null,
          storeCode: storeCode || null,
          contentLanguage, supportsBlog,
          statsPeriodDays, isActive,
          resume: apiKey.trim() !== '',
        });
      } else {
        await siteHubApi.createSite({
          provider, displayName, baseUrl,
          websiteUrl: websiteUrl.trim() || null,
          adapterConfigJson: isGeneric ? JSON.stringify(config) : null,
          apiKey: apiKey.trim(),
          storeCode: storeCode || null,
          contentLanguage, supportsBlog,
          statsPeriodDays, isActive,
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

  const canSave = displayName.trim() !== '' && baseUrl.trim() !== '' && (isEdit || apiKey.trim() !== '');

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
        className="w-full max-w-lg rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)] text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {isEdit ? `Siteyi Düzenle: ${site.displayName}` : 'Yeni Web Sitesi Bağlantısı'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!isEdit && selectedKnown === null ? (
            <div className="space-y-3">
              <label className="block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                Hangi Web Sitesini Bağlamak İstiyorsunuz?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(KNOWN_SITES) as KnownSiteKey[]).map((key) => {
                  const known = KNOWN_SITES[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => pickKnownSite(key)}
                      className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 hover:bg-[var(--bg-subtle)] hover:border-[var(--fg)] transition cursor-pointer text-left flex flex-col gap-1"
                    >
                      <span className="font-bold text-xs text-[var(--fg)]">{known.label}</span>
                      <span className="text-[10.5px] text-[var(--fg-muted)] font-mono truncate">{known.websiteUrl}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setSelectedKnown('other')}
                className="w-full p-2.5 rounded-[4px] border border-dashed border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer text-center"
              >
                + Farklı / Özel Bir Web Sitesi Bağla
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                  Sağlayıcı / API Tipi *
                </label>
                <FilterSelect
                  value={String(provider)}
                  onChange={(v) => setProvider(Number(v) as SiteProvider)}
                  placeholder="Sağlayıcı Seçin"
                  height="h-8.5"
                  options={PROVIDER_OPTIONS}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                    Görünen İsim *
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Örn: StoreB Web"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                    Web Sitesi Adresi (URL)
                  </label>
                  <input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="www.example.com"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                  API Kök Adresi (Base URL) *
                </label>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://www.example.com/api"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                  API Anahtarı (API Key / Secret) {isEdit && <span className="text-[var(--fg-muted)] font-normal">(Boş bırakılırsa korunur)</span>}
                </label>
                <div className="relative">
                  <input
                    type={keyVisible ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={isEdit ? '••••••••••••••••' : 'API anahtarını girin'}
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-2.5 pr-8 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                  <button
                    type="button"
                    onClick={() => setKeyVisible((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
                  >
                    {keyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <SiteBlogSettings
                supportsBlog={supportsBlog}
                onSupportsBlogChange={setSupportsBlog}
                contentLanguage={contentLanguage}
                onContentLanguageChange={setContentLanguage}
                config={isGeneric ? config : null}
                onConfigChange={setConfig}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                    Bağlı ERP / Mağaza Kodu (Opsiyonel)
                  </label>
                  <input
                    value={storeCode}
                    onChange={(e) => setStoreCode(e.target.value)}
                    placeholder="storeb-sentos"
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                    İstatistik Geçmişi (Gün)
                  </label>
                  <input
                    type="number"
                    min={1} max={365}
                    value={statsPeriodDays}
                    onChange={(e) => setStatsPeriodDays(Number(e.target.value))}
                    className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded-[3px]"
                />
                <span>Bağlantı Aktif (5 dakikada bir otomatik senkronize et)</span>
              </label>

              {error && (
                <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">
                  {error}
                </div>
              )}
            </>
          )}
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
          {(!isEdit && selectedKnown === null) ? null : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canSave}
              className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
