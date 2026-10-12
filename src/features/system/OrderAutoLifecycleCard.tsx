'use client';

import { useEffect, useState } from 'react';
import { Workflow } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { orderAutoLifecycleApi } from '@/lib/api/orderStatuses';
import { autoLifecycleButtonLabel, autoLifecycleLabel } from './autoLifecycle';

export function OrderAutoLifecycleCard() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    orderAutoLifecycleApi
      .get()
      .then((setting) => setEnabled(setting.enabled))
      .catch(() => setError('Otomatik yaşam döngüsü ayarı yüklenemedi.'));
  }, []);

  async function toggle() {
    const next = !enabled;
    try {
      await orderAutoLifecycleApi.set(next);
      setEnabled(next);
      setError(null);
    } catch {
      setError('Otomatik yaşam döngüsü ayarı kaydedilemedi.');
    }
  }

  return (
    <div
      data-tour="order-statuses-auto-lifecycle"
      className="flex max-w-4xl flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4"
    >
      <div className="flex items-center gap-2">
        <Workflow size={14} className="text-[var(--fg-muted)]" />
        <h2 className="text-xs font-bold text-[var(--fg)]">Otomatik yaşam döngüsü</h2>
      </div>
      <p className="text-[11px] text-[var(--fg-muted)]">
        Kargo firmasında gönderi oluşunca sipariş &quot;Kargolandı&quot;, teslim edilince
        &quot;Tamamlandı&quot; olur. Yalnız ileri gider; iptal, iade ve tamamlanmış siparişlere
        dokunulmaz. Müşteriye otomatik mesaj gitmez.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--fg-muted)]">{autoLifecycleLabel(enabled)}</span>
        <Button variant="secondary" size="sm" onClick={() => void toggle()}>
          {autoLifecycleButtonLabel(enabled)}
        </Button>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
