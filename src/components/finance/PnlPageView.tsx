'use client';

import { PnlTable } from './PnlTable';
import { MissingFeeRatesBanner } from './MissingFeeRatesBanner';

export function PnlPageView() {
  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto bg-transparent p-4 md:p-5">
      <MissingFeeRatesBanner />
      <PnlTable />
    </div>
  );
}
