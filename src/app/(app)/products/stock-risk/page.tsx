'use client';

import { useSearchParams } from 'next/navigation';
import { StockRiskWorkspace } from '../../../../features/products/StockRiskWorkspace';
import type { StockFlag } from '../../../../lib/api/stock';

const VALID_FLAGS: readonly StockFlag[] = ['atRisk', 'negative', 'belowThreshold'];

export default function StockRiskPage() {
  const params = useSearchParams();
  const raw = params.get('flag');
  const flag = VALID_FLAGS.includes(raw as StockFlag) ? (raw as StockFlag) : null;

  return <StockRiskWorkspace initialFlag={flag} />;
}
