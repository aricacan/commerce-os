'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Route, PackageCheck, Truck, Boxes } from 'lucide-react';
import { warehouseApi, type WmsPickingTask, type WmsPickingLine } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import { WmsScannerModal } from './WmsScannerModal';
import { useWmsAlert } from '../../stores/wms-alert';
import { TAB_CENTER_STYLE } from './shared';
import { PickingWavePanel } from './PickingWavePanel';
import { useRouter } from 'next/navigation';
import { workspaceRoute } from '../../lib/workspace-routes';
import { useShipmentPrefill } from '../../stores/shipment-prefill';

const PACKAGE_SIZES = [
  { key: 'Small', label: 'Küçük (S)' },
  { key: 'Medium', label: 'Orta (M)' },
  { key: 'Large', label: 'Büyük (L)' },
] as const;

type LineGroup = { kitGroupKey: string; kitProductId: number | null; lines: WmsPickingLine[] } | { kitGroupKey: null; lines: [WmsPickingLine] };

// Kit satırı eklenince aynı KitGroupKey'i taşıyan birden fazla PickingLine oluşur
// (bkz. backend AddLineAsync) — burada ekranda tek başlık altında toplanır.
function groupLinesByKit(lines: WmsPickingLine[]): LineGroup[] {
  const groups: LineGroup[] = [];
  const seenKits = new Map<string, LineGroup>();
  for (const line of lines) {
    if (line.kitGroupKey) {
      const existing = seenKits.get(line.kitGroupKey);
      if (existing) {
        existing.lines.push(line);
      } else {
        const group: LineGroup = { kitGroupKey: line.kitGroupKey, kitProductId: line.kitProductId, lines: [line] };
        seenKits.set(line.kitGroupKey, group);
        groups.push(group);
      }
    } else {
      groups.push({ kitGroupKey: null, lines: [line] });
    }
  }
  return groups;
}

export function PickingTab({ warehouseId }: { warehouseId: number }) {
  const currentUserEmail = useAuthStore((s) => s.user?.email) ?? 'bilinmeyen-kullanici';
  const wmsAlert = useWmsAlert();
  const { data: tasks, refetch } = useQuery({ queryKey: ['wms-picking-tasks', warehouseId], queryFn: () => warehouseApi.getOpenPickingTasks(warehouseId) });

  const [showNewTask, setShowNewTask] = useState(false);
  const [orderReference, setOrderReference] = useState('');
  const [busy, setBusy] = useState(false);

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [newLineProductId, setNewLineProductId] = useState('');
  const [newLineQty, setNewLineQty] = useState('');
  const [productScannerFor, setProductScannerFor] = useState<number | null>(null);
  const [pickingLineId, setPickingLineId] = useState<number | null>(null);
  const [locationScannerFor, setLocationScannerFor] = useState<number | null>(null);
  const [pickQty, setPickQty] = useState<Record<number, string>>({});

  // Dalga akışı: birden fazla siparişi tek turda toplamak için seçim + oluşturulan dalgalar.
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [activeWaveIds, setActiveWaveIds] = useState<number[]>([]);
  const [creatingWave, setCreatingWave] = useState(false);

  // Paketleme (Faz 8): tüm satırları toplanmış (ReadyToPack) bir görev için kutu
  // boyutu + ağırlık/desi seçimi. Paketlenince görev listeden kalkıyor (Completed
  // olduğu için) — o an "Kargo Oluştur" fırsatını kaçırmamak için ayrı state'te tutulur.
  const [packageSize, setPackageSize] = useState<Record<number, typeof PACKAGE_SIZES[number]['key']>>({});
  const [packWeight, setPackWeight] = useState<Record<number, string>>({});
  const [packDesi, setPackDesi] = useState<Record<number, string>>({});
  const [justPacked, setJustPacked] = useState<{ orderReference: string; weightKg: number | null; desi: number | null } | null>(null);
  const router = useRouter();
  const setShipmentPrefill = useShipmentPrefill((s) => s.setPrefill);

  async function handlePack(task: WmsPickingTask) {
    const size = packageSize[task.id] ?? 'Small';
    const weightKg = packWeight[task.id] ? Number(packWeight[task.id]) : null;
    const desi = packDesi[task.id] ? Number(packDesi[task.id]) : null;
    setBusy(true);
    try {
      await warehouseApi.packPickingTask(task.id, { packageSize: size, weightKg, desi });
      setJustPacked({ orderReference: task.orderReference, weightKg, desi });
      refetch();
    } catch (err) {
      console.error('Paketlenemedi:', err);
      wmsAlert.show('Paketlenemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  function handleGoToShipping() {
    if (!justPacked) return;
    setShipmentPrefill({
      orderNumber: justPacked.orderReference,
      weightKg: justPacked.weightKg ?? undefined,
      desi: justPacked.desi ?? undefined,
    });
    router.push(workspaceRoute('logistics'));
    setJustPacked(null);
  }

  function toggleTaskSelection(taskId: number) {
    setSelectedTaskIds((ids) => ids.includes(taskId) ? ids.filter((id) => id !== taskId) : [...ids, taskId]);
  }

  async function handleCreateWave() {
    if (selectedTaskIds.length < 2) return;
    setCreatingWave(true);
    try {
      const wave = await warehouseApi.createPickingWave({ warehouseId, taskIds: selectedTaskIds });
      setActiveWaveIds((ids) => [...ids, wave.id]);
      setSelectedTaskIds([]);
      refetch();
    } catch (err) {
      console.error('Dalga oluşturulamadı:', err);
      wmsAlert.show('Dalga oluşturulamadı, tekrar deneyin.');
    } finally {
      setCreatingWave(false);
    }
  }

  async function handleCreateTask() {
    if (!orderReference.trim()) return;
    setBusy(true);
    try {
      await warehouseApi.createPickingTask({ warehouseId, orderReference: orderReference.trim(), assignedUserName: currentUserEmail });
      setOrderReference(''); setShowNewTask(false);
      refetch();
    } catch (err) {
      console.error('Görev oluşturulamadı:', err);
      wmsAlert.show('Görev oluşturulamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddLine(taskId: number) {
    const productId = Number(newLineProductId);
    const qty = Number(newLineQty);
    if (!productId || !qty || qty <= 0) return;
    setBusy(true);
    try {
      await warehouseApi.addPickingLine(taskId, { productId, requiredQuantity: qty });
      setNewLineProductId(''); setNewLineQty('');
      refetch();
    } catch (err) {
      console.error('Satır eklenemedi:', err);
      wmsAlert.show('Satır eklenemedi, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleScanForNewLine(taskId: number, raw: string) {
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Product' || !result.productId) {
        wmsAlert.show('Bu bir ürün barkodu değil.');
        return;
      }
      setActiveTaskId(taskId);
      setNewLineProductId(String(result.productId));
    } catch (err) {
      console.error('Barkod okunamadı:', err);
      wmsAlert.show('Barkod okunamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  }

  async function handleScanLocationForPick(taskId: number, lineId: number, raw: string) {
    const qty = Number(pickQty[lineId]);
    if (!qty || qty <= 0) { wmsAlert.show('Önce miktar girin.'); return; }
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Location' || !result.locationId) {
        wmsAlert.show('Bu bir raf barkodu değil.');
        return;
      }
      await warehouseApi.pickLine(taskId, lineId, { fromLocationId: result.locationId, pickedQuantity: qty, userName: currentUserEmail });
      refetch();
    } catch (err) {
      console.error('Toplama başarısız:', err);
      wmsAlert.show('Toplama başarısız, tekrar deneyin.');
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
          <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginBottom: 4 }}>Açık Toplama Görevi</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{tasks?.filter((t) => !t.waveId || t.status === 'ReadyToPack').length ?? 0}</p>
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', minWidth: 140 }}>
          <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', marginBottom: 4 }}>Paketlemeye Hazır</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{tasks?.filter((t) => t.status === 'ReadyToPack').length ?? 0}</p>
        </div>
      </div>

      <button style={{ ...btnStyle, marginBottom: 16 }} onClick={() => setShowNewTask(!showNewTask)}>
        {showNewTask ? 'İptal' : '+ Yeni Toplama Görevi'}
      </button>

      {showNewTask && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20, maxWidth: 360 }}>
          <label style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>Sipariş No (referans)</label>
          <input value={orderReference} onChange={(e) => setOrderReference(e.target.value)}
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid var(--border-soft)', padding: '0 10px', marginTop: 4, marginBottom: 12, background: 'var(--bg)', color: 'var(--fg)' }} />
          <button style={btnStyle} onClick={handleCreateTask} disabled={busy}>{busy ? 'Kaydediliyor...' : 'Oluştur'}</button>
        </div>
      )}

      {selectedTaskIds.length >= 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
          <Route size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600 }}>{selectedTaskIds.length} sipariş seçildi</span>
          <button
            style={{ ...btnStyle, marginLeft: 'auto', background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
            onClick={handleCreateWave}
            disabled={creatingWave}
          >
            {creatingWave ? 'Oluşturuluyor...' : 'Dalga Oluştur (rota optimizasyonlu)'}
          </button>
          <button style={{ ...btnStyle, background: 'transparent' }} onClick={() => setSelectedTaskIds([])}>Vazgeç</button>
        </div>
      )}

      {justPacked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #16a34a' }}>
          <PackageCheck size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: '#15803d' }}><strong>{justPacked.orderReference}</strong> paketlendi.</span>
          <button style={{ ...btnStyle, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }} onClick={handleGoToShipping}>
            <Truck size={13} /> Kargo Oluştur
          </button>
          <button style={{ ...btnStyle, background: 'transparent' }} onClick={() => setJustPacked(null)}>Kapat</button>
        </div>
      )}

      {activeWaveIds.map((waveId) => (
        <PickingWavePanel
          key={waveId}
          waveId={waveId}
          currentUserEmail={currentUserEmail}
          onAllPicked={() => refetch()}
        />
      ))}

      {/* Dalgadaki görevler toplanırken üstteki PickingWavePanel'de gösterilir; hepsi
          toplandıktan sonra (ReadyToPack) her sipariş kendi kutusuna paketlenmek üzere
          buraya geri döner — ayrı paketleniyor çünkü ayrı kargo olabilirler. */}
      {tasks?.filter((t) => !t.waveId || t.status === 'ReadyToPack').map((task: WmsPickingTask) => (
        <div key={task.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={selectedTaskIds.includes(task.id)}
              onChange={() => toggleTaskSelection(task.id)}
              title="Dalgaya eklemek için seç"
            />
            <p style={{ fontWeight: 700 }}>{task.orderReference} — {task.status}</p>
          </div>

          {groupLinesByKit(task.lines).map((group) => group.kitGroupKey ? (
            <div key={group.kitGroupKey} style={{ marginBottom: 4, border: '1px solid var(--border-soft)', borderRadius: 8, overflow: 'hidden' }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, padding: '6px 10px', background: 'var(--bg)', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Boxes size={12} /> Kit — Ürün #{group.kitProductId} bileşenleri
              </p>
              {group.lines.map((line) => (
                <div key={line.id} style={{ padding: '8px 10px', borderTop: '1px solid var(--border-soft)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ flex: 1 }}>↳ Ürün #{line.productId} — istenen: {line.requiredQuantity} — durum: {line.status}</span>
                  {line.status === 'Pending' && (
                    <>
                      <input type="number" placeholder="miktar" value={pickQty[line.id] ?? ''} onChange={(e) => setPickQty({ ...pickQty, [line.id]: e.target.value })}
                        style={{ width: 80, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }} />
                      <button style={btnStyle} onClick={() => { setPickingLineId(line.id); setLocationScannerFor(task.id); }} disabled={busy}>Raf Tara ve Topla</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div key={group.lines[0].id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ flex: 1 }}>Ürün #{group.lines[0].productId} — istenen: {group.lines[0].requiredQuantity} — durum: {group.lines[0].status}</span>
              {group.lines[0].status === 'Pending' && (
                <>
                  <input type="number" placeholder="miktar" value={pickQty[group.lines[0].id] ?? ''} onChange={(e) => setPickQty({ ...pickQty, [group.lines[0].id]: e.target.value })}
                    style={{ width: 80, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }} />
                  <button style={btnStyle} onClick={() => { setPickingLineId(group.lines[0].id); setLocationScannerFor(task.id); }} disabled={busy}>Raf Tara ve Topla</button>
                </>
              )}
            </div>
          ))}

          {task.status === 'ReadyToPack' && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border-soft)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--fg)' }}>Tüm ürünler toplandı — paketle</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {PACKAGE_SIZES.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPackageSize({ ...packageSize, [task.id]: p.key })}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${(packageSize[task.id] ?? 'Small') === p.key ? 'var(--accent)' : 'var(--border-soft)'}`,
                      background: (packageSize[task.id] ?? 'Small') === p.key ? 'var(--accent-soft)' : 'var(--card)',
                      color: (packageSize[task.id] ?? 'Small') === p.key ? 'var(--accent)' : 'var(--fg-muted)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
                <input type="number" placeholder="kg" value={packWeight[task.id] ?? ''} onChange={(e) => setPackWeight({ ...packWeight, [task.id]: e.target.value })}
                  style={{ width: 70, height: 32, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--card)', color: 'var(--fg)' }} />
                <input type="number" placeholder="desi" value={packDesi[task.id] ?? ''} onChange={(e) => setPackDesi({ ...packDesi, [task.id]: e.target.value })}
                  style={{ width: 70, height: 32, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--card)', color: 'var(--fg)' }} />
                <button
                  style={{ ...btnStyle, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handlePack(task)}
                  disabled={busy}
                >
                  <PackageCheck size={14} /> Paketle
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button style={btnStyle} onClick={() => setProductScannerFor(task.id)}>Ürün Tara</button>
            <input placeholder="ürün ID" value={activeTaskId === task.id ? newLineProductId : ''} onChange={(e) => { setActiveTaskId(task.id); setNewLineProductId(e.target.value); }}
              style={{ width: 90, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }} />
            <input type="number" placeholder="istenen miktar" value={activeTaskId === task.id ? newLineQty : ''} onChange={(e) => { setActiveTaskId(task.id); setNewLineQty(e.target.value); }}
              style={{ width: 110, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }} />
            <button style={btnStyle} onClick={() => handleAddLine(task.id)} disabled={busy}>Satır Ekle</button>
          </div>
        </div>
      ))}

      {(!tasks || tasks.filter((t) => !t.waveId || t.status === 'ReadyToPack').length === 0) && activeWaveIds.length === 0 && !showNewTask && (
        <p style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Açık toplama görevi yok.</p>
      )}

      <WmsScannerModal
        open={productScannerFor !== null}
        onClose={() => setProductScannerFor(null)}
        onScan={(raw) => { if (productScannerFor !== null) void handleScanForNewLine(productScannerFor, raw); }}
      />

      <WmsScannerModal
        open={locationScannerFor !== null && pickingLineId !== null}
        onClose={() => { setLocationScannerFor(null); setPickingLineId(null); }}
        onScan={(raw) => {
          if (locationScannerFor !== null && pickingLineId !== null) {
            void handleScanLocationForPick(locationScannerFor, pickingLineId, raw);
            setLocationScannerFor(null); setPickingLineId(null);
          }
        }}
      />
    </div>
    </div>
  );
}
