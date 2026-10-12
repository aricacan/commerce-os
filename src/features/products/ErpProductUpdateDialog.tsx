'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { erpProductUpdatesApi, type ErpProductUpdateRequest } from '../../lib/api/erpProductUpdates';
import { describeError } from '../../lib/errors';

/** Kullanıcının değiştirebileceği alanlar — payload'a yalnızca İŞARETLENENLER girer. */
type EditableField =
  | 'price' | 'currency' | 'name' | 'description'
  | 'barcode' | 'brand' | 'vatRate' | 'desi' | 'invoiceName';

const FIELD_LABELS: Record<EditableField, string> = {
  price: 'Satış fiyatı',
  currency: 'Para birimi',
  name: 'Ürün adı',
  description: 'Açıklama',
  barcode: 'Barkod',
  brand: 'Marka',
  vatRate: 'KDV oranı (%)',
  desi: 'Desi',
  invoiceName: 'Fatura adı',
};

const NUMERIC_FIELDS: ReadonlySet<EditableField> = new Set(['price', 'vatRate', 'desi']);
const MULTILINE_FIELDS: ReadonlySet<EditableField> = new Set(['description']);
const FIELD_ORDER: readonly EditableField[] = [
  'price', 'currency', 'name', 'description', 'barcode', 'brand', 'vatRate', 'desi', 'invoiceName',
];

interface Props {
  productId: number;
  /** Başlıkta gösterilir — hangi ERP hesabının kaydını değiştirdiğimiz net olmalı. */
  targetLabel: string;
  productName: string;
  /**
   * Ürünün ERP'deki KENDİ para birimi (ProductErpVariant.originalCurrency).
   *
   * ⚠️ Asla sabit 'TRY' varsayma: BaseErpAdapter, Base/UK ürünlerini `BasePrice = priceTry`
   * (ingestion anında TRY'ye çevrilmiş) ama `Currency = "GBP"` olarak yazıyor. Yani listedeki
   * fiyat TRY, ERP'nin beklediği para birimi GBP.
   */
  erpCurrency: string | null;
  /** Listedeki fiyat — TRY cinsinden (bkz. erpCurrency notu). */
  currentPriceTry: number | null;
  currentDescription: string | null;
  onClose: () => void;
}

/**
 * ERP'deki var olan ürünü güncelleme.
 *
 * ONAY KUTUSU DESENİ: dolu bir input'u otomatik göndermek, "açıklamayı GÖRMEK için açtım"
 * ile "açıklamayı YOLLAMAK istedim" ayrımını kaybettirirdi. Yalnızca işaretlenen alan gider;
 * işaretlenmeyen alan karşı tarafta değişmez.
 */
export function ErpProductUpdateDialog({
  productId,
  targetLabel,
  productName,
  erpCurrency,
  currentPriceTry,
  currentDescription,
  onClose,
}: Props) {
  // ERP'nin KENDİ para birimi. Bilinmiyorsa TRY varsayılır — Sentos hesapları TRY çalışıyor
  // ve originalCurrency yalnızca hiç senkronlanmamış kayıtlarda boş kalır.
  const hedefParaBirimi = (erpCurrency ?? 'TRY').toUpperCase();
  // "TL", Sentos'un TRY için kullandığı takma ad (bkz. SentosProductWriter.ToSentosCurrency).
  const hedefTry = hedefParaBirimi === 'TRY' || hedefParaBirimi === 'TL';

  const [values, setValues] = useState<Record<EditableField, string>>({
    // Fiyat YALNIZCA hedef para birimi TRY ise ön-doldurulur. Base/UK ürünlerinde listedeki
    // değer TRY KARŞILIĞIDIR (BaseErpAdapter ingestion anında çeviriyor) ama ERP GBP bekliyor;
    // o değeri GBP alanına yazmak canlı ilanı ~40 kat pahalandırırdı.
    price: hedefTry ? (currentPriceTry?.toString() ?? '') : '',
    currency: hedefParaBirimi,
    name: productName,
    description: currentDescription ?? '',
    barcode: '',
    brand: '',
    vatRate: '',
    desi: '',
    invoiceName: '',
  });
  const [selected, setSelected] = useState<Set<EditableField>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: () => erpProductUpdatesApi.queue(buildRequest()),
    onSuccess: (result) => {
      setNotice(result.notice);
      setError(null);
    },
    onError: (err: unknown) => setError(describeError(err)),
  });

  function buildRequest(): ErpProductUpdateRequest {
    const body: ErpProductUpdateRequest = { productId };
    if (selected.has('price')) body.price = Number(values.price);
    if (selected.has('currency')) body.currency = values.currency;
    if (selected.has('name')) body.name = values.name;
    if (selected.has('description')) body.description = values.description;
    if (selected.has('barcode')) body.barcode = values.barcode;
    if (selected.has('brand')) body.brand = values.brand;
    if (selected.has('vatRate')) body.vatRate = Number(values.vatRate);
    if (selected.has('desi')) body.desi = Number(values.desi);
    if (selected.has('invoiceName')) body.invoiceName = values.invoiceName;
    return body;
  }

  function toggle(field: EditableField) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  // Sayısal alan doğrulaması. BOŞ METİN AYRICA REDDEDİLİR: `Number('')` 0 döner ve
  // `Number.isFinite(0)` true'dur — yani işaretlenip boş bırakılmış bir "KDV oranı" kutusu
  // sessizce `vatRate: 0` gönderiyordu ve ERP'deki ürünün KDV'si %0'a düşüyordu (sunucu 0'ı
  // geçerli sayıyor, 0-100 aralığında). Aynı tuzak desi için de vardı.
  const gecersizSayi = FIELD_ORDER.some(
    field => selected.has(field)
      && NUMERIC_FIELDS.has(field)
      && (values[field].trim() === '' || !Number.isFinite(Number(values[field]))),
  );

  // Metin alanı da boş gönderilemez: sunucu boş metni payload'a hiç koymuyor (bkz.
  // ErpProductUpdateService.AddText), yani "işaretledim ama gitmedi" sessiz no-op'u oluşurdu.
  const gecersizMetin = FIELD_ORDER.some(
    field => selected.has(field) && !NUMERIC_FIELDS.has(field) && values[field].trim() === '',
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs font-bold text-[var(--fg)]">ERP&apos;de Güncelle</h3>
          <p className="truncate text-[11px] text-[var(--fg-muted)]" title={productName}>
            {targetLabel} · {productName}
          </p>
        </div>

        <p className="rounded-[4px] bg-amber-500/10 p-2 text-[10.5px] leading-relaxed text-amber-600">
          Yalnızca <strong>işaretlediğiniz</strong> alanlar gönderilir; diğerleri ERP&apos;de
          değişmez. İstek kuyruğa alınır, gönderim birkaç dakika içinde yapılır ve sonucu ERP
          İşlemleri panelinden izleyebilirsiniz.
        </p>

        {!hedefTry && (
          <p className="rounded-[4px] bg-rose-500/10 p-2 text-[10.5px] leading-relaxed text-rose-500">
            Bu hesabın para birimi <strong>{hedefParaBirimi}</strong>. Listede görünen fiyat TRY
            karşılığıdır, bu yüzden fiyat alanı <strong>boş bırakıldı</strong> — göndermek
            istiyorsanız {hedefParaBirimi} cinsinden elle yazın.
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {FIELD_ORDER.map(field => (
            <label key={field} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selected.has(field)}
                onChange={() => toggle(field)}
                disabled={notice !== null}
                className="mt-1.5 size-3.5 shrink-0 cursor-pointer"
              />
              <span className="mt-1 w-28 shrink-0 text-[11px] text-[var(--fg-muted)]">
                {/* Fiyat alanı hangi BİRİMDE yazıldığını göstermeli — kullanıcı Base/UK
                    ürününde TRY tutar yazdığını sanmasın. */}
                {field === 'price' ? `${FIELD_LABELS[field]} (${hedefParaBirimi})` : FIELD_LABELS[field]}
              </span>
              {MULTILINE_FIELDS.has(field) ? (
                <textarea
                  value={values[field]}
                  rows={3}
                  disabled={!selected.has(field) || notice !== null}
                  onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11px] text-[var(--fg)] disabled:opacity-40"
                />
              ) : (
                <input
                  type={NUMERIC_FIELDS.has(field) ? 'number' : 'text'}
                  value={values[field]}
                  disabled={!selected.has(field) || notice !== null}
                  onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11px] text-[var(--fg)] disabled:opacity-40"
                />
              )}
            </label>
          ))}
        </div>

        {error && (
          <div className="rounded-[3px] bg-rose-500/10 p-2 text-[11px] text-rose-500">{error}</div>
        )}
        {notice && (
          <div className="rounded-[3px] bg-emerald-500/10 p-2 text-[11px] text-emerald-600">{notice}</div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-8 cursor-pointer rounded-[4px] border border-[var(--border)] px-3 text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            {notice ? 'Kapat' : 'Vazgeç'}
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || selected.size === 0 || gecersizSayi || gecersizMetin || notice !== null}
            className="h-8 cursor-pointer rounded-[4px] bg-[var(--fg)] px-3.5 text-[11px] font-bold text-[var(--bg)] shadow-xs hover:opacity-90 disabled:opacity-40"
          >
            {mutation.isPending ? 'Gönderiliyor…' : `Kuyruğa al (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
