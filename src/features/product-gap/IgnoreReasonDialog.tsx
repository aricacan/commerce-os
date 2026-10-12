'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { EyeOff, X } from 'lucide-react';

interface Props {
  productName: string;
  busy: boolean;
  isTr: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

// Tarayıcının prompt() kutusu yerine uygulama diline/temasına uyan bir diyalog:
// prompt() bazı tarayıcılarda engelleniyor ve boş/iptal ayrımını kaybettiriyordu.
export function IgnoreReasonDialog({ productName, busy, isTr, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={busy ? undefined : onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[3px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col gap-3.5 rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--bg-subtle)]">
            <EyeOff size={17} className="text-[var(--fg-muted)]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[var(--fg)]">{isTr ? 'Bu ürünü yok say' : 'Ignore this product'}</h3>
            <p className="mt-0.5 truncate text-[11.5px] text-[var(--fg-muted)]">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] cursor-pointer disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-[11.5px] leading-snug text-[var(--fg-muted)]">
          {isTr
            ? 'Yok sayılan ürün sonraki taramalarda tekrar açılmaz. Nedeni kayda geçer.'
            : 'An ignored product will not be reopened by later scans. The reason is recorded.'}
        </p>

        <textarea
          autoFocus
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isTr ? 'Örn. karşı ERP’de bilinçli olarak satılmıyor' : 'e.g. intentionally not sold on the other ERP'}
          className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-[11.5px] text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-8 rounded-[4px] border border-[var(--border)] px-3 text-[11.5px] font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40"
          >
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={busy || trimmed.length === 0}
            onClick={() => onConfirm(trimmed)}
            className="h-8 rounded-[4px] bg-zinc-600 px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-zinc-500 cursor-pointer disabled:opacity-40"
          >
            {isTr ? 'Yok say' : 'Ignore'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
