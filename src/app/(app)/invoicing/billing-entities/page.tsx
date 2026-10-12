'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Plus, Building2, Trash2, Pencil, Upload, CheckCircle2, XCircle, PlugZap, FileText, ChevronDown, ChevronUp, FileDown, RefreshCw } from 'lucide-react';
import { billingEntityApi, type BillingEntity } from '../../../../lib/api/billing-entity';
import { einvoiceProviderApi, type EInvoiceProviderType } from '../../../../lib/api/einvoice-provider';
import { BillingEntityFormDialog } from '../../../../features/invoicing/BillingEntityFormDialog';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../../lib/export';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const EINVOICE_PROVIDER_LABEL: Record<EInvoiceProviderType, string> = {
  Manual: 'Manuel Takip (Dış Program)',
  Foriba: 'Foriba (Sovos)',
  Uyumsoft: 'Uyumsoft',
  Efinans: 'eFinans',
  Logo: 'Logo Yazılım',
};

const EINVOICE_CREDENTIAL_FIELDS: Record<EInvoiceProviderType, string[]> = {
  Manual: [],
  Foriba: ['Kullanıcı Adı', 'Şifre'],
  Uyumsoft: ['Kullanıcı Adı', 'Şifre'],
  Efinans: ['Kullanıcı Adı', 'Şifre'],
  Logo: ['Kullanıcı Adı', 'Şifre', 'Firma Kodu'],
};

function EInvoiceProviderPanel({ billingEntityId }: { billingEntityId: number }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();
  const [selected, setSelected] = useState<EInvoiceProviderType>('Manual');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  const activeQuery = useQuery({
    queryKey: ['einvoice-provider', 'active', billingEntityId],
    queryFn: () => einvoiceProviderApi.getActive(billingEntityId),
  });

  const active = activeQuery.data;
  const initializedForEntityId = useRef<number | null>(null);

  useEffect(() => {
    if (active && initializedForEntityId.current !== billingEntityId) {
      initializedForEntityId.current = billingEntityId;
      setSelected(active.providerType);
      setApiBaseUrl(active.apiBaseUrl ?? '');
    }
  }, [active, billingEntityId]);

  const save = useMutation({
    mutationFn: () =>
      einvoiceProviderApi.upsert(billingEntityId, {
        providerType: selected,
        apiBaseUrl: apiBaseUrl.trim() || undefined,
        credentials: Object.fromEntries(Object.entries(credentials).filter(([, v]) => v.trim() !== '')),
      }),
    onSuccess: () => {
      toast.success(tr ? 'e-Fatura sağlayıcı ayarları kaydedildi.' : 'Provider settings saved.');
      setCredentials({});
      void qc.invalidateQueries({ queryKey: ['einvoice-provider', 'active', billingEntityId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const testConnection = useMutation({
    mutationFn: () => einvoiceProviderApi.testConnection(billingEntityId),
    onSuccess: (result) => {
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      void qc.invalidateQueries({ queryKey: ['einvoice-provider', 'active', billingEntityId] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const credentialFields = EINVOICE_CREDENTIAL_FIELDS[selected];
  const hasCredentials = active?.providerType === selected && active.configuredCredentialKeys.length > 0;

  return (
    <div className="space-y-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3.5 text-xs">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
        <span className="font-bold text-[var(--fg)]">{tr ? 'e-Fatura / e-Arşiv Entegrasyon Sağlayıcısı' : 'e-Invoice Provider'}</span>
        <div className="flex items-center gap-1 text-[11px] font-semibold">
          {active?.lastConnectionTestSuccess ? (
            <span className="inline-flex items-center gap-1 text-emerald-500">
              <CheckCircle2 size={13} /> {tr ? 'Bağlantı Başarılı' : 'Connected'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[var(--fg-muted)]">
              <XCircle size={13} /> {tr ? 'Bağlı Değil' : 'Not Connected'}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'Sağlayıcı Entegratör' : 'Provider'}</label>
          <FilterSelect
            value={selected}
            onChange={(v) => {
              setSelected((v || 'Manual') as EInvoiceProviderType);
              setCredentials({});
            }}
            placeholder="Manuel Takip"
            height="h-8"
            options={(Object.keys(EINVOICE_PROVIDER_LABEL) as EInvoiceProviderType[]).map((p) => ({
              value: p,
              label: EINVOICE_PROVIDER_LABEL[p],
            }))}
          />
        </div>

        {selected !== 'Manual' && (
          <>
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{tr ? 'API Endpoint Adresi (Opsiyonel)' : 'API Endpoint (Optional)'}</label>
              <input
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://efatura.entegrator.com/api"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none"
              />
            </div>

            {hasCredentials && (
              <div className="text-[11px] text-[var(--fg-muted)]">
                {tr ? 'Kimlik bilgisi kayıtlı — güncellemek için yeni değer girin.' : 'Credentials registered.'}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {credentialFields.map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)]">{field}</label>
                  <input
                    type={field.toLowerCase().includes('şifre') || field.toLowerCase().includes('password') ? 'password' : 'text'}
                    value={credentials[field] ?? ''}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, [field]: e.target.value }))}
                    placeholder={hasCredentials ? `${field} (••••••••)` : field}
                    className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-soft)]">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex h-7.5 items-center rounded-[3px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
        >
          {save.isPending ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Ayarları Kaydet' : 'Save')}
        </button>

        {selected !== 'Manual' && (
          <button
            type="button"
            onClick={() => testConnection.mutate()}
            disabled={testConnection.isPending}
            className="inline-flex h-7.5 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
          >
            <PlugZap size={12} />
            <span>{testConnection.isPending ? (tr ? 'Test ediliyor...' : 'Testing...') : (tr ? 'Bağlantıyı Test Et' : 'Test Connection')}</span>
          </button>
        )}
      </div>

      {active?.lastConnectionTestAt && (
        <div className="text-[10.5px] text-[var(--fg-muted)]">
          {tr ? 'Son test:' : 'Last tested:'} {new Date(active.lastConnectionTestAt).toLocaleString('tr-TR')} —{' '}
          {active.lastConnectionTestSuccess ? (
            <span className="text-emerald-500 font-semibold">{tr ? 'Başarılı' : 'Success'}</span>
          ) : (
            <span className="text-rose-500 font-semibold">{tr ? 'Başarısız' : 'Failed'} ({active.lastConnectionTestError})</span>
          )}
        </div>
      )}
    </div>
  );
}

function DocumentsPanel({ entity }: { entity: BillingEntity }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState('Vergi Levhası');

  const upload = useMutation({
    mutationFn: (file: File) => billingEntityApi.uploadDocument(entity.id, documentType, file),
    onSuccess: () => {
      toast.success(tr ? 'Belge yüklendi.' : 'Document uploaded.');
      void qc.invalidateQueries({ queryKey: ['billing-entities'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const remove = useMutation({
    mutationFn: (documentId: number) => billingEntityApi.deleteDocument(entity.id, documentId),
    onSuccess: () => {
      toast.success(tr ? 'Belge silindi.' : 'Document deleted.');
      void qc.invalidateQueries({ queryKey: ['billing-entities'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  return (
    <div className="space-y-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3.5 text-xs">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
        <span className="font-bold text-[var(--fg)]">{tr ? 'Kurumsal Belgeler & Evraklar' : 'Documents'}</span>
        <span className="text-[11px] text-[var(--fg-muted)]">{entity.documents.length} {tr ? 'belge' : 'files'}</span>
      </div>

      {entity.documents.length === 0 ? (
        <div className="py-4 text-center text-xs text-[var(--fg-muted)]">
          {tr ? 'Henüz yüklenmiş resmi evrak bulunmuyor.' : 'No documents uploaded yet.'}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {entity.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] p-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <FileText size={13} className="text-[var(--fg-muted)] shrink-0" />
                <span className="font-semibold text-[var(--fg)]">{doc.documentType}:</span>
                <span className="text-[var(--fg-muted)] truncate">{doc.fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => remove.mutate(doc.id)}
                className="flex h-6 w-6 items-center justify-center rounded-[2px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-soft)]">
        <FilterSelect
          value={documentType}
          onChange={(v) => setDocumentType(v || 'Vergi Levhası')}
          placeholder="Vergi Levhası"
          minWidth={170}
          height="h-8"
          options={[
            { value: 'Vergi Levhası', label: 'Vergi Levhası' },
            { value: 'İmza Sirküleri', label: 'İmza Sirküleri' },
            { value: 'Faaliyet Belgesi', label: 'Faaliyet Belgesi' },
            { value: 'Ticaret Sicil Gazetesi', label: 'Ticaret Sicil Gazetesi' },
            { value: 'Diğer', label: 'Diğer' },
          ]}
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
        >
          <Upload size={12} />
          <span>{upload.isPending ? (tr ? 'Yükleniyor...' : 'Uploading...') : (tr ? 'Belge Yükle' : 'Upload')}</span>
        </button>
      </div>
    </div>
  );
}

function BillingEntityCard({ entity, onEdit, onDeleted }: { entity: BillingEntity; onEdit: () => void; onDeleted: () => void }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const remove = useMutation({
    mutationFn: () => billingEntityApi.remove(entity.id),
    onSuccess: () => {
      toast.success(tr ? 'Tüzel kişilik silindi.' : 'Billing entity deleted.');
      onDeleted();
      void qc.invalidateQueries({ queryKey: ['billing-entities'] });
    },
    onError: (e) => toast.error(describeError(e)),
  });

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[var(--bg-subtle)] text-[var(--fg)] shrink-0">
            <Building2 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--fg)]">{entity.legalName}</h3>
              {entity.isActive && (
                <span className="rounded-[2px] border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-500">
                  {tr ? 'AKTİF' : 'ACTIVE'}
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--fg-muted)] mt-0.5">
              VKN: <span className="font-mono font-semibold text-[var(--fg)]">{entity.taxNumber}</span>
              {entity.taxOffice && ` • ${entity.taxOffice}`}
              {entity.city && ` • ${entity.city}`}
            </div>
            {entity.storeCodes.length > 0 && (
              <div className="text-[11px] text-[var(--fg-muted)] mt-1">
                {tr ? 'Bağlı Mağazalar:' : 'Assigned Stores:'} <span className="font-semibold text-[var(--fg)]">{entity.storeCodes.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            type="button"
            onClick={onEdit}
            title={tr ? 'Düzenle' : 'Edit'}
            className="flex h-7.5 w-7.5 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(tr ? `"${entity.legalName}" şirketini silmek istediğinize emin misiniz?` : 'Delete this entity?')) {
                remove.mutate();
              }
            }}
            title={tr ? 'Sil' : 'Delete'}
            className="flex h-7.5 w-7.5 items-center justify-center rounded-[3px] border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-7.5 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card)] transition cursor-pointer"
          >
            <span>{tr ? 'Entegratör & Evraklar' : 'Provider & Documents'}</span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-[var(--border-soft)] grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DocumentsPanel entity={entity} />
          <EInvoiceProviderPanel billingEntityId={entity.id} />
        </div>
      )}
    </div>
  );
}

export default function BillingEntitiesPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();
  const [dialogEntity, setDialogEntity] = useState<BillingEntity | null | undefined>(undefined);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['billing-entities'],
    queryFn: () => billingEntityApi.list(),
    staleTime: 15_000,
  });

  const entities = useMemo(() => data ?? [], [data]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = entities.length;
    const active = entities.filter((e) => e.isActive).length;
    const withStores = entities.filter((e) => e.storeCodes.length > 0).length;
    const totalDocs = entities.reduce((acc, e) => acc + e.documents.length, 0);
    return { total, active, withStores, totalDocs };
  }, [entities]);

  // Excel Export
  const handleExportExcel = () => {
    if (entities.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak şirket yok.' : 'No entities to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Şirket Unvanı' : 'Company Name', key: 'legalName', type: 'text' },
      { header: tr ? 'VKN / TCKN' : 'Tax Number', key: 'taxNumber', type: 'text' },
      { header: tr ? 'Vergi Dairesi' : 'Tax Office', key: 'taxOffice', type: 'text' },
      { header: tr ? 'Şehir' : 'City', key: 'city', type: 'text' },
      { header: tr ? 'Adres' : 'Address', key: 'addressLine', type: 'text' },
      { header: tr ? 'Telefon' : 'Phone', key: 'phone', type: 'text' },
      { header: tr ? 'E-posta' : 'Email', key: 'email', type: 'text' },
      { header: tr ? 'IBAN' : 'IBAN', key: 'iban', type: 'text' },
      { header: tr ? 'Durum' : 'Status', key: 'status', type: 'text' },
    ];

    const rows = entities.map((e) => ({
      legalName: e.legalName,
      taxNumber: e.taxNumber,
      taxOffice: e.taxOffice || '—',
      city: e.city || '—',
      addressLine: e.addressLine || '—',
      phone: e.phone || '—',
      email: e.email || '—',
      iban: e.iban || '—',
      status: e.isActive ? (tr ? 'Aktif' : 'Active') : tr ? 'Pasif' : 'Inactive',
    }));

    void downloadExcel(`fatura_kesen_sirketler_${new Date().toISOString().slice(0, 10)}`, rows, cols, 'Sirketler');
    toast.success(tr ? 'Şirket listesi Excel olarak indirildi.' : 'Entities exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Sub Tab Navigation ── */}
      <InvoicingSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* KPI Metrics */}
        <div data-tour="billing-entities-kpi" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Fatura Kesen Şirketler' : 'Billing Entities'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.total}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Aktif Tüzel Kişilik' : 'Active Entities'}</div>
            <div className="mt-1 text-lg font-bold text-emerald-500">{stats.active}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Mağaza Eşleşmesi Olan' : 'Store Assigned'}</div>
            <div className="mt-1 text-lg font-bold text-blue-500">{stats.withStores}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Yüklü Evrak' : 'Uploaded Documents'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.totalDocs}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div data-tour="billing-entities-actions" className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          <div className="text-xs font-bold text-[var(--fg)]">
            {tr ? 'Tanımlı Fatura Kesen Şirket Profilleri' : 'Billing Entity Profiles'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={entities.length === 0}
              title={tr ? 'Excel İndir' : 'Export Excel'}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">{tr ? 'Excel İndir' : 'Export'}</span>
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              title={tr ? 'Yenile' : 'Refresh'}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>

            <button
              type="button"
              onClick={() => setDialogEntity(null)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>{tr ? 'Yeni Şirket Tanımla' : 'New Entity'}</span>
            </button>
          </div>
        </div>

        {/* Entities List */}
        <div data-tour="billing-entities-list">
          {/* HATA once: basarisiz sorgu "hic sirket yok" gibi gorunmemeli. */}
          {isError ? (
            <ErrorState
              title={tr ? 'Şirketler yüklenemedi' : 'Could not load entities'}
              onRetry={() => refetch()}
            />
          ) : isLoading ? (
            <div className="py-16 text-center text-xs text-[var(--fg-muted)]">
              {tr ? 'Şirketler yükleniyor...' : 'Loading entities...'}
            </div>
          ) : entities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-2 text-[var(--fg-muted)] rounded-[4px] border border-dashed border-[var(--border)] bg-[var(--card)]">
              <Building2 size={36} strokeWidth={1.5} />
              <h4 className="text-sm font-bold text-[var(--fg)]">{tr ? 'Henüz Fatura Kesen Şirket Tanımlanmadı' : 'No Billing Entities'}</h4>
              <p className="text-xs max-w-sm">
                {tr ? 'e-Fatura / e-Arşiv faturası kesebilmek için şirket unvanı ve VKN bilgilerinizi ekleyin.' : 'Add your legal company profile and tax number.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entities.map((entity) => (
                <BillingEntityCard
                  key={entity.id}
                  entity={entity}
                  onEdit={() => setDialogEntity(entity)}
                  onDeleted={() => {}}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {dialogEntity !== undefined && (
        <BillingEntityFormDialog
          entity={dialogEntity}
          onClose={() => setDialogEntity(undefined)}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ['billing-entities'] });
          }}
        />
      )}
    </div>
  );
}
