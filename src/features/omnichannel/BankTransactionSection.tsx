'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bankApi, type BankOrderRefDto, type BankTransactionDto, type BankTransactionStatus } from '../../lib/api/omnichannel-bank';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { BANK_PAGE_SIZE, bankPageCount, formatBankAmount } from './bankMatchRules';
import { BankTransactionRow } from './BankTransactionRow';
import { useBankTransactionPage } from './useBankTransactions';

interface Props {
  title: string;
  hint: string;
  emptyText: string;
  status: BankTransactionStatus;
  days: number;
  version: number;
  onChanged: () => void;
}

// Bir durumun listesi (Eşleşenler / Öneriler / Eşleşmeyenler). Onay ve yoksay sonrası üst sekme tüm listeleri tazeler.
export function BankTransactionSection({ title, hint, emptyText, status, days, version, onChanged }: Props) {
  const { data, loading, error, page, setPage } = useBankTransactionPage(status, days, version);
  const { notify, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      notify.success(success);
      onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (tx: BankTransactionDto, order: BankOrderRefDto) => {
    const ok = await confirm({
      title: 'Sipariş ödendi olarak işaretlensin mi?',
      body: `${order.publicNo ?? `#${order.id}`} — ${formatBankAmount(tx.amount, tx.currency)} havale bu siparişin ödemesi sayılacak.`,
      confirmLabel: 'Onayla',
    });
    if (ok) await run(() => bankApi.confirm(tx.id, order.id), 'Sipariş ödendi olarak işaretlendi.');
  };

  const pages = data ? bankPageCount(data.total, BANK_PAGE_SIZE) : 1;

  return (
    <section className="flex flex-col gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3.5 py-3 shadow-xs">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold text-[var(--fg)]">{title}{data && ` (${data.total})`}</h3>
        <span className="text-[10.5px] text-[var(--fg-muted)]">{hint}</span>
      </div>

      {error && <p className="text-[11px] text-rose-500">{error}</p>}
      {loading && !data && <p className="py-2 text-[var(--fg-muted)]">Yükleniyor…</p>}
      {data && data.items.length === 0 && <p className="py-2 text-[var(--fg-muted)]">{emptyText}</p>}

      <div className="divide-y divide-[var(--border-soft)]">
        {data?.items.map((tx) => (
          <BankTransactionRow key={tx.id} transaction={tx} busy={busy}
            onConfirm={(t, o) => void handleConfirm(t, o)}
            onIgnore={(t) => void run(() => bankApi.ignore(t.id), 'Hareket yoksayıldı.')} />
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-1 text-[11px] text-[var(--fg-muted)]">
          <button type="button" aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="cursor-pointer rounded-[3px] p-1 hover:bg-[var(--bg-subtle)] disabled:opacity-40"><ChevronLeft size={14} /></button>
          <span>{page} / {pages}</span>
          <button type="button" aria-label="Sonraki sayfa" disabled={page >= pages} onClick={() => setPage(page + 1)}
            className="cursor-pointer rounded-[3px] p-1 hover:bg-[var(--bg-subtle)] disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      )}
    </section>
  );
}
