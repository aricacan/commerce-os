import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';
import { useStoreSelector } from '../stores/store-selector';

// Base (BaseLinker/StoreB UK) verisi TRY olarak saklanır ama kaynağı GBP'dir — kur
// CurrencyRates/TCMB'den otomatik gelir (bkz. backend ICurrencyConverter). Orijinal GBP
// tutarı hiç saklanmadığından (ingestion anında dönüştürülüp üzerine yazılıyor — bkz.
// BaseErpConnector), GBP burada "TRY / güncel kur" olarak anlık hesaplanır; ayrı bir
// sütun/migration gerekmez.
//
// İki farklı kullanım şekli var:
//  - isBaseOnly: ambient ERP seçicideki TÜM seçili kaynaklar "base-*" ile başlıyorsa
//    (ör. sadece "Base - StoreA" ve/veya "Base - StoreB" seçili, bkz. store-selector.ts
//    ErpSourceCode) true — o zaman sayfadaki TÜM veri zaten Base kaynaklı olduğundan
//    toplam/aggregate tutarlarda da GBP gösterilmesi anlamlı olur (Sentos karışıksa
//    YANILTICI olurdu, bu yüzden false kalır).
//  - isBaseSourceType(sourceType): per-satır sinyal — Orders/Products/ERP Dağılımı gibi
//    listelerde tek bir satırın hangi ERP'den geldiğini (DataSource.ConnectorType, bkz.
//    OrderDetailDto/ProductGridItemDto/StoreComparisonRow.SourceType) gösterir.
export function useBaseCurrency() {
  const { selectedStores } = useStoreSelector();
  const isBaseOnly = selectedStores.length > 0 && selectedStores.every((c) => c.startsWith('base-'));

  const { data } = useQuery({
    queryKey: ['base-fx-rate'],
    queryFn: settingsApi.getBaseFx,
    staleTime: 5 * 60_000,
  });
  const rate = data?.gbpToTryRate ?? 0;

  function toGbp(tryAmount: number): number | null {
    return rate > 0 ? tryAmount / rate : null;
  }

  function isBaseSourceType(sourceType?: string | null): boolean {
    return sourceType === 'Base';
  }

  return { rate, isBaseOnly, toGbp, isBaseSourceType };
}
