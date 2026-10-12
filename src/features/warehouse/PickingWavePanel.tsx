'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Route, MapPin } from 'lucide-react';
import { warehouseApi } from '../../lib/api';
import { WmsScannerModal } from './WmsScannerModal';
import { useWmsAlert } from '../../stores/wms-alert';

interface Props {
  waveId: number;
  currentUserEmail: string;
  onAllPicked: () => void;
}

const btnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)',
  background: 'var(--card)', color: 'var(--fg)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
};

// Faz 7 — dalga toplama: birden fazla siparişin satırları tek, optimize edilmiş rotada
// (SequenceOrder) gösterilir. Sırada olan satır vurgulanır, kullanıcı sırayla ilerler.
export function PickingWavePanel({ waveId, currentUserEmail, onAllPicked }: Props) {
  const wmsAlert = useWmsAlert();
  const { data: wave, refetch } = useQuery({ queryKey: ['wms-picking-wave', waveId], queryFn: () => warehouseApi.getPickingWave(waveId) });
  const [pickQty, setPickQty] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [scanningLineId, setScanningLineId] = useState<number | null>(null);
  const [scanningTaskId, setScanningTaskId] = useState<number | null>(null);

  const pendingLines = wave?.lines.filter((l) => l.status === 'Pending') ?? [];
  const nextLineId = pendingLines[0]?.lineId ?? null;

  useEffect(() => {
    if (wave && wave.lines.length > 0 && pendingLines.length === 0) onAllPicked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave]);

  async function handleScanLocation(raw: string) {
    if (scanningLineId === null || scanningTaskId === null) return;
    const qty = Number(pickQty[scanningLineId]);
    if (!qty || qty <= 0) { wmsAlert.show('Önce miktar girin.'); return; }
    setBusy(true);
    try {
      const result = await warehouseApi.resolveBarcode(raw);
      if (result.kind !== 'Location' || !result.locationId) {
        wmsAlert.show('Bu bir raf barkodu değil.');
        return;
      }
      await warehouseApi.pickLine(scanningTaskId, scanningLineId, { fromLocationId: result.locationId, pickedQuantity: qty, userName: currentUserEmail });
      refetch();
    } catch (err) {
      console.error('Toplama başarısız:', err);
      wmsAlert.show('Toplama başarısız, tekrar deneyin.');
    } finally {
      setBusy(false);
      setScanningLineId(null);
      setScanningTaskId(null);
    }
  }

  if (!wave) return null;

  return (
    <div style={{ background: 'var(--card)', border: '1.5px solid var(--accent)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Route size={16} style={{ color: 'var(--accent)' }} />
        <p style={{ fontWeight: 700, color: 'var(--accent)' }}>
          Dalga #{wave.id} — {wave.status === 'Completed' ? 'Tamamlandı' : `${pendingLines.length} satır kaldı`}
        </p>
      </div>

      {wave.lines.map((line) => {
        const isNext = line.lineId === nextLineId;
        const isPicked = line.status === 'Picked';
        return (
          <div
            key={line.lineId}
            style={{
              padding: '10px 12px', borderRadius: 8, marginBottom: 6, fontSize: 12.5,
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              background: isNext ? 'var(--accent-soft)' : 'transparent',
              border: isNext ? '1px solid var(--accent)' : '1px solid var(--border-soft)',
              opacity: isPicked ? 0.5 : 1,
            }}
          >
            {isNext && <MapPin size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
            <span style={{ flex: 1 }}>
              <strong>{line.orderReference}</strong> — Ürün #{line.productId} × {line.requiredQuantity}
              {line.suggestedLocationFullCode && ` — önerilen raf: ${line.suggestedLocationFullCode}`}
              {isPicked && ' — toplandı'}
            </span>
            {!isPicked && (
              <>
                <input
                  type="number" placeholder="miktar"
                  value={pickQty[line.lineId] ?? ''}
                  onChange={(e) => setPickQty({ ...pickQty, [line.lineId]: e.target.value })}
                  style={{ width: 80, height: 30, borderRadius: 6, border: '1px solid var(--border-soft)', padding: '0 8px', background: 'var(--bg)', color: 'var(--fg)' }}
                />
                <button
                  style={btnStyle}
                  disabled={busy}
                  onClick={() => { setScanningLineId(line.lineId); setScanningTaskId(line.taskId); }}
                >
                  Raf Tara ve Topla
                </button>
              </>
            )}
          </div>
        );
      })}

      <WmsScannerModal
        open={scanningLineId !== null}
        onClose={() => { setScanningLineId(null); setScanningTaskId(null); }}
        onScan={(raw) => void handleScanLocation(raw)}
      />
    </div>
  );
}
