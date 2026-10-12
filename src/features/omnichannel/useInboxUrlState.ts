'use client';

import { useEffect } from 'react';
import { CONVERSATION_FILTER, type ConversationFilter } from '../../lib/api/omnichannel';
import { applyInboxUrlState, parseInboxUrlState, type InboxUrlState } from './inboxUrlState';

// Açılışta adresten okunur (istemci bileşeni: pencere var). Sayfa yenilenince filtre kalır.
export function readInboxUrlState(): InboxUrlState {
  return parseInboxUrlState(window.location.search);
}

function writeSearch(search: string) {
  if (search === window.location.search) return;
  // router.replace DEĞİL: Next yönlendirmesi rotayı yeniden mount edip gelen kutusunun
  // iç durumunu sıfırlardı (kabuğun sekme yazımıyla aynı gerekçe).
  window.history.replaceState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
}

// Seçili durum filtresi adres çubuğuna yazılır (?f=payment).
// Gelen kutusundan çıkılınca iz bırakmaz: başka sekmede eski filtre adreste asılı kalmasın.
export function useInboxUrlState(filter: ConversationFilter) {
  useEffect(() => {
    writeSearch(applyInboxUrlState(window.location.search, filter));
  }, [filter]);

  useEffect(() => () => writeSearch(applyInboxUrlState(window.location.search, CONVERSATION_FILTER.All)), []);
}
