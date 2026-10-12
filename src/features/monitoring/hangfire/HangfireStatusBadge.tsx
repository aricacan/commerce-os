import type { HangfireRunStatus } from '../../../lib/api';

interface StatusMeta {
  label: string;
  className: string;
}

const MUTED = 'bg-bg-subtle text-fg-muted';

// Renk tek başına anlam taşımasın diye her rozetin okunur bir etiketi var.
const RUN_STATUS_META: Record<HangfireRunStatus, StatusMeta> = {
  succeeded: { label: 'Başarılı', className: 'bg-success-soft text-success' },
  failed: { label: 'Başarısız', className: 'bg-danger-soft text-danger' },
  skipped: { label: 'Atlandı', className: MUTED },
  processing: { label: 'Çalışıyor', className: 'bg-info-soft text-info' },
  enqueued: { label: 'Kuyrukta', className: 'bg-info-soft text-info' },
  retrying: { label: 'Yeniden denenecek', className: 'bg-warning-soft text-warning' },
  scheduled: { label: 'Zamanlandı', className: MUTED },
  deleted: { label: 'Silindi', className: MUTED },
  never: { label: 'Hiç çalışmadı', className: MUTED },
  unregistered: { label: 'Bu sunucuda kapalı', className: 'bg-warning-soft text-warning' },
  unknown: { label: 'Bilinmiyor', className: MUTED },
};

function isKnownStatus(status: string): status is HangfireRunStatus {
  return Object.hasOwn(RUN_STATUS_META, status);
}

/** Tanınmayan değer (ör. eski backend'in ham durum adı) "Bilinmiyor" olur. */
function toRunStatus(status: string): HangfireRunStatus {
  return isKnownStatus(status) ? status : 'unknown';
}

export function HangfireStatusBadge({ status }: { status: HangfireRunStatus | string }) {
  const meta = RUN_STATUS_META[toRunStatus(status)];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-ui-xs font-semibold whitespace-nowrap ${meta.className}`}>
      {meta.label}
    </span>
  );
}
