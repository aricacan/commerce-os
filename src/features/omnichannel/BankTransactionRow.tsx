import { AlertTriangle, Check } from 'lucide-react';
import {
  BANK_TRANSACTION_STATUS,
  type BankOrderRefDto,
  type BankTransactionDto,
} from '../../lib/api/omnichannel-bank';
import { bankAmountNote, formatBankAmount, formatBankDate } from './bankMatchRules';
import { secondaryButtonClass } from './formClasses';

interface Props {
  transaction: BankTransactionDto;
  busy: boolean;
  onConfirm: (transaction: BankTransactionDto, order: BankOrderRefDto) => void;
  onIgnore: (transaction: BankTransactionDto) => void;
}

const orderLabel = (order: BankOrderRefDto) => [order.publicNo ?? `#${order.id}`, order.fullName].filter(Boolean).join(' · ');

// Tek banka hareketi. Eşleşen: hangi siparişe bağlandığı. Öneri: aday başına "Onayla". Eşleşmeyen: "Yoksay".
export function BankTransactionRow({ transaction, busy, onConfirm, onIgnore }: Props) {
  const { status, matchedOrder, suggestions, attentionNote } = transaction;
  const canIgnore = status === BANK_TRANSACTION_STATUS.Unmatched || status === BANK_TRANSACTION_STATUS.Suggested;

  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-bold text-[var(--fg)]">{formatBankAmount(transaction.amount, transaction.currency)}</span>
        <span className="text-[11px] text-[var(--fg-muted)]">{formatBankDate(transaction.bookingDate)}</span>
      </div>
      <p className="min-w-0 break-words text-[11px] text-[var(--fg)]">
        {transaction.description || 'Açıklama yok'}
        {transaction.senderName && <span className="text-[var(--fg-muted)]">{` · ${transaction.senderName}`}</span>}
      </p>

      {attentionNote && (
        <p className="flex items-start gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle size={12} className="mt-px shrink-0" /> {attentionNote} Temsilciye görev açıldı.
        </p>
      )}
      {matchedOrder && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Ödendi olarak işaretlendi: {orderLabel(matchedOrder)}</p>
      )}

      {suggestions.map((order) => (
        <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] bg-[var(--bg-subtle)] px-2.5 py-1.5">
          <span className="min-w-0 text-[11px] text-[var(--fg)]">
            {orderLabel(order)}
            {bankAmountNote(transaction, order) && (
              <span className="block text-amber-600 dark:text-amber-400">{bankAmountNote(transaction, order)}</span>
            )}
          </span>
          <button type="button" disabled={busy} onClick={() => onConfirm(transaction, order)} className={secondaryButtonClass}>
            <Check size={13} /> Onayla
          </button>
        </div>
      ))}

      {canIgnore && (
        <div>
          <button type="button" disabled={busy} onClick={() => onIgnore(transaction)}
            className="cursor-pointer text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-40">
            Yoksay
          </button>
        </div>
      )}
    </div>
  );
}
