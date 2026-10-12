'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, GitCompareArrows } from 'lucide-react';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { downloadCsvFile } from '../../lib/export';
import {
  ERP_MATCH_FILTER, shopifyErpMatchApi, type ErpMatchFilter, type ErpMatchQuery,
} from '../../lib/api/shopify-erp-match';
import { useFeedback } from '../shared/Feedback';
import {
  DEFAULT_PRICE_TOLERANCE_PERCENT, DEFAULT_STOCK_TOLERANCE, ERP_MATCH_CSV_COLUMNS, ERP_MATCH_EXPORT_LIMIT,
  ERP_MATCH_FILTER_OPTIONS, ERP_MATCH_PAGE_SIZE, parseTolerance, toCsvRows, totalPages,
} from './erpMatchRules';
import { ErpMatchReadinessCard } from './ErpMatchReadinessCard';
import { ErpMatchTable } from './ErpMatchTable';
import { explorerErrorText } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { PagerBar } from './PagerBar';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';
import { useShopifyStores } from './useShopifyStores';

interface Props {
  storeId: number;
  onOpenStores: () => void;
}

const CSV_FILE_NAME = 'shopify-erp-eslestirme.csv';
const FILTER_MIN_WIDTH = 200;

// ERP eşleştirme sihirbazı (SALT OKUNUR): mağaza varyantları ile ERP kataloğunu SKU üzerinden karşılaştırır.
// Tarama Shopify'a gittiği için düğmeye basınca çalışır; süzgeç/sayfa değişince rapor yeniden hesaplanır.
export function ErpMatchTab({ storeId, onOpenStores }: Props) {
  const { notify } = useFeedback();
  const stores = useShopifyStores();
  const [started, setStarted] = useState(false);
  const [filter, setFilter] = useState<ErpMatchFilter>(ERP_MATCH_FILTER.All);
  const [page, setPage] = useState(1);
  const [priceText, setPriceText] = useState(String(DEFAULT_PRICE_TOLERANCE_PERCENT));
  const [stockText, setStockText] = useState(String(DEFAULT_STOCK_TOLERANCE));
  const [applied, setApplied] = useState({ price: DEFAULT_PRICE_TOLERANCE_PERCENT, stock: DEFAULT_STOCK_TOLERANCE });
  const [exporting, setExporting] = useState(false);

  const queryFor = (overrides: Partial<ErpMatchQuery>): ErpMatchQuery => ({
    filter, page, pageSize: ERP_MATCH_PAGE_SIZE,
    priceTolerancePercent: applied.price, stockTolerance: applied.stock, ...overrides,
  });

  const report = useQuery({
    queryKey: ['shopify', 'erp-match', storeId, filter, page, applied],
    queryFn: () => shopifyErpMatchApi.report(storeId, queryFor({})),
    enabled: started,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 0,
  });

  const compare = () => {
    setApplied({
      price: parseTolerance(priceText, DEFAULT_PRICE_TOLERANCE_PERCENT),
      stock: parseTolerance(stockText, DEFAULT_STOCK_TOLERANCE),
    });
    setPage(1);
    setStarted(true);
    if (started) void report.refetch();
  };

  const changeFilter = (value: string) => {
    setFilter(value as ErpMatchFilter);
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await shopifyErpMatchApi.report(storeId, queryFor({ page: 1, pageSize: ERP_MATCH_EXPORT_LIMIT }));
      downloadCsvFile(CSV_FILE_NAME, toCsvRows(all.rows), ERP_MATCH_CSV_COLUMNS);
      if (all.totalRows > all.rows.length) notify.info(`İlk ${all.rows.length} satır indirildi; süzgeçle daraltıp tekrar indirin.`);
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setExporting(false);
    }
  };

  const data = report.data;
  const authority = stores.data?.find((s) => s.id === storeId)?.catalogAuthority;

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-ui-xs text-fg-muted">
        Shopify varyant SKU&apos;larını ERP kataloğuyla karşılaştırır; hiçbir tarafa yazmaz. ERP bağlanmadan önce çift kayıt
        riskini görmek için kullanın.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-ui-2xs text-fg-muted">
          Fiyat farkı eşiği (%)
          <input className={`${fieldClass} w-28`} inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs text-fg-muted">
          Stok farkı eşiği (adet)
          <input className={`${fieldClass} w-28`} inputMode="numeric" value={stockText} onChange={(e) => setStockText(e.target.value)} />
        </label>
        <button type="button" className={primaryButtonClass} onClick={compare} disabled={report.isFetching}>
          <GitCompareArrows size={14} aria-hidden /> {started ? 'Yeniden karşılaştır' : 'Karşılaştır'}
        </button>
      </div>

      {started && (
        <ExplorerState
          loading={report.isLoading}
          error={report.error}
          isEmpty={false}
          emptyTitle=""
          onRetry={() => void report.refetch()}
        >
          {data && (
            <>
              <ErpMatchReadinessCard summary={data.summary} authority={authority} onOpenStores={onOpenStores} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FilterSelect
                  value={filter} options={ERP_MATCH_FILTER_OPTIONS} placeholder="Süzgeç" onChange={changeFilter}
                  showAllOption={false} minWidth={FILTER_MIN_WIDTH} ariaLabel="Satır süzgeci"
                />
                <button type="button" className={ghostButtonClass} onClick={exportCsv} disabled={exporting || data.totalRows === 0}>
                  <Download size={14} aria-hidden /> CSV indir ({data.totalRows})
                </button>
              </div>
              {data.rows.length === 0
                ? <p className="m-0 text-ui-xs text-fg-muted">Bu süzgece uyan satır yok.</p>
                : <ErpMatchTable rows={data.rows} />}
              <PagerBar
                pageNumber={data.page}
                hasPrevious={data.page > 1}
                hasNext={data.page < totalPages(data.totalRows, data.pageSize)}
                busy={report.isFetching}
                onPrevious={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            </>
          )}
        </ExplorerState>
      )}
    </div>
  );
}
