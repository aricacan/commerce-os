'use client';

import { useEffect, useState } from 'react';
import { orderStatusesApi, type OperationStatus } from '../../lib/api/orderStatuses';

interface Props {
  orderId: number;
  currentStatusId: number | null;
  /** Durum değiştikten sonra sipariş verisini tazelemek için. */
  onChanged: () => void;
}

/**
 * Siparişin operasyon durumunu değiştirir.
 *
 * Pazaryeri durumu (universalStatus) BURADAN DEĞİŞMEZ — o, dış sistemin söylediği şeydir.
 * Buradaki durum bizim iş akışımızdır ve değiştiğinde durum bildirimleri tetiklenir
 * (bkz. OrderStatusService).
 */
export function OrderOperationStatusSelector({ orderId, currentStatusId, onChanged }: Props) {
  const [statuses, setStatuses] = useState<OperationStatus[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    orderStatusesApi
      .list()
      .then((data) => { if (active) setStatuses(data.filter((s) => s.isActive)); })
      .catch(() => { if (active) setError('Durumlar yüklenemedi.'); });
    return () => { active = false; };
  }, []);

  async function change(statusId: number) {
    setSaving(true);
    setError(null);
    try {
      await orderStatusesApi.changeOrderStatus(orderId, statusId);
      onChanged();
    } catch {
      setError('Durum değiştirilemedi.');
    } finally {
      setSaving(false);
    }
  }

  if (statuses.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="operation-status" className="text-sm font-medium">
        Operasyon durumu
      </label>
      <select
        id="operation-status"
        value={currentStatusId ?? ''}
        disabled={saving}
        onChange={(e) => void change(Number(e.target.value))}
        className="rounded-lg border px-3 py-1.5 text-sm"
      >
        <option value="" disabled>Seçiniz</option>
        {statuses.map((status) => (
          <option key={status.id} value={status.id}>{status.name}</option>
        ))}
      </select>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
