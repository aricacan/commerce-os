'use client';

import { useState, type SyntheticEvent } from 'react';
import type { SaveShopifyCollectionBody, ShopifyCollectionDetailDto } from '../../lib/api/shopify-store-content';
import { surfaceCard } from '../shared/design';
import { CheckboxField, SelectField } from './FormControls';
import { CollectionRulesEditor } from './CollectionRulesEditor';
import {
  buildCollectionBody, collectionFormError, collectionFormState, NEW_COLLECTION_STATE, SORT_ORDER_OPTIONS,
  type CollectionFormState,
} from './collectionRules';
import { textAreaClass } from './contentStyles';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  // Düzenlemede mevcut koleksiyon; yoksa yeni koleksiyon formu.
  original?: ShopifyCollectionDetailDto;
  busy: boolean;
  onSubmit: (body: SaveShopifyCollectionBody) => void;
  onCancel: () => void;
}

const SEO_TITLE_MAX_LENGTH = 255;
const SEO_DESCRIPTION_MAX_LENGTH = 512;

// Koleksiyon oluştur / düzenle: temel alanlar + SEO + (akıllıysa) kurallar. Manuel ↔ akıllı tür oluşturulduktan sonra değişmez.
export function CollectionForm({ original, busy, onSubmit, onCancel }: Props) {
  const [state, setState] = useState<CollectionFormState>(original ? collectionFormState(original) : NEW_COLLECTION_STATE);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<CollectionFormState>) => setState((s) => ({ ...s, ...patch }));
  const title = original ? `Koleksiyonu düzenle: ${original.title}` : 'Yeni koleksiyon';

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const problem = collectionFormError(state);
    setError(problem);
    if (problem === null) onSubmit(buildCollectionBody(state, original));
  };

  return (
    <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label={title}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Başlık
          <input value={state.title} onChange={(e) => set({ title: e.target.value })} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Adres (handle) — boşsa başlıktan üretilir
          <input value={state.handle} onChange={(e) => set({ handle: e.target.value })} className={fieldClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Açıklama (HTML)
        <textarea value={state.descriptionHtml} onChange={(e) => set({ descriptionHtml: e.target.value })} rows={3} className={textAreaClass} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          SEO başlığı
          <input value={state.seoTitle} maxLength={SEO_TITLE_MAX_LENGTH} onChange={(e) => set({ seoTitle: e.target.value })} className={fieldClass} />
        </label>
        <SelectField label="Ürün sıralaması" value={state.sortOrder} options={SORT_ORDER_OPTIONS} onChange={(sortOrder) => set({ sortOrder })} />
      </div>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        SEO açıklaması
        <textarea value={state.seoDescription} maxLength={SEO_DESCRIPTION_MAX_LENGTH} onChange={(e) => set({ seoDescription: e.target.value })} rows={2} className={textAreaClass} />
      </label>
      {original === undefined && (
        <CheckboxField checked={state.smart} onChange={(smart) => set({ smart })}>
          Akıllı koleksiyon (kurallara uyan ürünler kendiliğinden eklenir)
        </CheckboxField>
      )}
      {state.smart && (
        <CollectionRulesEditor
          rules={state.rules} appliedDisjunctively={state.appliedDisjunctively}
          onRulesChange={(rules) => set({ rules })} onDisjunctiveChange={(appliedDisjunctively) => set({ appliedDisjunctively })}
        />
      )}
      {error && <p role="alert" className="m-0 text-ui-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
