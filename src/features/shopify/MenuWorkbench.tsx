'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { shopifyStoreContentApi, type ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { ExplorerState } from './ExplorerState';
import { MenuEditorSession } from './MenuEditorSession';
import { MenuHistoryPanel } from './MenuHistoryPanel';
import { ghostButtonClass } from './styles';

interface Props {
  storeId: number;
  menuId: number;
  // Araç önerisinden gelen taslak; yalnız İLK oturumda uygulanır (yayın/yeniden yükleme sonrası tekrar eklenmez).
  draftItems?: ShopifyMenuNodeDto[];
}

// Seçili menünün çalışma alanı: düzenleme oturumu + (açılır) yedek geçmişi. Canlı menü yalnız açılışta ve
// "yeniden yükle / yayın / geri alma" sonrası okunur (odak değişince otomatik tazelenmez: yarım kalmış taslak kaybolmasın).
export function MenuWorkbench({ storeId, menuId, draftItems }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [session, setSession] = useState(0);

  const menu = useQuery({
    queryKey: ['shopify', 'menus', storeId, 'detail', menuId],
    queryFn: () => shopifyStoreContentApi.menu(storeId, menuId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const reload = async () => {
    await menu.refetch();
    setSession((s) => s + 1);
  };

  return (
    <div className="flex flex-col gap-3">
      <ExplorerState loading={menu.isLoading} error={menu.error} isEmpty={!menu.data} emptyTitle="Menü bulunamadı" onRetry={() => void menu.refetch()}>
        {menu.data && <MenuEditorSession
          key={`${menuId}-${session}`} storeId={storeId} menu={menu.data} onReload={() => void reload()}
          draftItems={session === 0 ? draftItems : undefined}
        />}
      </ExplorerState>
      <button type="button" className={`${ghostButtonClass} self-start`} aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)}>
        <History size={14} aria-hidden /> Yedek geçmişi
      </button>
      {showHistory && <MenuHistoryPanel storeId={storeId} menuId={menuId} onRolledBack={() => void reload()} />}
    </div>
  );
}
