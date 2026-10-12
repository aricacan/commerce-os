'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  omnichannelApi, type ConversationSummaryDto, type InboxChannelDto, type SenderType,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import type { InboxFilters } from './inboxFilters';
import { applyToList, matchInboxFilters, unreadDelta } from './inboxLiveUpdates';
import { channelBrandOf } from './brandGroups';
import { inboxPageSkip } from './inboxPagination';

// Filtreyle karar verilemeyen canlı olaylar art arda gelirse tek tazeleme yeter.
const REFETCH_DEBOUNCE_MS = 1500;
// Açık sohbete gelen mesajlar okundu işaretlenir; mesaj yağmurunda tek istek.
const MARK_READ_DEBOUNCE_MS = 1000;

export interface ConversationEvent {
  // Yeni müşteri mesajı mı (okunmamış +1)?
  isNewInbound: boolean;
  lastSenderType?: SenderType;
}

export interface InboxConversationsState {
  channels: InboxChannelDto[];
  conversations: ConversationSummaryDto[];
  selected: ConversationSummaryDto | null;
  loading: boolean;
  error: string | null;
  loadChannels: () => Promise<void>;
  loadConversations: () => Promise<void>;
  select: (conversation: ConversationSummaryDto) => void;
  clearSelection: () => void;
  // Sunucudan gelen konuşma (SignalR olayı ya da işlem yanıtı).
  applyUpdate: (incoming: ConversationSummaryDto, event: ConversationEvent) => void;
  // Yerel kısmi güncelleme (ör. temsilci yazdı → bot kapandı); okunmamış sayıya dokunmaz.
  patch: (conversationId: number, patch: Partial<ConversationSummaryDto>) => void;
}

// Gelen kutusunun konuşma/kanal durumu. Tek gerçek kaynak: liste + seçili konuşma + bilinen
// okunmamış sayılar (kanal rozeti farkı buradan hesaplanır, liste dışı satırlar dahil).
// Liste sayfa sayfa çekilir; canlı tazeleme (SignalR/yeniden okuma) aynı sayfayı yeniden okur.
export function useInboxConversations(
  filters: InboxFilters, debouncedSearch: string, myUserId: number | null, page: number, pageSize: number,
): InboxConversationsState {
  const [channels, setChannels] = useState<InboxChannelDto[]>([]);
  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([]);
  const [selected, setSelected] = useState<ConversationSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useFeedback();
  // Okundu işaretleme arka plan işi: hata listeyi kapatmaz, bildirim olarak görünür.
  const reportBackgroundError = useCallback((e: unknown) => notify.error(describeError(e)), [notify]);

  const knownUnread = useRef(new Map<number, number>());
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selected?.id ?? null;
  const activeFilters = { ...filters, search: debouncedSearch };
  const filtersRef = useRef(activeFilters);
  filtersRef.current = activeFilters;
  const channelsRef = useRef(channels);
  channelsRef.current = channels;
  const requestIdRef = useRef(0);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markReadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadChannels = useCallback(async () => {
    try {
      setChannels(await omnichannelApi.getMyChannels());
    } catch (e) {
      setError(describeError(e));
    }
  }, []);

  const { channelId, brandId, platform, filter, topic, stage, detail } = filters;
  const loadConversations = useCallback(async () => {
    // Filtre hızla değişirse geç dönen eski yanıt yenisinin üzerine yazmasın.
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const rows = await omnichannelApi.getConversations({
        channelId, brandId, platform, filter, topic, stage,
        search: debouncedSearch || undefined,
        country: detail.country,
        tagId: detail.tagId,
        skip: inboxPageSkip(page, pageSize),
        take: pageSize,
      });
      if (requestId !== requestIdRef.current) return;
      const openId = selectedIdRef.current;
      const normalized = rows.map((c) => (c.id === openId ? { ...c, unreadCount: 0 } : c));
      normalized.forEach((c) => knownUnread.current.set(c.id, c.unreadCount));
      setConversations(normalized);
    } catch (e) {
      if (requestId === requestIdRef.current) setError(describeError(e));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [channelId, brandId, platform, filter, topic, stage, debouncedSearch, detail, page, pageSize]);

  const loadConversationsRef = useRef(loadConversations);
  loadConversationsRef.current = loadConversations;

  useEffect(() => { void loadChannels(); }, [loadChannels]);
  useEffect(() => { void loadConversations(); }, [loadConversations]);

  useEffect(() => () => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => void loadConversationsRef.current(), REFETCH_DEBOUNCE_MS);
  }, []);

  // Açık konuşmaya mesaj geldi: sunucudaki okunmamış sayı da 0'a dönsün.
  const scheduleMarkRead = useCallback((conversationId: number) => {
    if (markReadTimer.current) clearTimeout(markReadTimer.current);
    markReadTimer.current = setTimeout(() => {
      omnichannelApi.markAsRead(conversationId).catch(reportBackgroundError);
    }, MARK_READ_DEBOUNCE_MS);
  }, [reportBackgroundError]);

  const adjustChannelUnread = useCallback((id: number, delta: number) => {
    if (delta === 0) return;
    setChannels((prev) => prev.map((c) =>
      c.id === id ? { ...c, unreadCount: Math.max(0, c.unreadCount + delta) } : c));
  }, []);

  const applyUpdate = useCallback((incoming: ConversationSummaryDto, event: ConversationEvent) => {
    const isOpen = selectedIdRef.current === incoming.id;
    // Açık konuşma okunuyor — rozeti şişmesin, sunucuda da okundu işaretlenir.
    const next = isOpen ? { ...incoming, unreadCount: 0 } : incoming;
    adjustChannelUnread(next.channelId, unreadDelta(knownUnread.current.get(next.id), next.unreadCount, event.isNewInbound));
    knownUnread.current.set(next.id, next.unreadCount);

    if (isOpen) {
      setSelected((prev) => (prev?.id === next.id ? next : prev));
      if (incoming.unreadCount > 0) scheduleMarkRead(next.id);
    }

    // Açık konuşma filtreye uymasa da listeden düşmez — temsilci üzerinde çalışıyor.
    const match = isOpen
      ? 'match'
      : matchInboxFilters(next, filtersRef.current, {
        myUserId,
        lastSenderType: event.lastSenderType,
        channelBrandId: channelBrandOf(channelsRef.current, next.channelId),
      });
    setConversations((prev) => applyToList(prev, next, match));
    if (match === 'unknown') scheduleRefetch();
  }, [adjustChannelUnread, scheduleMarkRead, scheduleRefetch, myUserId]);

  const patch = useCallback((conversationId: number, changes: Partial<ConversationSummaryDto>) => {
    setSelected((prev) => (prev?.id === conversationId ? { ...prev, ...changes } : prev));
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, ...changes } : c)));
  }, []);

  // Açılan konuşmanın rozeti anında sıfırlanır ve sunucuda okundu işaretlenir.
  const select = useCallback((conversation: ConversationSummaryDto) => {
    const unread = knownUnread.current.get(conversation.id) ?? conversation.unreadCount;
    adjustChannelUnread(conversation.channelId, -unread);
    knownUnread.current.set(conversation.id, 0);
    if (unread > 0 || conversation.unreadCount > 0) {
      omnichannelApi.markAsRead(conversation.id).catch(reportBackgroundError);
    }
    selectedIdRef.current = conversation.id;
    setSelected({ ...conversation, unreadCount: 0 });
    setConversations((prev) => prev.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)));
  }, [adjustChannelUnread, reportBackgroundError]);

  const clearSelection = useCallback(() => setSelected(null), []);

  return {
    channels, conversations, selected, loading, error,
    loadChannels, loadConversations, select, clearSelection, applyUpdate, patch,
  };
}
