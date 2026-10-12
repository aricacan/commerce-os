'use client';

import type { ErpisSqlPreviewResult } from '@/lib/api';
import { formatNumber } from './shared';

// "Önizle" sonucu — prosedür çalıştı, HİÇBİR ŞEY yazılmadı. Kullanıcı kaynağı açmadan önce
// ya da toplu kapatma uyarısını onaylamadan önce "ne olacak" sorusunu burada görür.
export function SqlSourcePreview({ preview }: { preview: ErpisSqlPreviewResult }) {
  if (!preview.success) {
    return (
      <p className="rounded-[4px] bg-red-50 px-2 py-1 text-[10.5px] font-semibold text-red-700">
        Önizleme başarısız: {preview.errorMessage}
      </p>
    );
  }

  const isOrders = preview.orderCount != null;
  const tone = preview.wouldRequireConfirmation
    ? 'border-amber-300 bg-amber-50 text-amber-900'
    : 'border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg)]';

  return (
    <div className={`flex flex-col gap-1 rounded-[4px] border px-2.5 py-2 text-[10.5px] ${tone}`}>
      <span className="font-bold">Önizleme — hiçbir şey yazılmadı</span>
      <span>Prosedür {formatNumber(preview.rowCount)} satır döndürdü.</span>

      {preview.rowCount === 0 && (
        <span className="font-bold text-amber-800">
          Hiç satır gelmedi — tam liste kaynaklarında bu tur yazılmaz. ERP şirket kodunu kontrol edin.
        </span>
      )}

      {preview.newItemCount != null && (
        <span>
          Yazılırsa <b>{formatNumber(preview.newItemCount)} yeni kart</b> açılır,{' '}
          {formatNumber(preview.existingItemCount ?? 0)} mevcut kart güncellenir. Hiçbir kart silinmez.
        </span>
      )}

      {isOrders && (
        <>
          <span>
            {formatNumber(preview.orderCount ?? 0)} sipariş geliyor · şu an açık {formatNumber(preview.openOrdersNow ?? 0)} ·
            yeni {formatNumber(preview.wouldCreateOrders ?? 0)} ·{' '}
            <b>kapanacak {formatNumber(preview.wouldCloseOrders ?? 0)}</b>
          </span>
          {preview.sampleClosingOrderNos.length > 0 && (
            <span className="text-[var(--fg-muted)]">
              Kapanacaklardan örnek: {preview.sampleClosingOrderNos.join(', ')}
            </span>
          )}
        </>
      )}

      {preview.wouldRequireConfirmation && (
        <span className="font-bold">
          Bu sonuç olağan dışı: otomatik tur bunu yazmaz. Kapanacak siparişlerin gerçekten ERP&apos;de
          kapandığını birkaç örnekle doğrulayın; doğruysa &quot;Onayla ve çalıştır&quot; ile yazın.
        </span>
      )}
    </div>
  );
}
