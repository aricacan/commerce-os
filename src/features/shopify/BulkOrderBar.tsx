'use client';

import { useState } from 'react';
import { StickyNote, Tag, Tags, Truck, X } from 'lucide-react';
import { shopifyBulkApi } from '../../lib/api/shopify-bulk';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { allSelected } from './bulkRules';
import { BulkFulfillForm, BulkNoteForm, type BulkFulfillInput } from './BulkOrderActionForms';
import { BulkResultPanel } from './BulkResultPanel';
import { BulkSelectBox } from './BulkSelectBox';
import { BulkTagForm } from './BulkTagForm';
import { ghostButtonClass } from './styles';
import { useBulkRun } from './useBulkRun';
import type { BulkSelection } from './useBulkSelection';

interface Props {
  storeId: number;
  // Görünen sayfadaki sipariş kimlikleri ("sayfayı seç" bunlara uygulanır).
  pageIds: number[];
  selection: BulkSelection;
}

type Mode = 'tag-add' | 'tag-remove' | 'note' | 'fulfill';

// Siparişler için toplu eylem çubuğu: yalnız güvenli eylemler (etiket, not, kargolandı). İptal/iade toplu yapılmaz.
export function BulkOrderBar({ storeId, pageIds, selection }: Props) {
  const { confirm } = useFeedback();
  const [mode, setMode] = useState<Mode | null>(null);
  const bulk = useBulkRun(selection, ['shopify', 'orders', storeId]);
  const ids = [...selection.selected];
  const close = () => setMode(null);

  const fulfill = async (body: BulkFulfillInput): Promise<boolean> => {
    const ok = await confirm({
      title: `${ids.length} sipariş kargolandı işaretlensin mi?`,
      body: 'Shopify\'da kargo kaydı oluşur; geri alınması zordur. Müşteri bildirimi seçildiyse e-posta gider.',
      confirmLabel: 'Kargolandı işaretle',
    });
    return ok ? bulk.run(() => shopifyBulkApi.fulfillOrders(storeId, { ...body, ids })) : false;
  };

  return (
    <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Toplu sipariş işlemleri">
      <div className="flex flex-wrap items-center gap-2">
        <BulkSelectBox
          checked={allSelected(selection.selected, pageIds)} label="Sayfadaki tüm siparişleri seç"
          onChange={(on) => selection.setMany(pageIds, on)}
        />
        <span className="text-ui-xs text-fg-muted" aria-live="polite">
          {selection.count === 0 ? 'Toplu işlem için sipariş seçin' : `${selection.count} sipariş seçili${selection.limitReached ? ' (üst sınır)' : ''}`}
        </span>
        {selection.count > 0 && (
          <>
            <button type="button" className={ghostButtonClass} onClick={() => setMode('tag-add')}><Tag size={14} aria-hidden /> Etiket ekle</button>
            <button type="button" className={ghostButtonClass} onClick={() => setMode('tag-remove')}><Tags size={14} aria-hidden /> Etiket çıkar</button>
            <button type="button" className={ghostButtonClass} onClick={() => setMode('note')}><StickyNote size={14} aria-hidden /> Not ekle</button>
            <button type="button" className={ghostButtonClass} onClick={() => setMode('fulfill')}><Truck size={14} aria-hidden /> Kargolandı işaretle</button>
            <button type="button" className={ghostButtonClass} onClick={selection.clear}><X size={14} aria-hidden /> Seçimi temizle</button>
          </>
        )}
      </div>
      {(mode === 'tag-add' || mode === 'tag-remove') && (
        <BulkTagForm
          remove={mode === 'tag-remove'} count={ids.length} busy={bulk.busy} onClose={close}
          onSubmit={(tags) => bulk.run(() => shopifyBulkApi.tagOrders(storeId, { ids, tags, remove: mode === 'tag-remove' }))}
        />
      )}
      {mode === 'note' && (
        <BulkNoteForm
          count={ids.length} busy={bulk.busy} onClose={close}
          onSubmit={(note) => bulk.run(() => shopifyBulkApi.noteOrders(storeId, { ids, note }))}
        />
      )}
      {mode === 'fulfill' && <BulkFulfillForm count={ids.length} busy={bulk.busy} onClose={close} onSubmit={fulfill} />}
      {bulk.result && <BulkResultPanel result={bulk.result} itemLabel="Sipariş" onDismiss={bulk.dismiss} />}
    </section>
  );
}
