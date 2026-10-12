'use client';

import type { ShopifyFitmentApplyDto, ShopifyFitmentPreviewDto } from '../../lib/api/shopify-fitment';
import { surfaceCard } from '../shared/design';
import { FitmentUnmatchedList } from './FitmentUnmatchedList';

interface PreviewProps {
  preview: ShopifyFitmentPreviewDto;
}

// Önizleme: hiçbir şey yazılmadı; uygulanırsa neler olacağı.
export function FitmentPreviewReport({ preview }: PreviewProps) {
  return (
    <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Eşitleme önizlemesi">
      <strong className="text-ui-sm text-fg">Önizleme (henüz yazılmadı)</strong>
      <p className="m-0 text-ui-xs text-fg">
        {preview.matchedSkuCount} / {preview.skuCount} SKU eşitlenecek · {preview.productsToLink} ürüne bağlanacak ·{' '}
        {preview.vehicleCount} araç kaydı ({preview.vehiclesToCreate} yeni, {preview.vehiclesToUpdate} güncellenecek).
      </p>
      <p className="m-0 text-ui-2xs text-fg-muted">Ürünün mevcut &quot;Araç uyumluluğu&quot; listesi bu araçlarla değiştirilir.</p>
      <FitmentUnmatchedList issues={preview.unmatched} />
    </section>
  );
}

interface ApplyProps {
  result: ShopifyFitmentApplyDto;
}

// Uygulama sonucu: yazılanlar, atlanan SKU'lar ve (varsa) Shopify'ın reddettikleri.
export function FitmentApplyReport({ result }: ApplyProps) {
  return (
    <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Eşitleme sonucu">
      <strong className="text-ui-sm text-fg">{result.applied ? 'Eşitleme tamamlandı' : 'Eşitleme kısmen tamamlandı'}</strong>
      <p className="m-0 text-ui-xs text-fg">
        {result.vehiclesWritten} araç kaydı yazıldı · {result.productsLinked} ürün bağlandı.
      </p>
      {result.errors.length > 0 && (
        <ul role="alert" className="m-0 flex max-h-40 list-none flex-col gap-1 overflow-y-auto p-0 text-ui-xs text-danger">
          {result.errors.map((error) => <li key={error} className="break-words">{error}</li>)}
        </ul>
      )}
      <FitmentUnmatchedList issues={result.unmatched} />
    </section>
  );
}
