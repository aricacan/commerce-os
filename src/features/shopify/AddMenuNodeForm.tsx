'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ShopifyMenuNodeDto, ShopifyMenuTargetDto } from '../../lib/api/shopify-store-content';
import { surfaceCard } from '../shared/design';
import { SelectField } from './FormControls';
import { MenuTargetPicker } from './MenuTargetPicker';
import { ADDABLE_MENU_TYPES, MENU_TYPE, menuTypeLabel, newMenuNode, nodeFromTarget } from './menuTree';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  onAdd: (node: ShopifyMenuNodeDto) => void;
  // Ağaçta bir düğümün altına eklerken form açık gelir; kapanınca üst bileşen gizler.
  startOpen?: boolean;
  onClosed?: () => void;
}

// Menüye yeni öğe (varsayılan üst seviye; ağaçta düğümün altına da kullanılır): tür seç → koleksiyon/ürün/sayfa ise hedefi ara-seç, bağlantı ise başlık + adres yaz.
// Girintiyi (alt öğe yapma) ağaçtaki oklar verir.
export function AddMenuNodeForm({ storeId, onAdd, startOpen = false, onClosed }: Props) {
  const [open, setOpen] = useState(startOpen);
  const [type, setType] = useState<string>(MENU_TYPE.Collection);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const close = () => {
    setOpen(false);
    setTitle('');
    setUrl('');
    onClosed?.();
  };

  const pick = (target: ShopifyMenuTargetDto) => {
    onAdd(nodeFromTarget(target, title));
    close();
  };

  const addLink = () => {
    onAdd(newMenuNode({ title: title.trim(), type: MENU_TYPE.Http, url: url.trim() }));
    close();
  };

  if (!open) {
    return <button type="button" className={`${ghostButtonClass} self-start`} onClick={() => setOpen(true)}><Plus size={14} aria-hidden /> Öğe ekle</button>;
  }

  return (
    <div className={`${surfaceCard} flex flex-col gap-3 p-3`} role="group" aria-label="Yeni menü öğesi">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          label="Tür" value={type} onChange={setType}
          options={ADDABLE_MENU_TYPES.map((t) => ({ value: t, label: menuTypeLabel(t) }))}
        />
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Başlık {type !== MENU_TYPE.Http && '(boşsa hedefin adı)'}
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
        </label>
      </div>
      {type === MENU_TYPE.Http ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Bağlantı adresi (https://… ya da /sayfa)
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={fieldClass} />
          </label>
          <button type="button" className={primaryButtonClass} disabled={title.trim() === '' || url.trim() === ''} onClick={addLink}>Ekle</button>
        </div>
      ) : (
        <MenuTargetPicker key={type} storeId={storeId} kind={type} onPick={pick} />
      )}
      <button type="button" className={`${ghostButtonClass} self-start`} onClick={close}>Vazgeç</button>
    </div>
  );
}
