'use client';

import { useState } from 'react';
import { formatDateTime } from '@/lib/format';
import type { CatalogSiteSourceDto } from '../../lib/api/omnichannel-catalog';
import { describeFailureKind, hasPendingRetry, isManualSyncBlocked, isStale, syncSeverity } from './siteSyncHealth';

const SEVERITY_STYLES = {
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-600',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
} as const;

function formatAt(at: string): string {
  return formatDateTime(at, 'tr', { dateStyle: 'short', timeStyle: 'short' });
}

// Site kaynağı satırının altındaki durum: son başarılı senkron + bayat rozeti, hata/uyarı ayrımı,
// sınıfa göre kısa açıklama. Tam hata metni kırpılmaz; açılır bölümde durur.
export function SiteSyncStatus({ site }: { site: CatalogSiteSourceDto }) {
  const [nowMs] = useState(() => Date.now());
  const severity = syncSeverity(site);
  const stale = isStale(site, nowMs);

  return (
    <div className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
        Son başarılı senkron: {site.lastSuccessAt ? formatAt(site.lastSuccessAt) : 'yok'}
        {stale && (
          <span className="rounded-[3px] bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
            title="Veri beklenenden eski; bot güncel olmayan fiyat/stok söyleyebilir">
            Bayat
          </span>
        )}
        {hasPendingRetry(site, nowMs) && site.nextAttemptAt && <span>· Sonraki deneme: {formatAt(site.nextAttemptAt)}</span>}
        {isManualSyncBlocked(site, nowMs) && site.manualSyncNotBefore && (
          <span>· Elle çekme {formatAt(site.manualSyncNotBefore)} sonrası açılır</span>
        )}
      </span>
      {severity !== 'none' && site.lastError && (
        <details className={`rounded-[4px] border px-2 py-1 text-[11px] ${SEVERITY_STYLES[severity]}`}>
          <summary className="cursor-pointer font-semibold">
            {severity === 'error' ? 'Hata' : 'Uyarı'}
            {describeFailureKind(site.lastFailureKind) ? `: ${describeFailureKind(site.lastFailureKind)}` : ''}
          </summary>
          <p className="mt-1 whitespace-pre-wrap break-words">{site.lastError}</p>
        </details>
      )}
    </div>
  );
}
