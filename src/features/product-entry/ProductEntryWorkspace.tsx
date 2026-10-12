'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CloudUpload, Save, Send, ShieldCheck } from 'lucide-react';
import {
  ErpOperationTarget,
  ProductDraftStatus,
  productDraftApi,
  type BroadcastProductDraft,
  type ProductDraft,
  type ProductDraftContext,
  type SaveProductDraft,
} from '../../lib/api/product-drafts';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuthStore } from '../../stores/auth';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { ProductEntryDraftList } from './ProductEntryDraftList';
import { ManualOrderActionDialog, type ManualOrderAction } from '../manual-orders/ManualOrderActionDialog';
import { destinationStatus, draftStatus, labelClass } from './product-entry-ui';
import { ProductEntryTabProduct } from './ProductEntryTabProduct';
import { ProductEntryTabSalesStock } from './ProductEntryTabSalesStock';
import { ProductEntryTabMedia } from './ProductEntryTabMedia';
import { ProductEntryTabTargets, type StoreTarget } from './ProductEntryTabTargets';
import { useI18n } from '../../lib/i18n';


type TabKey = 'product' | 'sales-stock' | 'media' | 'targets';
const TABS: Array<{ key: TabKey; labelTr: string; labelEn: string }> = [
  { key: 'product', labelTr: 'Ürün Bilgileri', labelEn: 'Product Details' },
  { key: 'sales-stock', labelTr: 'Satış & Stok', labelEn: 'Sales & Stock' },
  { key: 'media', labelTr: 'Görseller', labelEn: 'Media' },
  { key: 'targets', labelTr: 'Hedef & Onay', labelEn: 'Targets & Approval' },
];

interface EditorState {
  name: string;
  brand: string;
  model: string;
  modelYear: string;
  supplierSku: string;
  barcode: string;
  internalCategoryId: number | '';
  price: number;
  stockQuantity: number;
  vatRate: number | '';
  desi: number;
  boxId: number | '';
  description: string;
  note: string;
  imageUrls: string[];
  storeTargets: StoreTarget[];
}

function emptyEditor(): EditorState {
  return {
    name: '', brand: '', model: '', modelYear: '', supplierSku: '', barcode: '',
    internalCategoryId: '', price: 0, stockQuantity: 0, vatRate: '', desi: 0, boxId: '',
    description: '', note: '', imageUrls: [], storeTargets: [],
  };
}

function editorFromDraft(draft: ProductDraft): EditorState {
  return {
    name: draft.name, brand: draft.brand ?? '', model: draft.model ?? '', modelYear: draft.modelYear ?? '',
    supplierSku: draft.supplierSku, barcode: draft.barcode ?? '', internalCategoryId: draft.internalCategoryId ?? '',
    price: draft.price, stockQuantity: draft.stockQuantity, vatRate: draft.vatRate ?? '', desi: draft.desi,
    boxId: draft.boxId ?? '', description: draft.description ?? '', note: draft.note ?? '',
    imageUrls: draft.imageUrls,
    storeTargets: [{
      storeId: draft.storeId,
      keepLocally: draft.destinations.some((d) => d.target === ErpOperationTarget.Local),
      targetDataSourceIds: draft.destinations.flatMap((d) => (d.dataSourceId == null ? [] : [d.dataSourceId])),
    }],
  };
}

/**
 * Hedefin ülkesine göre para birimi. Ekran daha önce her taslağa `'TRY'` SABİT yazıyordu;
 * UK (Base) bir hesap seçildiğinde bu, TRY etiketli bir fiyatın GBP kataloğuna gitmesi
 * demekti. Backend de aynı eşlemeyi doğruluyor (bkz. CurrencyCodeCatalog.ExpectedForCountry),
 * burası yalnızca doğru değeri ÜRETİR — bilinmeyen ülkede TRY'de kalınır ve karar backend'e
 * bırakılır.
 */
const CURRENCY_BY_COUNTRY: Record<string, string> = { TR: 'TRY', UK: 'GBP', GB: 'GBP' };
const DEFAULT_CURRENCY = 'TRY';

function currencyForTarget(context: ProductDraftContext | undefined, target: StoreTarget | undefined): string {
  if (!context || !target) return DEFAULT_CURRENCY;

  const store = context.stores.find((s) => s.id === target.storeId);
  if (!store) return DEFAULT_CURRENCY;

  // Seçili ERP hedefleri; hiçbiri seçilmediyse (sadece yerel kayıt) mağazanın kaynakları.
  const sources = target.targetDataSourceIds.length > 0
    ? store.erpSources.filter((source) => target.targetDataSourceIds.includes(source.id))
    : store.erpSources;

  const currencies = [...new Set(sources.map((source) => CURRENCY_BY_COUNTRY[source.country] ?? DEFAULT_CURRENCY))];

  // Tek bir para birimi çıkmıyorsa (hedefler farklı ülkelerde) seçim yapılamaz — TRY'de
  // kalınır ve backend hangi hedefin uymadığını açık bir hatayla söyler.
  return currencies.length === 1 ? currencies[0] : DEFAULT_CURRENCY;
}

function toSinglePayload(editor: EditorState, storeId: number, context: ProductDraftContext | undefined): SaveProductDraft {
  const target = editor.storeTargets.find((t) => t.storeId === storeId) ?? editor.storeTargets[0];
  return {
    storeId: target?.storeId ?? storeId,
    name: editor.name,
    brand: editor.brand || undefined,
    model: editor.model || undefined,
    modelYear: editor.modelYear || undefined,
    supplierSku: editor.supplierSku || undefined,
    barcode: editor.barcode || undefined,
    internalCategoryId: editor.internalCategoryId === '' ? undefined : editor.internalCategoryId,
    boxId: editor.boxId === '' ? undefined : editor.boxId,
    price: editor.price,
    currency: currencyForTarget(context, target),
    stockQuantity: editor.stockQuantity,
    vatRate: editor.vatRate === '' ? undefined : editor.vatRate,
    desi: editor.desi,
    description: editor.description || undefined,
    imageUrls: editor.imageUrls.filter(Boolean),
    note: editor.note || undefined,
    keepLocally: target?.keepLocally ?? true,
    targetDataSourceIds: target?.targetDataSourceIds ?? [],
  };
}

function toBroadcastPayload(editor: EditorState, context: ProductDraftContext | undefined): BroadcastProductDraft {
  return {
    name: editor.name,
    brand: editor.brand || undefined,
    model: editor.model || undefined,
    modelYear: editor.modelYear || undefined,
    supplierSku: editor.supplierSku || undefined,
    barcode: editor.barcode || undefined,
    internalCategoryId: editor.internalCategoryId === '' ? undefined : editor.internalCategoryId,
    boxId: editor.boxId === '' ? undefined : editor.boxId,
    price: editor.price,
    // Yayın TEK para birimi taşır: hedefler farklı ülkelerdeyse ilk hedefinki gönderilir ve
    // backend uymayan hedefi adıyla reddeder (sessizce yanlış fiyat yazmaktansa açık hata).
    currency: currencyForTarget(context, editor.storeTargets[0]),
    stockQuantity: editor.stockQuantity,
    vatRate: editor.vatRate === '' ? undefined : editor.vatRate,
    desi: editor.desi,
    description: editor.description || undefined,
    imageUrls: editor.imageUrls.filter(Boolean),
    note: editor.note || undefined,
    storeTargets: editor.storeTargets,
  };
}

export interface ProductEntryWorkspaceProps {
  /**
   * Editordeki veri kaydedilmemis degisiklik icerdiginde bildirilir. Panel (FullScreenPanel)
   * icinde acildiginda kapatmadan once onay sormak icin kullanilir.
   * NOT: kararli (stable) bir referans verin — her render yeniden uretilen bir lambda dongu yaratir.
   */
  onDirtyChange?: (dirty: boolean) => void;
  /** Basarili her kayit/gonderim/aksiyon sonrasi cagrilir; cagiran alttaki listeyi tazeler. */
  onSaved?: () => void;
}

export function ProductEntryWorkspace({ onDirtyChange, onSaved }: ProductEntryWorkspaceProps = {}) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.roles?.some((role) => role === 'Admin' || role === 'SuperAdmin') ?? false;
  const contextQuery = useQuery({ queryKey: ['product-drafts', 'context'], queryFn: productDraftApi.context });
  const draftsQuery = useQuery({ queryKey: ['product-drafts', 'list'], queryFn: productDraftApi.list });
  const [selectedDraft, setSelectedDraft] = useState<ProductDraft | null>(null);
  const [editor, setEditor] = useState<EditorState>(() => emptyEditor());
  const [activeTab, setActiveTab] = useState<TabKey>('product');
  const [pendingAction, setPendingAction] = useState<ManualOrderAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);

  const editable = !selectedDraft || selectedDraft.status === ProductDraftStatus.Draft || selectedDraft.status === ProductDraftStatus.Rejected;

  // Kirli durum: editor icerigi, secili taslagin (ya da bos formun) baslangic haline esit degilse.
  // Turetilen deger — her setEditor cagrisina ayri bir "degisti" bayragi eklemek gerekmiyor.
  const baselineEditor = useMemo(
    () => (selectedDraft ? editorFromDraft(selectedDraft) : emptyEditor()),
    [selectedDraft],
  );
  const isDirty = useMemo(
    () => JSON.stringify(editor) !== JSON.stringify(baselineEditor),
    [editor, baselineEditor],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  function selectDraft(draft: ProductDraft) {
    setSelectedDraft(draft);
    setEditor(editorFromDraft(draft));
    setActiveTab('product');
  }

  function startNew() {
    setSelectedDraft(null);
    setEditor(emptyEditor());
    setActiveTab('product');
  }

  async function refreshAndSelect(draft: ProductDraft) {
    await queryClient.invalidateQueries({ queryKey: ['product-drafts', 'list'] });
    selectDraft(draft);
    // Tum basarili mutasyonlar (kaydet / onaya gonder / onayla-reddet-sevk) buradan gecer,
    // bu yuzden alttaki listeyi tazeleme sinyali icin tek dogru nokta burasi.
    onSaved?.();
  }

  async function performSave(): Promise<ProductDraft | undefined> {
    if (editor.storeTargets.length === 0) {
      toast.error(isTr ? 'En az bir mağaza seçmelisiniz (Hedef & Onay sekmesi).' : 'Please select at least one store.');
      return undefined;
    }
    try {
      if (selectedDraft) {
        const saved = await toast.promise(productDraftApi.update(selectedDraft.id, toSinglePayload(editor, selectedDraft.storeId, contextQuery.data)), {
          loading: isTr ? 'Ürün taslağı kaydediliyor…' : 'Saving draft…',
          success: isTr ? 'Taslak kaydedildi.' : 'Draft saved.',
          error: (error) => describeError(error),
        });
        await refreshAndSelect(saved);
        return saved;
      }
      if (editor.storeTargets.length === 1) {
        const saved = await toast.promise(productDraftApi.create(toSinglePayload(editor, editor.storeTargets[0].storeId, contextQuery.data)), {
          loading: isTr ? 'Ürün taslağı kaydediliyor…' : 'Saving draft…',
          success: isTr ? 'Taslak kaydedildi.' : 'Draft saved.',
          error: (error) => describeError(error),
        });
        await refreshAndSelect(saved);
        return saved;
      }
      const results = await toast.promise(productDraftApi.broadcast(toBroadcastPayload(editor, contextQuery.data)), {
        loading: isTr ? 'Ürün taslakları oluşturuluyor…' : 'Creating product drafts…',
        success: (r) => isTr ? `${r.filter((x) => x.success).length}/${r.length} mağaza için taslak oluşturuldu.` : `Drafts created for ${r.filter((x) => x.success).length}/${r.length} stores.`,
        error: (error) => describeError(error),
      });
      results.filter((r) => !r.success).forEach((r) => toast.error(`Mağaza #${r.storeId}: ${r.error}`));
      const firstSuccess = results.find((r) => r.success && r.draft);
      if (firstSuccess?.draft) {
        await refreshAndSelect(firstSuccess.draft);
        return firstSuccess.draft;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async function saveDraft(): Promise<ProductDraft | undefined> {
    if (saveBusy || submitBusy) return undefined;
    setSaveBusy(true);
    try {
      return await performSave();
    } finally {
      setSaveBusy(false);
    }
  }

  async function submitDraft() {
    if (saveBusy || submitBusy) return;
    setSubmitBusy(true);
    try {
      const saved = await performSave();
      if (!saved) return;
      const submitted = await toast.promise(productDraftApi.submit(saved.id), {
        loading: isTr ? 'Ürün doğrulanıp onaya gönderiliyor…' : 'Submitting for approval…',
        success: isTr ? 'Ürün onaya gönderildi.' : 'Submitted for approval.',
        error: (error) => describeError(error),
      });
      await refreshAndSelect(submitted);
    } catch { /* toast sonucu gösterir */ }
    finally {
      setSubmitBusy(false);
    }
  }

  async function executeAction(reason: string) {
    if (!selectedDraft || !pendingAction) return;
    setActionBusy(true);
    const action = pendingAction;
    const requests = {
      approve: { request: () => productDraftApi.approve(selectedDraft.id), loading: isTr ? 'Ürün onaylanıyor…' : 'Approving…', success: isTr ? 'Ürün onaylandı.' : 'Approved.' },
      reject: { request: () => productDraftApi.reject(selectedDraft.id, reason), loading: isTr ? 'Ürün reddediliyor…' : 'Rejecting…', success: isTr ? 'Ürün reddedildi.' : 'Rejected.' },
      dispatch: { request: () => productDraftApi.dispatch(selectedDraft.id), loading: isTr ? 'Ürün ERP kuyruğuna alınıyor…' : 'Queueing…', success: isTr ? 'Ürün ERP kuyruğuna alındı.' : 'Queued.' },
      cancel: { request: () => productDraftApi.cancel(selectedDraft.id, reason), loading: isTr ? 'Ürün siliniyor…' : 'Deleting…', success: isTr ? 'Ürün silindi.' : 'Deleted.' },
      reopen: { request: () => productDraftApi.reopen(selectedDraft.id), loading: isTr ? 'Düzenlemeye açılıyor…' : 'Reopening…', success: isTr ? 'Düzenlemeye açıldı.' : 'Reopened.' },
    } satisfies Record<ManualOrderAction, { request: () => Promise<ProductDraft>; loading: string; success: string }>;
    try {
      const result = await toast.promise(requests[action].request(), {
        loading: requests[action].loading, success: requests[action].success, error: (error) => describeError(error),
      });
      setPendingAction(null);
      await refreshAndSelect(result);
    } catch { /* toast sonucu gösterir */ }
    finally { setActionBusy(false); }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 's' && editable && !saveBusy && !submitBusy) {
        event.preventDefault();
        void saveDraft();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (contextQuery.isError || draftsQuery.isError) {
    return <ErrorState title={isTr ? 'Ürün girme ekranı yüklenemedi' : 'Could not load product entry'} detail={describeError(contextQuery.error ?? draftsQuery.error)} onRetry={() => { void contextQuery.refetch(); void draftsQuery.refetch(); }} />;
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'transparent', padding: '16px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 14, minHeight: 'calc(100vh - 120px)' }}>
        {/* Sol Panel: Taslak Listesi */}
        <div data-tour="product-entry-drafts" style={{ minWidth: 0, height: '100%' }}>
          <ProductEntryDraftList
            drafts={draftsQuery.data ?? []}
            selectedId={selectedDraft?.id ?? null}
            onSelect={selectDraft}
            onNew={startNew}
            onImported={() => queryClient.invalidateQueries({ queryKey: ['product-drafts', 'list'] })}
          />
        </div>

        {/* Sağ Panel: Form Çalışma Alanı */}
        <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Header */}
          <header
            data-tour="product-entry-header"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
              padding: '12px 16px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Link
                href="/products"
                title={isTr ? 'Ürün Kataloğuna Dön' : 'Back to Catalog'}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 4, border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)', color: 'var(--fg)', textDecoration: 'none',
                }}
              >
                <ArrowLeft size={14} />
              </Link>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedDraft?.draftNumber ?? (isTr ? 'Yeni Ürün Girişi' : 'New Product Entry')}
                  </h1>
                  {selectedDraft && (() => {
                    const status = draftStatus(selectedDraft.status);
                    return <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 9.5, fontWeight: 600 }} className={status.className}>{status.label}</span>;
                  })()}
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--fg-muted)' }}>
                  {isTr ? 'Ürün girişi, onay ve ERP entegrasyonu' : 'Product entry, approval, and ERP dispatch'}
                </p>
              </div>
            </div>

            <div data-tour="product-entry-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {editable && (
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saveBusy || submitBusy}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    height: 32, padding: '0 12px', borderRadius: 4,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    opacity: saveBusy ? 0.6 : 1,
                  }}
                >
                  <Save size={13} />
                  <span>{isTr ? 'Taslağı Kaydet' : 'Save Draft'}</span>
                </button>
              )}
              {editable && (
                <button
                  type="button"
                  onClick={submitDraft}
                  disabled={saveBusy || submitBusy}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    height: 32, padding: '0 12px', borderRadius: 4,
                    border: 'none', background: 'var(--fg)',
                    color: 'var(--card)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    opacity: submitBusy ? 0.6 : 1,
                  }}
                >
                  <Send size={13} />
                  <span>{isTr ? 'Onaya Gönder' : 'Submit'}</span>
                </button>
              )}
              {selectedDraft?.status === ProductDraftStatus.AwaitingApproval && isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setPendingAction('reject')}
                    style={{
                      height: 32, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border)',
                      background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {isTr ? 'Reddet' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction('approve')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      height: 32, padding: '0 12px', borderRadius: 4, border: 'none',
                      background: 'var(--fg)', color: 'var(--card)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <ShieldCheck size={13} />
                    <span>{isTr ? 'Onayla' : 'Approve'}</span>
                  </button>
                </>
              )}
              {selectedDraft?.status === ProductDraftStatus.ReadyToDispatch && isAdmin && (
                <button
                  type="button"
                  onClick={() => setPendingAction('dispatch')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    height: 32, padding: '0 12px', borderRadius: 4, border: 'none',
                    background: 'var(--fg)', color: 'var(--card)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <CloudUpload size={13} />
                  <span>{isTr ? 'ERP’ye Gönder' : 'Dispatch to ERP'}</span>
                </button>
              )}
              {selectedDraft && selectedDraft.status !== ProductDraftStatus.Cancelled && isAdmin && (
                <button
                  type="button"
                  onClick={() => setPendingAction('cancel')}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border)',
                    background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {isTr ? 'Sil' : 'Delete'}
                </button>
              )}
              {selectedDraft && (selectedDraft.status === ProductDraftStatus.AwaitingApproval || selectedDraft.status === ProductDraftStatus.Approved || selectedDraft.status === ProductDraftStatus.ReadyToDispatch) && isAdmin && (
                <button
                  type="button"
                  onClick={() => setPendingAction('reopen')}
                  style={{
                    height: 32, padding: '0 12px', borderRadius: 4, border: '1px solid var(--border)',
                    background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {isTr ? 'Düzenlemeye Aç' : 'Reopen'}
                </button>
              )}
            </div>
          </header>

          {/* Form Kartı & Sekmeler */}
          <div style={{ borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)' }}>
            <div data-tour="product-entry-tabs" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-soft)', padding: '4px 12px 0' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: 'none', background: 'transparent',
                    borderBottom: activeTab === tab.key ? '2px solid var(--fg)' : '2px solid transparent',
                    color: activeTab === tab.key ? 'var(--fg)' : 'var(--fg-muted)',
                    marginBottom: -1, transition: 'all 0.15s',
                  }}
                >
                  {isTr ? tab.labelTr : tab.labelEn}
                </button>
              ))}
            </div>

            <div data-tour="product-entry-content" style={{ padding: 16 }}>
              {activeTab === 'product' && (
                <ProductEntryTabProduct
                  editable={editable}
                  context={contextQuery.data}
                  value={editor}
                  onChange={(patch) => setEditor((c) => ({ ...c, ...patch }))}
                />
              )}
              {activeTab === 'sales-stock' && (
                <ProductEntryTabSalesStock
                  editable={editable}
                  context={contextQuery.data}
                  value={editor}
                  onChange={(patch) => setEditor((c) => ({ ...c, ...patch }))}
                />
              )}
              {activeTab === 'media' && (
                <ProductEntryTabMedia
                  editable={editable}
                  imageUrls={editor.imageUrls}
                  onChange={(imageUrls) => setEditor((c) => ({ ...c, imageUrls }))}
                />
              )}
              {activeTab === 'targets' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <ProductEntryTabTargets
                    editable={editable}
                    context={contextQuery.data}
                    storeTargets={editor.storeTargets}
                    onChange={(storeTargets) => setEditor((c) => ({ ...c, storeTargets }))}
                  />
                  {selectedDraft && selectedDraft.destinations.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
                      <label className={labelClass}>
                        {isTr ? 'ERP Hedef Durumu' : 'ERP Destination Status'}
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        {selectedDraft.destinations.map((destination) => (
                          <div key={destination.idempotencyKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                            <span style={{ color: 'var(--fg-muted)' }}>{destination.name}</span>
                            <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{destinationStatus(destination.status)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <ManualOrderActionDialog
        action={pendingAction}
        orderNumber={selectedDraft?.draftNumber ?? ''}
        busy={actionBusy}
        onClose={() => setPendingAction(null)}
        onConfirm={(reason) => { void executeAction(reason); }}
        entityLabel="ürün"
        entityAccusative="ürünü"
      />
    </div>
  );
}
