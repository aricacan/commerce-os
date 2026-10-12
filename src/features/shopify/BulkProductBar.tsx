'use client';

import { useState } from 'react';
import { Tag, Tags, ToggleRight, X } from 'lucide-react';
import { shopifyBulkApi, type ShopifyBulkProductStatus } from '../../lib/api/shopify-bulk';
import { FormSelect, type FormSelectOption } from '../../components/ui/FormSelect';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { allSelected } from './bulkRules';
import { BulkResultPanel } from './BulkResultPanel';
import { BulkSelectBox } from './BulkSelectBox';
import { BulkTagForm } from './BulkTagForm';
import { ghostButtonClass, primaryButtonClass } from './styles';
import { useBulkRun } from './useBulkRun';
import type { BulkSelection } from './useBulkSelection';

interface Props {
  storeId: number;
  // Görünen sayfadaki ürün kimlikleri ("sayfayı seç" bunlara uygulanır).
  pageIds: number[];
  selection: BulkSelection;
}

type Mode = 'status' | 'tag-add' | 'tag-remove';

const STATUS_OPTIONS: FormSelectOption<ShopifyBulkProductStatus>[] = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'DRAFT', label: 'Taslak' },
  { value: 'ARCHIVED', label: 'Arşiv' },
];

const STATUS_LABEL: Record<ShopifyBulkProductStatus, string> = { ACTIVE: 'Aktif', DRAFT: 'Taslak', ARCHIVED: 'Arşiv' };

// Ürünler için toplu eylem çubuğu: durum değiştirme (Aktif/Taslak/Arşiv) ve etiket ekle/çıkar. Stok/fiyat toplu yazılmaz.
export function BulkProductBar({ storeId, pageIds, selection }: Props) {
  const { confirm } = useFeedback();
  const [mode, setMode] = useState<Mode | null>(null);
  const [status, setStatus] = useState<ShopifyBulkProductStatus | null>(null);
  const bulk = useBulkRun(selection, ['shopify', 'products', storeId]);
  const ids = [...selection.selected];
  const close = () => setMode(null);

  const applyStatus = async () => {
    if (status === null) return;
    const ok = await confirm({
      title: `${ids.length} ürünün durumu "${STATUS_LABEL[status]}" yapılsın mı?`,
      body: status === 'ACTIVE' ? 'Ürünler mağazada yayına girer.' : 'Ürünler mağazada satışa kapanır; istenirse tekrar aktif yapılabilir.',
      confirmLabel: 'Durumu değiştir',
    });
    if (ok && await bulk.run(() => shopifyBulkApi.setProductStatus(storeId, { ids, status }))) close();
  };

  return (
    <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Toplu ürün işlemleri">
      <div className="flex flex-wrap items-center gap-2">
        <BulkSelectBox
          checked={allSelected(selection.selected, pageIds)} label="Sayfadaki tüm ürünleri seç"
          onChange={(on) => selection.setMany(pageIds, on)}
        />
        <span className="text-ui-xs text-fg-muted" aria-live="polite">
          {selection.count === 0 ? 'Toplu işlem için ürün seçin' : `${selection.count} ürün seçili${selection.limitReached ? ' (üst sınır)' : ''}`}
        </span>
        {selection.count > 0 && (
          <>
            <button type="button" className={ghostButtonClass} onClick={() => setMode('status')}><ToggleRight size={14} aria-hidden /> Durum değiştir</button>
            <button type="button" className={ghostButtonClass} onClick={() => setMode('tag-add')}><Tag size={14} aria-hidden /> Etiket ekle</button>
            <button type="button" className={ghostButtonClass} onClick={() => setMode('tag-remove')}><Tags size={14} aria-hidden /> Etiket çıkar</button>
            <button type="button" className={ghostButtonClass} onClick={selection.clear}><X size={14} aria-hidden /> Seçimi temizle</button>
          </>
        )}
      </div>
      {mode === 'status' && (
        <div className="flex flex-wrap items-center gap-2">
          <FormSelect value={status} options={STATUS_OPTIONS} onChange={setStatus} placeholder="Yeni durum" className="w-44" triggerClassName="h-8 rounded-md" />
          <button type="button" className={primaryButtonClass} disabled={bulk.busy || status === null} onClick={() => void applyStatus()}>
            {ids.length} ürüne uygula
          </button>
          <button type="button" className={ghostButtonClass} onClick={close}>Vazgeç</button>
        </div>
      )}
      {(mode === 'tag-add' || mode === 'tag-remove') && (
        <BulkTagForm
          remove={mode === 'tag-remove'} count={ids.length} busy={bulk.busy} onClose={close}
          onSubmit={(tags) => bulk.run(() => shopifyBulkApi.tagProducts(storeId, { ids, tags, remove: mode === 'tag-remove' }))}
        />
      )}
      {bulk.result && <BulkResultPanel result={bulk.result} itemLabel="Ürün" onDismiss={bulk.dismiss} />}
    </section>
  );
}
