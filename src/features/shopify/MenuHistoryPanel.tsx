'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Undo2 } from 'lucide-react';
import { shopifyStoreContentApi, type ShopifyMenuDiffDto, type ShopifyMenuSnapshotDto } from '../../lib/api/shopify-store-content';
import { useFeedback } from '../shared/Feedback';
import { listRowClass } from './contentStyles';
import { explorerErrorText, formatDateTime } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { MenuDiffPanel } from './MenuDiffPanel';
import { ghostButtonClass } from './styles';
import { useInvalidatingWrite } from './useInvalidatingWrite';

interface Props {
  storeId: number;
  menuId: number;
  // Geri alma uygulandıktan sonra düzenleyici canlı menüyü yeniden yükler.
  onRolledBack: () => void;
}

const REASON_LABELS: Record<string, string> = { PrePublish: 'Yayın öncesi', PreRollback: 'Geri alma öncesi' };

interface Preview {
  snapshot: ShopifyMenuSnapshotDto;
  diff: ShopifyMenuDiffDto;
}

// Yedek geçmişi: her yayından (ve geri almadan) önce canlı menü saklanır. Geri al = önce farkı göster, onayla, uygula.
export function MenuHistoryPanel({ storeId, menuId, onRolledBack }: Props) {
  const { notify, confirm } = useFeedback();
  const [preview, setPreview] = useState<Preview | null>(null);
  const { writing, run } = useInvalidatingWrite(['shopify', 'menus', storeId]);

  const snapshots = useQuery({
    queryKey: ['shopify', 'menus', storeId, 'snapshots', menuId],
    queryFn: () => shopifyStoreContentApi.menuSnapshots(storeId, menuId),
  });

  const showPreview = async (snapshot: ShopifyMenuSnapshotDto) => {
    try {
      const detail = await shopifyStoreContentApi.menuSnapshot(storeId, snapshot.id);
      const diff = await shopifyStoreContentApi.diffMenu(storeId, menuId, { items: detail.items });
      setPreview({ snapshot, diff });
    } catch (e) {
      notify.error(explorerErrorText(e));
    }
  };

  const rollback = async (snapshot: ShopifyMenuSnapshotDto) => {
    const ok = await confirm({
      title: 'Menü bu yedeğe döndürülsün mü?',
      body: 'Canlı menü yedekteki haliyle değiştirilir. Şu anki hali de yedeklenir; istersen ona da dönebilirsin.',
      confirmLabel: 'Geri al',
    });
    if (!ok || !(await run(() => shopifyStoreContentApi.rollbackMenu(storeId, snapshot.id), 'Menü yedeğe döndürüldü.'))) return;
    setPreview(null);
    onRolledBack();
  };

  const list = snapshots.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <ExplorerState
        loading={snapshots.isLoading} error={snapshots.error} isEmpty={list.length === 0}
        emptyTitle="Henüz yedek yok" emptyDescription="Menü ilk kez yayınlandığında önceki hali burada saklanır."
        onRetry={() => void snapshots.refetch()}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {list.map((snapshot) => (
            <li key={snapshot.id} className={listRowClass}>
              <span className="min-w-0 flex-1 basis-40 text-ui-xs text-fg">
                {formatDateTime(snapshot.takenAt)} · {REASON_LABELS[snapshot.reason] ?? snapshot.reason}
              </span>
              <span className="text-ui-2xs text-fg-muted">{snapshot.itemCount} öğe</span>
              <button type="button" className={ghostButtonClass} onClick={() => void showPreview(snapshot)}>
                <Undo2 size={14} aria-hidden /> Geri al…
              </button>
            </li>
          ))}
        </ul>
      </ExplorerState>
      {preview && (
        <MenuDiffPanel
          diff={preview.diff} confirmLabel="Bu yedeğe dön" busy={writing}
          onConfirm={() => void rollback(preview.snapshot)} onCancel={() => setPreview(null)}
        />
      )}
    </div>
  );
}
