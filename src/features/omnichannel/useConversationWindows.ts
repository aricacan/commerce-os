'use client';

import { CHANNEL_TYPE, type ConversationSummaryDto } from '../../lib/api/omnichannel';
import { windowWarningOf } from './conversationInfoRules';
import { useServiceWindow } from './ServiceWindowNotice';

// Platform mesaj pencereleri: WhatsApp 24 saat; Messenger/Instagram 24 saat + 7 günlük "insan
// temsilci" penceresi. Alanı göndermeyen eski backend'de (undefined) kısıt uygulanmaz.
export function useConversationWindows(conversation: ConversationSummaryDto, canWrite: boolean) {
  const isWhatsApp = conversation.channelType === CHANNEL_TYPE.WhatsApp;
  const serviceWindow = useServiceWindow(conversation.serviceWindowEndsAt);
  const showWindowNotice = canWrite && isWhatsApp && conversation.serviceWindowEndsAt !== undefined;

  const isMeta = conversation.channelType === CHANNEL_TYPE.Facebook || conversation.channelType === CHANNEL_TYPE.Instagram;
  const agentWindow = useServiceWindow(conversation.humanAgentWindowEndsAt);
  const showMetaNotice = canWrite && isMeta && conversation.humanAgentWindowEndsAt !== undefined
    && !agentWindow.neverOpened && !serviceWindow.isOpen;

  // Pencere tamamen kapalı: serbest mesaj yazılamaz, nedeni yazma alanının yerinde söylenir.
  const whatsappClosed = showWindowNotice && !serviceWindow.isOpen;
  const metaClosed = showMetaNotice && !agentWindow.isOpen;

  // Pencere açık ama dikkat gerekiyor: uyarı "Ayrıntılar" paneline gider.
  const warning = windowWarningOf(
    { applies: showWindowNotice, isOpen: serviceWindow.isOpen, remainingMs: serviceWindow.remainingMs },
    { applies: showMetaNotice, isOpen: agentWindow.isOpen, remainingMs: agentWindow.remainingMs },
  );

  return {
    isWhatsApp,
    serviceWindow,
    agentWindow,
    whatsappClosed,
    metaClosed,
    freeTextBlocked: whatsappClosed || metaClosed,
    warning,
  };
}
