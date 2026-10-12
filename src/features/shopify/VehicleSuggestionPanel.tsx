'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { shopifyAiCatalogApi, type ShopifyVehicleSuggestionDto } from '../../lib/api/shopify-ai-catalog';
import type { ShopifyMenuNodeDto } from '../../lib/api/shopify-store-content';
import { useFeedback } from '../shared/Feedback';
import { surfaceCard } from '../shared/design';
import { explorerErrorText } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';
import {
  APPLY_OUTCOME_LABELS, DEFAULT_MIN_PRODUCTS, buildVehicleApplyBody, buildVehicleMenuDraft, defaultVehicleSelection,
  effectiveTitle, resolveVehicleRows, type TitleOverrides,
} from './vehicleRules';
import { VehicleSuggestionRow } from './VehicleSuggestionRow';

interface Props {
  storeId: number;
  // Verilirse "oluştur ve menü taslağına aktar" düğmesi çıkar (Menüler sekmesi).
  onMenuDraft?: (items: ShopifyMenuNodeDto[]) => void;
}

// "Öneri üret": mağaza ürünlerinden araç marka/model koleksiyonu önerir (sözlük + AI adlandırma). Satır satır seçilir/düzenlenir;
// yalnız seçilenler oluşturulur, var olanlar yeniden oluşturulmaz. Menü yolunda sonuç taslak olarak menü düzenleyiciye gider
// (fark önizleme → onay → yedek → yayın akışı orada).
export function VehicleSuggestionPanel({ storeId, onMenuDraft }: Props) {
  const { notify, confirm } = useFeedback();
  const queryClient = useQueryClient();
  const [minProducts, setMinProducts] = useState(DEFAULT_MIN_PRODUCTS);
  const [suggestion, setSuggestion] = useState<ShopifyVehicleSuggestionDto | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [overrides, setOverrides] = useState<TitleOverrides>({});

  const suggest = useMutation({
    mutationFn: () => shopifyAiCatalogApi.suggestVehicleCollections(storeId, minProducts),
    onSuccess: (result) => {
      setSuggestion(result);
      setSelected(defaultVehicleSelection(result.collections));
      setOverrides({});
    },
    onError: (error) => notify.error(explorerErrorText(error)),
  });

  const apply = useMutation({
    mutationFn: () => shopifyAiCatalogApi.applyVehicleCollections(storeId, buildVehicleApplyBody(suggestion?.collections ?? [], selected, overrides)),
    onError: (error) => notify.error(explorerErrorText(error)),
  });

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const create = async (toMenu: boolean) => {
    if (!suggestion) return;
    const ok = await confirm({
      title: `${selected.size} koleksiyon işlensin mi?`,
      body: 'Seçilenlerden mağazada olmayanlar akıllı koleksiyon olarak oluşturulur; var olanlar yeniden oluşturulmaz.',
      confirmLabel: 'Oluştur',
    });
    if (!ok) return;
    const result = await apply.mutateAsync().catch(() => null);
    if (!result) return;
    await queryClient.invalidateQueries({ queryKey: ['shopify', 'collections', storeId] });
    const failed = result.rows.filter((row) => row.outcome === 'Failed');
    const created = result.rows.filter((row) => row.outcome === 'Created').length;
    if (failed.length > 0) notify.error(`${failed.length} koleksiyon oluşturulamadı: ${failed.map((r) => `${r.title} (${r.errors.join(' ')})`).join('; ')}`);
    if (created > 0 || failed.length === 0) notify.success(`${created} koleksiyon oluşturuldu.`);
    if (toMenu) onMenuDraft?.(buildVehicleMenuDraft(resolveVehicleRows(suggestion.collections, result.rows)));
  };

  const rows = suggestion?.collections ?? [];
  const busy = suggest.isPending || apply.isPending;

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Araç koleksiyonu önerisi">
      <header className="flex flex-col gap-0.5">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Araç marka/model önerisi</h3>
        <span className="text-ui-2xs text-fg-muted">
          Ürün başlık ve etiketlerinden marka/model bulunur, AI yalnız adı düzeltir. Hiçbir şey sen onaylamadan yazılmaz.
        </span>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          En az ürün
          <input
            type="number" min={1} value={minProducts} className={`${fieldClass} w-24`}
            onChange={(e) => setMinProducts(Math.max(1, Number(e.target.value) || DEFAULT_MIN_PRODUCTS))}
          />
        </label>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => suggest.mutate()}>
          <Sparkles size={14} aria-hidden /> {suggest.isPending ? 'Üretiliyor…' : 'Öneri üret'}
        </button>
      </div>

      {suggestion && (
        <>
          <p className="m-0 text-ui-xs text-fg">
            {suggestion.productsScanned} ürün tarandı, {rows.length} öneri bulundu.
            {suggestion.truncated && ' Tarama üst sınıra ulaştı; kalan ürünler taranmadı.'}
          </p>
          {suggestion.aiNote && <p role="status" className="m-0 text-ui-2xs text-warning">{suggestion.aiNote}</p>}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {rows.map((row) => (
              <VehicleSuggestionRow
                key={row.key} row={row} title={effectiveTitle(row, overrides)} checked={selected.has(row.key)}
                onToggle={() => toggle(row.key)} onTitleChange={(title) => setOverrides((c) => ({ ...c, [row.key]: title }))}
              />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButtonClass} disabled={busy || selected.size === 0} onClick={() => void create(false)}>
              {apply.isPending ? 'Oluşturuluyor…' : 'Seçilenleri oluştur'}
            </button>
            {onMenuDraft && (
              <button type="button" className={ghostButtonClass} disabled={busy || selected.size === 0} onClick={() => void create(true)}>
                Oluştur ve menü taslağına aktar
              </button>
            )}
          </div>
          {apply.data && (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-ui-2xs text-fg-muted">
              {apply.data.rows.map((row) => <li key={row.key}>{row.title}: {APPLY_OUTCOME_LABELS[row.outcome]}</li>)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
