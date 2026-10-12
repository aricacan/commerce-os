'use client';

import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  omnichannelApi, DELIVERY_STATUS, MESSAGE_CONTENT_TYPE, MESSAGE_DIRECTION, SENDER_TYPE,
  type MessageDto,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { appendUnique, isOptimistic, markFailed, replaceOptimistic } from './chatMessages';
import { currentPreview, nextDraftOrigin, type DraftOrigin, type OutgoingPreview } from './outgoingTranslation';
import type { OutgoingTranslationState } from './useOutgoingTranslation';

// Optimistic mesajlara geçici negatif id verilir: sunucudan gerçek id gelene kadar
// React'in key'i sabit kalsın ve gerçek mesajla çakışmasın diye.
let optimisticIdCounter = -1;

const SEND_FAILED_REASON = 'Gönderilemedi';

interface Options {
  conversationId: number;
  myId: number | null;
  outgoing: OutgoingTranslationState;
  setMessages: Dispatch<SetStateAction<MessageDto[]>>;
  // Temsilci yazınca sunucu botu kapatır; başlık bunu yansıtsın. Gönderilen metin (ek açıklaması dahil) verilir.
  onAgentSent: (body: string) => void;
  setError: (message: string | null) => void;
}

export interface ChatComposer {
  draft: string;
  draftOrigin: DraftOrigin;
  sending: boolean;
  // Yalnız şu anki taslağa ait önizleme — taslak değiştiyse null.
  preview: OutgoingPreview | null;
  // Önizleme bir ekin açıklamasıysa ekin adı.
  pendingAttachmentName: string | null;
  changeDraft: (value: string, origin?: DraftOrigin) => void;
  send: () => Promise<void>;
  sendPreview: () => Promise<void>;
  cancelPreview: () => void;
  sendFile: (file: File) => Promise<void>;
  retry: (message: MessageDto) => void;
}

function optimisticMessage(conversationId: number, body: string, myId: number | null): MessageDto {
  return {
    id: optimisticIdCounter--,
    conversationId,
    direction: MESSAGE_DIRECTION.Outbound,
    senderType: SENDER_TYPE.Agent,
    // Balon sunucu yanıtından önce de "Siz" etiketini alsın.
    senderUserId: myId,
    contentType: MESSAGE_CONTENT_TYPE.Text,
    body,
    deliveryStatus: DELIVERY_STATUS.Pending,
    sentAt: null, deliveredAt: null, readAt: null,
    failureReason: null, replyToMessageId: null,
    createdAt: new Date().toISOString(),
  };
}

// Yazma alanının tüm gönderim akışı: taslak + kaynağı (dil), çeviri önizlemesi, metin/ek gönderimi.
// KATI KURAL: çeviri gereken her metin (ek açıklaması dahil) önce önizlemeye gider.
export function useChatComposer({ conversationId, myId, outgoing, setMessages, onAgentSent, setError }: Options): ChatComposer {
  const [draft, setDraft] = useState('');
  const [draftOrigin, setDraftOrigin] = useState<DraftOrigin>('agent');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Müşteri dilinde gönderilmiş mesajların id'leri — "Tekrar dene" onları yeniden çevirmesin.
  const customerLanguageIds = useRef(new Set<number>());

  const preview = currentPreview(outgoing.preview, draft);

  const discardPreview = () => {
    outgoing.invalidate();
    setPendingFile(null);
  };

  const changeDraft = (value: string, origin?: DraftOrigin) => {
    setDraft(value);
    setDraftOrigin((current) => nextDraftOrigin(current, value, origin));
    // Taslak değişti → önceki/süren çeviri artık onu yansıtmıyor.
    discardPreview();
  };

  const resetDraft = () => {
    setDraft('');
    setDraftOrigin('agent');
  };

  const sendBody = async (body: string, origin: DraftOrigin) => {
    // OPTIMISTIC: mesaj anında balonda görünür (saat ikonu = beklemede).
    const optimistic = optimisticMessage(conversationId, body, myId);
    if (origin === 'customerLanguage') customerLanguageIds.current.add(optimistic.id);
    setMessages((prev) => [...prev, optimistic]);
    resetDraft();
    setSending(true);
    setError(null);
    try {
      const saved = await omnichannelApi.sendMessage({ conversationId, body });
      if (origin === 'customerLanguage') customerLanguageIds.current.add(saved.id);
      setMessages((prev) => replaceOptimistic(prev, optimistic.id, saved));
      onAgentSent(body);
    } catch (e) {
      // Geçici balon kaldırılmaz — yazılan metin kaybolmasın diye Failed'a çevrilir.
      setMessages((prev) => markFailed(prev, optimistic.id, SEND_FAILED_REASON));
      setError(describeError(e));
    } finally {
      setSending(false);
    }
  };

  const sendMedia = async (file: File, caption: string | null) => {
    setSending(true);
    setError(null);
    try {
      const saved = await omnichannelApi.sendMedia(conversationId, file, caption);
      setMessages((prev) => appendUnique(prev, [saved]));
      resetDraft();
      onAgentSent(caption ?? '');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSending(false);
    }
  };

  const sendPreview = async () => {
    const body = preview?.translated.trim();
    if (!body || sending) return;
    const file = pendingFile;
    discardPreview();
    if (file) await sendMedia(file, body);
    else await sendBody(body, 'customerLanguage');
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || outgoing.translating) return;
    // Önizleme açıkken Enter (düzenlenmiş) çeviriyi gönderir, yeniden çevirmez.
    if (preview) {
      await sendPreview();
      return;
    }
    setError(null);
    try {
      const plan = await outgoing.plan(text, draftOrigin);
      if (plan.kind === 'send') await sendBody(plan.body, draftOrigin);
    } catch (e) {
      setError(describeError(e));
    }
  };

  // Dosya seçilince gider; yazma alanındaki metin açıklama olur ve metinle AYNI çeviri
  // kuralından geçer — çeviri gerekiyorsa ek, önizleme onaylanınca gönderilir.
  const sendFile = async (file: File) => {
    if (sending || outgoing.translating) return;
    const caption = draft.trim();
    if (!caption) {
      await sendMedia(file, null);
      return;
    }
    setError(null);
    try {
      const plan = await outgoing.plan(caption, draftOrigin);
      if (plan.kind === 'send') await sendMedia(file, plan.body);
      else if (plan.kind === 'preview') setPendingFile(file);
    } catch (e) {
      setError(describeError(e));
    }
  };

  // Başarısız balon yazma alanına döner; geçici balon kaldırılır ki gönderimde ikilenmesin.
  const retry = (message: MessageDto) => {
    if (isOptimistic(message)) setMessages((prev) => prev.filter((m) => m.id !== message.id));
    const origin: DraftOrigin = customerLanguageIds.current.has(message.id) ? 'customerLanguage' : 'agent';
    changeDraft(message.body ?? '', origin);
  };

  return {
    draft, draftOrigin, sending, preview,
    pendingAttachmentName: preview && pendingFile ? pendingFile.name : null,
    changeDraft, send, sendPreview, cancelPreview: discardPreview, sendFile, retry,
  };
}
