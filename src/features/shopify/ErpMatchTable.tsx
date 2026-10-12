'use client';

import type { ErpMatchRowDto } from '../../lib/api/shopify-erp-match';
import { surfaceCard } from '../shared/design';
import { kindLabel, kindTone } from './erpMatchRules';
import { StatusBadge } from './StatusBadge';

interface Props {
  rows: ErpMatchRowDto[];
}

const HEADERS = ['SKU', 'Tür', 'Shopify ürün', 'ERP ürün', 'Fiyat (Shopify / ERP)', 'Stok (Shopify / ERP)', 'Not'];
const EMPTY = '-';

const pair = (shopify: number | null, erp: number | null): string => `${shopify ?? EMPTY} / ${erp ?? EMPTY}`;

function Row({ row }: { row: ErpMatchRowDto }) {
  return (
    <tr className="border-t border-border-soft align-top">
      <td className="px-2 py-1.5 font-mono text-ui-2xs font-semibold text-fg">{row.sku}</td>
      <td className="px-2 py-1.5"><StatusBadge label={kindLabel(row.kind)} tone={kindTone(row.kind)} /></td>
      <td className="min-w-0 break-words px-2 py-1.5 text-ui-xs text-fg">{row.shopifyTitle ?? EMPTY}</td>
      <td className="min-w-0 break-words px-2 py-1.5 text-ui-xs text-fg">
        {row.erpName ?? EMPTY}
        {row.erpSource && <span className="block text-ui-2xs text-fg-muted">{row.erpSource}</span>}
      </td>
      <td className="px-2 py-1.5 text-ui-xs text-fg">
        {pair(row.shopifyPrice, row.erpPrice)}
        {row.priceDiffers && <StatusBadge label="Fark" tone="warning" />}
      </td>
      <td className="px-2 py-1.5 text-ui-xs text-fg">
        {pair(row.shopifyStock, row.erpStock)}
        {row.stockDiffers && <StatusBadge label="Fark" tone="warning" />}
      </td>
      <td className="min-w-0 break-words px-2 py-1.5 text-ui-2xs text-fg-muted">
        {row.note ?? (row.suggestedSku ? `Önerilen yazım: ${row.suggestedSku}` : '')}
      </td>
    </tr>
  );
}

export function ErpMatchTable({ rows }: Props) {
  return (
    <div className={`${surfaceCard} overflow-x-auto`}>
      <table className="w-full min-w-[48rem] border-collapse text-left">
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="px-2 py-1.5 text-ui-2xs font-semibold text-fg-muted">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((row) => <Row key={`${row.kind}-${row.sku}`} row={row} />)}</tbody>
      </table>
    </div>
  );
}
