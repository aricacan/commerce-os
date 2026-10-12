'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Images, Pencil, Send, X } from 'lucide-react';
import { CustomCheckbox } from '../../components/ui/CustomCheckbox';
import {
  MISSING_FIELD_LABELS,
  type ProductGapCandidate,
  type ProductGapSendOverrides,
  type SendProductGapOptions,
} from '../../lib/api/product-gap';

type Mode = 'exact' | 'edit';

interface Props {
  /** Tek ürün gönderimi. Toplu gönderimde null gelir ve yalnızca fotoğraf tercihi sorulur. */
  candidate: ProductGapCandidate | null;
  bulkCount?: number;
  targetName: string;
  /** Dış gönderim kapalıysa kullanıcı "gitti" sanmasın diye uyarı gösterilir. */
  dispatchEnabled: boolean;
  dispatchNotice?: string;
  busy: boolean;
  isTr: boolean;
  onSend: (options: SendProductGapOptions) => void;
  onClose: () => void;
}

const FIELD =
  'h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11.5px] text-[var(--fg)] outline-none focus:border-[var(--border-strong)]';
const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-[var(--fg-muted)]';

export function SendProductDialog({
  candidate, bulkCount, targetName, dispatchEnabled, dispatchNotice, busy, isTr, onSend, onClose,
}: Props) {
  const isBulk = candidate === null;
  const missing = candidate?.missingFields ?? [];
  // Eksik alanı olan aday zaten birebir gönderilemez — form doğrudan düzenleme modunda açılır.
  const [mode, setMode] = useState<Mode>(missing.length > 0 ? 'edit' : 'exact');
  const [includeImages, setIncludeImages] = useState(true);
  const [form, setForm] = useState<ProductGapSendOverrides>({});

  if (typeof document === 'undefined') return null;

  const imageCount = candidate?.productImageCount ?? 0;
  const field = <K extends keyof ProductGapSendOverrides>(key: K, value: ProductGapSendOverrides[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function submit() {
    // "Birebir" modda hiçbir alan gönderilmez — backend her alanı kaynak üründen kopyalar.
    onSend({ includeImages, overrides: mode === 'edit' ? form : undefined });
  }

  return createPortal(
    <div
      onClick={busy ? undefined : onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)]"
      >
        {/* Başlık */}
        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--border-soft)] px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-zinc-600/15">
            <Send size={17} className="text-zinc-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[var(--fg)]">
              {isBulk
                ? (isTr ? `${bulkCount} ürünü gönder` : `Send ${bulkCount} products`)
                : (isTr ? 'Ürünü gönder' : 'Send product')}
            </h3>
            <p className="mt-0.5 text-[11.5px] text-[var(--fg-muted)]">
              {isTr ? 'Hedef ERP: ' : 'Target ERP: '}
              <span className="font-semibold text-[var(--fg)]">{targetName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] cursor-pointer disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4">
          {!dispatchEnabled && (
            <div className="flex items-start gap-2 rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                {dispatchNotice
                  ?? (isTr
                    ? 'Dış ERP gönderimi şu an kapalı — kayıt kuyruğa alınır, açıldığında gönderilir.'
                    : 'External dispatch is currently off — the record is queued and sent once enabled.')}
              </p>
            </div>
          )}

          {missing.length > 0 && (
            <div className="flex items-start gap-2 rounded-[6px] border border-orange-500/30 bg-orange-500/10 px-3 py-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-orange-500" />
              <p className="text-[11px] leading-snug text-orange-600 dark:text-orange-400">
                {isTr
                  ? `Hedef ERP şu alanı zorunlu tutuyor ve bizde boş: ${missing.map((f) => MISSING_FIELD_LABELS[f]?.tr ?? f).join(', ')}. Doldurmadan gönderilemez.`
                  : `The target ERP requires these fields and they are empty: ${missing.map((f) => MISSING_FIELD_LABELS[f]?.en ?? f).join(', ')}.`}
              </p>
            </div>
          )}

          {candidate && (
            <div className="rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2.5">
              <p className="text-[12px] font-semibold text-[var(--fg)]">{candidate.productName}</p>
              <p className="mt-0.5 font-mono text-[10.5px] text-[var(--fg-muted)]">
                {candidate.productSku || candidate.productBarcode || '—'} · {candidate.productPrice} {candidate.productCurrency}
                {' · '}{isTr ? 'stok' : 'stock'} {candidate.productStockQuantity}
              </p>
            </div>
          )}

          {/* Gönderim şekli — toplu gönderimde düzenleme yok (birebir kopya) */}
          {!isBulk && (
            <div className="flex flex-col gap-1.5">
              <span className={LABEL}>{isTr ? 'Nasıl gönderilsin?' : 'How to send?'}</span>
              <div className="grid grid-cols-2 gap-2">
                <ModeCard
                  active={mode === 'exact'}
                  icon={<Send size={13} />}
                  title={isTr ? 'Birebir gönder' : 'Send as-is'}
                  hint={isTr ? 'Tüm alanlar aynen kopyalanır' : 'All fields copied as-is'}
                  onClick={() => setMode('exact')}
                />
                <ModeCard
                  active={mode === 'edit'}
                  icon={<Pencil size={13} />}
                  title={isTr ? 'Düzenleyerek gönder' : 'Edit then send'}
                  hint={isTr ? 'Değiştirdiğin alanlar gider' : 'Only edited fields change'}
                  onClick={() => setMode('edit')}
                />
              </div>
            </div>
          )}

          {/* Fotoğraf tercihi */}
          <button
            type="button"
            onClick={() => setIncludeImages((v) => !v)}
            className="flex items-center gap-2.5 rounded-[6px] border border-[var(--border-soft)] px-3 py-2.5 text-left transition hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <CustomCheckbox checked={includeImages} onChange={setIncludeImages} />
            <Images size={14} className="text-[var(--fg-muted)]" />
            <span className="flex-1 text-[11.5px] font-semibold text-[var(--fg)]">
              {isTr ? 'Fotoğraflarla gönder' : 'Send with photos'}
            </span>
            {!isBulk && (
              <span className="text-[10.5px] text-[var(--fg-muted)]">
                {imageCount} {isTr ? 'görsel' : 'images'}
              </span>
            )}
          </button>

          {/* Düzenleme formu */}
          {!isBulk && mode === 'edit' && candidate && (
            <div className="grid grid-cols-2 gap-2.5 rounded-[6px] border border-[var(--border-soft)] p-3">
              <div className="col-span-2 flex flex-col gap-1">
                <span className={LABEL}>{isTr ? 'Ürün adı' : 'Product name'}</span>
                <input
                  className={FIELD}
                  defaultValue={candidate.productName}
                  onChange={(e) => field('name', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={LABEL}>SKU</span>
                <input
                  className={FIELD}
                  defaultValue={candidate.productSku ?? ''}
                  onChange={(e) => field('supplierSku', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={LABEL}>{isTr ? 'Barkod' : 'Barcode'}</span>
                <input
                  className={FIELD}
                  defaultValue={candidate.productBarcode ?? ''}
                  onChange={(e) => field('barcode', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={LABEL}>{isTr ? 'Satış fiyatı' : 'Sale price'}</span>
                <input
                  className={FIELD}
                  type="number"
                  step="0.01"
                  defaultValue={candidate.productPrice}
                  onChange={(e) => field('price', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={`${LABEL} ${missing.includes('purchasePrice') ? 'text-orange-500' : ''}`}>
                  {isTr ? 'Alış fiyatı' : 'Purchase price'}
                  {missing.includes('purchasePrice') && ' *'}
                </span>
                <input
                  autoFocus={missing.includes('purchasePrice')}
                  className={`${FIELD} ${missing.includes('purchasePrice') ? 'border-orange-500/60' : ''}`}
                  type="number"
                  step="0.01"
                  defaultValue={candidate.productPurchasePrice ?? ''}
                  onChange={(e) => field('purchasePrice', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={LABEL}>{isTr ? 'Stok' : 'Stock'}</span>
                <input
                  className={FIELD}
                  type="number"
                  defaultValue={candidate.productStockQuantity}
                  onChange={(e) => field('stockQuantity', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={LABEL}>{isTr ? 'KDV (%)' : 'VAT (%)'}</span>
                <input
                  className={FIELD}
                  type="number"
                  defaultValue={candidate.productVatRate ?? ''}
                  onChange={(e) => field('vatRate', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className={LABEL}>{isTr ? 'Desi' : 'Desi'}</span>
                <input
                  className={FIELD}
                  type="number"
                  step="0.01"
                  defaultValue={candidate.productDesi}
                  onChange={(e) => field('desi', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <span className={LABEL}>{isTr ? 'Açıklama' : 'Description'}</span>
                <textarea
                  rows={2}
                  className={`${FIELD} h-auto py-1.5`}
                  defaultValue={candidate.productDescription ?? ''}
                  onChange={(e) => field('description', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Aksiyonlar */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-soft)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-8 rounded-[4px] border border-[var(--border)] px-3 text-[11.5px] font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40"
          >
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-zinc-600 px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-zinc-500 cursor-pointer disabled:opacity-40"
          >
            <Send size={13} className={busy ? 'animate-pulse' : ''} />
            {busy
              ? (isTr ? 'Gönderiliyor…' : 'Sending…')
              : (isTr ? 'Onayla ve gönder' : 'Confirm and send')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ModeCard({
  active, icon, title, hint, onClick,
}: { active: boolean; icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-[6px] border px-3 py-2.5 text-left transition cursor-pointer ${
        active
          ? 'border-zinc-600 bg-zinc-600/10'
          : 'border-[var(--border-soft)] hover:bg-[var(--bg-subtle)]'
      }`}
    >
      <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--fg)]">
        {icon}
        {title}
      </span>
      <span className="text-[10.5px] leading-snug text-[var(--fg-muted)]">{hint}</span>
    </button>
  );
}
