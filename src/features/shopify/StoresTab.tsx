'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { ConnectStoreForm } from './ConnectStoreForm';
import { StoreCard } from './StoreCard';
import { readConnectResult } from './storeRules';
import { SHOPIFY_STORES_KEY, useShopifyStores } from './useShopifyStores';

// Mağazalar: üstte "Shopify'a bağlan", altta bağlı mağaza kartları. Hata boş liste olarak GÖSTERİLMEZ.
export function StoresTab() {
  const queryClient = useQueryClient();
  const storesQuery = useShopifyStores();
  const refresh = () => queryClient.invalidateQueries({ queryKey: SHOPIFY_STORES_KEY });
  useConnectResultNotice(refresh);

  const stores = storesQuery.data ?? [];

  return (
    <div className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="m-0 text-ui-md font-bold text-fg">Shopify mağazaları</h2>
        <p className="m-0 text-ui-xs text-fg-muted">
          Ülke başına bir mağaza. Sipariş senkronu açık mağazaya, o ülkede sohbetten onaylanan siparişler otomatik açılır.
        </p>
      </header>

      <ConnectStoreForm />

      {storesQuery.isLoading && <p className="m-0 text-ui-xs text-fg-muted">Yükleniyor…</p>}
      {storesQuery.error && (
        <p role="alert" className="m-0 break-words text-ui-xs text-danger">Mağazalar yüklenemedi: {describeError(storesQuery.error)}</p>
      )}
      {!storesQuery.isLoading && !storesQuery.error && stores.length === 0 && (
        <p className="m-0 text-ui-xs text-fg-muted">Henüz bağlı mağaza yok.</p>
      )}

      <div className="flex flex-col gap-3">
        {stores.map((store) => <StoreCard key={store.id} store={store} onChanged={refresh} />)}
      </div>
    </div>
  );
}

// "Shopify'a bağlan" dönüşünde backend panele ?connected=<id> / ?connectError=<mesaj> ile döner:
// sonuç bir kez gösterilir ve adres temizlenir (yenilemede tekrar çıkmasın).
function useConnectResultNotice(onConnected: () => void) {
  const { notify } = useFeedback();

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = readConnectResult(url.searchParams);
    if (!result) return;

    if (result.kind === 'connected') {
      notify.success('Mağaza Shopify\'a bağlandı.');
      onConnected();
    } else {
      notify.error(`Shopify bağlantısı tamamlanamadı: ${result.message}`);
    }
    url.searchParams.delete('connected');
    url.searchParams.delete('connectError');
    window.history.replaceState(null, '', url.toString());
    // Yalnız ilk açılışta: dönüş parametreleri bir kez okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
