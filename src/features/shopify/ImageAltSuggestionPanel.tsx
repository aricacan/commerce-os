'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  shopifyProductsApi, type ShopifyImageAltProposalDto, type ShopifyImageAltSuggestionDto,
} from '../../lib/api/shopify-products';
import { surfaceCard } from '../shared/design';
import { ExplorerState } from './ExplorerState';
import { ALT_SUGGESTED_LENGTH, buildAltItems, defaultAltSelection, draftsFromProposals } from './imageAltRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';
import { useWriteAction } from './useWriteAction';
import { CheckboxField } from './FormControls';

interface Props {
  storeId: number;
  productId: number;
  productTitle: string;
  // Yazma başarılı olunca (tarama yenilenir).
  onApplied: () => Promise<void>;
  onClose: () => void;
}

// Alt metni olmayan görseller için AI önerisi: öneri istenir (hiçbir şey yazılmaz), kullanıcı düzenler/seçer,
// onaylananlar tek istekte Shopify'a yazılır.
export function ImageAltSuggestionPanel({ storeId, productId, productTitle, onApplied, onClose }: Props) {
  const suggestion = useQuery({
    queryKey: ['shopify', 'image-alt-suggestion', storeId, productId],
    queryFn: () => shopifyProductsApi.suggestImageAlts(storeId, productId),
    // Her açılışta yeni öneri (AI token harcar; yanlışlıkla eski öneri gösterilmesin).
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
  });

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Görsel alt metni önerisi">
      <header className="flex flex-col gap-0.5">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Alt metin önerisi: {productTitle}</h3>
        <span className="text-ui-2xs text-fg-muted">
          Öneri ürün bilgisinden üretilir (görsel içeriği analiz edilmez); seçtiğiniz metinler Shopify&apos;a yazılır.
        </span>
      </header>
      <ExplorerState
        loading={suggestion.isLoading} error={suggestion.error} isEmpty={suggestion.data?.images.length === 0}
        emptyTitle="Alt metni eksik görsel yok" onRetry={() => void suggestion.refetch()}
      >
        {suggestion.data && (
          <ProposalEditor storeId={storeId} suggestion={suggestion.data} onApplied={onApplied} onClose={onClose} />
        )}
      </ExplorerState>
      {suggestion.data?.images.length === 0 && <button type="button" className={`${ghostButtonClass} self-start`} onClick={onClose}>Kapat</button>}
    </section>
  );
}

interface EditorProps {
  storeId: number;
  suggestion: ShopifyImageAltSuggestionDto;
  onApplied: () => Promise<void>;
  onClose: () => void;
}

function ProposalEditor({ storeId, suggestion, onApplied, onClose }: EditorProps) {
  const { busy, run } = useWriteAction(onApplied);
  const [drafts, setDrafts] = useState(() => draftsFromProposals(suggestion.images));
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => defaultAltSelection(suggestion.images));
  const items = buildAltItems(drafts, selected);

  const toggle = (mediaId: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(mediaId)) next.add(mediaId);
      return next;
    });

  const apply = async () => {
    if (await run(() => shopifyProductsApi.updateImageAlts(storeId, suggestion.productId, items), 'Alt metinler Shopify\'a yazıldı.')) onClose();
  };

  return (
    <>
      <p className="m-0 text-ui-2xs text-fg-muted">Dil: {suggestion.language}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {suggestion.images.map((proposal, index) => (
          <ProposalRow
            key={proposal.mediaId} proposal={proposal} position={index + 1} value={drafts[proposal.mediaId] ?? ''}
            checked={selected.has(proposal.mediaId)} onToggle={() => toggle(proposal.mediaId)}
            onChange={(value) => setDrafts((d) => ({ ...d, [proposal.mediaId]: value }))}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || items.length === 0} onClick={() => void apply()}>
          {busy ? 'Yazılıyor…' : 'Seçilenleri Shopify\'a yaz'}
        </button>
        <button type="button" className={ghostButtonClass} onClick={onClose}>Vazgeç</button>
      </div>
    </>
  );
}

interface RowProps {
  proposal: ShopifyImageAltProposalDto;
  position: number;
  value: string;
  checked: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}

function ProposalRow({ proposal, position, value, checked, onToggle, onChange }: RowProps) {
  const over = value.trim().length > ALT_SUGGESTED_LENGTH;

  return (
    <li className="flex items-start gap-2">
      <CheckboxField checked={checked} onChange={() => onToggle()} className="mt-2 items-start"><span className="sr-only">{`${position}. görseli yaz`}</span></CheckboxField>
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-subtle">
        {proposal.url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={proposal.url} alt="" className="h-full w-full object-contain" />
          : <span className="text-ui-2xs text-fg-muted">—</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          className={fieldClass} value={value} placeholder="AI öneri üretmedi; elle yazabilirsiniz"
          aria-label={`${position}. görsel alt metni önerisi`} onChange={(e) => onChange(e.target.value)}
        />
        <span className={`text-ui-2xs ${over ? 'text-warning' : 'text-fg-muted'}`}>{value.trim().length}/{ALT_SUGGESTED_LENGTH} önerilen</span>
      </div>
    </li>
  );
}
