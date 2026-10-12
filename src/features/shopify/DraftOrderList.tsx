'use client';

import { Copy, Mail, Trash2 } from 'lucide-react';
import type { ShopifyDraftOrderListItemDto } from '../../lib/api/shopify-payment-shipping';
import { formatDateTime, formatMoney } from './explorerRules';
import { ghostButtonClass } from './styles';

interface Props {
  drafts: ShopifyDraftOrderListItemDto[];
  busy: boolean;
  onCopy: (draft: ShopifyDraftOrderListItemDto) => void;
  onSendInvoice: (draft: ShopifyDraftOrderListItemDto) => void;
  onDelete: (draft: ShopifyDraftOrderListItemDto) => void;
}

// Açık ödeme linkleri (taslak siparişler): link kopyala, e-postayla gönder, sil.
export function DraftOrderList({ drafts, busy, onCopy, onSendInvoice, onDelete }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {drafts.map((draft) => (
        <li key={draft.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border-soft bg-card px-3 py-2">
          <span className="min-w-0 flex-1 basis-48 break-words text-ui-xs text-fg">
            <strong className="text-ui-sm">{draft.name}</strong> · {formatMoney(draft.total)}
            <span className="block text-ui-2xs text-fg-muted">
              {draft.lines.map((line) => `${line.quantity} × ${line.sku ?? line.title}`).join(', ')}
            </span>
          </span>
          <span className="min-w-0 basis-40 break-all text-ui-2xs text-fg-muted">
            {draft.email ?? 'E-posta yok'} · {formatDateTime(draft.createdAt)}
          </span>
          <span className="flex gap-1">
            <button
              type="button" className={ghostButtonClass} aria-label={`${draft.name} linkini kopyala`}
              disabled={!draft.invoiceUrl} onClick={() => onCopy(draft)}
            >
              <Copy size={14} aria-hidden /> Linki kopyala
            </button>
            <button
              type="button" className={ghostButtonClass} aria-label={`${draft.name} faturasını e-postayla gönder`}
              disabled={busy || !draft.email} onClick={() => onSendInvoice(draft)}
            >
              <Mail size={14} aria-hidden />
            </button>
            <button type="button" className={ghostButtonClass} aria-label={`${draft.name} sil`} disabled={busy} onClick={() => onDelete(draft)}>
              <Trash2 size={14} aria-hidden />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
