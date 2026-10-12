'use client';

import { erpisCategoricalColor, useErpisChartTheme } from './useErpisChartTheme';
import type { ErpisBreakdownRow } from './useErpisDashboardBreakdown';
import { formatCompact, formatNumber } from '../../../features/erpis/shared';

// Sıralama listesi — cari, ürün, marka, model, kategori kartlarının ortak gövdesi.
//
// Beş kart aynı işi yapıyordu ve her biri kendi satır düzenini kurmuştu: birinde pay
// yüzdesi vardı diğerinde yoktu, birinde sipariş sayısı görünüyordu diğerinde miktar.
// Tek bileşen olunca bir sütun eklemek her yerde birden geçerli oluyor.
//
// Çubuk uzunluğu EN BÜYÜĞE göre, yüzde ise TOPLAMA göre: biri görsel karşılaştırma,
// diğeri gerçek pay. İkisini aynı ölçüye bağlamak çubukları okunmaz kısaltırdı.
interface Props {
  rows: ErpisBreakdownRow[];
  currency: string | null;
  /** Tek renk mi (aynı ölçünün büyüklükleri) yoksa kategorik mi (ayrı şeyler). */
  variant?: 'ranking' | 'categorical';
  /** Satırın sağındaki ikincil rakam. */
  secondary?: 'orderCount' | 'quantity' | 'lineCount';
}

const SECONDARY_LABELS = {
  orderCount: 'sipariş',
  quantity: 'adet',
  lineCount: 'kalem',
} as const;

export function ErpisRankList({ rows, currency, variant = 'ranking', secondary = 'orderCount' }: Props) {
  const theme = useErpisChartTheme();

  const max = rows.length > 0 ? Math.max(...rows.map((r) => Math.abs(r.amount))) : 0;
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="w-full min-w-0">
      {rows.map((row, index) => {
        const share = total > 0 ? (row.amount / total) * 100 : 0;
        const width = max > 0 ? Math.max(2, (Math.abs(row.amount) / max) * 100) : 2;

        const secondaryValue = secondary === 'quantity'
          ? formatCompact(row.quantity)
          : formatNumber(secondary === 'orderCount' ? row.orderCount : row.rowCount);

        return (
          <div key={row.key} className="erpis-rank-row">
            <span className="erpis-rank-num">{index + 1}</span>

            <div className="erpis-rank-body">
              {/* Kod ve ad ALT ALTA. Yan yana yazılınca ikisi tek satıra sıkışıp
                  ellipsis'e giriyor ve ürünün adı hiç okunmuyordu; kod kısa ve sabit
                  genişlikte, ad ise uzun — aynı satırı paylaşamıyorlar. */}
              <span className="erpis-rank-label" title={row.label}>{row.label}</span>
              {row.subLabel && (
                <span className="erpis-rank-sublabel" title={row.subLabel}>{row.subLabel}</span>
              )}
              <div className="erpis-bar-track">
                <div
                  className="erpis-bar-fill"
                  style={{
                    width: `${width}%`,
                    background: variant === 'categorical'
                      ? erpisCategoricalColor(index, theme.dark)
                      : theme.accent,
                    // Sıralama varyantında tonlama: en üstteki en belirgin, aşağıya
                    // doğru açılır. Kategorikte her dilim kendi rengiyle tam güçte.
                    opacity: variant === 'ranking' ? Math.max(0.35, 1 - index * 0.12) : 1,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0 text-right min-w-[72px] pl-1">
              <span className="erpis-rank-value">
                {formatCompact(row.amount)}
                {currency && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: theme.tick }}> {currency}</span>
                )}
              </span>
              <span className="erpis-rank-share whitespace-nowrap">
                %{share.toFixed(1)} · {secondaryValue} {SECONDARY_LABELS[secondary]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
