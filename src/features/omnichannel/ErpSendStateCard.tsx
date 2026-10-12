'use client';

import { ScopeBadge } from './ScopeBadge';
import { useErpSendState } from './useErpSendState';

// Hesap geneli › Sipariş hedefi: "ERP'ye sohbet siparişi gönderimi (test aşamasında)" anahtarının durumu.
// Sentos/Base sipariş uçları canlıda doğrulanmadığı için varsayılan KAPALI; ERP hedefli sipariş bu durumda
// panelde kalır. Açma/kapama Ayarlar › Sistem Modülleri'ndedir (burada yalnız durum gösterilir).
export function ErpSendStateCard() {
  const { state, error } = useErpSendState();
  if (!state && !error) return null;

  return (
    <section className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-bold text-[var(--fg)]">ERP&apos;ye sohbet siparişi gönderimi (test aşamasında)</h3>
        {state && <ScopeBadge label={state.enabled ? 'Açık' : 'Kapalı'} tone={state.enabled ? 'warning' : 'neutral'} />}
      </div>
      {state && <p className="m-0 text-[var(--fg-muted)]">{state.notice}</p>}
      {error && <p role="alert" className="m-0 text-[var(--danger)]">{error}</p>}
    </section>
  );
}
