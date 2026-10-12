import { ErpDispatchStatus, ProductGapCandidateStatus, ProductGapMatchType } from '../../lib/api/product-gap';

export function candidateStatusLabel(status: number, isTr: boolean): { label: string; className: string } {
  switch (status) {
    case ProductGapCandidateStatus.Pending:
      return { label: isTr ? 'Bekliyor' : 'Pending', className: 'bg-amber-500/10 text-amber-500' };
    case ProductGapCandidateStatus.Sent:
      return { label: isTr ? 'Gönderildi' : 'Sent', className: 'bg-blue-500/10 text-blue-500' };
    case ProductGapCandidateStatus.Resolved:
      return { label: isTr ? 'Çözüldü' : 'Resolved', className: 'bg-emerald-500/10 text-emerald-500' };
    case ProductGapCandidateStatus.Ignored:
      return { label: isTr ? 'Yok sayıldı' : 'Ignored', className: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]' };
    case ProductGapCandidateStatus.Incomplete:
      return { label: isTr ? 'Eksik' : 'Incomplete', className: 'bg-orange-500/10 text-orange-500' };
    default:
      return { label: '—', className: '' };
  }
}

/**
 * Gönderilen adayın dış ERP kuyruğundaki gerçek durumu. Kullanıcı "gönderdim ama ne oldu"
 * sorusunu başka ekrana bakmadan burada görsün diye satırda ikinci bir rozet olarak çıkar.
 * null = henüz gönderilmemiş (kuyruk kaydı yok) → rozet gösterilmez.
 */
export function dispatchStatusLabel(
  status: number | null,
  isTr: boolean,
): { label: string; className: string } | null {
  if (status === null) return null;

  switch (status) {
    case ErpDispatchStatus.Queued:
    case ErpDispatchStatus.ReadyToDispatch:
    case ErpDispatchStatus.Approved:
      return { label: isTr ? 'Kuyrukta' : 'Queued', className: 'bg-sky-500/10 text-sky-500' };
    case ErpDispatchStatus.Processing:
      return { label: isTr ? 'Gönderiliyor' : 'Sending', className: 'bg-sky-500/10 text-sky-500' };
    case ErpDispatchStatus.Succeeded:
      return { label: isTr ? 'ERP’ye işlendi' : 'Delivered', className: 'bg-emerald-500/10 text-emerald-500' };
    case ErpDispatchStatus.PartiallySucceeded:
      return { label: isTr ? 'Kısmen başarılı' : 'Partial', className: 'bg-amber-500/10 text-amber-500' };
    case ErpDispatchStatus.Failed:
      return { label: isTr ? 'Hata' : 'Failed', className: 'bg-rose-500/10 text-rose-500' };
    case ErpDispatchStatus.DispatchDisabled:
      return { label: isTr ? 'Gönderim kapalı' : 'Dispatch off', className: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]' };
    case ErpDispatchStatus.Cancelled:
    case ErpDispatchStatus.Rejected:
      return { label: isTr ? 'İptal' : 'Cancelled', className: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]' };
    default:
      return null;
  }
}

export function matchTypeLabel(type: number, isTr: boolean): string {
  return type === ProductGapMatchType.Barcode ? (isTr ? 'Barkod' : 'Barcode') : 'SKU';
}
