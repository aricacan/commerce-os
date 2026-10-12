'use client';

import { useEffect, useState } from 'react';
import { creditLimitApi, type CreditLimitCheck } from '@/lib/api/history';

interface Props {
  customerId: number;
  /** Planlanan işlem tutarı. 0 ise yalnızca mevcut bakiye/limit durumu gösterilir. */
  amount?: number;
  currency?: string;
}

/**
 * Cari risk limiti göstergesi.
 *
 * Limiti olmayan müşteride HİÇBİR ŞEY göstermez — boş bir rozet, limitin var olduğu
 * yanılgısını yaratırdı.
 */
export function CreditLimitBadge({ customerId, amount = 0, currency = 'TRY' }: Props) {
  const [check, setCheck] = useState<CreditLimitCheck | null>(null);

  useEffect(() => {
    let active = true;

    creditLimitApi
      .check(customerId, amount, currency)
      .then((data) => {
        if (active) setCheck(data);
      })
      .catch(() => {
        if (active) setCheck(null);
      });

    return () => {
      active = false;
    };
  }, [customerId, amount, currency]);

  if (!check?.hasLimit) return null;

  const format = (value: number) =>
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: check.currency }).format(value);

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
        check.exceeded ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
      }`}
    >
      <span>Bakiye: {format(check.currentBalance)}</span>
      <span aria-hidden>/</span>
      <span>Limit: {format(check.limit ?? 0)}</span>
      {check.exceeded && (
        <span className="font-medium">
          · {check.enforced ? 'Aşım — işlem engellenir' : 'Aşım — yalnızca uyarı'}
        </span>
      )}
    </span>
  );
}
