'use client';

import { Download } from 'lucide-react';
import type { ShopifyFitmentSkuIssueDto } from '../../lib/api/shopify-fitment';
import { unmatchedCsv } from './fitmentRules';
import { ghostButtonClass } from './styles';

interface Props {
  issues: ShopifyFitmentSkuIssueDto[];
}

const CSV_FILE_NAME = 'shopify-uyumluluk-eslesmeyen-skular.csv';

function downloadCsv(issues: ShopifyFitmentSkuIssueDto[]) {
  const url = URL.createObjectURL(new Blob([unmatchedCsv(issues)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = CSV_FILE_NAME;
  link.click();
  URL.revokeObjectURL(url);
}

// Eşitlenemeyen SKU'lar ve nedenleri (yazılmadılar); liste CSV olarak indirilebilir.
export function FitmentUnmatchedList({ issues }: Props) {
  if (issues.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-ui-xs text-fg">Eşitlenmeyen SKU&apos;lar ({issues.length})</strong>
        <button type="button" className={ghostButtonClass} onClick={() => downloadCsv(issues)}>
          <Download size={14} aria-hidden /> CSV indir
        </button>
      </div>
      <ul className="m-0 flex max-h-56 list-none flex-col gap-1 overflow-y-auto p-0 text-ui-xs text-fg-muted">
        {issues.map((issue) => (
          <li key={issue.sku} className="break-words">
            <span className="font-semibold text-fg">{issue.sku}</span> — {issue.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
