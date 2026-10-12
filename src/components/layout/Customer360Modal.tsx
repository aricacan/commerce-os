'use client';

import { X, UserCircle2 } from 'lucide-react';
import { Customer360Panel } from '../../features/system/Customer360Panel';
import { useI18n } from '../../lib/i18n';

interface Customer360ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Customer360Modal({ isOpen, onClose }: Customer360ModalProps) {
  const { lang } = useI18n();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl h-[85vh] flex flex-col rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-3.5 px-4 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <UserCircle2 size={16} className="text-[var(--fg)]" />
            <div>
              <h2 className="text-xs font-bold text-[var(--fg)]">
                {lang === 'tr' ? 'Müşteri 360' : 'Customer 360'}
              </h2>
              <p className="text-ui-xs text-[var(--fg-muted)]">
                {lang === 'tr'
                  ? 'İsim, sipariş no veya e-posta ile ara — siparişler ve konuşmalar tek yerde'
                  : 'Search by name, order number, or email — orders and conversations in one place'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5">
          <Customer360Panel />
        </div>
      </div>
    </div>
  );
}
