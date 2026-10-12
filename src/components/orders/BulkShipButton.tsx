'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { bulkShippingApi, type BulkShipResult } from '../../lib/api/returns';

/**
 * Seçili siparişler için toplu kargo açar.
 *
 * KISMİ BAŞARI GÖSTERİLİR: backend her sipariş için ayrı sonuç döner (bkz.
 * BulkShippingService) ve bu bileşen üçünü de ayırır — başarılı, atlanan (zaten
 * gönderisi var) ve hatalı. "40 gönderi oluşturuldu" deyip 3 hatayı yutmak,
 * kargolanmadığı fark edilmeyen siparişler demektir.
 *
 * Ayrı bileşen: sipariş listesi sayfası zaten 1500+ satır; buraya daha fazla
 * durum eklemek onu daha da okunmaz yapardı.
 */
export function BulkShipButton({
  orderIds,
  carrierId,
  onDone,
}: {
  orderIds: number[];
  carrierId: number;
  onDone?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<BulkShipResult[] | null>(null);

  async function ship() {
    setBusy(true);
    try {
      setResults(await bulkShippingApi.ship(carrierId, orderIds));
      onDone?.();
    } catch {
      setResults([{ orderId: 0, success: false, shipmentId: null, error: 'İstek başarısız oldu.', skipped: false, resubmittedDraft: false }]);
    } finally {
      setBusy(false);
    }
  }

  const basarili = results?.filter((r) => r.success) ?? [];
  const atlanan = results?.filter((r) => r.skipped) ?? [];
  const hatali = results?.filter((r) => !r.success && !r.skipped) ?? [];
  const taslakYeniden = results?.filter((r) => r.resubmittedDraft) ?? [];

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void ship()}
        disabled={busy || orderIds.length === 0}
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-accent disabled:opacity-50"
      >
        <Truck size={13} />
        {busy ? 'Kargolanıyor…' : `Toplu kargola (${orderIds.length})`}
      </button>

      {results && (
        <div className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">
            {basarili.length} gönderi açıldı
            {atlanan.length > 0 && `, ${atlanan.length} atlandı (zaten kargolu)`}
            {hatali.length > 0 && `, ${hatali.length} hata`}
          </span>

          {/* Eski taslağı olan siparişte yeni kayıt açılmaz, taslak yeniden gönderilir —
              kullanıcı o taslağın varlığından habersiz kalmasın. */}
          {taslakYeniden.length > 0 && (
            <span className="text-amber-600">
              {taslakYeniden.length} siparişin mevcut taslak gönderisi yeniden gönderildi:{' '}
              {taslakYeniden.map((r) => `#${r.orderId}`).join(', ')}
            </span>
          )}

          {/* Hatalar TEK TEK gösterilir: hangi siparişin neden kargolanmadığı bilinmeden
              düzeltilemez. */}
          {hatali.map((r) => (
            <span key={r.orderId} className="text-destructive">
              Sipariş #{r.orderId}: {r.error}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
