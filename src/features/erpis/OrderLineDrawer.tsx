'use client';

import { useState } from 'react';
import { useErpisLine } from '@/hooks/erpis/useErpisQuery';
import { DetailRow, DetailSection, ErpisDrawer } from './ErpisDrawer';
import { ErrorState, formatDate, formatDateTime, formatNumber } from './shared';

// Sipariş kalemi detayı.
//
// Ham Excel satırı da gösterilir: bir tutar tartışmalı olduğunda "bu rakam nereden geldi"
// sorusunun cevabı sistemin içinde olmalı, kullanıcı dosyayı yeniden açmak zorunda kalmamalı.
export function OrderLineDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useErpisLine(id);
  const [showRaw, setShowRaw] = useState(false);

  const detail = query.data;
  const line = detail?.line;

  return (
    <ErpisDrawer
      title={line ? `Sipariş ${line.orderNo}` : 'Sipariş kalemi'}
      subtitle={line?.partyName ?? undefined}
      onClose={onClose}
    >
      {query.isError && <ErrorState />}
      {query.isLoading && <p className="text-[12px] text-[var(--fg-muted)]">Yükleniyor…</p>}

      {detail && line && (
        <>
          <DetailSection title="Kalem">
            <DetailRow label="SKU" value={line.sku} />
            <DetailRow label="Ürün" value={line.itemName} />
            <DetailRow label="Marka / Model" value={[line.brand, line.model].filter(Boolean).join(' ')} />
            <DetailRow label="Ürün Tipi" value={line.productType} />
            <DetailRow label="Durum" value={line.isClosed ? 'Kapalı' : 'Açık'} />
          </DetailSection>

          <DetailSection title="Miktar">
            <DetailRow label="Sipariş" value={qty(line.orderedQty, line.unit)} />
            <DetailRow label="Sevk" value={qty(line.shippedQty, line.unit)} />
            <DetailRow label="Kalan" value={qty(line.remainingQty, line.unit)} />
            <DetailRow label="Rezerv" value={qty(detail.reservedQty, line.unit)} />
            <DetailRow label="Mevcut Stok" value={qty(detail.stockOnHand, line.unit)} />
          </DetailSection>

          <DetailSection title="Fiyat">
            <DetailRow label="Birim Fiyat" value={money(line.unitPrice, line.currency)} />
            <DetailRow label="Net Birim Fiyat" value={money(detail.netUnitPrice, line.currency)} />
            <DetailRow label="Net Tutar" value={money(line.netAmount, line.currency)} />
            <DetailRow label="İskontolar" value={discounts(detail)} />
          </DetailSection>

          <DetailSection title="Tarihler">
            <DetailRow label="Sipariş" value={formatDate(line.orderDate)} />
            <DetailRow label="Teslim" value={formatDate(line.deliveryDate)} />
            <DetailRow label="Kayıt" value={formatDate(detail.recordDate)} />
            <DetailRow label="Son Fatura" value={formatDate(detail.lastInvoiceDate)} />
          </DetailSection>

          <DetailSection title="Diğer">
            <DetailRow label="Müşteri Sipariş No" value={detail.customerOrderNo} />
            <DetailRow label="Kalem Tipi" value={detail.lineType} />
            <DetailRow label="Üretim Şekli" value={detail.productionMode} />
            <DetailRow label="Bölüm" value={detail.departmentName} />
            <DetailRow label="Sevk Adresi" value={detail.shippingAddress} />
            <DetailRow label="Depo Dağılımı" value={detail.warehouseBreakdownRaw} />
            <DetailRow label="Not" value={detail.notes} />
          </DetailSection>

          {detail.stockLocations.length > 0 && (
            <DetailSection title={`Depo Rafları (${detail.stockLocations.length})`}>
              {detail.stockLocations.map((l) => (
                <DetailRow
                  key={`${l.zone}-${l.shelf}`}
                  label={`Bölge ${l.zone} · ${l.shelf}`}
                  value={`${formatNumber(l.quantity, 2)} adet`}
                />
              ))}
            </DetailSection>
          )}

          <DetailSection title="Kaynak">
            <DetailRow label="İlk görüldüğü yükleme" value={`#${detail.firstSeenUploadId}`} />
            <DetailRow label="Son görüldüğü yükleme" value={`#${detail.lastSeenUploadId}`} />
            {/* Kapanış TÜRETİLMİŞ: kalem daha yeni bir raporda görünmediği için kapandı
                sayıldı. Kullanıcı kararı sorgulayabilsin diye tarih gösteriliyor. */}
            <DetailRow
              label="Kapanış"
              value={detail.closedAt
                ? `${formatDateTime(detail.closedAt)} — son raporda görünmedi`
                : null}
            />
            <DetailRow label="Excel satırı" value={detail.sourceRowIndex ?? 'silinmiş'} />
          </DetailSection>

          {detail.sourceRow && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                className="self-start rounded-[4px] border border-[var(--border-soft)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--fg)]"
              >
                {showRaw ? 'Ham satırı gizle' : 'Ham Excel satırını göster'}
              </button>

              {showRaw && (
                <div className="max-h-72 overflow-auto rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2">
                  {Object.entries(detail.sourceRow)
                    .filter(([, value]) => value !== '')
                    .map(([key, value]) => (
                      <DetailRow key={key} label={key} value={value} />
                    ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </ErpisDrawer>
  );
}

function qty(value: number | null, unit: string | null): string {
  if (value == null) return '—';
  return `${formatNumber(value, 2)}${unit ? ` ${unit}` : ''}`;
}

function money(value: number | null, currency: string | null): string {
  if (value == null) return '—';
  return `${formatNumber(value, 2)} ${currency ?? ''}`.trim();
}

// Erpis dört kademeli iskonto veriyor; sıfır olanlar gösterilmez, hepsi sıfırsa "—".
function discounts(detail: {
  discount1: number | null; discount2: number | null;
  discount3: number | null; discount4: number | null;
}): string {
  const values = [detail.discount1, detail.discount2, detail.discount3, detail.discount4]
    .filter((d): d is number => d != null && d !== 0);

  return values.length === 0 ? '—' : values.map((d) => `%${formatNumber(d, 2)}`).join(' + ');
}
