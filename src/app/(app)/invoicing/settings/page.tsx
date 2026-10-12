'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, PlugZap, Settings, Save } from 'lucide-react';
import { accountingProviderApi, type AccountingProviderType } from '../../../../lib/api/accounting-provider';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const PROVIDER_LABEL: Record<AccountingProviderType, { tr: string; en: string; desc: string }> = {
  Manual: { tr: 'Manuel / Excel Takip', en: 'Manual / Excel', desc: 'Dış muhasebe veya Excel tablosu üzerinden takip' },
  Logo: { tr: 'Logo Yazılım (Tiger / Go)', en: 'Logo Software', desc: 'Logo Objects REST & XML Veritabanı Entegrasyonu' },
  Mikro: { tr: 'Mikro Yazılım (v16 / Jump)', en: 'Mikro Software', desc: 'Mikro Veritabanı ve API Servis Köprüsü' },
  Netsis: { tr: 'Netsis (Rest API)', en: 'Netsis', desc: 'Netsis NDI & REST Entegrasyon Servisi' },
};

const PROVIDER_CREDENTIAL_FIELDS: Record<AccountingProviderType, string[]> = {
  Manual: [],
  Logo: ['Kullanıcı Adı', 'Şifre', 'Firma Kodu', 'Dönem Kodu'],
  Mikro: ['Kullanıcı Adı', 'Şifre', 'Veritabanı Sunucusu'],
  Netsis: ['Kullanıcı Adı', 'Şifre', 'Şube Kodu'],
};

export default function AccountingProviderSettingsPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const [selected, setSelected] = useState<AccountingProviderType>('Manual');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const capabilitiesQuery = useQuery({
    queryKey: ['accounting-provider', 'capabilities'],
    queryFn: () => accountingProviderApi.getCapabilities(),
  });
  const activeQuery = useQuery({
    queryKey: ['accounting-provider', 'active'],
    queryFn: () => accountingProviderApi.getActive(),
  });

  useEffect(() => {
    if (activeQuery.data) {
      setSelected(activeQuery.data.providerType);
      setApiBaseUrl(activeQuery.data.apiBaseUrl ?? '');
    }
  }, [activeQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      accountingProviderApi.upsert({
        providerType: selected,
        apiBaseUrl: apiBaseUrl.trim() || undefined,
        credentials: Object.fromEntries(Object.entries(credentials).filter(([, v]) => v.trim() !== '')),
      }),
    onSuccess: () => {
      toast.success(tr ? 'Muhasebe entegrasyon ayarları kaydedildi.' : 'Settings saved.');
      setCredentials({});
      void qc.invalidateQueries({ queryKey: ['accounting-provider'] });
    },
    onError: (e) => setError(describeError(e)),
  });

  const testConnection = useMutation({
    mutationFn: () => accountingProviderApi.testConnection(),
    onSuccess: (result) => {
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      void qc.invalidateQueries({ queryKey: ['accounting-provider'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const active = activeQuery.data;
  const capabilities = capabilitiesQuery.data ?? [];
  const credentialFields = PROVIDER_CREDENTIAL_FIELDS[selected];
  const hasCredentials = active?.providerType === selected && active.configuredCredentialKeys.length > 0;

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Sub Tab Navigation ── */}
      <InvoicingSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* Header Summary Strip */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Settings size={18} className="text-[var(--fg-muted)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">{tr ? 'Muhasebe ve Fatura Entegratör Ayarları' : 'Accounting & Invoicing Settings'}</h2>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                {tr
                  ? 'ERP fatura ve cari hareketlerinin aktarılacağı resmi muhasebe yazılımı bağlantısı.'
                  : 'Configure connector for official accounting ERP sync.'}
              </p>
            </div>
          </div>
        </div>

        {/* Supported Systems Cards */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-[var(--fg)]">{tr ? 'Desteklenen Muhasebe Sistemleri' : 'Supported Systems'}</div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {capabilities.map((c) => {
              const isSelected = selected === c.providerType;
              const meta = PROVIDER_LABEL[c.providerType];
              return (
                <div
                  key={c.providerType}
                  onClick={() => {
                    setSelected(c.providerType);
                    setCredentials({});
                  }}
                  className={`rounded-[4px] border p-3.5 shadow-xs transition cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-[var(--fg)] bg-[var(--bg-subtle)]'
                      : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--fg)]">{tr ? meta.tr : meta.en}</span>
                      {c.isConnected ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <XCircle size={14} className="text-[var(--fg-muted)]" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] mt-1">{meta.desc}</p>
                  </div>

                  <div className="flex items-center justify-between text-[10.5px] border-t border-[var(--border-soft)] pt-2">
                    <span className={c.isConnected ? 'text-emerald-500 font-semibold' : 'text-[var(--fg-muted)]'}>
                      {c.isConnected ? (tr ? 'Bağlantı Aktif' : 'Connected') : (tr ? 'Bağlı Değil' : 'Not Connected')}
                    </span>
                    {isSelected && (
                      <span className="rounded-[2px] bg-[var(--fg)] px-1.5 py-0.2 text-[9.5px] font-bold text-[var(--bg)]">
                        {tr ? 'SEÇİLİ' : 'SELECTED'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected System Configuration Workspace */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-xs space-y-4 max-w-3xl text-xs">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
            <div>
              <span className="font-bold text-sm text-[var(--fg)]">
                {tr ? `${PROVIDER_LABEL[selected]?.tr} Yapılandırması` : `${PROVIDER_LABEL[selected]?.en} Configuration`}
              </span>
              <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                {selected === 'Manual'
                  ? tr ? 'Hareketler ve faturalar panel üzerinden manuel yönetilir.' : 'Track manually.'
                  : tr ? 'API servis ve kimlik doğrulama anahtarlarını girin.' : 'Enter API credentials.'}
              </p>
            </div>

            {active?.lastConnectionTestAt && (
              <div className="text-right text-[11px]">
                <div className="text-[var(--fg-muted)]">{tr ? 'Son Test:' : 'Last Tested:'} {new Date(active.lastConnectionTestAt).toLocaleTimeString('tr-TR')}</div>
                <div className={active.lastConnectionTestSuccess ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                  {active.lastConnectionTestSuccess ? (tr ? 'Test Başarılı' : 'Success') : (tr ? 'Bağlantı Başarısız' : 'Failed')}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {selected !== 'Manual' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                  {tr ? 'API Endpoint Adresi (Host / Port)' : 'API Endpoint Address'}
                </label>
                <input
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="https://muhasebe.sirket.com:8080/api"
                  className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
                />
              </div>

              {hasCredentials && (
                <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2.5 text-[11.5px] text-[var(--fg-muted)]">
                  {tr ? '✓ Kimlik bilgileri kayıtlı. Değiştirmek istemiyorsanız aşağıdaki alanları boş bırakabilirsiniz.' : 'Credentials registered.'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {credentialFields.map((field) => (
                  <div key={field}>
                    <label className="mb-1 block text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                      {field}
                    </label>
                    <input
                      type={field.toLowerCase().includes('şifre') || field.toLowerCase().includes('password') ? 'password' : 'text'}
                      value={credentials[field] ?? ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                      placeholder={hasCredentials ? '••••••••' : field}
                      className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>{save.isPending ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Ayarları Kaydet' : 'Save Settings')}</span>
            </button>

            {selected !== 'Manual' && (
              <button
                type="button"
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
              >
                <PlugZap size={13} />
                <span>{testConnection.isPending ? (tr ? 'Test Ediliyor...' : 'Testing...') : (tr ? 'Bağlantıyı Test Et' : 'Test Connection')}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
