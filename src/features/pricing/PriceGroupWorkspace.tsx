'use client';

import { useCallback, useEffect, useState } from 'react';
import { catalogPricingApi, type PriceGroupRow } from '@/lib/api/catalog-pricing';
import * as ui from '@/features/shared/panel';

/** Backend `PriceResolver.IsValidDiscount` ile aynı sınırlar. */
export function isValidDiscount(percent: number): boolean {
  return Number.isFinite(percent) && percent >= 0 && percent <= 100;
}

/**
 * İskontolu fiyat — ekranda gösterilen ÖNİZLEME.
 *
 * Geçersiz iskontoda **null** döner: sessizce liste fiyatına düşmek, hatalı bir
 * iskontonun fark edilmemesine yol açardı (backend'de de aynı karar — negatif iskonto
 * istisna fırlatır).
 *
 * YUVARLAMA: backend `decimal` + AwayFromZero kullanıyor; JavaScript ise ikilik kayan
 * nokta. Düzeltmesiz `Math.round`, 33.335 gibi tam yarım değerlerde 1 kuruş aşağı
 * sapıyor (33.335 bellekte 33.33499999…). Epsilon düzeltmesi bu sapmayı kapatır.
 * Yine de OTORİTE BACKEND'dir: faturaya yazılan tutarı o hesaplar.
 */
export function discountedPrice(basePrice: number, percent: number | null): number | null {
  if (percent === null) return basePrice;
  if (!isValidDiscount(percent)) return null;
  if (percent === 0) return basePrice;

  const raw = basePrice * (1 - percent / 100);
  return Math.round((raw + Number.EPSILON * Math.abs(raw)) * 100) / 100;
}

export function PriceGroupWorkspace() {
  const [rows, setRows] = useState<PriceGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [discount, setDiscount] = useState('0');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await catalogPricingApi.priceGroups());
      setError(null);
    } catch {
      setError('Fiyat grupları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function create() {
    const percent = Number(discount);
    if (!name.trim()) { setError('Grup adı boş olamaz.'); return; }
    if (!isValidDiscount(percent)) { setError('İskonto 0–100 arasında olmalı.'); return; }

    try {
      await catalogPricingApi.createPriceGroup({ name: name.trim(), discountPercent: percent, isActive: true });
      setName('');
      setDiscount('0');
      await reload();
    } catch {
      setError('Grup oluşturulamadı (aynı adda bir grup olabilir).');
    }
  }

  return (
    <div className={ui.page}>
      <div data-tour="price-groups-header">
        <h1 className={ui.pageTitle}>Fiyat Grupları</h1>
        <p className={ui.pageHint}>
        Fiyat grubu, müşteriye <strong>yüzde iskonto</strong> uygular. Grubu olmayan müşteri
        liste fiyatını görür. Tutar bazlı iskonto ve miktar kırılımlı fiyat bilinçli olarak
        yok — fiyat değişince anlamsızlaşırlar.
        </p>
      </div>

      {error && <p className={ui.errorText}>{error}</p>}

      <div data-tour="price-groups-form" className={`${ui.card} flex flex-wrap items-end gap-2`}>
        <label className="flex flex-col gap-1">
          <span className={ui.label}>Grup adı</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${ui.input} w-56`}
            placeholder="Bayi"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={ui.label}>İskonto (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className={`${ui.input} w-24 text-right`}
          />
        </label>
        <button
          type="button"
          onClick={() => void create()}
          className={ui.buttonPrimary}
        >
          Grup ekle
        </button>
      </div>

      {loading && <p className={ui.emptyText}>Yükleniyor…</p>}
      {!loading && rows.length === 0 && (
        <p className={ui.emptyText}>Henüz fiyat grubu yok.</p>
      )}

      <div data-tour="price-groups-list" className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className={`${ui.card} flex flex-wrap items-center gap-3 ${
              row.isActive ? '' : 'opacity-60'
            }`}
          >
            <span className="text-xs font-bold text-[var(--fg)]">{row.name}</span>
            <span className={`${ui.chip} tabular-nums`}>
              %{row.discountPercent} iskonto
            </span>
            <span className={ui.mutedText}>{row.customerCount} müşteri</span>
            {/* 100 TL'lik ürün üzerinden örnek: soyut yüzdeyi somutlaştırır. */}
            <span className="ml-auto text-[11px] text-[var(--fg-muted)] tabular-nums">
              100,00 → {(discountedPrice(100, row.discountPercent) ?? 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
