import { ErpOperationStatus, ManualOrderDraftStatus } from '../../lib/api/manual-orders';

export const fieldClass = 'w-full rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--fg)] outline-none transition focus:border-[var(--border-strong)] disabled:bg-[var(--bg-subtle)] disabled:text-[var(--fg-muted)]';
export const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]';

export function money(value: number, currency = 'TRY', lang: 'tr' | 'en' = 'tr') {
  return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency }).format(value);
}

export function draftStatus(status: number, lang: 'tr' | 'en' = 'tr'): { label: string; className: string } {
  const isTr = lang === 'tr';
  switch (status) {
    case ManualOrderDraftStatus.Draft:
      return { label: isTr ? 'Taslak' : 'Draft', className: 'border border-[var(--border-soft)] bg-[var(--card-hover)] text-[var(--fg-muted)] rounded-[4px]' };
    case ManualOrderDraftStatus.AwaitingApproval:
      return { label: isTr ? 'Onay bekliyor' : 'Awaiting approval', className: 'border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.06)] text-[#93c5fd] rounded-[4px]' };
    case ManualOrderDraftStatus.Approved:
      return { label: isTr ? 'Onaylandı' : 'Approved', className: 'border border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.06)] text-[#6ee7b7] rounded-[4px]' };
    case ManualOrderDraftStatus.Rejected:
      return { label: isTr ? 'Reddedildi' : 'Rejected', className: 'border border-[rgba(244,63,94,0.18)] bg-[rgba(244,63,94,0.06)] text-[#fda4af] rounded-[4px]' };
    case ManualOrderDraftStatus.ReadyToDispatch:
      return { label: isTr ? 'Gönderime hazır' : 'Ready to dispatch', className: 'border border-[rgba(139,92,246,0.18)] bg-[rgba(139,92,246,0.06)] text-[#c4b5fd] rounded-[4px]' };
    case ManualOrderDraftStatus.Queued:
      return { label: isTr ? 'Kuyrukta' : 'Queued', className: 'border border-[var(--border-soft)] bg-[var(--card-hover)] text-[var(--fg)] rounded-[4px]' };
    case ManualOrderDraftStatus.Completed:
      return { label: isTr ? 'Tamamlandı' : 'Completed', className: 'border border-[rgba(16,185,129,0.18)] bg-[rgba(16,185,129,0.06)] text-[#6ee7b7] rounded-[4px]' };
    case ManualOrderDraftStatus.Failed:
      return { label: isTr ? 'Başarısız' : 'Failed', className: 'border border-[rgba(244,63,94,0.18)] bg-[rgba(244,63,94,0.06)] text-[#fda4af] rounded-[4px]' };
    default:
      return { label: isTr ? 'İptal' : 'Cancelled', className: 'border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)] rounded-[4px]' };
  }
}

export interface TargetErpSource {
  id: number;
  name: string;
  connectorType: string;
  country: string;
}

/**
 * Bir siparişin/ürünün gerçekte hangi mağaza + hangi ERP/pazaryeri bağlantısına
 * gideceğini tek bakışta gösteren okunabilir etiket üretir. "StoreA" ya da "StoreB"
 * tek başına yeterli değildir; aynı mağazanın birden fazla ERP hedefi olabilir.
 */
export function formatTargetLabel(storeName: string, source: TargetErpSource): string {
  return `${storeName} → ${source.name} (${source.connectorType} · ${source.country})`;
}

export function destinationStatus(status: number, lang: 'tr' | 'en' = 'tr'): string {
  const isTr = lang === 'tr';
  switch (status) {
    case ErpOperationStatus.Draft: return isTr ? 'Taslak' : 'Draft';
    case ErpOperationStatus.AwaitingApproval: return isTr ? 'Onay bekliyor' : 'Awaiting approval';
    case ErpOperationStatus.Approved:
    case ErpOperationStatus.ReadyToDispatch: return isTr ? 'Gönderime hazır' : 'Ready to dispatch';
    case ErpOperationStatus.Queued: return isTr ? 'Kuyrukta' : 'Queued';
    case ErpOperationStatus.Processing: return isTr ? 'İşleniyor' : 'Processing';
    case ErpOperationStatus.Succeeded: return isTr ? 'Tamamlandı' : 'Succeeded';
    case ErpOperationStatus.PartiallySucceeded: return isTr ? 'Kısmen tamamlandı' : 'Partially succeeded';
    case ErpOperationStatus.Failed: return isTr ? 'Başarısız' : 'Failed';
    case ErpOperationStatus.Rejected: return isTr ? 'Reddedildi' : 'Rejected';
    case ErpOperationStatus.Cancelled: return isTr ? 'İptal edildi' : 'Cancelled';
    default: return isTr ? 'Bekliyor' : 'Pending';
  }
}
