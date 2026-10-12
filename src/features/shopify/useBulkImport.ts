'use client';

import { useState } from 'react';
import {
  IMPORT_OUTCOME, IMPORT_ROW_STATE, shopifyImportApi,
  type ShopifyImportPreviewDto, type ShopifyImportResultDto, type ShopifyImportRowDto, type ShopifyImportRowPreviewDto,
} from '../../lib/api/shopify-import';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText } from './explorerRules';
import { applyGroups, failedGroup, mergeResults } from './importRules';

export interface ImportProgress {
  done: number;
  total: number;
}

// Önizlemede güncellenmeyecek satırlar (değişmeyen/hatalı/eşleşmeyen) Shopify'a gönderilmez ama sonuç raporunda "atlandı" görünür.
function skippedFromPreview(rows: ShopifyImportRowPreviewDto[]): ShopifyImportResultDto {
  const skipped = rows
    .filter((r) => r.state !== IMPORT_ROW_STATE.WillUpdate)
    .map((r) => ({ rowNumber: r.rowNumber, sku: r.sku, outcome: IMPORT_OUTCOME.Skipped, message: r.message ?? 'Değişiklik yok.' }));
  return { rows: skipped, applied: 0, skipped: skipped.length, failed: 0 };
}

// Toplu içe aktarma akışı: önizleme (yazmaz) → onaylı uygulama (küçük gruplar, sırayla; bir grup düşerse diğerleri sürer).
export function useBulkImport(storeId: number) {
  const { notify } = useFeedback();
  const [rows, setRows] = useState<ShopifyImportRowDto[]>([]);
  const [preview, setPreview] = useState<ShopifyImportPreviewDto | null>(null);
  const [result, setResult] = useState<ShopifyImportResultDto | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setRows([]);
    setPreview(null);
    setResult(null);
    setProgress(null);
  };

  const runPreview = async (next: ShopifyImportRowDto[]) => {
    setBusy(true);
    try {
      setPreview(await shopifyImportApi.preview(storeId, { rows: next }));
      setRows(next);
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const apply = async (confirmLargePriceChange: boolean) => {
    if (!preview) return;
    const updating = rows.filter((row) => preview.rows.some((p) => p.rowNumber === row.rowNumber && p.state === IMPORT_ROW_STATE.WillUpdate));
    const groups = applyGroups(updating);
    setBusy(true);
    const parts: ShopifyImportResultDto[] = [skippedFromPreview(preview.rows)];
    for (const [index, group] of groups.entries()) {
      setProgress({ done: index, total: groups.length });
      try {
        parts.push(await shopifyImportApi.apply(storeId, { rows: group, confirmLargePriceChange }));
      } catch (e) {
        parts.push(failedGroup(group, explorerErrorText(e)));
      }
    }
    setProgress(null);
    setResult(mergeResults(parts));
    setBusy(false);
  };

  return { preview, result, progress, busy, runPreview, apply, reset };
}
