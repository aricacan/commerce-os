'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { warehouseApi, type WmsReceivingDocument, type WmsLocation } from '../../lib/api';
import { RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { WmsScannerModal } from './WmsScannerModal';
import { useWmsAlert } from '../../stores/wms-alert';
import { TAB_CENTER_STYLE } from './shared';

export function ReceivingTab({ warehouseId }: { warehouseId: number }) {
  const currentUserEmail = useAuthStore((s) => s.user?.email) ?? 'bilinmeyen-kullanici';
  const wmsAlert = useWmsAlert();
  const { data: locations } = useQuery({ queryKey: ['wms-locations', warehouseId], queryFn: () => warehouseApi.listLocations(warehouseId) });
  const { data: levelTypes } = useQuery({ queryKey: ['wms-level-types', warehouseId], queryFn: () => warehouseApi.listLevelTypes(warehouseId) });
  const { data: documents, refetch } = useQuery({ queryKey: ['wms-receiving-docs', warehouseId], queryFn: () => warehouseApi.getOpenReceivingDocuments(warehouseId) });

  const [showNewDoc, setShowNewDoc] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [receivingLocationId, setReceivingLocationId] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [newLineProductId, setNewLineProductId] = useState('');
  const [newLineQty, setNewLineQty] = useState('');
  const [scannerOpenFor, setScannerOpenFor] = useState<number | null>(null);
  const [acceptQty, setAcceptQty] = useState<Record<number, string>>({});

  // Faz 13 — iade. Mal kabuldeki belge akışı yok: tara → lokasyon seç → gönder.
  const [showReturn, setShowReturn] = useState(false);
  const [returnProductId, setReturnProductId] = useState('');
  const [returnLocationId, setReturnLocationId] = useState<number | ''>('');
  const [returnQty, setReturnQty] = useState('');
  const [returnScannerOpen, setReturnScannerOpen] = useState(false);
  const [returnResult, setReturnResult] = useState<string | null>(null);

  async function handleCreateDocument() {
    if (!supplierName.trim() || receivingLocationId === '') return;
    setBusy(true);
    try {
      await warehouseApi.createReceivingDocument({
        warehouseId, receivingLocationId: Number(receivingLocationId),
        supplierName: supplierName.trim(), note: null, createdByUserName: currentUserEmail,
      });
      setSupplierName(''); setReceivingLocationId(''); setShowNewDoc(false);
      refetch();
    } catch (err) {
      console.error('Belge oluşturulamadı:', err);
      wmsAlert.show('Belge oluşturulamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddLine(docId: number) {
    const productId = Number(newLineProductId);
    const qty = Number(newLineQty);
    if (!productId || !qty || qty <= 0) return;
    setBusy(true);
    try {
      await warehouseApi.addReceivingLine(docId, { productId, expectedQuantity: qty });
      setNewLineProductId(''); setNewLineQty('');
      refetch();
    } catch (err) {
      console.error('Satır eklenemedi:', err);
      wmsAlert.show('Satır eklenemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleScanForLine(docId: number, raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Product' || !result.productId) {
        wmsAlert.show('Bu bir ürün barkodu değil.');
        return;
      }
      setNewLineProductId(String(result.productId));
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(docId: number, lineId: number) {
    const qty = Number(acceptQty[lineId]);
    if (!qty || qty < 0) return;
    setBusy(true);
    try {
      await warehouseApi.acceptReceivingLine(docId, lineId, { acceptedQuantity: qty, userName: currentUserEmail, qualityNote: null });
      refetch();
    } catch (err) {
      console.error('Satır kabul edilemedi:', err);
      wmsAlert.show('Satır kabul edilemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(docId: number, lineId: number) {
    const note = window.prompt('Red nedeni:');
    if (note === null) return;
    setBusy(true);
    try {
      await warehouseApi.rejectReceivingLine(docId, lineId, note);
      refetch();
    } catch (err) {
      console.error('Satır reddedilemedi:', err);
      wmsAlert.show('Satır reddedilemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReturnScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Product' || !result.productId) {
        wmsAlert.show('Bu bir ürün barkodu değil.');
        return;
      }
      setReturnProductId(String(result.productId));
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleReturnSubmit() {
    const productId = Number(returnProductId);
    const qty = Number(returnQty);
    if (!productId || returnLocationId === '' || !qty || qty <= 0) return;
    setBusy(true);
    try {
      const result = await warehouseApi.returnStock({
        productId, toLocationId: Number(returnLocationId), quantity: qty,
        userName: currentUserEmail, idempotencyKey: crypto.randomUUID(), note: null,
      });
      setReturnResult(result.isQuarantine
        ? `Karantinaya alındı — yeni miktar: ${result.newQuantity}`
        : `Rafa eklendi — yeni miktar: ${result.newQuantity}`);
      setReturnProductId(''); setReturnQty(''); setReturnLocationId('');
    } catch (err) {
      console.error('İade işlenemedi:', err);
      wmsAlert.show('İade işlenemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  const btnStyle: React.CSSProperties = {
    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)',
    background: 'var(--card)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
    <div style={TAB_CENTER_STYLE}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 140 }}>
          <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginBottom: 4 }}>Açık Mal Kabul Belgesi</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{documents?.length ?? 0}</p>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 140 }}>
          <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginBottom: 4 }}>Bekleyen Satır</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>
            {documents?.reduce((sum, d) => sum + d.lines.filter((l) => l.status === 'Pending').length, 0) ?? 0}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button style={btnStyle} onClick={() => setShowNewDoc(!showNewDoc)}>
          {showNewDoc ? 'İptal' : '+ Yeni Mal Kabul Belgesi'}
        </button>
        <button style={btnStyle} onClick={() => { setShowReturn(!showReturn); setReturnResult(null); }}>
          <RotateCcw size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
          {showReturn ? 'İptal' : 'İade Al'}
        </button>
      </div>

      {showReturn && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20, maxWidth: 360 }}>
          <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>İade — Ürün Kabulü</p>

          {returnResult && (
            <p style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 10 }}>{returnResult}</p>
          )}

          <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Ürün</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 12 }}>
            <input placeholder="ürün ID" value={returnProductId} onChange={(e) => setReturnProductId(e.target.value)}
              style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', background: 'var(--bg)', color: 'var(--fg)' }} />
            <button style={btnStyle} onClick={() => setReturnScannerOpen(true)}>Tara</button>
          </div>

          <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Hedef Lokasyon</label>
          <select value={returnLocationId} onChange={(e) => setReturnLocationId(Number(e.target.value))}
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 12, background: 'var(--bg)', color: 'var(--fg)' }}>
            <option value="">Seç...</option>
            {locations
              ?.filter((l) => levelTypes?.find((lt) => lt.id === l.levelTypeId)?.holdsStock)
              .map((l: WmsLocation) => {
                const lt = levelTypes?.find((t) => t.id === l.levelTypeId);
                return <option key={l.id} value={l.id}>{l.fullCode}{lt?.isQuarantine ? ' (Karantina)' : ''}</option>;
              })}
          </select>

          <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Miktar</label>
          <input type="number" value={returnQty} onChange={(e) => setReturnQty(e.target.value)}
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 12, background: 'var(--bg)', color: 'var(--fg)' }} />

          <button style={btnStyle} onClick={handleReturnSubmit} disabled={busy}>{busy ? 'Kaydediliyor...' : 'İadeyi İşle'}</button>
        </div>
      )}

      <WmsScannerModal
        open={returnScannerOpen}
        onClose={() => setReturnScannerOpen(false)}
        onScan={(raw) => { setReturnScannerOpen(false); void handleReturnScan(raw); }}
      />

      {showNewDoc && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20, maxWidth: 360 }}>
          <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Tedarikçi</label>
          <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)}
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 12, background: 'var(--bg)', color: 'var(--fg)' }} />
          <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Kabul Lokasyonu</label>
          <select value={receivingLocationId} onChange={(e) => setReceivingLocationId(Number(e.target.value))}
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 12, background: 'var(--bg)', color: 'var(--fg)' }}>
            <option value="">Seç...</option>
            {locations
              ?.filter((l) => levelTypes?.find((lt) => lt.id === l.levelTypeId)?.holdsStock)
              .map((l: WmsLocation) => <option key={l.id} value={l.id}>{l.fullCode}</option>)}
          </select>
          <button style={btnStyle} onClick={handleCreateDocument} disabled={busy}>{busy ? 'Kaydediliyor...' : 'Oluştur'}</button>
        </div>
      )}

      {documents?.map((doc: WmsReceivingDocument) => (
        <div key={doc.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{doc.supplierName} — {doc.status}</p>

          {doc.lines.map((line) => (
            <div key={line.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ flex: 1 }}>Ürün #{line.productId} — beklenen: {line.expectedQuantity} — durum: {line.status}</span>
              {line.status === 'Pending' && (
                <>
                  <input type="number" placeholder="miktar" value={acceptQty[line.id] ?? ''} onChange={(e) => setAcceptQty({ ...acceptQty, [line.id]: e.target.value })}
                    style={{ width: 80, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }} />
                  <button style={btnStyle} onClick={() => handleAccept(doc.id, line.id)} disabled={busy}>Kabul Et</button>
                  <button style={{ ...btnStyle, background: 'transparent' }} onClick={() => handleReject(doc.id, line.id)} disabled={busy}>Reddet</button>
                </>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={btnStyle} onClick={() => setScannerOpenFor(doc.id)}>Ürün Tara</button>
            <input placeholder="ürün ID" value={activeDocId === doc.id ? newLineProductId : ''} onChange={(e) => { setActiveDocId(doc.id); setNewLineProductId(e.target.value); }}
              style={{ width: 90, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }} />
            <input type="number" placeholder="beklenen miktar" value={activeDocId === doc.id ? newLineQty : ''} onChange={(e) => { setActiveDocId(doc.id); setNewLineQty(e.target.value); }}
              style={{ width: 110, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }} />
            <button style={btnStyle} onClick={() => handleAddLine(doc.id)} disabled={busy}>Satır Ekle</button>
          </div>
        </div>
      ))}

      {(!documents || documents.length === 0) && !showNewDoc && (
        <p style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Açık mal kabul belgesi yok.</p>
      )}

      <WmsScannerModal
        open={scannerOpenFor !== null}
        onClose={() => setScannerOpenFor(null)}
        onScan={(raw) => { if (scannerOpenFor !== null) { setActiveDocId(scannerOpenFor); void handleScanForLine(scannerOpenFor, raw); } }}
      />
    </div>
    </div>
  );
}
