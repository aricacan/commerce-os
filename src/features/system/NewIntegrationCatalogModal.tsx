'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { integrationConnectionsApi, storeApi } from '../../lib/api';
import {
  BaseErpIcon,
  CiceksepetiIcon,
  HepsiburadaIcon,
  N11Icon,
  PazaramaIcon,
  SentosIcon,
  TrendyolIcon,
} from '../../components/ui/BrandIcons';

type IntegrationField = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  placeholder?: string;
  required?: boolean;
};

export interface IntegrationDefinition {
  id: 'sentos' | 'baselinker' | 'trendyol' | 'hepsiburada' | 'n11' | 'ciceksepeti' | 'pazarama';
  category: 'erp' | 'marketplace';
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  docsUrl: string;
  fields: IntegrationField[];
}

export const INTEGRATION_CATALOG: IntegrationDefinition[] = [
  {
    id: 'sentos',
    category: 'erp',
    name: 'Sentos ERP',
    icon: SentosIcon,
    description: 'Canlı Sentos ürün, stok, sipariş ve kategori connector’ı.',
    docsUrl: 'https://sentos.com.tr/',
    fields: [
      { key: 'baseUrl', label: 'Sentos API adresi', type: 'url', placeholder: 'https://hesap.sentos.com.tr/api', required: true },
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
    ],
  },
  {
    id: 'baselinker',
    category: 'erp',
    name: 'Base',
    icon: BaseErpIcon,
    description: 'Canlı Base ürün, stok, sipariş, kategori ve kanal connector’ı.',
    docsUrl: 'https://api.baselinker.com/',
    fields: [
      { key: 'apiToken', label: 'Base API Token', type: 'password', required: true },
      { key: 'inventoryId', label: 'Envanter ID', type: 'text', required: true },
    ],
  },
  {
    id: 'trendyol',
    category: 'marketplace',
    name: 'Trendyol',
    icon: TrendyolIcon,
    description: 'Trendyol Marketplace API ürün ve mağaza bağlantısı.',
    docsUrl: 'https://developers.trendyol.com/',
    fields: [
      { key: 'supplierId', label: 'Supplier ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
    ],
  },
  {
    id: 'hepsiburada',
    category: 'marketplace',
    name: 'Hepsiburada',
    icon: HepsiburadaIcon,
    description: 'Hepsiburada Listing API ürün ve mağaza bağlantısı.',
    docsUrl: 'https://developers.hepsiburada.com/',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'username', label: 'Servis Kullanıcı Adı', type: 'text', required: true },
      { key: 'password', label: 'Servis Şifresi', type: 'password', required: true },
    ],
  },
  {
    id: 'n11',
    category: 'marketplace',
    name: 'N11',
    icon: N11Icon,
    description: 'N11 ürün ve sipariş verilerini salt okunur keşfeder.',
    docsUrl: 'https://magazadestek.n11.com/satis-surecleri/api-dokumantasyonu-10491',
    fields: [
      { key: 'appKey', label: 'App Key', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
    ],
  },
  {
    id: 'ciceksepeti',
    category: 'marketplace',
    name: 'Çiçeksepeti',
    icon: CiceksepetiIcon,
    description: 'Çiçeksepeti ürün, sipariş ve teslimat verilerini salt okunur keşfeder.',
    docsUrl: 'https://ciceksepeti.dev/',
    fields: [
      { key: 'sellerId', label: 'Satıcı ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'integratorName', label: 'Entegratör Adı', type: 'text', placeholder: 'Opsiyonel' },
    ],
  },
  {
    id: 'pazarama',
    category: 'marketplace',
    name: 'Pazarama',
    icon: PazaramaIcon,
    description: 'Pazarama OAuth ile ürün, sipariş, marka ve kategori verilerini salt okunur keşfeder.',
    docsUrl: 'https://cdn.pazarama.com/asset/entegrasyondokumani/APIEntegrasyonDokumani18.09.2023.pdf',
    fields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
];

export function NewIntegrationCatalogModal({
  isOpen,
  onClose,
  initialCategory = 'erp',
  onIntegrationAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: 'erp' | 'marketplace';
  onIntegrationAdded?: (item: IntegrationDefinition, values: Record<string, string>) => void;
}) {
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDefinition | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [connectionAlias, setConnectionAlias] = useState('');
  const [createdConnectionId, setCreatedConnectionId] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  // Pazaryeri bağlantısı MEVCUT bir mağazaya bağlanır — Trendyol/Hepsiburada yeni bir marka
  // değil, var olan mağazanın satış kanalıdır. Backend bu alan olmadan pazaryeri bağlantısını
  // reddeder (bkz. CreateIntegrationConnectionDto.StoreId).
  const [storeId, setStoreId] = useState<number | ''>('');
  const availableIntegrations = INTEGRATION_CATALOG.filter(
    (integration) => integration.category === initialCategory,
  );
  const needsStore = initialCategory === 'marketplace';
  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: storeApi.list,
    enabled: isOpen && needsStore,
    staleTime: 5 * 60_000,
  });

  if (!isOpen) return null;

  const resetForm = () => {
    setSelectedIntegration(null);
    setFormValues({});
    setConnectionAlias('');
    setCreatedConnectionId(null);
    setTestResult(null);
    setStoreId('');
  };

  const selectIntegration = (integration: IntegrationDefinition) => {
    resetForm();
    setSelectedIntegration(integration);
  };

  const validateForm = (integration: IntegrationDefinition) => {
    if (!connectionAlias.trim()) {
      throw new Error(isEn ? 'Connection name is required.' : 'Bağlantı adı zorunludur.');
    }
    if (needsStore && storeId === '') {
      throw new Error(isEn ? 'Select the store this channel belongs to.' : 'Bu kanalın ait olduğu mağazayı seçin.');
    }
    const missingField = integration.fields.find((field) => field.required && !formValues[field.key]?.trim());
    if (missingField) {
      throw new Error(isEn ? `${missingField.label} is required.` : `${missingField.label} zorunludur.`);
    }
  };

  const createConnection = async () => {
    if (!selectedIntegration) throw new Error(isEn ? 'Select an ERP.' : 'ERP seçiniz.');
    validateForm(selectedIntegration);
    if (createdConnectionId !== null) return createdConnectionId;
    const connection = await integrationConnectionsApi.create({
      kind: selectedIntegration.category === 'erp' ? 0 : 1,
      providerKey: selectedIntegration.id,
      alias: connectionAlias.trim(),
      // ERP'de mağaza seçilmezse backend yeni bir mağaza açar (yeni ERP = yeni marka);
      // pazaryerinde ise seçim zorunludur ve mevcut mağazaya bağlanır.
      storeId: storeId === '' ? undefined : storeId,
      configValues: formValues,
    });
    setCreatedConnectionId(connection.id);
    return connection.id;
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const connectionId = await createConnection();
      const result = await integrationConnectionsApi.test(connectionId);
      if (result.success) {
        await integrationConnectionsApi.discover(connectionId);
      }
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : 'Bağlantı başarısız.' });
    } finally {
      setIsTesting(false);
    }
  };

  const saveConnection = async () => {
    if (!selectedIntegration) return;
    setIsSaving(true);
    setTestResult(null);
    try {
      await createConnection();
      onIntegrationAdded?.(selectedIntegration, formValues);
      resetForm();
      onClose();
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : 'Kayıt başarısız.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div>
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {selectedIntegration
                ? `${selectedIntegration.name} Bağlantısı`
                : initialCategory === 'erp' ? 'Yeni ERP Bağlantısı' : 'Yeni Pazaryeri Bağlantısı'}
            </h2>
            {!selectedIntegration && <p className="mt-0.5 text-[10.5px] text-[var(--fg-muted)]">Yalnızca canlı connector’ı bulunan sistemler gösterilir.</p>}
          </div>
          <button type="button" onClick={() => (selectedIntegration ? resetForm() : onClose())} className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--border-soft)] text-[var(--fg-muted)] hover:text-[var(--fg)]">
            <X size={14} />
          </button>
        </header>

        {!selectedIntegration ? (
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {availableIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <button key={integration.id} type="button" onClick={() => selectIntegration(integration)} className="flex items-center gap-4 rounded-[4px] border border-[var(--border-soft)] p-4 text-left hover:border-[var(--border)] hover:bg-[var(--bg-subtle)]/40">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]"><Icon size={23} /></span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{integration.name}</span>
                    <span className="mt-1 block text-[11px] text-[var(--fg-muted)]">{integration.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-5 overflow-y-auto p-5">
            <div className="flex items-start gap-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]"><selectedIntegration.icon size={23} /></span>
              <div>
                <p className="text-sm font-bold">{selectedIntegration.name}</p>
                <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{selectedIntegration.description}</p>
                <a href={selectedIntegration.docsUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline">API dokümantasyonu <ExternalLink size={10} /></a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="text-xs font-bold">Bağlantı adı <span className="text-rose-500">*</span></span>
                <input value={connectionAlias} onChange={(event) => setConnectionAlias(event.target.value)} disabled={createdConnectionId !== null} placeholder="Örnek: Deneme" className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none disabled:opacity-60" />
                <span className="text-[10.5px] text-[var(--fg-muted)]">Görünüm: {selectedIntegration.name.replace(' ERP', '')}-{connectionAlias.trim() || 'İsim'}</span>
              </label>
              {needsStore && (
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-bold">Mağaza <span className="text-rose-500">*</span></span>
                  <select
                    value={storeId}
                    onChange={(event) => setStoreId(event.target.value === '' ? '' : Number(event.target.value))}
                    disabled={createdConnectionId !== null}
                    className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none disabled:opacity-60"
                  >
                    <option value="">Seçin…</option>
                    {(storesQuery.data ?? []).filter((store) => store.isActive).map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                  <span className="text-[10.5px] text-[var(--fg-muted)]">
                    Bu pazaryeri hesabı hangi mağazanın satış kanalı? Siparişleri ve sayaçları bu mağazaya yazılır.
                  </span>
                </label>
              )}
              {selectedIntegration.fields.map((field) => (
                <label key={field.key} className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold">{field.label} {field.required && <span className="text-rose-500">*</span>}</span>
                  <input type={field.type} value={formValues[field.key] ?? ''} onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))} disabled={createdConnectionId !== null} placeholder={field.placeholder} className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs outline-none disabled:opacity-60" />
                </label>
              ))}
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 rounded-[4px] border p-3 text-xs font-semibold ${testResult.success ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' : 'border-rose-500/20 bg-rose-500/5 text-rose-500'}`}>
                {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}{testResult.message}
              </div>
            )}

            <footer className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
              <button type="button" onClick={resetForm} className="h-8 rounded-[4px] border border-[var(--border)] px-3 text-xs font-semibold">Geri</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => void testConnection()} disabled={isTesting || isSaving} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] px-3 text-xs font-bold disabled:opacity-50">
                  {isTesting && <Loader2 size={12} className="animate-spin" />}Bağlantıyı Test Et
                </button>
                <button type="button" onClick={() => void saveConnection()} disabled={isTesting || isSaving} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-50">
                  {isSaving && <Loader2 size={12} className="animate-spin" />}Kaydet
                </button>
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
