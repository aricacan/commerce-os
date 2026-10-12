'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, History, Loader2, X } from 'lucide-react';
import type { ShippingPolicyApplyTo } from '../../../lib/api/shipping-policies';

interface ApplyToDialogProps {
  title: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (applyTo: ShippingPolicyApplyTo) => void;
}

const OPTIONS: { key: ShippingPolicyApplyTo; label: string; hint: string; Icon: typeof History }[] = [
  {
    key: 'FromToday',
    label: 'Bugünden itibaren',
    hint: 'Yeni fiyat bugünden sonraki siparişlere uygulanır. Önceki siparişler eski fiyatında kalır.',
    Icon: CalendarClock,
  },
  {
    key: 'AllOrders',
    label: 'Tüm siparişlere (geçmiş dahil)',
    hint: 'Eski fiyat silinir; geçmiş siparişlerin kârı da yeni fiyatla yeniden hesaplanır.',
    Icon: History,
  },
];

// Kayıtlı bir fiyat değişirken kaydetmeden önce sorulur: değişiklik geçmiş siparişleri de
// etkilesin mi? Portal ile body'ye çizilir — sayfadaki kartların katman sırası örtmesin.
export function ApplyToDialog({ title, saving, onCancel, onConfirm }: ApplyToDialogProps) {
  const [choice, setChoice] = useState<ShippingPolicyApplyTo>('FromToday');

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-[10px] border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="m-0 text-sm font-semibold text-[var(--fg)]">{title}</h3>
          <button type="button" aria-label="Kapat" onClick={onCancel} className="text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div role="radiogroup" className="flex flex-col gap-2">
          {OPTIONS.map(({ key, label, hint, Icon }) => {
            const selected = key === choice;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChoice(key)}
                className={`flex items-start gap-3 rounded-[8px] border p-3 text-left transition cursor-pointer ${
                  selected ? 'border-[var(--fg)] bg-[var(--bg-subtle)]' : 'border-[var(--border-soft)] hover:border-[var(--border)]'
                }`}
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${selected ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-[var(--fg)]">{label}</span>
                  <span className="text-[11px] leading-snug text-[var(--fg-muted)]">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-9 rounded-[6px] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => onConfirm(choice)}
            disabled={saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[var(--fg)] px-4 text-xs font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
