'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  omnichannelApi, type BotReplyDraftDto, type MessageDto, type MessageStatusChangedDto,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { appendUnique, applyStatusChanges } from './chatMessages';
import {
  hasMoreOlder, MESSAGE_PAGE_SIZE, mergeReloadKeepingOlder, olderCursorId, prependOlder,
} from './chatPaging';

export interface OlderMessagesState {
  // Sunucuda daha eski mesaj olabilir (son gelen sayfa doluydu).
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export interface ChatMessagesState {
  messages: MessageDto[];
  setMessages: Dispatch<SetStateAction<MessageDto[]>>;
  pilotDrafts: BotReplyDraftDto[];
  setPilotDrafts: Dispatch<SetStateAction<BotReplyDraftDto[]>>;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  older: OlderMessagesState;
}

// Açık sohbetin mesajları: REST yüklemesi (son sayfa) + yukarı kaydırınca eski sayfalar + canlı mesajlar + tik
// güncellemeleri tek listede. Okundu işaretleme burada DEĞİL (bkz. InboxTab) — okunmamış sayı değişince sohbet
// yeniden yüklenmesin.
export function useChatMessages(
  conversationId: number, liveMessages: MessageDto[], statusChanges: MessageStatusChangedDto[], reloadToken: number,
): ChatMessagesState {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [pilotDrafts, setPilotDrafts] = useState<BotReplyDraftDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // Eski sayfa yüklendiyse yeniden yükleme (son sayfa) "daha eski var" bilgisini ezmez — eski sayfalar korunur.
  // Konuşma değişince pane yeniden kurulur (InboxTab key), bu yüzden konuşma başına ayrı tutulmaz.
  const olderLoaded = useRef(false);
  const loadingOlderRef = useRef(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedMessages, loadedDrafts] = await Promise.all([
        omnichannelApi.getMessages(conversationId, undefined, MESSAGE_PAGE_SIZE),
        omnichannelApi.getBotDrafts(conversationId),
      ]);
      setMessages((current) => mergeReloadKeepingOlder(loadedMessages, current));
      setPilotDrafts(loadedDrafts);
      if (!olderLoaded.current) setHasMore(hasMoreOlder(loadedMessages.length));
    } catch (e) {
      setLoadError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const loadOlder = useCallback(async () => {
    const cursor = olderCursorId(messagesRef.current);
    if (loadingOlderRef.current || cursor === null) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const older = await omnichannelApi.getMessages(conversationId, cursor, MESSAGE_PAGE_SIZE);
      olderLoaded.current = true;
      setMessages((current) => prependOlder(current, older));
      setHasMore(hasMoreOlder(older.length));
    } catch (e) {
      setOlderError(describeError(e));
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [conversationId]);

  useEffect(() => { void reload(); }, [reload, reloadToken]);

  useEffect(() => {
    setMessages((prev) => applyStatusChanges(prev, statusChanges, conversationId));
  }, [statusChanges, conversationId]);

  // Kendi gönderdiğimizin yankısı id üzerinden tekilleşir.
  useEffect(() => {
    const incoming = liveMessages.filter((m) => m.conversationId === conversationId);
    if (incoming.length > 0) setMessages((prev) => appendUnique(prev, incoming));
  }, [liveMessages, conversationId]);

  return {
    messages, setMessages, pilotDrafts, setPilotDrafts, loading, loadError, reload,
    older: { hasMore, loading: loadingOlder, error: olderError, load: loadOlder },
  };
}
