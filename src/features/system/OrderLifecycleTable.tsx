'use client';

import { useEffect, useState } from 'react';
import { orderStatusesApi, type OrderLifecycleKind, type OrderLifecycleStep } from '@/lib/api/orderStatuses';

const KIND_LABELS: Readonly<Record<OrderLifecycleKind, string>> = {
  Flow: 'Akış',
  Terminal: 'Uç durum',
  Other: 'Diğer',
};

/** Sipariş yaşam döngüsü: tek gerçek kaynak (UniversalStatus) ve gerçek sipariş sayıları. */
export function OrderLifecycleTable() {
  const [steps, setSteps] = useState<OrderLifecycleStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    orderStatusesApi
      .lifecycle()
      .then(setSteps)
      .catch(() => setError('Sipariş yaşam döngüsü yüklenemedi.'));
  }, []);

  return (
    <section
      data-tour="order-lifecycle"
      className="flex max-w-4xl flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4"
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-xs font-bold text-[var(--fg)]">Sipariş yaşam döngüsü</h2>
        <p className="text-[11px] text-[var(--fg-muted)]">
          Her sipariş tek bir yaşam döngüsünden geçer: Yeni → Onaylandı → Hazırlanıyor → Kargolandı → Tamamlandı.
          Ödeme durumu ayrı izlenir.
        </p>
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      <ul className="flex flex-col divide-y divide-[var(--border-soft)]">
        {steps.map((step) => (
          <li key={step.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="w-5 font-mono text-[10.5px] text-[var(--fg-muted)]">{step.order}</span>
            <span className="w-28 text-xs font-bold text-[var(--fg)]">{step.label}</span>
            <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)]">
              {KIND_LABELS[step.kind]}
            </span>
            <span className="min-w-0 flex-1 text-[11px] text-[var(--fg-muted)]">{step.description}</span>
            <span className="font-mono text-xs font-bold text-[var(--fg)]">
              {step.count.toLocaleString('tr-TR')} sipariş
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
