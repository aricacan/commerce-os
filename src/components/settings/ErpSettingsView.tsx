'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, PlugZap, Server } from 'lucide-react';
import { erpIntegrationApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { ErpDataSourceInfo } from '../../types/api';
import { BaseChannelMappingView } from './BaseChannelMappingView';
import { ErpCompanyNamesCard } from './ErpCompanyNamesCard';

const EMPTY_STORES: Awaited<ReturnType<typeof erpIntegrationApi.list>> = [];
const EMPTY_TYPES: Awaited<ReturnType<typeof erpIntegrationApi.connectorTypes>> = [];

export function ErpSettingsView() {
  const { lang, t } = useI18n();
  const queryClient = useQueryClient();

  const { data: storesData, isLoading: loadingStores } = useQuery({
    queryKey: ['erp-integrations'],
    queryFn: erpIntegrationApi.list,
  });
  const stores = storesData ?? EMPTY_STORES;

  const { data: typesData } = useQuery({
    queryKey: ['erp-connector-types'],
    queryFn: erpIntegrationApi.connectorTypes,
  });
  const connectorTypes = typesData ?? EMPTY_TYPES;

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  useEffect(() => {
    if (stores.length > 0 && selectedStoreId === null) setSelectedStoreId(stores[0].storeId);
  }, [stores, selectedStoreId]);

  useEffect(() => {
    if (connectorTypes.length > 0 && selectedType === null) setSelectedType(connectorTypes[0].type);
  }, [connectorTypes, selectedType]);

  const activeTypeSchema = connectorTypes.find((c) => c.type === selectedType);

  const saveMutation = useMutation({
    meta: { successMessage: 'ERP ayarları kaydedildi' } as const,
    mutationFn: erpIntegrationApi.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-integrations'] });
      setStatusMsg({ text: lang === 'tr' ? 'ERP bağlantısı kaydedildi.' : 'ERP connection saved.', ok: true });
      setValues({});
      setCode('');
      setTimeout(() => setStatusMsg(null), 3000);
    },
    onError: (err: unknown) => {
      setStatusMsg({ text: (lang === 'tr' ? 'Kaydetme başarısız: ' : 'Save failed: ') + (err instanceof Error ? err.message : String(err)), ok: false });
    },
  });

  const testMutation = useMutation({
    meta: { successMessage: 'Bağlantı testi başarılı' } as const,
    mutationFn: (dataSourceId: number) => erpIntegrationApi.test(dataSourceId),
    onSuccess: (result) => {
      setStatusMsg({ text: result.message, ok: result.success });
      setTimeout(() => setStatusMsg(null), 5000);
    },
    onSettled: () => setTestingId(null),
  });

  const handleSave = () => {
    if (selectedStoreId === null || selectedType === null || !code.trim()) return;
    saveMutation.mutate({ storeId: selectedStoreId, connectorType: selectedType, code: code.trim(), configValues: values });
  };

  const handleTest = (ds: ErpDataSourceInfo) => {
    setTestingId(ds.dataSourceId);
    testMutation.mutate(ds.dataSourceId);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, height: '100%', overflowY: 'auto' }}>
      <style>{`
        .erp-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.65fr);
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 980px) {
          .erp-layout { grid-template-columns: 1fr; }
        }
        .erp-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: var(--shadow-sm);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .erp-card:hover {
          border-color: var(--fg-subtle);
          box-shadow: var(--shadow-md);
        }
        .erp-select, .erp-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--fg);
          font-size: 13.5px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
          width: 100%;
        }
        .erp-select:focus, .erp-input:focus {
          border-color: #e52521;
          box-shadow: 0 0 0 3px rgba(229,37,33,0.1);
        }
        .btn-test {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 10px;
          border: 1px solid var(--border-soft);
          background: var(--bg-subtle);
          color: var(--fg);
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-test:hover:not(:disabled) {
          background: var(--border-soft);
          color: var(--fg);
          border-color: var(--fg-subtle);
        }
      `}</style>

      {statusMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: statusMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: statusMsg.ok ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${statusMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          animation: 'fadeIn 0.2s ease',
        }}>
          {statusMsg.text}
        </div>
      )}

      <div className="erp-layout">
      {/* Mevcut bağlantılar */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
          {lang === 'tr' ? 'ERP Bağlantıları' : 'ERP Connections'}
        </h3>

        {loadingStores ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)', padding: 24 }}>
            <Loader2 className="animate-spin" size={20} />
            <span>{t('loading')}</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {stores.flatMap((store) =>
              store.dataSources.length > 0
                ? store.dataSources.map((ds) => (
                    <div key={ds.dataSourceId} className="erp-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0
                        }}>
                          <Server size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)', display: 'block' }}>{store.storeName}</span>
                          <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {connectorTypes.find((c) => c.type === ds.connectorType)?.displayName ?? ds.connectorType} · {ds.code}
                          </span>
                        </div>
                      </div>
                      {/* UC DURUM, UC AYRI RENK. Onceden ikisi vardi ve ucuncusu (kayit VAR
                          ama COZULEMIYOR) "Yapilandirilmadi" gibi gorunuyordu: kullanici
                          baglantiyi kurulmamis sanip yeniden kuruyor, asil sorun (degismis
                          sifreleme anahtari) hic gorulmuyordu. */}
                      {ds.configValues?.__error ? (
                        <span
                          title={ds.configValues.__error}
                          style={{
                            fontSize: 10.5, fontWeight: 700, alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 999,
                            background: 'rgba(244,63,94,0.12)', color: 'var(--danger)', border: 'none',
                          }}
                        >
                          {lang === 'tr' ? 'Kimlik bilgisi okunamıyor' : 'Credential unreadable'}
                        </span>
                      ) : (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, alignSelf: 'flex-start', padding: '3px 10px', borderRadius: 999,
                        background: ds.hasCredential ? 'rgba(16,185,129,0.12)' : 'var(--bg-subtle)',
                        color: ds.hasCredential ? 'var(--success)' : 'var(--fg-muted)',
                        border: ds.hasCredential ? 'none' : '1px solid var(--border)',
                      }}>
                        {ds.hasCredential ? (lang === 'tr' ? 'Yapılandırıldı' : 'Configured') : (lang === 'tr' ? 'Yapılandırılmadı' : 'Not configured')}
                      </span>
                      )}
                      <button
                        onClick={() => handleTest(ds)}
                        disabled={testingId === ds.dataSourceId}
                        className="btn-test"
                      >
                        {testingId === ds.dataSourceId ? <Loader2 className="animate-spin" size={13} /> : <PlugZap size={13} />}
                        {lang === 'tr' ? 'Bağlantıyı Test Et' : 'Test Connection'}
                      </button>
                    </div>
                  ))
                : [
                    <div key={`no-erp-${store.storeId}`} className="erp-card" style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
                          <Server size={14} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--fg)' }}>{store.storeName}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                        {lang === 'tr' ? 'ERP bağlantısı yok — aşağıdan ekle.' : 'No ERP connection — add one below.'}
                      </span>
                    </div>,
                  ],
            )}
            {stores.length === 0 && (
              <p style={{ fontSize: 13.5, color: 'var(--fg-muted)', padding: 12 }}>
                {lang === 'tr' ? 'Henüz hiç ERP bağlantısı yok.' : 'No ERP connections yet.'}
              </p>
            )}
          </div>
        )}
      </div>

      <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Yeni bağlantı ekle / güncelle */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 14, boxShadow: 'var(--shadow-sm)',
      }}>
        <h3 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--fg)', margin: '0 0 4px 0', borderBottom: '1px solid var(--border-soft)', paddingBottom: 12 }}>
          {lang === 'tr' ? 'Mağaza / ERP Aç' : 'Open Store / ERP'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {lang === 'tr' ? 'Mağaza' : 'Store'}
          </label>
          <select
            value={selectedStoreId ?? ''}
            onChange={(e) => setSelectedStoreId(Number(e.target.value))}
            className="erp-select"
          >
            {stores.map((s) => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {lang === 'tr' ? 'ERP Tipi' : 'ERP Type'}
          </label>
          <select
            value={selectedType ?? ''}
            onChange={(e) => { setSelectedType(Number(e.target.value)); setValues({}); }}
            className="erp-select"
          >
            {connectorTypes.map((c) => <option key={c.type} value={c.type}>{c.displayName}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {lang === 'tr' ? 'Hesap Kodu' : 'Account Code'}
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={lang === 'tr' ? 'örn. storeb' : 'e.g. storeb'}
            className="erp-input"
          />
        </div>

        {activeTypeSchema?.configFields.map((field) => (
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {field.label}
            </label>
            <input
              type={field.secret ? 'password' : 'text'}
              value={values[field.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.default}
              className="erp-input"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saveMutation.isPending || !code.trim()}
          style={{
            marginTop: 10, height: 42, borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #e52521, #c01f1b)',
            boxShadow: '0 2px 10px rgba(229,37,33,0.25)',
            color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {saveMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          {lang === 'tr' ? 'Kaydet' : 'Save'}
        </button>
      </div>
      <ErpCompanyNamesCard />
      </aside>
      </div>
      <BaseChannelMappingView embedded />
    </div>
  );
}
