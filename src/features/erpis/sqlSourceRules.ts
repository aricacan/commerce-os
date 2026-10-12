import type { ErpisDataset, ErpisSqlSource } from '@/lib/api';

// Canlı Veri panelinin karar kuralları — bileşenden ayrı, test edilebilir.

// Seçicide yalnız doğru TÜRDEKİ aktif rapor tipleri listelenir: açık siparişlerin
// "Stok Kartları" tipine yazılması her turda hata üretiyordu.
export function datasetsForSource<T extends Pick<ErpisDataset, 'kind' | 'isActive'>>(
  source: Pick<ErpisSqlSource, 'expectedKind'>,
  datasets: T[],
): T[] {
  return datasets.filter((d) => d.isActive && (source.expectedKind == null || d.kind === source.expectedKind));
}

// Çalıştırma/açma için eksik ayar — yoksa null. Düğme bu metinle devre dışı kalır;
// eksik ayarla çalıştırmak backend'de gereksiz bir hata kaydı üretiyordu.
export function missingTargetReason(
  source: Pick<ErpisSqlSource, 'target' | 'companyId' | 'datasetId' | 'erpCompanyCode' | 'requiresErpCompanyCode'>,
): string | null {
  if (source.companyId == null) return 'Önce hedef firma seçilmeli.';
  if (source.target === 'Import' && source.datasetId == null) return 'Önce hedef rapor tipi seçilmeli.';
  if (source.requiresErpCompanyCode && !source.erpCompanyCode?.trim())
    return 'Önce ERP şirket kodu girilmeli (ör. STOREB).';
  return null;
}
