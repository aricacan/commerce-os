'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Sparkles } from 'lucide-react';
import { shopifyStoreContentApi, type ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { ExplorerState } from './ExplorerState';
import { MenuWorkbench } from './MenuWorkbench';
import { NewMenuForm } from './NewMenuForm';
import { ghostButtonClass, primaryButtonClass } from './styles';
import { useInvalidatingWrite } from './useInvalidatingWrite';
import { VehicleSuggestionPanel } from './VehicleSuggestionPanel';

interface Props {
  storeId: number;
}

const LIST_STALE_MS = 30_000;

// Menüler: mağazanın menüleri (chip) + yeni menü; seçili menü ağaç düzenleyicide açılır. Shopify'a yazma yalnız
// "değişiklikleri incele → yayınla" ile; her yayından önce canlı menü yedeklenir.
export function MenusTab({ storeId }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [draft, setDraft] = useState<{ items: ShopifyMenuNodeDto[]; version: number }>({ items: [], version: 0 });
  const { writing, run } = useInvalidatingWrite(['shopify', 'menus', storeId]);

  const list = useQuery({
    queryKey: ['shopify', 'menus', storeId, 'list'],
    queryFn: () => shopifyStoreContentApi.menus(storeId),
    staleTime: LIST_STALE_MS,
  });
  const menus = list.data ?? [];
  const activeId = menus.find((m) => m.id === selectedId)?.id ?? menus[0]?.id ?? null;

  // Yeni taslak gelince çalışma alanı yeniden açılır (taslak canlı menüye eklenmiş halde başlar, hiçbir şey yayınlanmaz).
  const receiveDraft = (items: ShopifyMenuNodeDto[]) => setDraft((current) => ({ items, version: current.version + 1 }));

  const create = async (title: string, handle: string) => {
    if (await run(() => shopifyStoreContentApi.createMenu(storeId, { title, handle, items: [] }), 'Menü oluşturuldu.')) setCreating(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {menus.map((menu) => (
          <button
            key={menu.id} type="button" aria-pressed={menu.id === activeId}
            className={menu.id === activeId ? primaryButtonClass : ghostButtonClass} onClick={() => setSelectedId(menu.id)}
          >
            {menu.title} <span className="opacity-70">({menu.itemCount})</span>
          </button>
        ))}
        <button type="button" className={ghostButtonClass} onClick={() => setCreating(true)}><Plus size={14} aria-hidden /> Yeni menü</button>
        <button type="button" className={ghostButtonClass} aria-expanded={suggesting} onClick={() => setSuggesting((v) => !v)}>
          <Sparkles size={14} aria-hidden /> Öneri üret
        </button>
      </div>
      {suggesting && <VehicleSuggestionPanel storeId={storeId} onMenuDraft={receiveDraft} />}
      {creating && <NewMenuForm busy={writing} onSubmit={(title, handle) => void create(title, handle)} onCancel={() => setCreating(false)} />}
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={activeId === null}
        emptyTitle="Mağazada menü yok" emptyDescription="Yeni menü ile başlayın." onRetry={() => void list.refetch()}
      >
        {activeId !== null && (
          <MenuWorkbench
            key={`${activeId}-${draft.version}`} storeId={storeId} menuId={activeId}
            draftItems={draft.version > 0 ? draft.items : undefined}
          />
        )}
      </ExplorerState>
    </div>
  );
}
