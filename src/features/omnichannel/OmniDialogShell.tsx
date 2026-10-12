'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Katman: 'form' kanal düzenleme gibi ana pencereler; 'modal' ortak tasarım sistemindeki
// modal katmanı (layers.modal); 'stacked' bir 'form' penceresinin İÇİNDEN açılan pencere —
// açıldığı pencerenin üstünde kalmalı.
const LAYER_CLASS = {
  form: 'z-[30001]',
  modal: 'z-[40000]',
  stacked: 'z-[40001]',
} as const;

type DialogLayer = keyof typeof LAYER_CLASS;

interface Props {
  onClose: () => void;
  // Panelin kendi görünümü (genişlik, zemin, kenarlık, yükseklik) — pencereden pencereye değişir.
  panelClassName: string;
  ariaLabel?: string;
  // Arka plan karartması; bazı pencereler daha koyu + bulanık zemin kullanır.
  backdropClassName?: string;
  layer?: DialogLayer;
  closeOnEscape?: boolean;
  children: ReactNode;
}

// Omnichannel pencerelerinin ortak kabuğu: body'ye açılan karartılmış zemin + ortalanmış panel.
// Zemine tıklamak kapatır; panelin içine tıklamak kapatmaz.
export function OmniDialogShell({
  onClose, panelClassName, ariaLabel, backdropClassName = 'bg-slate-900/45', layer = 'modal',
  closeOnEscape = false, children,
}: Props) {
  useEffect(() => {
    if (!closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeOnEscape, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${LAYER_CLASS[layer]} flex items-center justify-center p-4 ${backdropClassName}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
