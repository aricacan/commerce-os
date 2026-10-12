'use client';

import { useCallback, useEffect, useState } from 'react';
import { handoffApi, HANDOFF_STATUS, type HandoffOutcome, type HandoffTicketDto } from '../../lib/api/handoff';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';

// Konuşmanın açık devir kaydı (Faz 5, v2: FAZ 7). Konuşma bota geri verilince/çözülünce kayıt kalkar:
// refreshKey değişince tazelenir. Çözülen kayıt "yok" sayılır.
export function useHandoffTicket(conversationId: number, refreshKey: number) {
  const [ticket, setTicket] = useState<HandoffTicketDto | null>(null);
  const [busy, setBusy] = useState(false);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    try {
      setTicket(await handoffApi.forConversation(conversationId) ?? null);
    } catch {
      // Devir kaydı yan bilgidir: okunamazsa sohbet normal çalışmaya devam eder.
      setTicket(null);
    }
  }, [conversationId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const run = async (action: () => Promise<HandoffTicketDto>) => {
    setBusy(true);
    try {
      setTicket(await action());
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // "Üstlen": kayıt ve konuşma bana atanır, iş başlar, bot susar.
  const takeOver = (ticketId: number) => run(() => handoffApi.takeOver(ticketId));
  const setWaiting = (ticketId: number, waiting: boolean) => run(() => handoffApi.setWaiting(ticketId, waiting));
  const resolve = (ticketId: number, outcome: HandoffOutcome, note: string) =>
    run(() => handoffApi.resolve(ticketId, outcome, note));

  const active = ticket !== null && ticket.status !== HANDOFF_STATUS.Resolved ? ticket : null;
  return { ticket: active, busy, takeOver, setWaiting, resolve };
}

export type HandoffTicketState = ReturnType<typeof useHandoffTicket>;
