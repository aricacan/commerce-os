import { ErpOperationStatus, ProductDraftStatus } from '../../lib/api/product-drafts';

export const fieldClass = 'w-full h-9 rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--fg)] outline-none transition focus:border-[var(--fg)] focus:ring-0 disabled:bg-[var(--bg-subtle)] disabled:text-[var(--fg-muted)]';
export const textareaClass = 'w-full rounded-[6px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--fg)] outline-none transition focus:border-[var(--fg)] focus:ring-0 disabled:bg-[var(--bg-subtle)] disabled:text-[var(--fg-muted)]';
export const labelClass = 'mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]';

export function money(value: number, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value);
}

export function draftStatus(status: number): { label: string; className: string } {
  switch (status) {
    case ProductDraftStatus.Draft:
      return { label: 'Taslak', className: 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]' };
    case ProductDraftStatus.AwaitingApproval:
      return { label: 'Onay bekliyor', className: 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg)]' };
    case ProductDraftStatus.Approved:
      return { label: 'Onaylandı', className: 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)]' };
    case ProductDraftStatus.Rejected:
      return { label: 'Reddedildi', className: 'border border-[var(--border)] bg-[var(--card)] text-red-500' };
    case ProductDraftStatus.ReadyToDispatch:
      return { label: 'Gönderime hazır', className: 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg)]' };
    case ProductDraftStatus.Queued:
      return { label: 'Kuyrukta', className: 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)]' };
    case ProductDraftStatus.Completed:
      return { label: 'Tamamlandı', className: 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg)]' };
    case ProductDraftStatus.Failed:
      return { label: 'Başarısız', className: 'border border-[var(--border)] bg-[var(--card)] text-red-500' };
    default:
      return { label: 'İptal', className: 'border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]' };
  }
}

export function destinationStatus(status: number): string {
  switch (status) {
    case ErpOperationStatus.Draft: return 'Taslak';
    case ErpOperationStatus.AwaitingApproval: return 'Onay bekliyor';
    case ErpOperationStatus.Approved:
    case ErpOperationStatus.ReadyToDispatch: return 'Gönderime hazır';
    case ErpOperationStatus.Queued: return 'Kuyrukta';
    case ErpOperationStatus.Processing: return 'İşleniyor';
    case ErpOperationStatus.Succeeded: return 'Tamamlandı';
    case ErpOperationStatus.PartiallySucceeded: return 'Kısmen tamamlandı';
    case ErpOperationStatus.Failed: return 'Başarısız';
    case ErpOperationStatus.Rejected: return 'Reddedildi';
    case ErpOperationStatus.Cancelled: return 'İptal edildi';
    default: return 'Bekliyor';
  }
}
