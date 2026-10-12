'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { copilotApi, type AgentCopilotDto } from '../../lib/api/copilot';
import { describeError } from '../../lib/errors';
import { copilotVisible, needsRefresh } from './copilotRules';

interface PickedOption {
  suggestionId: number;
  optionIndex: number;
}

// Devir sonrası temsilci yardımcısı (FAZ 7): konuşma açılınca kayıtlı öneri okunur (ucuz). Son müşteri mesajı için
// öneri yoksa YALNIZ yardımcı paneli açıkken üretilir (araçlı, birkaç saniye, token harcar); panel kapalıyken
// üretim yapılmaz. Panel açıkken her yeni müşteri mesajında yenilenir. Seçilen seçenek gönderilince onaylı cevap
// adayı olarak kaydedilir. Hiçbir şey otomatik gönderilmez.
export function useAgentCopilot(
  conversationId: number, lastInboundMessageId: number | null, enabled: boolean, autoGenerate: boolean,
) {
  const [dto, setDto] = useState<AgentCopilotDto | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picked = useRef<PickedOption | null>(null);
  // Aynı müşteri mesajı için ikinci üretim isteği gönderilmez (sunucu da tekilleştirir).
  const requestedFor = useRef<number | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      setDto(await copilotApi.generate(conversationId));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setGenerating(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setDto(null);
    picked.current = null;
    requestedFor.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    copilotApi.get(conversationId)
      .then((current) => {
        if (cancelled) return;
        setDto(current);
        if (autoGenerate && needsRefresh(current, lastInboundMessageId) && requestedFor.current !== lastInboundMessageId) {
          requestedFor.current = lastInboundMessageId;
          void generate();
        }
      })
      // Yardımcı yan bilgidir: okunamazsa kart görünmez, sohbet çalışır.
      .catch(() => { if (!cancelled) setDto(null); });
    return () => { cancelled = true; };
  }, [conversationId, lastInboundMessageId, enabled, autoGenerate, generate]);

  const pick = (optionIndex: number) => {
    if (dto?.suggestionId == null) return null;
    picked.current = { suggestionId: dto.suggestionId, optionIndex };
    return dto.options[optionIndex]?.text ?? null;
  };

  // Temsilci mesajı gitti: yardımcıdan seçilmiş bir seçenekse aday olarak kaydedilir (hatası gönderimi bozmaz).
  const recordSent = (sentText: string) => {
    const option = picked.current;
    picked.current = null;
    if (!option || sentText.trim() === '') return;
    void copilotApi.recordUse(conversationId, { ...option, sentText }).catch(() => undefined);
  };

  return {
    dto, visible: enabled && copilotVisible(dto), generating, error, refresh: generate, pick, recordSent,
    hasPicked: () => picked.current !== null,
  };
}

export type AgentCopilotState = ReturnType<typeof useAgentCopilot>;
