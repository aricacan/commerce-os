'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { FullScreenPanel } from '../../components/ui/FullScreenPanel';
import {
  chatOrdersApi,
  type ChatOrderDraftDefaultsDto,
  type ChatOrderDto,
  type ChatOrderWriteResultDto,
} from '../../lib/api/omnichannel-chat-orders';
import { describeError } from '../../lib/errors';
import { focusRing, motionFast, surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { ChatOrderDeliveryFields } from './ChatOrderDeliveryFields';
import { ChatOrderLineList } from './ChatOrderLineList';
import { ChatOrderProductPicker } from './ChatOrderProductPicker';
import {
  addProduct,
  draftFromDefaults,
  draftFromOrder,
  formTotal,
  hasUpdateChanges,
  removeLine,
  toCreateDto,
  toUpdateDto,
  updateLine,
  validateDraft,
  type OrderFormDraft,
} from './chatOrderFormRules';
import { formatOrderMoney, isOpenChatOrder, orderDisplayNo } from './chatOrderRules';

const buttonClass = `inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-ui-sm font-semibold disabled:opacity-40 md:h-9 ${focusRing} ${motionFast}`;

type Props =
  | { mode: 'create'; conversationId: number; onClose: () => void; onSaved: (result: ChatOrderWriteResultDto) => void }
  | { mode: 'edit'; order: ChatOrderDto; onClose: () => void; onSaved: (result: ChatOrderWriteResultDto) => void };

// Sipariş oluştur / düzenle (tam ekran; telefonda da aynı). Ürünler katalogdan, fiyat sunucuda okunur;
// fiyat değişikliği yalnız yetkiliye açık. Shopify'a gitmiş siparişte değişiklik önce Shopify'a yazılır.
export function ChatOrderFormDialog(props: Props) {
  const conversationId = props.mode === 'create' ? props.conversationId : props.order.conversationId;
  const order = props.mode === 'edit' ? props.order : null;
  const { notify } = useFeedback();
  const [defaults, setDefaults] = useState<ChatOrderDraftDefaultsDto | null>(null);
  const [draft, setDraft] = useState<OrderFormDraft | null>(order ? draftFromOrder(order) : null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    chatOrdersApi.draftDefaults(conversationId)
      .then((loaded) => {
        if (cancelled) return;
        setDefaults(loaded);
        setDraft((current) => current ?? draftFromDefaults(loaded));
      })
      .catch((e: unknown) => { if (!cancelled) setError(describeError(e)); });
    return () => { cancelled = true; };
  }, [conversationId]);

  const patch = useCallback((change: Partial<OrderFormDraft>) => setDraft((d) => (d ? { ...d, ...change } : d)), []);

  const currency = order?.currency ?? defaults?.currency ?? '';
  const country = order?.country ?? defaults?.country ?? null;
  const inShopify = Boolean(order?.shopifyOrderName);
  const openOrderId = props.mode === 'create' ? defaults?.openOrderId ?? null : null;

  const submit = async () => {
    if (!draft) return;
    const invalid = validateDraft(draft);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError(null);
    try {
      const result = await save(draft);
      if (result === null) { props.onClose(); return; }
      if (result.warning) notify.info(result.warning);
      else notify.success(order ? 'Sipariş güncellendi' : 'Sipariş oluşturuldu');
      props.onSaved(result);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  // null = değişiklik yok.
  const save = async (current: OrderFormDraft): Promise<ChatOrderWriteResultDto | null> => {
    if (!order) return chatOrdersApi.create(toCreateDto(conversationId, country, current));
    const body = toUpdateDto(order, current);
    return hasUpdateChanges(body) ? chatOrdersApi.update(order.id, body) : null;
  };

  const title = order ? `Siparişi düzenle — ${orderDisplayNo(order)}` : 'Sipariş oluştur';

  return (
    <FullScreenPanel open title={title} onClose={props.onClose}>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
            {inShopify && (
              <Notice text={`Sipariş Shopify'da (${order?.shopifyOrderName}). Değişiklik önce Shopify'a yazılır; kargoya verildiyse Shopify reddeder.`} />
            )}
            {openOrderId !== null && (
              <Notice text="Bu konuşmada müşterinin henüz onaylamadığı bir sipariş var. Yenisini açmak yerine onu düzenleyin." />
            )}

            {!draft && !error && <p className="m-0 text-ui-sm text-fg-muted">Yükleniyor…</p>}
            {draft && (
              <>
                <section className={`flex flex-col gap-3 p-4 ${surfaceCard}`}>
                  <h3 className="m-0 text-ui-sm font-bold text-fg">Ürünler</h3>
                  <ChatOrderProductPicker conversationId={conversationId} country={country} currency={currency}
                    onPick={(option) => setDraft((d) => (d ? addProduct(d, option) : d))} />
                  <ChatOrderLineList
                    lines={draft.lines}
                    currency={currency}
                    canEditPrice={defaults?.canOverridePrice === true}
                    inShopify={inShopify}
                    onChange={(key, change) => setDraft((d) => (d ? updateLine(d, key, change) : d))}
                    onRemove={(key) => setDraft((d) => (d ? removeLine(d, key) : d))}
                  />
                </section>

                <section className={`flex flex-col gap-3 p-4 ${surfaceCard}`}>
                  <h3 className="m-0 text-ui-sm font-bold text-fg">Müşteri ve teslimat</h3>
                  <ChatOrderDeliveryFields
                    draft={draft}
                    currency={currency}
                    paymentMethods={defaults?.paymentMethods ?? (draft.paymentMethod === null ? [] : [draft.paymentMethod])}
                    paymentLocked={order !== null && !isOpenChatOrder(order.status)}
                    shippingLocked={inShopify}
                    onChange={patch}
                  />
                </section>

                {!order && (
                  <ConfirmationToggle
                    checked={draft.sendConfirmation}
                    enabled={defaults?.canMessageCustomer === true}
                    onChange={(sendConfirmation) => patch({ sendConfirmation })}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-border-soft bg-card px-4 py-3 sm:flex-row sm:items-center">
          {error && <p role="alert" className="m-0 min-w-0 flex-1 break-words text-ui-xs text-danger">{error}</p>}
          <span className="font-mono text-ui-md font-bold text-fg sm:ml-auto">
            Toplam {draft ? formatOrderMoney(formTotal(draft), currency) : '—'}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={props.onClose} disabled={busy}
              className={`${buttonClass} flex-1 border border-border text-fg hover:bg-bg-subtle sm:flex-none`}>Vazgeç</button>
            <button type="button" onClick={() => void submit()} disabled={busy || !draft || openOrderId !== null}
              className={`${buttonClass} flex-1 bg-fg text-bg hover:opacity-90 sm:flex-none`}>
              {busy ? 'Kaydediliyor…' : order ? 'Kaydet' : 'Siparişi oluştur'}
            </button>
          </div>
        </footer>
      </div>
    </FullScreenPanel>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p className="m-0 flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-ui-xs text-fg">
      <AlertTriangle size={14} className="mt-px shrink-0 text-warning" aria-hidden /> {text}
    </p>
  );
}

// Teyit: botun onay özeti müşteriye gider, müşterinin "Evet"i siparişi onaylar. Pencere kapalıysa kapalı.
function ConfirmationToggle({ checked, enabled, onChange }: { checked: boolean; enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={`flex items-start gap-3 p-4 ${surfaceCard} ${enabled ? 'cursor-pointer' : 'opacity-60'}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked && enabled} disabled={!enabled}
        onChange={(e) => onChange(e.target.checked)} />
      <span className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 text-ui-sm font-semibold text-fg"><Send size={13} aria-hidden /> Müşteriye teyit gönder</span>
        <span className="text-ui-xs text-fg-muted">
          {enabled
            ? 'Sipariş özeti (Evet / Düzelt düğmeleriyle) müşteriye gider; müşteri onaylayınca sipariş açılır.'
            : 'Müşteri son 24 saatte yazmadığı için şu an mesaj gönderilemez. Teyidi başka yoldan alıp "Müşteri adına onayla"yı kullanın.'}
        </span>
      </span>
    </label>
  );
}
