'use client';

import { useEffect, useRef } from 'react';
import { HubConnectionBuilder, HubConnectionState, type HubConnection } from '@microsoft/signalr';
import { getHubUrl, getAccessToken } from '../../lib/api/core';
import { IS_DEMO } from '../../lib/demo/config';
import type { ConversationSummaryDto, MessageDto, MessageStatusChangedDto } from '../../lib/api/omnichannel';

export type HubConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface Handlers {
  onMessage: (message: MessageDto, conversation: ConversationSummaryDto) => void;
  onStatusChanged: (status: MessageStatusChangedDto) => void;
  onConversationUpdated: (conversation: ConversationSummaryDto) => void;
  /**
   * Bağlantı kopunca kullanıcı haberdar olsun: yeniden bağlanana kadar liste canlı
   * güncellenmez (yoklama yok). Opsiyonel: veren yoksa davranış değişmez.
   */
  onConnectionStatusChange?: (status: HubConnectionStatus) => void;
  /**
   * Kopukluk sırasında gelen olaylar SignalR tarafından yeniden oynatılmaz; yeniden
   * bağlanınca liste/sohbet REST'ten tazelenmezse o aradaki mesajlar hiç görünmez.
   */
  onReconnected?: () => void;
  /** Devir kaydı değişti (FAZ 7: atama, durum, çözüm). Yalnız kimlik taşır; dinleyen REST'ten tazeler. */
  onHandoffChanged?: (change: { channelId: number; conversationId: number }) => void;
}

// Inbox'ın canlı bağlantısı. Kanal grupları hub üzerinde: temsilci yalnızca izlediği
// kanalların trafiğini alır.
//
// Handler'lar ref'te tutuluyor: her render'da yeni fonksiyon referansı gelirse bağlantı
// sürekli kurulup yıkılır ve mesajlar kaçar. Bağlantı yalnızca kanal listesi değişince
// yeniden gruplanır.
export function useOmnichannelHub(channelIds: number[], handlers: Handlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connectionRef = useRef<HubConnection | null>(null);

  // Kanal listesi dizi olduğu için referansı her render değişir — bağımlılığa
  // sıralı bir imza veriyoruz ki yalnızca gerçek değişimde yeniden çalışsın.
  const channelKey = [...channelIds].sort((a, b) => a - b).join(',');

  useEffect(() => {
    let disposed = false;
    const subscribedChannelIds = channelKey ? channelKey.split(',').map(Number) : [];

    // Jeton henüz belleğe yazılmadıysa bağlanma. SignalR ilk denemede 401 alırsa
    // withAutomaticReconnect DEVREYE GİRMEZ (o yalnızca kurulmuş bağlantının
    // kopmasını kurtarır) — bağlantı sessizce hiç kurulmaz ve inbox canlı akışsız kalır.
    if (!getAccessToken()) return;

    // Demo'da canlı hub yoktur; kullanıcıya "bağlantı koptu" uyarısı göstermemek için bağlı sayılır.
    if (IS_DEMO) {
      handlersRef.current.onConnectionStatusChange?.('connected');
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(getHubUrl('/hubs/omnichannel'), {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      // Ağ koptuğunda otomatik yeniden bağlanır; varsayılan artan aralıklarla dener.
      .withAutomaticReconnect()
      .build();

    connection.on('MessageReceived', (payload: { message: MessageDto; conversation: ConversationSummaryDto }) => {
      handlersRef.current.onMessage(payload.message, payload.conversation);
    });

    connection.on('MessageStatusChanged', (status: MessageStatusChangedDto) => {
      handlersRef.current.onStatusChanged(status);
    });

    connection.on('ConversationUpdated', (conversation: ConversationSummaryDto) => {
      handlersRef.current.onConversationUpdated(conversation);
    });

    connection.on('HandoffChanged', (change: { channelId: number; conversationId: number }) => {
      handlersRef.current.onHandoffChanged?.(change);
    });

    const joinChannels = async () => {
      for (const id of subscribedChannelIds) {
        // Erişimi olmayan kanal için sunucu hata fırlatır — bir kanalın reddedilmesi
        // diğerlerine katılmayı engellememeli.
        try { await connection.invoke('JoinChannel', id); } catch { /* erişim yok */ }
      }
    };

    // Yeniden bağlanınca gruplar sıfırlanır; tekrar katılmazsak mesajlar sessizce durur.
    connection.onreconnected(() => {
      handlersRef.current.onConnectionStatusChange?.('connected');
      void joinChannels();
      handlersRef.current.onReconnected?.();
    });
    connection.onreconnecting(() => handlersRef.current.onConnectionStatusChange?.('connecting'));
    connection.onclose(() => handlersRef.current.onConnectionStatusChange?.('disconnected'));

    handlersRef.current.onConnectionStatusChange?.('connecting');
    connection.start()
      .then(() => {
        if (disposed) return;
        handlersRef.current.onConnectionStatusChange?.('connected');
        return joinChannels();
      })
      .catch(() => {
        // Bağlantı kurulamadı — canlı güncelleme yok; kullanıcı durumdan haberdar olsun.
        handlersRef.current.onConnectionStatusChange?.('disconnected');
      });

    connectionRef.current = connection;

    return () => {
      disposed = true;
      if (connection.state !== HubConnectionState.Disconnected) void connection.stop();
      connectionRef.current = null;
    };
  }, [channelKey]);
}
