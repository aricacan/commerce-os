'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, CloudUpload,
  Layers, Minus, Pencil, Plus, Save, Send, ShieldCheck, Star, Trash2,
} from 'lucide-react';
import {
  ManualOrderDraftStatus,
  manualOrderApi,
  type ManualOrderDraft,
  type ManualOrderProduct,
  type SaveManualOrderDraft,
} from '../../lib/api/manual-orders';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuthStore } from '../../stores/auth';
import { useI18n } from '../../lib/i18n';
import { useMobile } from '../../hooks/useMobile';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { CustomCheckbox } from '../../components/ui/CustomCheckbox';
import { ManualOrderDraftList } from './ManualOrderDraftList';
import { ProductQuickPicker } from './ProductQuickPicker';
import { ManualOrderActionDialog, type ManualOrderAction } from './ManualOrderActionDialog';
import { destinationStatus, draftStatus, formatTargetLabel, money } from './manual-order-ui';

interface EditorLine {
  productId: number;
  sku: string;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  stockQuantity?: number;
  listPrice: number;
  buyingPrice: number | null;
  boxCode: string | null;
  boxName: string | null;
  boxPrice: number | null;
  desi: number;
  shippingCost: number;
  vatRate: number;
  breakEvenPrice: number | null;
  hasCostData: boolean;
}

interface EditorState {
  storeId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shipCity: string;
  shipDistrict: string;
  addressLine: string;
  shippingAmount: number;
  discountAmount: number;
  note: string;
  keepLocally: boolean;
  targetDataSourceIds: number[];
  lines: EditorLine[];
}

function emptyEditor(storeId = 0): EditorState {
  return {
    storeId,
    customerName: '', customerEmail: '', customerPhone: '', shipCity: '', shipDistrict: '', addressLine: '',
    shippingAmount: 0, discountAmount: 0, note: '', keepLocally: true, targetDataSourceIds: [], lines: [],
  };
}

function editorFromDraft(draft: ManualOrderDraft): EditorState {
  return {
    storeId: draft.storeId,
    customerName: draft.customerName,
    customerEmail: draft.customerEmail ?? '',
    customerPhone: draft.customerPhone ?? '',
    shipCity: draft.shipCity,
    shipDistrict: draft.shipDistrict ?? '',
    addressLine: draft.addressLine,
    shippingAmount: draft.shippingAmount,
    discountAmount: draft.discountAmount,
    note: draft.note ?? '',
    keepLocally: draft.destinations.some((destination) => destination.target === 0),
    targetDataSourceIds: draft.destinations.flatMap((destination) => destination.dataSourceId == null ? [] : [destination.dataSourceId]),
    lines: draft.lines.map((line) => ({
      productId: line.productId, sku: line.sku, productName: line.productName, imageUrl: line.imageUrl,
      quantity: line.quantity, unitPrice: line.unitPrice, stockQuantity: line.stockQuantity,
      listPrice: line.listPrice, buyingPrice: line.buyingPrice, boxCode: line.boxCode,
      boxName: line.boxName, boxPrice: line.boxPrice, desi: line.desi,
      shippingCost: line.shippingCost, vatRate: line.vatRate,
      breakEvenPrice: line.breakEvenPrice, hasCostData: line.hasCostData,
    })),
  };
}

function toPayload(editor: EditorState): SaveManualOrderDraft {
  return {
    storeId: editor.storeId,
    customerName: editor.customerName,
    customerEmail: editor.customerEmail || undefined,
    customerPhone: editor.customerPhone || undefined,
    shipCity: editor.shipCity,
    shipDistrict: editor.shipDistrict || undefined,
    addressLine: editor.addressLine,
    currency: 'TRY',
    shippingAmount: editor.shippingAmount,
    discountAmount: editor.discountAmount,
    note: editor.note || undefined,
    keepLocally: editor.keepLocally,
    targetDataSourceIds: editor.targetDataSourceIds,
    lines: editor.lines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
  };
}

export interface ManualOrderWorkspaceProps {
  /**
   * Editordeki veri kaydedilmemis degisiklik icerdiginde bildirilir. Panel (FullScreenPanel)
   * icinde acildiginda kapatmadan once onay sormak icin kullanilir.
   * NOT: kararli (stable) bir referans verin — her render yeniden uretilen bir lambda dongu yaratir.
   */
  onDirtyChange?: (dirty: boolean) => void;
  /** Basarili her kayit/gonderim/aksiyon sonrasi cagrilir; cagiran alttaki listeyi tazeler. */
  onSaved?: () => void;
}

export function ManualOrderWorkspace({ onDirtyChange, onSaved }: ManualOrderWorkspaceProps = {}) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();

  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.roles?.some((role) => role === 'Admin' || role === 'SuperAdmin') ?? false;

  const contextQuery = useQuery({ queryKey: ['manual-orders', 'context'], queryFn: manualOrderApi.context });
  const draftsQuery = useQuery({ queryKey: ['manual-orders', 'list'], queryFn: manualOrderApi.list });

  const [selectedDraft, setSelectedDraft] = useState<ManualOrderDraft | null>(null);
  const [editor, setEditor] = useState<EditorState>(() => emptyEditor());
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<ManualOrderAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [showCostDetails, setShowCostDetails] = useState(false);
  const [erpDropdownOpen, setErpDropdownOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'list' | 'editor'>('editor');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(productSearch.trim()), 220);
    return () => window.clearTimeout(timeout);
  }, [productSearch]);

  useEffect(() => {
    if (editor.storeId === 0 && contextQuery.data?.stores[0]) {
      setEditor((current) => ({ ...current, storeId: contextQuery.data!.stores[0].id }));
    }
  }, [contextQuery.data, editor.storeId]);

  const productsQuery = useQuery({
    queryKey: ['manual-orders', 'products', editor.storeId, debouncedSearch],
    queryFn: () => manualOrderApi.products(editor.storeId, debouncedSearch),
    enabled: editor.storeId > 0,
  });

  const editable = selectedDraft == null || selectedDraft.status === ManualOrderDraftStatus.Draft || selectedDraft.status === ManualOrderDraftStatus.Rejected;
  const subtotal = useMemo(() => editor.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), [editor.lines]);
  const total = subtotal + editor.shippingAmount - editor.discountAmount;
  const profitability = useMemo(() => editor.lines.reduce((summary, line) => {
    const quantity = line.quantity;
    const lineSale = line.unitPrice * quantity;
    const allocatedRevenue = subtotal > 0 ? total * (lineSale / subtotal) : 0;
    const costs = ((line.buyingPrice ?? 0) + (line.boxPrice ?? 0) + line.shippingCost) * quantity;
    const vatRate = line.vatRate / 100;
    const grossProfit = line.hasCostData ? (allocatedRevenue - costs) / (1 + vatRate) : 0;
    return {
      buying: summary.buying + (line.buyingPrice ?? 0) * quantity,
      boxes: summary.boxes + (line.boxPrice ?? 0) * quantity,
      shipping: summary.shipping + line.shippingCost * quantity,
      listTotal: summary.listTotal + line.listPrice * quantity,
      grossProfit: summary.grossProfit + grossProfit,
      missingCosts: summary.missingCosts + (line.hasCostData ? 0 : 1),
    };
  }, { buying: 0, boxes: 0, shipping: 0, listTotal: 0, grossProfit: 0, missingCosts: 0 }), [editor.lines, subtotal, total]);

  // Kirli durum: editor icerigi, secili taslagin (ya da bos formun) baslangic haline esit degilse.
  // Ayri bir "degisti" bayragi tutmak yerine turetilen deger kullaniliyor — her setEditor
  // cagrisina bayrak eklemek gerekmiyor ve kaydettikten sonra kendiliginden temizleniyor.
  const baselineEditor = useMemo(
    () => (selectedDraft ? editorFromDraft(selectedDraft) : emptyEditor(contextQuery.data?.stores[0]?.id ?? 0)),
    [selectedDraft, contextQuery.data],
  );
  const isDirty = useMemo(
    () => JSON.stringify(editor) !== JSON.stringify(baselineEditor),
    [editor, baselineEditor],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  function selectDraft(draft: ManualOrderDraft) {
    setSelectedDraft(draft);
    setEditor(editorFromDraft(draft));
    setProductSearch('');
    if (isMobile) setMobileTab('editor');
  }

  function startNew() {
    setSelectedDraft(null);
    setEditor(emptyEditor(contextQuery.data?.stores[0]?.id ?? 0));
    setProductSearch('');
    if (isMobile) setMobileTab('editor');
  }

  async function refreshAndSelect(draft: ManualOrderDraft) {
    await queryClient.invalidateQueries({ queryKey: ['manual-orders', 'list'] });
    selectDraft(draft);
    // Tum basarili mutasyonlar (kaydet / onaya gonder / onayla-reddet-sevk) buradan gecer,
    // bu yuzden alttaki listeyi tazeleme sinyali icin tek dogru nokta burasi.
    onSaved?.();
  }

  async function performSave(): Promise<ManualOrderDraft | undefined> {
    try {
      const promise = selectedDraft
        ? manualOrderApi.update(selectedDraft.id, toPayload(editor))
        : manualOrderApi.create(toPayload(editor));
      const saved = await toast.promise(promise, {
        loading: isTr ? 'Sipariş taslağı kaydediliyor…' : 'Saving order draft…',
        success: isTr ? 'Taslak kaydedildi.' : 'Draft saved.',
        error: (error) => describeError(error),
      });
      await refreshAndSelect(saved);
      return saved;
    } catch {
      return undefined;
    }
  }

  async function saveDraft(): Promise<ManualOrderDraft | undefined> {
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
      const submitted = await toast.promise(manualOrderApi.submit(saved.id), {
        loading: isTr ? 'Sipariş doğrulanıp onaya gönderiliyor…' : 'Submitting order for approval…',
        success: isTr ? 'Sipariş onaya gönderildi.' : 'Order submitted for approval.',
        error: (error) => describeError(error),
      });
      await refreshAndSelect(submitted);
    } catch { /* toast shows error */ }
    finally {
      setSubmitBusy(false);
    }
  }

  async function executeAction(reason: string) {
    if (!selectedDraft || !pendingAction) return;
    setActionBusy(true);
    const action = pendingAction;
    const requests = {
      approve: {
        request: () => manualOrderApi.approve(selectedDraft.id),
        loading: isTr ? 'Sipariş onaylanıyor…' : 'Approving order…',
        success: isTr ? 'Sipariş onaylandı.' : 'Order approved.',
      },
      reject: {
        request: () => manualOrderApi.reject(selectedDraft.id, reason),
        loading: isTr ? 'Sipariş reddediliyor…' : 'Rejecting order…',
        success: isTr ? 'Sipariş reddedildi.' : 'Order rejected.',
      },
      dispatch: {
        request: () => manualOrderApi.dispatch(selectedDraft.id),
        loading: isTr ? 'Sipariş ERP kuyruğuna alınıyor…' : 'Queueing to ERP…',
        success: isTr ? 'Sipariş ERP kuyruğuna alındı.' : 'Order queued to ERP.',
      },
      cancel: {
        request: () => manualOrderApi.cancel(selectedDraft.id, reason),
        loading: isTr ? 'Sipariş siliniyor…' : 'Deleting order…',
        success: isTr ? 'Sipariş silindi.' : 'Order deleted.',
      },
      reopen: {
        request: () => manualOrderApi.reopen(selectedDraft.id),
        loading: isTr ? 'Sipariş düzenlemeye açılıyor…' : 'Reopening order…',
        success: isTr ? 'Sipariş taslağa döndü.' : 'Order reverted to draft.',
      },
    } satisfies Record<ManualOrderAction, { request: () => Promise<ManualOrderDraft>; loading: string; success: string }>;
    try {
      const result = await toast.promise(requests[action].request(), {
        loading: requests[action].loading, success: requests[action].success, error: (error) => describeError(error),
      });
      setPendingAction(null);
      await refreshAndSelect(result);
    } catch { /* toast handles */ }
    finally { setActionBusy(false); }
  }

  function addProduct(product: ManualOrderProduct) {
    if (!editable) return;
    setEditor((current) => {
      const existing = current.lines.find((line) => line.productId === product.id);
      if (existing) {
        return { ...current, lines: current.lines.map((line) => line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line) };
      }
      return { ...current, lines: [...current.lines, {
        productId: product.id, sku: product.sku, productName: product.name, imageUrl: product.imageUrl,
        quantity: 1, unitPrice: product.price, stockQuantity: product.stockQuantity,
        listPrice: product.price, buyingPrice: product.buyingPrice, boxCode: product.boxCode,
        boxName: product.boxName, boxPrice: product.boxPrice, desi: product.desi,
        shippingCost: product.shippingCost, vatRate: product.vatRate,
        breakEvenPrice: product.breakEvenPrice, hasCostData: product.hasCostData,
      }] };
    });
    setProductSearch('');
  }

  function updateLine(productId: number, patch: Partial<Pick<EditorLine, 'quantity' | 'unitPrice'>>) {
    setEditor((current) => ({
      ...current,
      lines: current.lines.map((line) => line.productId === productId ? { ...line, ...patch } : line),
    }));
  }

  function toggleSource(storeId: number, sourceId: number) {
    if (storeId !== editor.storeId && editor.lines.length > 0) {
      toast.error(isTr ? 'Farklı mağaza ERP’sini seçmek için önce ürünleri temizleyin.' : 'Clear items before choosing another store ERP.');
      return;
    }
    setEditor((current) => ({
      ...current,
      storeId,
      targetDataSourceIds: storeId !== current.storeId
        ? [sourceId]
        : current.targetDataSourceIds.includes(sourceId)
        ? current.targetDataSourceIds.filter((id) => id !== sourceId)
        : [...current.targetDataSourceIds, sourceId],
    }));
  }

  const currentStore = contextQuery.data?.stores.find((store) => store.id === editor.storeId);
  const selectedTargetChips = useMemo((): Array<{ key: string; label: string; status: string | null }> => {
    // Kayıtlı bir taslak seçiliyse gerçek hedef durumunu (backend'den gelen) göster;
    // yeni/düzenlenmekte olan siparişte henüz durum yoktur, editör seçiminden üret.
    if (selectedDraft) {
      return selectedDraft.destinations.map((destination) => ({
        key: destination.idempotencyKey,
        label: destination.target === 0
          ? (isTr ? 'DEMO ERP (Yerel kayıt)' : 'DEMO ERP (Local record)')
          : `${selectedDraft.storeName} → ${destination.name}`,
        status: destinationStatus(destination.status, lang),
      }));
    }
    const chips: Array<{ key: string; label: string; status: null }> = [];
    if (editor.keepLocally) chips.push({ key: 'local', label: isTr ? 'DEMO ERP (Yerel kayıt)' : 'DEMO ERP (Local record)', status: null });
    for (const sourceId of editor.targetDataSourceIds) {
      const source = currentStore?.erpSources.find((candidate) => candidate.id === sourceId);
      if (source && currentStore) chips.push({ key: `source-${sourceId}`, label: formatTargetLabel(currentStore.name, source), status: null });
    }
    return chips;
  }, [selectedDraft, editor.keepLocally, editor.targetDataSourceIds, currentStore, isTr, lang]);
  const selectedTargetsCount = selectedTargetChips.length;

  if (contextQuery.isError || draftsQuery.isError) {
    return (
      <ErrorState
        title={isTr ? 'Manuel sipariş ekranı yüklenemedi' : 'Failed to load manual orders'}
        detail={describeError(contextQuery.error ?? draftsQuery.error)}
        onRetry={() => { void contextQuery.refetch(); void draftsQuery.refetch(); }}
      />
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', padding: isMobile ? 8 : 12 }}>
      {/* Mobile Tab Switcher */}
      {isMobile && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, padding: 4, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border-soft)' }}>
          <button
            type="button"
            onClick={() => setMobileTab('list')}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 4, border: 'none',
              background: mobileTab === 'list' ? 'var(--card-hover)' : 'transparent',
              color: mobileTab === 'list' ? 'var(--fg)' : 'var(--fg-muted)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {isTr ? 'Sipariş Akışı' : 'Drafts'} ({draftsQuery.data?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('editor')}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 4, border: 'none',
              background: mobileTab === 'editor' ? 'var(--card-hover)' : 'transparent',
              color: mobileTab === 'editor' ? 'var(--fg)' : 'var(--fg-muted)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {selectedDraft ? selectedDraft.draftNumber : (isTr ? 'Yeni Sipariş' : 'New Order')}
          </button>
        </div>
      )}

      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: isMobile ? '1fr' : '280px minmax(0, 1fr)',
        minHeight: 'calc(100vh - 90px)',
      }}>
        {/* Sol Panel: Taslak Listesi */}
        {(!isMobile || mobileTab === 'list') && (
          <div data-tour="manual-orders-drafts" style={{ minWidth: 0, height: '100%' }}>
            <ManualOrderDraftList drafts={draftsQuery.data ?? []} selectedId={selectedDraft?.id ?? null} onSelect={selectDraft} onNew={startNew} />
          </div>
        )}

        {/* Ana Panel: Editör */}
        {(!isMobile || mobileTab === 'editor') && (
          <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Top Bar */}
            <header
              data-tour="manual-orders-header"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Star size={15} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                <h1 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--fg)', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedDraft ? `Order ${selectedDraft.draftNumber}` : (isTr ? 'Yeni Manuel Sipariş' : 'New Manual Order')}
                </h1>
                {selectedDraft && (() => {
                  const status = draftStatus(selectedDraft.status, lang);
                  return (
                    <span style={{
                      padding: '2px 7px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                      border: '1px solid var(--border-soft)', background: 'var(--card-hover)', color: 'var(--fg)',
                    }}>
                      {status.label}
                    </span>
                  );
                })()}
              </div>

              <div data-tour="manual-orders-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Link
                  href="/orders"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px',
                    borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)',
                    color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={13} /> {isTr ? 'Sipariş listesi' : 'Orders list'}
                </Link>
                {editable && (
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={saveBusy || submitBusy}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
                      borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card-hover)',
                      color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Save size={13} /> {isTr ? 'Kaydet' : 'Save'}
                  </button>
                )}
                {editable && (
                  <button
                    type="button"
                    onClick={submitDraft}
                    disabled={saveBusy || submitBusy}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
                      borderRadius: 4, border: 'none', background: 'var(--fg)', color: 'var(--card)',
                      fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <Send size={13} /> {isTr ? 'Onaya gönder' : 'Submit'}
                  </button>
                )}
                {selectedDraft?.status === ManualOrderDraftStatus.AwaitingApproval && isAdmin && (
                  <>
                    <button type="button" onClick={() => setPendingAction('reject')} style={{ height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>{isTr ? 'Reddet' : 'Reject'}</button>
                    <button type="button" onClick={() => setPendingAction('approve')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 4, border: 'none', background: 'var(--fg)', color: 'var(--card)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}><ShieldCheck size={13} /> {isTr ? 'Onayla' : 'Approve'}</button>
                  </>
                )}
                {selectedDraft?.status === ManualOrderDraftStatus.ReadyToDispatch && isAdmin && (
                  <button type="button" onClick={() => setPendingAction('dispatch')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 4, border: 'none', background: 'var(--fg)', color: 'var(--card)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}><CloudUpload size={13} /> {isTr ? 'ERP’ye gönder' : 'Dispatch'}</button>
                )}
                {selectedDraft && (selectedDraft.status === ManualOrderDraftStatus.AwaitingApproval || selectedDraft.status === ManualOrderDraftStatus.Approved || selectedDraft.status === ManualOrderDraftStatus.ReadyToDispatch) && isAdmin && (
                  <button type="button" onClick={() => setPendingAction('reopen')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}><Pencil size={13} /> {isTr ? 'Düzenle' : 'Edit'}</button>
                )}
                {selectedDraft?.localOrderId && (
                  <Link href={`/orders/${selectedDraft.localOrderId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 4, border: 'none', background: 'var(--fg)', color: 'var(--card)', fontSize: 11.5, fontWeight: 700, textDecoration: 'none' }}><CheckCircle2 size={13} /> {isTr ? 'Siparişi aç' : 'Open'}</Link>
                )}
                {selectedDraft && selectedDraft.status !== ManualOrderDraftStatus.Cancelled && isAdmin && (
                  <button type="button" onClick={() => setPendingAction('cancel')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: '#f43f5e', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}><Trash2 size={13} /> {isTr ? 'Sil' : 'Delete'}</button>
                )}
              </div>
            </header>

            {/* Section 1: Sipariş Kalemleri */}
            <section data-tour="manual-orders-items" style={{ borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-soft)' }}>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
                  {isTr ? 'Sipariş Kalemleri' : 'Order Items'} ({editor.lines.length})
                </h2>
              </div>

              {/* Quick Search */}
              <div data-tour="manual-orders-picker" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-soft)' }}>
                <ProductQuickPicker search={productSearch} onSearchChange={setProductSearch} products={productsQuery.data ?? []} loading={productsQuery.isFetching} disabled={!editable} onAdd={addProduct} />
              </div>

              {/* Products Table */}
              {editor.lines.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>
                  {isTr ? 'Siparişe henüz ürün eklenmedi. Yukarıdan ürün arayabilirsiniz.' : 'No items added yet. Search products above.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-soft)' }}>
                        <th style={{ textAlign: 'left', padding: '7px 12px', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase' }}>{isTr ? 'Ürün Adı & SKU' : 'Product & SKU'}</th>
                        <th style={{ textAlign: 'center', padding: '7px 12px', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', width: 100 }}>{isTr ? 'Adet' : 'Qty'}</th>
                        <th style={{ textAlign: 'right', padding: '7px 12px', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', width: 120 }}>{isTr ? 'Birim Fiyat' : 'Unit Price'}</th>
                        <th style={{ textAlign: 'right', padding: '7px 12px', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', width: 110 }}>{isTr ? 'Toplam' : 'Total'}</th>
                        <th style={{ textAlign: 'center', padding: '7px 12px', color: 'var(--fg-muted)', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', width: 50 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editor.lines.map((line) => (
                        <tr key={line.productId} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--fg)' }}>{line.productName}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 10.5, color: 'var(--fg-muted)' }}>
                              {line.sku} {line.stockQuantity != null ? `· ${isTr ? 'Stok' : 'Stock'}: ${line.stockQuantity}` : ''}
                            </p>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-soft)', borderRadius: 4, background: 'var(--card)' }}>
                              <button type="button" disabled={!editable || line.quantity <= 1} onClick={() => updateLine(line.productId, { quantity: line.quantity - 1 })} style={{ padding: '3px 5px', border: 'none', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}><Minus size={11} /></button>
                              <span style={{ minWidth: 26, textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--fg)' }}>{line.quantity}</span>
                              <button type="button" disabled={!editable} onClick={() => updateLine(line.productId, { quantity: line.quantity + 1 })} style={{ padding: '3px 5px', border: 'none', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}><Plus size={11} /></button>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            <input
                              type="number" min={0} step="0.01" value={line.unitPrice} disabled={!editable}
                              onChange={(event) => updateLine(line.productId, { unitPrice: Math.max(0, Number(event.target.value)) })}
                              style={{
                                width: 90, padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border-soft)',
                                background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, textAlign: 'right', outline: 'none',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: 'var(--fg)' }}>
                            {money(line.quantity * line.unitPrice, 'TRY', lang)}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button
                              type="button" disabled={!editable}
                              onClick={() => setEditor({ ...editor, lines: editor.lines.filter((item) => item.productId !== line.productId) })}
                              style={{ border: 'none', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', display: 'inline-flex' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section 2: Müşteri, Adres ve Finansal Kartlar */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
              {/* Card 1: Müşteri Bilgileri */}
              <section data-tour="manual-orders-customer" style={{ borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)', padding: 12 }}>
                <h2 style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 700, color: 'var(--fg)' }}>
                  {isTr ? 'Müşteri Bilgileri' : 'Customer Info'}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                      {isTr ? 'Mağaza *' : 'Store *'}
                    </label>
                    <select
                      value={editor.storeId}
                      disabled={!editable || editor.lines.length > 0}
                      onChange={(e) => setEditor({ ...editor, storeId: Number(e.target.value), targetDataSourceIds: [] })}
                      style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                    >
                      {(contextQuery.data?.stores ?? []).map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                      {isTr ? 'Müşteri Adı *' : 'Customer Name *'}
                    </label>
                    <input
                      type="text" value={editor.customerName} disabled={!editable}
                      onChange={(e) => setEditor({ ...editor, customerName: e.target.value })}
                      style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                        {isTr ? 'Telefon' : 'Phone'}
                      </label>
                      <input
                        type="text" value={editor.customerPhone} disabled={!editable}
                        onChange={(e) => setEditor({ ...editor, customerPhone: e.target.value })}
                        style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                        {isTr ? 'E-posta' : 'Email'}
                      </label>
                      <input
                        type="email" value={editor.customerEmail} disabled={!editable}
                        onChange={(e) => setEditor({ ...editor, customerEmail: e.target.value })}
                        style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                      {isTr ? 'Sipariş Notu' : 'Order Note'}
                    </label>
                    <textarea
                      value={editor.note} disabled={!editable}
                      onChange={(e) => setEditor({ ...editor, note: e.target.value })} rows={2}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </section>

              {/* Card 2: Teslimat Adresi */}
              <section data-tour="manual-orders-address" style={{ borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)', padding: 12 }}>
                <h2 style={{ margin: '0 0 10px', fontSize: 12.5, fontWeight: 700, color: 'var(--fg)' }}>
                  {isTr ? 'Teslimat Adresi' : 'Delivery Address'}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                        {isTr ? 'Şehir *' : 'City *'}
                      </label>
                      <input
                        type="text" value={editor.shipCity} disabled={!editable}
                        onChange={(e) => setEditor({ ...editor, shipCity: e.target.value })}
                        style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                        {isTr ? 'İlçe' : 'District'}
                      </label>
                      <input
                        type="text" value={editor.shipDistrict} disabled={!editable}
                        onChange={(e) => setEditor({ ...editor, shipDistrict: e.target.value })}
                        style={{ width: '100%', height: 32, padding: '0 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                      {isTr ? 'Açık Adres *' : 'Address Line *'}
                    </label>
                    <textarea
                      value={editor.addressLine} disabled={!editable}
                      onChange={(e) => setEditor({ ...editor, addressLine: e.target.value })} rows={4}
                      style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </section>

              {/* Card 3: Hedef ERP & Finansal Özet */}
              <section data-tour="manual-orders-summary" style={{ borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)', padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--fg)' }}>
                    {isTr ? 'ERP ve Özet' : 'ERP & Summary'}
                  </h2>
                  <div data-tour="manual-orders-targets" style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setErpDropdownOpen((o) => !o)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 8px',
                        borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card-hover)',
                        color: 'var(--fg)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Layers size={11} /> {isTr ? 'ERP Hedefleri' : 'ERP Targets'} ({selectedTargetsCount}) <ChevronDown size={11} />
                    </button>
                    {erpDropdownOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setErpDropdownOpen(false)} />
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50,
                          background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 4,
                          boxShadow: 'var(--shadow-lg)', padding: 8, width: 220, display: 'flex', flexDirection: 'column', gap: 6,
                        }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--fg)', cursor: 'pointer' }}>
                            <CustomCheckbox checked={editor.keepLocally} onChange={() => setEditor({ ...editor, keepLocally: !editor.keepLocally })} />
                            <span>DEMO ERP ({isTr ? 'Yerel' : 'Local'})</span>
                          </label>
                          <div style={{ height: 1, background: 'var(--border-soft)', margin: '2px 0' }} />
                          {(contextQuery.data?.stores ?? []).flatMap((s) => s.erpSources).map((source) => (
                            <label key={source.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--fg)', cursor: 'pointer' }}>
                              <CustomCheckbox
                                checked={editor.targetDataSourceIds.includes(source.id)}
                                onChange={() => toggleSource(editor.storeId, source.id)}
                              />
                              <span>{source.name} <span style={{ color: 'var(--fg-muted)' }}>({source.connectorType} · {source.country})</span></span>
                              {/* Bkz. ProductEntryTabTargets — hedef secilebilir kalir, ama yazicisi
                                  olmayan ERP icin gonderimin basarisiz olacagi onceden soylenir. */}
                              {source.supportsDispatch === false && (
                                <span style={{
                                  padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                                  border: '1px solid rgba(244,63,94,0.25)', background: 'rgba(244,63,94,0.06)', color: '#fda4af',
                                }}>
                                  {isTr ? 'Gönderim desteklenmiyor' : 'Dispatch unsupported'}
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Seçili Hedefler: her zaman görünür, gizli sayaç değil */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {selectedTargetChips.length === 0 ? (
                    <span style={{
                      padding: '3px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                      border: '1px solid rgba(244,63,94,0.25)', background: 'rgba(244,63,94,0.06)', color: '#fda4af',
                    }}>
                      {isTr ? 'Hedef seçilmedi' : 'No destination selected'}
                    </span>
                  ) : (
                    selectedTargetChips.map((chip) => (
                      <span key={chip.key} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '3px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                        border: '1px solid var(--border-soft)', background: 'var(--card-hover)', color: 'var(--fg)',
                      }}>
                        {chip.label}
                        {chip.status && (
                          <span style={{ color: 'var(--fg-muted)', fontWeight: 600 }}>· {chip.status}</span>
                        )}
                      </span>
                    ))
                  )}
                </div>

                {/* Gönderim durumu iki yönlü gösterilir: kapalıyken "kaydedilir ama gitmez",
                    açıkken "gerçekten gidecek". Açık durum sessiz kalırsa kullanıcı gerçek bir
                    ERP yazımı tetiklediğini fark etmeden onaylayabilir. */}
                {contextQuery.data && editor.targetDataSourceIds.length > 0 && (
                  <p style={{
                    margin: '0 0 10px', padding: '7px 10px', borderRadius: 4,
                    border: contextQuery.data.externalDispatchEnabled
                      ? '1px solid rgba(245,158,11,0.28)' : '1px solid var(--border-soft)',
                    background: contextQuery.data.externalDispatchEnabled
                      ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
                    fontSize: 10.5,
                    color: contextQuery.data.externalDispatchEnabled ? 'var(--fg)' : 'var(--fg-muted)',
                  }}>
                    {contextQuery.data.dispatchNotice}
                  </p>
                )}

                {/* Kargo & İndirim */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                      {isTr ? 'Manuel Kargo (₺)' : 'Shipping (₺)'}
                    </label>
                    <input
                      type="number" min={0} step="0.01" value={editor.shippingAmount} disabled={!editable}
                      onChange={(e) => setEditor({ ...editor, shippingAmount: Math.max(0, Number(e.target.value)) })}
                      style={{ width: '100%', height: 30, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--fg-muted)', textTransform: 'uppercase', marginBottom: 3 }}>
                      {isTr ? 'İndirim (₺)' : 'Discount (₺)'}
                    </label>
                    <input
                      type="number" min={0} step="0.01" value={editor.discountAmount} disabled={!editable}
                      onChange={(e) => setEditor({ ...editor, discountAmount: Math.max(0, Number(e.target.value)) })}
                      style={{ width: '100%', height: 30, padding: '0 6px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 11.5, outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Özet ve Detaylar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11.5, borderTop: '1px solid var(--border-soft)', paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}>
                    <span>{isTr ? 'Ara Toplam:' : 'Subtotal:'}</span>
                    <span style={{ fontWeight: 600, color: 'var(--fg)' }}>{money(subtotal, 'TRY', lang)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-soft)', paddingTop: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--fg)' }}>{isTr ? 'Toplam:' : 'Total:'}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)' }}>{money(total, 'TRY', lang)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-muted)' }}>{isTr ? 'Tahmini Brüt Kâr:' : 'Est. Gross Profit:'}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: profitability.grossProfit >= 0 ? '#10b981' : '#f43f5e' }}>
                      {money(profitability.grossProfit, 'TRY', lang)}
                    </span>
                  </div>

                  {/* Detay Göster Tuşu */}
                  <button
                    type="button"
                    onClick={() => setShowCostDetails((s) => !s)}
                    style={{
                      marginTop: 4, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border-soft)',
                      background: 'var(--card-hover)', color: 'var(--fg-muted)', fontSize: 10.5, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <span>{isTr ? 'Maliyet Detayları' : 'Cost Breakdown'}</span>
                    {showCostDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showCostDetails && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: 6, borderRadius: 4, background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', fontSize: 10.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}>
                        <span>{isTr ? 'Ürün Maliyeti:' : 'Buying Cost:'}</span>
                        <span style={{ color: 'var(--fg)' }}>-{money(profitability.buying, 'TRY', lang)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}>
                        <span>{isTr ? 'Kutu Maliyeti:' : 'Box Cost:'}</span>
                        <span style={{ color: 'var(--fg)' }}>-{money(profitability.boxes, 'TRY', lang)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}>
                        <span>{isTr ? 'Kargo Maliyeti:' : 'Shipping Cost:'}</span>
                        <span style={{ color: 'var(--fg)' }}>-{money(profitability.shipping, 'TRY', lang)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--fg-muted)' }}>
                        <span>{isTr ? 'Liste Toplamı:' : 'List Total:'}</span>
                        <span style={{ color: 'var(--fg)' }}>{money(profitability.listTotal, 'TRY', lang)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>
        )}
      </div>

      <ManualOrderActionDialog action={pendingAction} orderNumber={selectedDraft?.draftNumber ?? ''} busy={actionBusy} onClose={() => setPendingAction(null)} onConfirm={(reason) => { void executeAction(reason); }} />
    </div>
  );
}
