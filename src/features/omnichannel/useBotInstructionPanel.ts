'use client';

import { useState } from 'react';
import {
  APPLY_OUTCOME, instructionsApi, type ConversationInstructionCreateBody, type ConversationInstructionCreateResponse,
  type InstructionPreviewDto,
} from '../../lib/api/omnichannel-instructions';
import { describeError, httpStatusOf } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { instructionNotice } from './botInstructionRules';

interface Args {
  conversationId: number;
  create: (body: ConversationInstructionCreateBody) => Promise<ConversationInstructionCreateResponse>;
  // Bot cevabı gönderdi: mesajlar tazelenir.
  onReplySent: () => void;
}

const NOT_FOUND = 404;

// "Bota talimat ver" v2 panelinin durumu (FAZ 7): aç/kapa, önizleme (botun araçlı cevabı, hiçbir şey gitmez),
// onaylı gönderim ve sonucun temsilciye bildirilmesi.
export function useBotInstructionPanel({ conversationId, create, onReplySent }: Args) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<InstructionPreviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useFeedback();

  const close = () => {
    setOpen(false);
    setError(null);
    setPreview(null);
  };

  const requestPreview = async (text: string) => {
    setPreviewing(true);
    setError(null);
    try {
      setPreview(await instructionsApi.preview(conversationId, text));
    } catch (e) {
      // Ön yüz backend'den önce yayına çıkar: uç yoksa talimat yine önizlemesiz kaydedilebilir.
      setError(httpStatusOf(e) === NOT_FOUND ? 'Önizleme sunucu güncellemesinden sonra açılacak; talimatı kaydedebilirsiniz.' : describeError(e));
    } finally {
      setPreviewing(false);
    }
  };

  const submit = async (body: ConversationInstructionCreateBody) => {
    setSending(true);
    setError(null);
    try {
      const response = await create(body);
      // Onaylı cevap gidemediyse panel açık kalır ve neden gösterilir (talimat yine kaydedildi).
      if (body.sendText && response.applyOutcome !== APPLY_OUTCOME.Sent) {
        setError(response.detail ?? 'Talimat kaydedildi; cevap gönderilemedi.');
        // Talimat kaydedildi: aynı önizleme ikinci kez gönderilip talimat çoğaltılmasın.
        setPreview(null);
        return;
      }
      const notice = instructionNotice(response);
      notify[notice.tone](notice.message);
      close();
      if (response.applyOutcome === APPLY_OUTCOME.Sent) onReplySent();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSending(false);
    }
  };

  return {
    open, toggle: () => (open ? close() : setOpen(true)), close, sending, previewing, preview,
    clearPreview: () => setPreview(null), error, requestPreview, submit,
  };
}

export type BotInstructionPanelState = ReturnType<typeof useBotInstructionPanel>;
