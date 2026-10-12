'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Ban, Plus } from 'lucide-react';
import { shopifyPromotionsApi, type CreateShopifyGiftCardBody, type ShopifyGiftCardDto } from '../../lib/api/shopify-promotions';
import { useFeedback } from '../shared/Feedback';
import { formatMoney } from './explorerRules';
import { ExplorerState } from './ExplorerState';
import { FilterSelectField } from './FilterField';
import { GiftCardCodeNotice } from './GiftCardCodeNotice';
import { GiftCardForm } from './GiftCardForm';
import { PagerBar } from './PagerBar';
import { GIFT_CARD_STATUS_OPTIONS } from './promotionRules';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass } from './styles';
import { useCursorPaging } from './useCursorPaging';
import { useShopifyWrite } from './useShopifyWrite';

interface Props {
  storeId: number;
}

const LIST_STALE_MS = 30_000;

// Hediye kartları: liste (bakiye, son 4 karakter) + oluştur + devre dışı bırak. Devre dışı bırakma GERİ ALINAMAZ → onay.
export function GiftCardsSection({ storeId }: Props) {
  const { confirm } = useFeedback();
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const paging = useCursorPaging();
  const { writing, run } = useShopifyWrite(['shopify', 'gift-cards', storeId]);

  const list = useQuery({
    queryKey: ['shopify', 'gift-cards', storeId, status, paging.after],
    queryFn: () => shopifyPromotionsApi.giftCards(storeId, status, paging.after),
    placeholderData: keepPreviousData,
    staleTime: LIST_STALE_MS,
  });

  // Kart kodu yanıtta ayrı gelir; run'ın standart akışına (Applied/Errors) uydurup kodu yakalıyoruz.
  const create = async (body: CreateShopifyGiftCardBody) => {
    const captured: { code: string | null } = { code: null };
    const applied = await run(async () => {
      const created = await shopifyPromotionsApi.createGiftCard(storeId, body);
      captured.code = created.code;
      return created.result;
    }, 'Hediye kartı oluşturuldu.');
    if (!applied) return;
    setCreating(false);
    setCreatedCode(captured.code);
  };

  const deactivate = async (card: ShopifyGiftCardDto) => {
    const ok = await confirm({
      title: 'Hediye kartı devre dışı bırakılsın mı?',
      body: `…${card.lastCharacters} ile biten kart kullanılamaz hâle gelir. Shopify bu işlemi GERİ ALMAYA izin vermez.`,
      confirmLabel: 'Devre dışı bırak',
      danger: true,
    });
    if (ok) await run(() => shopifyPromotionsApi.deactivateGiftCard(storeId, card.id), 'Hediye kartı devre dışı bırakıldı.');
  };

  const cards = list.data?.items ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <FilterSelectField
          label="Durum" value={status} options={GIFT_CARD_STATUS_OPTIONS} allLabel="Tümü"
          onChange={(value) => { paging.reset(); setStatus(value); }}
        />
        <button type="button" className={ghostButtonClass} onClick={() => { setCreating(true); setCreatedCode(null); }}>
          <Plus size={14} aria-hidden /> Yeni hediye kartı
        </button>
      </div>
      {createdCode && <GiftCardCodeNotice code={createdCode} onDismiss={() => setCreatedCode(null)} />}
      {creating && <GiftCardForm busy={writing} onSubmit={(body) => void create(body)} onCancel={() => setCreating(false)} />}
      <ExplorerState
        loading={list.isLoading} error={list.error} isEmpty={cards.length === 0}
        emptyTitle={status ? 'Süzgece uyan hediye kartı yok' : 'Mağazada hediye kartı yok'}
        onRetry={() => void list.refetch()}
      >
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {cards.map((card) => (
            <li key={card.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2">
              <span className="min-w-0 flex-1 basis-40 break-words">
                <span className="block text-ui-sm font-bold text-fg">•••• {card.lastCharacters}</span>
                <span className="block text-ui-2xs text-fg-muted">{[card.customerName, card.note].filter(Boolean).join(' · ') || 'Müşteriye bağlı değil'}</span>
              </span>
              <span className="text-ui-xs text-fg">{formatMoney(card.balance)} <span className="text-fg-muted">/ {formatMoney(card.initialValue)}</span></span>
              <StatusBadge label={card.enabled ? 'Aktif' : 'Devre dışı'} tone={card.enabled ? 'success' : 'neutral'} />
              <span className="text-ui-2xs text-fg-muted">{card.expiresOn ? `Son: ${card.expiresOn}` : 'Süresiz'}</span>
              {card.enabled && (
                <button type="button" className={ghostButtonClass} disabled={writing} onClick={() => void deactivate(card)}>
                  <Ban size={14} aria-hidden /> Devre dışı bırak
                </button>
              )}
            </li>
          ))}
        </ul>
        <PagerBar
          pageNumber={paging.pageNumber} hasPrevious={paging.hasPrevious} hasNext={Boolean(list.data?.hasNextPage)}
          busy={list.isFetching} onPrevious={paging.previous}
          onNext={() => list.data?.endCursor && paging.next(list.data.endCursor)}
        />
      </ExplorerState>
    </div>
  );
}
