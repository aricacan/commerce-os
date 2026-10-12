'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  consultApi, type AgentConsultAnswerBody, type AgentConsultationDto,
} from '../../lib/api/omnichannel-consult';
import { useFeedback } from '../shared/Feedback';
import { classifyConsultError, CONSULT_SENT_NOTICE_MS } from './consultationRules';

export interface AgentConsultationState {
  consultation: AgentConsultationDto | null;
  // Son cevapla müşteriye giden metin; kısa süre onay olarak gösterilir.
  sentText: string | null;
  busy: boolean;
  // Kartı açık bırakan hata (422/503/400): kartın içinde yazılır.
  failure: string | null;
  answer: (body: AgentConsultAnswerBody) => Promise<void>;
  reload: () => Promise<void>;
}

// Bir konuşmanın bekleyen danışma kartı. refreshKey değişince (yeni mesaj, canlı güncelleme,
// yeniden bağlanma) kart sunucudan tazelenir. Çağıran, konuşma değişince kendini `key` ile sıfırlar.
export function useAgentConsultation(
  conversationId: number, refreshKey: string | number, onAnswered: () => void,
): AgentConsultationState {
  const [consultation, setConsultation] = useState<AgentConsultationDto | null>(null);
  const [sentText, setSentText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const requestId = useRef(0);
  const { notify } = useFeedback();

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const pending = await consultApi.getPending(conversationId);
      if (id === requestId.current) setConsultation(pending ?? null);
    } catch {
      // Kart yan bilgidir: okunamazsa sohbet çalışmaya devam eder, ekrandaki kart olduğu gibi kalır.
    }
  }, [conversationId]);

  useEffect(() => { void reload(); }, [reload, refreshKey]);

  useEffect(() => {
    if (sentText === null) return;
    const timer = setTimeout(() => setSentText(null), CONSULT_SENT_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [sentText]);

  const answer = useCallback(async (body: AgentConsultAnswerBody) => {
    if (!consultation || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await consultApi.answer(conversationId, consultation.id, body);
      requestId.current += 1;
      setConsultation(null);
      setSentText(result.sentText);
      onAnswered();
    } catch (e) {
      const { kind, message } = classifyConsultError(e);
      if (kind === 'gone') {
        setConsultation(null);
        notify.info(message);
        void reload();
      } else {
        setFailure(message);
      }
    } finally {
      setBusy(false);
    }
  }, [consultation, busy, conversationId, onAnswered, notify, reload]);

  return { consultation, sentText, busy, failure, answer, reload };
}
