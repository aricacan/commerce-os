'use client';

import { useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ShopifyCustomerListItemDto } from '../../lib/api/shopify-explorer';
import { shopifyOrderCrudApi } from '../../lib/api/shopify-order-crud';
import type { ShopifyStoreDto } from '../../lib/api/shopify';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText, formatMoney, writeFailure } from './explorerRules';
import { OrderAddressFields } from './OrderAddressFields';
import { OrderCustomerPicker } from './OrderCustomerPicker';
import { OrderDraftLines } from './OrderDraftLines';
import { OrderDraftSummary } from './OrderDraftSummary';
import {
  addDraftLine, buildCreateBody, draftTotal, emptyOrderDraft, paymentOptions, removeDraftLine, setDraftLineQuantity,
  validateOrderDraft, type OrderDraft,
} from './orderDraftRules';
import { OrderProductPicker } from './OrderProductPicker';
import { SelectField } from './FormControls';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  store: ShopifyStoreDto;
  onBack: () => void;
  // Sipariş açıldı: Shopify'ın verdiği sipariş kimliği (detaya geçmek için); kimlik dönmediyse null.
  onCreated: (orderId: number | null) => void;
}

const DEFAULT_CURRENCY = 'EUR';
const NOTE_MAX_LENGTH = 5000;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label={title}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
      {children}
    </section>
  );
}

// Elle sipariş: müşteri (mevcut ya da yeni, e-posta zorunlu) + ürünler (SKU ile) + teslimat adresi + ödeme + kargo + not.
// Özet her zaman görünür; "Siparişi oluştur" açık onay ister. Sipariş yalnız Shopify'da açılır (müşteriye bildirim gitmez).
export function NewOrderPanel({ store, onBack, onCreated }: Props) {
  const { notify, confirm } = useFeedback();
  const [draft, setDraft] = useState<OrderDraft>(() => emptyOrderDraft(store.countryCode));
  const [requestKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const currency = store.currency ?? DEFAULT_CURRENCY;
  const options = paymentOptions(store.codGatewayName, store.bankTransferGatewayName);
  const paymentLabel = options.find((option) => option.value === draft.payment)?.label ?? '—';

  const pickCustomer = (customer: ShopifyCustomerListItemDto) => setDraft((d) => ({
    ...d,
    customerId: customer.id,
    email: customer.email ?? d.email,
    fullName: customer.name ?? d.fullName,
    address: { ...d.address, fullName: d.address.fullName || (customer.name ?? ''), phone: d.address.phone || (customer.phone ?? '') },
  }));

  const submit = async () => {
    const problem = validateOrderDraft(draft);
    if (problem) return notify.error(problem);
    const ok = await confirm({
      title: 'Sipariş Shopify\'da açılsın mı?',
      body: `${draft.lines.length} kalem, toplam ${formatMoney({ amount: draftTotal(draft), currency })}. Ödeme: ${paymentLabel}. Müşteriye bildirim gitmez; stok düşer.`,
      confirmLabel: 'Siparişi oluştur',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const result = await shopifyOrderCrudApi.create(store.id, buildCreateBody(draft, requestKey));
      const failure = writeFailure(result);
      if (failure) return notify.error(failure);
      notify.success('Sipariş oluşturuldu.');
      onCreated(result.id);
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <button type="button" className={ghostButtonClass} onClick={onBack}><ArrowLeft size={14} aria-hidden /> Siparişler</button>
        <h2 className="m-0 text-ui-md font-bold text-fg">Yeni sipariş</h2>
      </header>

      <Section title="Müşteri">
        <OrderCustomerPicker storeId={store.id} onPick={pickCustomer} />
        {draft.customerId !== null && <p className="m-0 text-ui-2xs text-fg-muted">Mevcut müşteriye bağlanacak (#{draft.customerId}).</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Müşteri adı
            <input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            E-posta (zorunlu)
            <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className={fieldClass} />
          </label>
        </div>
      </Section>

      <Section title="Ürünler">
        <OrderProductPicker
          storeId={store.id} currency={currency}
          onPick={(picked) => setDraft((d) => ({ ...d, lines: addDraftLine(d.lines, picked) }))}
        />
        <OrderDraftLines
          lines={draft.lines} currency={currency}
          onQuantity={(sku, quantity) => setDraft((d) => ({ ...d, lines: setDraftLineQuantity(d.lines, sku, quantity) }))}
          onRemove={(sku) => setDraft((d) => ({ ...d, lines: removeDraftLine(d.lines, sku) }))}
        />
      </Section>

      <Section title="Teslimat adresi">
        <OrderAddressFields value={draft.address} onChange={(address) => setDraft({ ...draft, address })} />
      </Section>

      <Section title="Ödeme, kargo ve not">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label="Ödeme yöntemi" value={draft.payment} options={options} onChange={(payment) => setDraft({ ...draft, payment })} />
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Kargo ücreti ({currency})
            <input value={draft.shipping} inputMode="decimal" onChange={(e) => setDraft({ ...draft, shipping: e.target.value })} className={fieldClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Sipariş notu
          <input value={draft.note} maxLength={NOTE_MAX_LENGTH} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={fieldClass} />
        </label>
      </Section>

      <OrderDraftSummary draft={draft} currency={currency} paymentLabel={paymentLabel} />
      <div className="flex gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void submit()}>Siparişi oluştur</button>
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={onBack}>Vazgeç</button>
      </div>
    </div>
  );
}
