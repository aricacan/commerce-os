'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { shopifyStoreContentApi, type ShopifyMenuDiffDto, type ShopifyMenuDto, type ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText } from './explorerRules';
import { MenuDiffPanel } from './MenuDiffPanel';
import { MenuTreeEditor } from './MenuTreeEditor';
import { sameTree } from './menuTree';
import { ghostButtonClass, primaryButtonClass } from './styles';
import { useInvalidatingWrite } from './useInvalidatingWrite';
import { mergeVehicleDraft } from './vehicleRules';

interface Props {
  storeId: number;
  // Düzenlemenin başladığı andaki canlı menü (parmak izi dahil); oturum boyunca değişmez.
  menu: ShopifyMenuDto;
  // Yayından sonra / "yeniden yükle" ile yeni oturum başlatılır.
  onReload: () => void;
  // Araç önerisinden gelen taslak düğümler: canlı ağaca eklenmiş halde başlar (yayın yine fark → onay yolundan geçer).
  draftItems?: ShopifyMenuNodeDto[];
}

// Bir menünün düzenleme oturumu: taslak (ekranda) → fark önizlemesi → onay → yayın. Parmak izi başlangıçta alınır;
// arada Shopify'da değişiklik olduysa fark ekranı bunu gösterir, sunucu da körlemesine ezmez (409).
export function MenuEditorSession({ storeId, menu, onReload, draftItems }: Props) {
  const { notify, confirm } = useFeedback();
  const [items, setItems] = useState<ShopifyMenuNodeDto[]>(() => (draftItems ? mergeVehicleDraft(menu.items, draftItems) : menu.items));
  const [diff, setDiff] = useState<ShopifyMenuDiffDto | null>(null);
  const [diffing, setDiffing] = useState(false);
  const { writing, run } = useInvalidatingWrite(['shopify', 'menus', storeId]);
  const dirty = !sameTree(items, menu.items);

  const edit = (next: ShopifyMenuNodeDto[]) => {
    setItems(next);
    setDiff(null);
  };

  const review = async () => {
    setDiffing(true);
    try {
      setDiff(await shopifyStoreContentApi.diffMenu(storeId, menu.id, { items, expectedHash: menu.hash }));
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setDiffing(false);
    }
  };

  const publish = async (overwriteLive: boolean) => {
    const ok = await confirm({
      title: `"${menu.title}" menüsü yayınlansın mı?`,
      body: `${diff?.changes.length ?? 0} değişiklik Shopify'daki canlı menüye uygulanır. Önceki hali yedeklenir; Geçmiş sekmesinden geri alabilirsin.`,
      confirmLabel: 'Yayınla',
    });
    if (!ok) return;
    const body = { items, expectedHash: menu.hash, overwriteLive };
    if (await run(() => shopifyStoreContentApi.publishMenu(storeId, menu.id, body), 'Menü yayınlandı.')) onReload();
  };

  return (
    <div className="flex flex-col gap-3">
      <MenuTreeEditor storeId={storeId} items={items} liveItems={menu.items} onChange={edit} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={!dirty || diffing} onClick={() => void review()}>
          {diffing ? 'Karşılaştırılıyor…' : 'Değişiklikleri incele'}
        </button>
        <button type="button" className={ghostButtonClass} disabled={!dirty} onClick={() => edit(menu.items)}>
          <RotateCcw size={14} aria-hidden /> Değişiklikleri at
        </button>
        <button type="button" className={ghostButtonClass} onClick={onReload}>Canlı menüyü yeniden yükle</button>
      </div>
      {diff && (
        <MenuDiffPanel diff={diff} confirmLabel="Yayınla" busy={writing} onConfirm={(overwrite) => void publish(overwrite)} onCancel={() => setDiff(null)} />
      )}
    </div>
  );
}
