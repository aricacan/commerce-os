'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, Clock, Lock, PackageCheck, Pencil, Send, Trash2, Wallet } from 'lucide-react';
import type { ChatOrderDto } from '../../lib/api/omnichannel-chat-orders';
import { ghostButtonClass, inputClass, primaryButtonClass } from './CustomerPanelParts';
import { chatOrderActionFlags } from './chatOrderRules';
import type { ChatOrderCommands } from './useChatOrderCommands';

const CANCEL_REASON_MAX_LENGTH = 256;

interface Props {
  order: ChatOrderDto;
  busy: boolean;
  commands: ChatOrderCommands;
  onEdit: () => void;
}

// Duruma ve sunucunun kilitlerine göre izinli işlem düğmeleri. İptal önce isteğe bağlı sebep sorar,
// sonra ortak onay diyaloğu açılır. Kilitliyse (kargolandı) sebebi açıkça yazar.
export function ChatOrderActions({ order, busy, commands, onEdit }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const flags = chatOrderActionFlags(order);

  if (cancelling) {
    return (
      <form
        className="flex flex-wrap items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void commands.cancel(reason.trim()).then(() => setCancelling(false));
        }}
      >
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="İptal sebebi (isteğe bağlı)"
          maxLength={CANCEL_REASON_MAX_LENGTH}
          className={`${inputClass} flex-1 basis-40`}
          autoFocus
        />
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => setCancelling(false)}>Vazgeç</button>
        <button type="submit" disabled={busy}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] bg-rose-600 px-2.5 text-[11px] font-bold text-white hover:opacity-90 disabled:opacity-40">
          <Ban size={12} aria-hidden /> Siparişi iptal et
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {flags.edit && (
          <button type="button" className={ghostButtonClass} disabled={busy} onClick={onEdit}>
            <Pencil size={12} aria-hidden /> Düzenle
          </button>
        )}
        {flags.sendConfirmation && (
          <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => void commands.sendConfirmation()}>
            <Send size={12} aria-hidden /> Müşteriye teyit gönder
          </button>
        )}
        {flags.confirm && (
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void commands.confirmOnBehalf()}>
            <CheckCircle2 size={12} aria-hidden /> Müşteri adına onayla
          </button>
        )}
        {flags.awaitPayment && (
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void commands.awaitPayment()}>
            <Clock size={12} aria-hidden /> Ödeme beklemeye al
          </button>
        )}
        {flags.markPaid && (
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void commands.markPaid()}>
            <Wallet size={12} aria-hidden /> Ödendi
          </button>
        )}
        {flags.markProcessed && (
          <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void commands.markProcessed()}>
            <PackageCheck size={12} aria-hidden /> Elle işlendi (Shopify&apos;a girildi)
          </button>
        )}
        {flags.cancel && (
          <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => setCancelling(true)}>
            <Ban size={12} aria-hidden /> İptal
          </button>
        )}
        {flags.remove && (
          <button type="button" className={ghostButtonClass} disabled={busy} onClick={() => void commands.remove()}>
            <Trash2 size={12} aria-hidden /> Sil
          </button>
        )}
      </div>
      {order.editLock && (
        <p className="m-0 flex items-start gap-1 break-words text-[10.5px] text-[var(--fg-muted)]">
          <Lock size={11} className="mt-px shrink-0" aria-hidden /> {order.editLock}
        </p>
      )}
    </div>
  );
}
