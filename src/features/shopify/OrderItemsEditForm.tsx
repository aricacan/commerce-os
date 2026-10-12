'use client';

import { useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { ShopifyOrderDetailDto } from '../../lib/api/shopify-explorer';
import { shopifyOrderCrudApi } from '../../lib/api/shopify-order-crud';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText, writeFailure } from './explorerRules';
import { OrderAddressFields } from './OrderAddressFields';
import { addressChanged, addressFromOrder, toAddressInput, validateAddress } from './orderAddressRules';
import { MAX_LINE_QUANTITY } from './orderDraftRules';
import {
  addPickedLine, buildEditLines, canEditLines, describeLineChanges, hasLineChanges, linesFromDetail, remainingLineCount,
  setLineQuantity, toggleLineRemoved,
} from './orderEditRules';
import { OrderProductPicker } from './OrderProductPicker';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  detail: ShopifyOrderDetailDto;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

const DEFAULT_CURRENCY = 'EUR';
const ADDRESS_CHANGE_TEXT = 'Teslimat adresi güncellenecek';

// Kalem adedi değiştir / kalem çıkar / ürün ekle + teslimat adresi. Fark önizlemesi canlı gösterilir; "Uygula" açık onay ister.
// Sunucu kilitli (kargolanmış) ya da eşleşmeyen ürünü reddederse neden gösterilir ve hiçbir şey yazılmaz.
export function OrderItemsEditForm({ storeId, detail, onClose, onChanged }: Props) {
  const { notify, confirm } = useFeedback();
  const [lines, setLines] = useState(() => linesFromDetail(detail.lines));
  const original = addressFromOrder(detail.shippingAddress, '');
  const [address, setAddress] = useState(original);
  const [busy, setBusy] = useState(false);
  const currency = detail.order.total?.currency ?? DEFAULT_CURRENCY;
  const linesEditable = canEditLines(lines);
  const changeLines = describeLineChanges(lines);
  const addressEdited = addressChanged(address, original);
  const summary = [...changeLines, ...(addressEdited ? [ADDRESS_CHANGE_TEXT] : [])];

  const apply = async () => {
    if (remainingLineCount(lines) === 0) return notify.error('Siparişte en az bir kalem kalmalı; tamamen vazgeçmek için siparişi iptal edin.');
    const addressProblem = addressEdited ? validateAddress(address) : null;
    if (addressProblem) return notify.error(addressProblem);
    const ok = await confirm({
      title: 'Sipariş değişiklikleri uygulansın mı?',
      body: `${summary.join('; ')}. Stok buna göre güncellenir; müşteriye bildirim gitmez.`,
      confirmLabel: 'Değişiklikleri uygula',
    });
    if (ok) await submit();
  };

  const submit = async () => {
    setBusy(true);
    try {
      const body = {
        lines: hasLineChanges(lines) ? buildEditLines(lines) : undefined,
        address: addressEdited ? toAddressInput(address) : undefined,
      };
      const failure = writeFailure(await shopifyOrderCrudApi.edit(storeId, detail.order.id, body));
      if (failure) return notify.error(failure);
      notify.success('Sipariş güncellendi.');
      onClose();
      await onChanged();
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Kalem ve adres düzenleme">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Kalem ve adres düzenle</h3>
      {!linesEditable && (
        <p className="m-0 text-ui-xs text-warning">Ürün kodu olmayan kalem var; kalemler Shopify&apos;da düzenlenir. Yalnız adres değiştirilebilir.</p>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {lines.map((line) => (
          <li key={line.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2">
            <span className={`min-w-0 flex-1 basis-40 break-words text-ui-xs ${line.removed ? 'text-fg-muted line-through' : 'text-fg'}`}>
              {line.title}
              <span className="block font-mono text-ui-2xs text-fg-muted">{line.sku ?? 'SKU yok'}</span>
            </span>
            <input
              type="number" min={1} max={MAX_LINE_QUANTITY} value={line.quantity} disabled={!linesEditable || line.removed}
              aria-label={`${line.title} adedi`} className={`${fieldClass} w-20`}
              onChange={(e) => setLines(setLineQuantity(lines, line.key, e.target.valueAsNumber))}
            />
            <button
              type="button" className={ghostButtonClass} disabled={!linesEditable}
              aria-label={`${line.title} ${line.removed ? 'geri al' : 'çıkar'}`} onClick={() => setLines(toggleLineRemoved(lines, line.key))}
            >
              {line.removed ? <RotateCcw size={14} aria-hidden /> : <Trash2 size={14} aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
      {linesEditable && <OrderProductPicker storeId={storeId} currency={currency} onPick={(picked) => setLines(addPickedLine(lines, picked))} />}
      <h4 className="m-0 text-ui-xs font-bold text-fg">Teslimat adresi</h4>
      <OrderAddressFields value={address} onChange={setAddress} />
      <div className="rounded-md bg-bg-subtle px-3 py-2 text-ui-xs text-fg" aria-label="Değişiklik önizlemesi">
        {summary.length === 0 ? 'Henüz değişiklik yok.' : (
          <ul className="m-0 list-disc pl-4">{summary.map((text) => <li key={text}>{text}</li>)}</ul>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || summary.length === 0} onClick={() => void apply()}>
          Değişiklikleri uygula
        </button>
        <button type="button" className={ghostButtonClass} disabled={busy} onClick={onClose}>Vazgeç</button>
      </div>
    </section>
  );
}
