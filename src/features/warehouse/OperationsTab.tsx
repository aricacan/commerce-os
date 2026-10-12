'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { warehouseApi, type WmsBarcodeResolveResult, type WmsLocationStock, type WmsCountSession } from '../../lib/api';
import { WmsScannerModal } from './WmsScannerModal';
import { useAuthStore } from '../../stores/auth';
import { useWmsAlert } from '../../stores/wms-alert';
import { TAB_CENTER_STYLE } from './shared';

const ABC_COLOR: Record<string, string> = { A: '#dc2626', B: '#d97706', C: 'var(--fg-muted)' };

type Mode = 'idle' | 'lookup' | 'putaway-product' | 'putaway-location' | 'putaway-qty' | 'count-location' | 'count-items' | 'transfer-product' | 'transfer-source' | 'transfer-dest' | 'transfer-qty';

export function OperationsTab({ warehouseId }: { warehouseId: number }) {
  const currentUserEmail = useAuthStore((s) => s.user?.email) ?? 'bilinmeyen-kullanici';
  const wmsAlert = useWmsAlert();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [lookupResult, setLookupResult] = useState<WmsBarcodeResolveResult | null>(null);
  const [lookupDetail, setLookupDetail] = useState<WmsLocationStock[] | null>(null);
  const [putAwayProduct, setPutAwayProduct] = useState<number | null>(null);
  const [putAwayLocation, setPutAwayLocation] = useState<{ id: number; fullCode: string } | null>(null);
  const [putAwayQty, setPutAwayQty] = useState('');
  const [transferProduct, setTransferProduct] = useState<number | null>(null);
  const [transferSource, setTransferSource] = useState<{ id: number; fullCode: string } | null>(null);
  const [transferDest, setTransferDest] = useState<{ id: number; fullCode: string } | null>(null);
  const [transferQty, setTransferQty] = useState('');
  const [countSession, setCountSession] = useState<WmsCountSession | null>(null);
  const [countLocationCode, setCountLocationCode] = useState('');
  const [countProduct, setCountProduct] = useState<number | null>(null);
  const [countQty, setCountQty] = useState('');
  const [busy, setBusy] = useState(false);
  const [minQtyInput, setMinQtyInput] = useState<Record<string, string>>({});
  const { data: countSchedule } = useQuery({ queryKey: ['wms-count-schedule', warehouseId], queryFn: () => warehouseApi.getCountScheduleDue(warehouseId) });
  const { data: replenishment } = useQuery({ queryKey: ['wms-replenishment', warehouseId], queryFn: () => warehouseApi.getReplenishmentAlerts(warehouseId) });

  async function handleStartCountDirect(locationId: number, locationFullCode: string) {
    setBusy(true);
    try {
      const session = await warehouseApi.startCount(locationId, currentUserEmail);
      setCountSession(session);
      setCountLocationCode(locationFullCode);
      setMode('count-items');
    } catch (err) {
      console.error('Sayım başlatılamadı:', err);
      wmsAlert.show('Sayım başlatılamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveMinQty(locationId: number, productId: number) {
    const key = `${locationId}-${productId}`;
    const raw = minQtyInput[key];
    const value = raw?.trim() === '' ? null : Number(raw);
    setBusy(true);
    try {
      const updated = await warehouseApi.setMinQty(locationId, productId, value);
      setLookupDetail((prev) => prev?.map((d) => (d.locationId === locationId && d.productId === productId ? updated : d)) ?? null);
      wmsAlert.show('İkmal eşiği kaydedildi.', 'success');
    } catch (err) {
      console.error('Eşik kaydedilemedi:', err);
      wmsAlert.show('Eşik kaydedilemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLookupScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      setLookupResult(result);
      if (result.kind === 'Product' && result.productId) {
        setLookupDetail(await warehouseApi.getProductLocations(result.productId));
      } else if (result.kind === 'Location' && result.locationId) {
        setLookupDetail(await warehouseApi.getLocationStock(result.locationId));
      } else {
        setLookupDetail(null);
      }
    } catch (err) {
      console.error('Barkod sorgulanamadı:', err);
      wmsAlert.show('Barkod sorgulanamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePutAwayProductScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Product' || !result.productId) {
        wmsAlert.show('Bu bir ürün barkodu değil.');
        return;
      }
      setPutAwayProduct(result.productId);
      setMode('putaway-location');
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePutAwayLocationScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Location' || !result.locationId || !result.locationFullCode) {
        wmsAlert.show('Bu bir raf barkodu değil.');
        return;
      }
      setPutAwayLocation({ id: result.locationId, fullCode: result.locationFullCode });
      setMode('putaway-qty');
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePutAwayConfirm() {
    const qty = Number(putAwayQty);
    if (!putAwayProduct || !putAwayLocation || !qty || qty <= 0) return;
    setBusy(true);
    try {
      await warehouseApi.putAway({
        productId: putAwayProduct, toLocationId: putAwayLocation.id, quantity: qty,
        userName: currentUserEmail, idempotencyKey: crypto.randomUUID(), sourceDocument: null,
      });
      wmsAlert.show(`${qty} adet ${putAwayLocation.fullCode} rafına yerleştirildi.`, 'success');
      resetAll();
    } catch (err) {
      console.error('Yerleştirme başarısız:', err);
      wmsAlert.show('Yerleştirme başarısız, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTransferProductScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Product' || !result.productId) {
        wmsAlert.show('Bu bir ürün barkodu değil.');
        return;
      }
      setTransferProduct(result.productId);
      setMode('transfer-source');
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTransferSourceScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Location' || !result.locationId || !result.locationFullCode) {
        wmsAlert.show('Bu bir raf barkodu değil.');
        return;
      }
      setTransferSource({ id: result.locationId, fullCode: result.locationFullCode });
      setMode('transfer-dest');
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTransferDestScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Location' || !result.locationId || !result.locationFullCode) {
        wmsAlert.show('Bu bir raf barkodu değil.');
        return;
      }
      setTransferDest({ id: result.locationId, fullCode: result.locationFullCode });
      setMode('transfer-qty');
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleTransferConfirm() {
    const qty = Number(transferQty);
    if (!transferProduct || !transferSource || !transferDest || !qty || qty <= 0) return;
    setBusy(true);
    try {
      await warehouseApi.transfer({
        productId: transferProduct, fromLocationId: transferSource.id, toLocationId: transferDest.id,
        quantity: qty, userName: currentUserEmail, idempotencyKey: crypto.randomUUID(),
      });
      wmsAlert.show(`${qty} adet ${transferSource.fullCode} → ${transferDest.fullCode} transfer edildi.`, 'success');
      resetAll();
    } catch (err) {
      console.error('Transfer başarısız:', err);
      wmsAlert.show('Transfer başarısız, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCountLocationScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Location' || !result.locationId || !result.locationFullCode) {
        wmsAlert.show('Bu bir raf barkodu değil.');
        return;
      }
      const session = await warehouseApi.startCount(result.locationId, currentUserEmail);
      setCountSession(session);
      setCountLocationCode(result.locationFullCode);
      setMode('count-items');
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCountProductScan(raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Product' || !result.productId) {
        wmsAlert.show('Bu bir ürün barkodu değil.');
        return;
      }
      setCountProduct(result.productId);
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddCountLine() {
    const qty = Number(countQty);
    if (!countSession || !countProduct || countQty === '' || qty < 0) return;
    setBusy(true);
    try {
      await warehouseApi.addCountLine(countSession.id, { productId: countProduct, countedQuantity: qty, varianceReason: null });
      setCountProduct(null);
      setCountQty('');
    } catch (err) {
      console.error('Sayım satırı eklenemedi:', err);
      wmsAlert.show('Sayım satırı eklenemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFinishCount() {
    if (!countSession) return;
    setBusy(true);
    try {
      const result = await warehouseApi.approveCount(countSession.id, currentUserEmail);
      wmsAlert.show(result.hasVariance ? 'Sayım tamamlandı, fark bulundu ve düzeltildi.' : 'Sayım tamamlandı, fark yok.', 'success');
      resetAll();
    } catch (err) {
      console.error('Sayım onaylanamadı:', err);
      wmsAlert.show('Sayım onaylanamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  function resetAll() {
    setMode('idle');
    setLookupResult(null); setLookupDetail(null);
    setPutAwayProduct(null); setPutAwayLocation(null); setPutAwayQty('');
    setTransferProduct(null); setTransferSource(null); setTransferDest(null); setTransferQty('');
    setCountSession(null); setCountLocationCode(''); setCountProduct(null); setCountQty('');
  }

  async function handleCancelCount() {
    if (countSession) {
      try {
        await warehouseApi.cancelCount(countSession.id);
      } catch (err) {
        console.error('Sayım iptal edilemedi:', err);
      }
    }
    resetAll();
  }

  function openScannerFor(newMode: Mode) {
    setMode(newMode);
    setScannerOpen(true);
  }

  function handleScan(raw: string) {
    if (mode === 'lookup') void handleLookupScan(raw);
    else if (mode === 'putaway-product') void handlePutAwayProductScan(raw);
    else if (mode === 'putaway-location') void handlePutAwayLocationScan(raw);
    else if (mode === 'count-location') void handleCountLocationScan(raw);
    else if (mode === 'transfer-product') void handleTransferProductScan(raw);
    else if (mode === 'transfer-source') void handleTransferSourceScan(raw);
    else if (mode === 'transfer-dest') void handleTransferDestScan(raw);
  }

  const btnStyle: React.CSSProperties = {
    padding: '10px 18px', borderRadius: 10, border: '1px solid var(--border-soft)',
    background: 'var(--card)', color: 'var(--fg)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
    <div style={TAB_CENTER_STYLE}>
      {mode === 'idle' && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 140 }}>
              <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginBottom: 4 }}>Bugün Sayılacak Raf</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: (countSchedule?.totalDue ?? 0) > 0 ? '#d97706' : 'var(--fg)' }}>{countSchedule?.totalDue ?? 0}</p>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 140 }}>
              <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginBottom: 4 }}>İkmal Gereken Raf</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: (replenishment?.length ?? 0) > 0 ? '#dc2626' : 'var(--fg)' }}>{replenishment?.length ?? 0}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            <button style={btnStyle} onClick={() => openScannerFor('lookup')}>Sorgula</button>
            <button style={btnStyle} onClick={() => openScannerFor('putaway-product')}>Rafa Yerleştir</button>
            <button style={btnStyle} onClick={() => openScannerFor('count-location')}>Say</button>
            <button style={btnStyle} onClick={() => openScannerFor('transfer-product')}>Transfer Et</button>
          </div>

          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClipboardList size={13} style={{ color: 'var(--fg-muted)' }} />
            Bugün Sayılması Önerilen Raflar
          </p>
          {!countSchedule || countSchedule.dueLocations.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Bugün için önerilen raf yok.</p>
          ) : (
            countSchedule.dueLocations.map((d) => (
              <div key={d.locationId} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: ABC_COLOR[d.abcClass], width: 18 }}>{d.abcClass}</span>
                <span style={{ flex: 1 }}>
                  <strong>{d.locationFullCode}</strong> — {d.lastCountedAt ? `${d.overdueDays} gün gecikti` : 'hiç sayılmadı'}
                </span>
                <button style={btnStyle} onClick={() => handleStartCountDirect(d.locationId, d.locationFullCode)} disabled={busy}>Sayıma Başla</button>
              </div>
            ))
          )}
        </>
      )}

      {mode === 'putaway-product' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>Ürün barkodunu taramak için hazır.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={() => setScannerOpen(true)}>Tekrar Tara</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'count-location' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>Raf barkodunu taramak için hazır.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={() => setScannerOpen(true)}>Tekrar Tara</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'transfer-product' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>Ürün barkodunu taramak için hazır.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={() => setScannerOpen(true)}>Tekrar Tara</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'transfer-source' && transferProduct && (
        <div style={{ marginTop: 16 }}>
          <p>Ürün #{transferProduct} seçildi. Şimdi kaynak raf barkodunu tara.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={btnStyle} onClick={() => setScannerOpen(true)}>Kaynak Raf Tara</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'transfer-dest' && transferSource && (
        <div style={{ marginTop: 16 }}>
          <p>Kaynak: {transferSource.fullCode}. Şimdi hedef raf barkodunu tara.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={btnStyle} onClick={() => setScannerOpen(true)}>Hedef Raf Tara</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'transfer-qty' && transferSource && transferDest && (
        <div style={{ marginTop: 16, maxWidth: 320 }}>
          <p style={{ marginBottom: 8 }}>{transferSource.fullCode} → {transferDest.fullCode}: kaç adet?</p>
          <input type="number" value={transferQty} onChange={(e) => setTransferQty(e.target.value)}
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginBottom: 10, background: 'var(--bg)', color: 'var(--fg)' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={handleTransferConfirm} disabled={busy}>{busy ? 'Kaydediliyor...' : 'Onayla'}</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll} disabled={busy}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'lookup' && lookupResult && (
        <div style={{ marginTop: 16 }}>
          {lookupResult.kind === 'Unknown' && <p style={{ color: 'var(--fg-muted)' }}>Bilinmeyen barkod.</p>}
          {lookupResult.kind === 'Product' && <p style={{ fontWeight: 700, marginBottom: 8 }}>Ürün #{lookupResult.productId} — bulunduğu raflar:</p>}
          {lookupResult.kind === 'Location' && <p style={{ fontWeight: 700, marginBottom: 8 }}>{lookupResult.locationFullCode} rafındaki ürünler:</p>}
          {lookupDetail?.map((d) => {
            const key = `${d.locationId}-${d.productId}`;
            return (
              <div key={key} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>
                  {lookupResult.kind === 'Product' ? `${d.locationFullCode}: ${d.quantity} adet` : `Ürün #${d.productId}: ${d.quantity} adet`}
                  {d.minQty != null && <span style={{ color: d.quantity < d.minQty ? '#dc2626' : 'var(--fg-muted)' }}> (eşik: {d.minQty})</span>}
                </span>
                <input
                  type="number" placeholder="ikmal eşiği"
                  value={minQtyInput[key] ?? (d.minQty ?? '')}
                  onChange={(e) => setMinQtyInput({ ...minQtyInput, [key]: e.target.value })}
                  style={{ width: 100, height: 28, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12 }}
                />
                <button style={{ ...btnStyle, padding: '4px 10px', fontSize: 11.5 }} onClick={() => handleSaveMinQty(d.locationId, d.productId)} disabled={busy}>Kaydet</button>
              </div>
            );
          })}
          <button style={{ ...btnStyle, marginTop: 12 }} onClick={resetAll}>Kapat</button>
        </div>
      )}

      {mode === 'putaway-location' && putAwayProduct && (
        <div style={{ marginTop: 16 }}>
          <p>Ürün #{putAwayProduct} seçildi. Şimdi raf barkodunu tara.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button style={btnStyle} onClick={() => setScannerOpen(true)}>Raf Tara</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'putaway-qty' && putAwayLocation && (
        <div style={{ marginTop: 16, maxWidth: 280 }}>
          <p style={{ marginBottom: 8 }}>{putAwayLocation.fullCode} rafına kaç adet?</p>
          <input type="number" value={putAwayQty} onChange={(e) => setPutAwayQty(e.target.value)}
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginBottom: 10, background: 'var(--bg)', color: 'var(--fg)' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnStyle} onClick={handlePutAwayConfirm} disabled={busy}>{busy ? 'Kaydediliyor...' : 'Onayla'}</button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={resetAll} disabled={busy}>İptal</button>
          </div>
        </div>
      )}

      {mode === 'count-items' && countSession && (
        <div style={{ marginTop: 16, maxWidth: 360 }}>
          <p style={{ fontWeight: 700, marginBottom: 10 }}>{countLocationCode} sayımı</p>
          {!countProduct ? (
            <button style={btnStyle} onClick={() => setScannerOpen(true)}>Ürün Tara</button>
          ) : (
            <div>
              <p style={{ marginBottom: 8 }}>Ürün #{countProduct} — miktar:</p>
              <input type="number" value={countQty} onChange={(e) => setCountQty(e.target.value)}
                style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginBottom: 10, background: 'var(--bg)', color: 'var(--fg)' }} />
              <button style={btnStyle} onClick={handleAddCountLine} disabled={busy}>Satırı Ekle</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...btnStyle, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }} onClick={handleFinishCount} disabled={busy}>
              Sayımı Bitir
            </button>
            <button style={{ ...btnStyle, background: 'transparent' }} onClick={handleCancelCount} disabled={busy}>İptal</button>
          </div>
        </div>
      )}

      <WmsScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(raw) => {
          if (mode === 'count-items') void handleCountProductScan(raw);
          else handleScan(raw);
        }}
      />
    </div>
    </div>
  );
}
