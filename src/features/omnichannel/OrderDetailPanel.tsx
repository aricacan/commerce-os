'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, ShieldCheck, X } from 'lucide-react';
import { ConversationCountry } from './ConversationCountry';
import { chatOrdersApi, type ChatOrderDetailDto } from '../../lib/api/omnichannel-chat-orders';
import { describeError } from '../../lib/errors';
import { focusRing, motionFast } from '../shared/design';
import { ChatOrderActions } from './ChatOrderActions';
import { ChatOrderDetails } from './ChatOrderDetails';
import { ChatOrderFormDialog } from './ChatOrderFormDialog';
import { ChatOrderDestinationStatus } from './ChatOrderDestinationStatus';
import { ChatOrderStatusBadge } from './ChatOrderStatusBadge';
import { formatPanelDate, iconButtonClass, primaryButtonClass } from './CustomerPanelParts';
import { formatOrderMoney, orderDisplayNo } from './chatOrderRules';
import { useChatOrderCommands } from './useChatOrderCommands';

interface Props {
  orderId: number;
  onClose: () => void;
  // Durum değişti: liste de tazelensin.
  onChanged: () => Promise<void>;
  onOpenConversation: (conversationId: number) => void;
}

// Sipariş ayrıntısı: müşterinin onayladığı metin (aynen), müşteri/adres/ürün/ödeme, Shopify bağlantısı ve
// takip, kim-ne zaman-ne yaptı geçmişi, düzenle/iptal/sil/teyit (kanalda yazma yetkisi varsa; asıl denetim
// sunucuda) ve konuşmaya geçiş.
export function OrderDetailPanel({ orderId, onClose, onChanged, onOpenConversation }: Props) {
  const [detail, setDetail] = useState<ChatOrderDetailDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setDetail(await chatOrdersApi.detail(orderId));
    } catch (e) {
      setLoadError(describeError(e));
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(async () => { await Promise.all([load(), onChanged()]); }, [load, onChanged]);
  const order = detail?.order;
  const { busy, error, commands } = useChatOrderCommands(order ?? null, refresh);

  return (
    <aside aria-label="Sipariş ayrıntısı" className="flex h-full min-h-0 flex-col bg-card">
      <header className="flex shrink-0 items-center gap-2 border-b border-border-soft px-4 py-3">
        <span className="font-mono text-ui-sm font-bold text-fg">{order ? orderDisplayNo(order) : '…'}</span>
        {order && <ChatOrderStatusBadge status={order.status} />}
        <div className="flex-1" />
        <button type="button" onClick={onClose} aria-label="Ayrıntıyı kapat" className={`${iconButtonClass} ${focusRing}`}>
          <X size={14} aria-hidden />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 text-xs">
        {loadError && <p role="alert" className="m-0 break-words text-ui-xs text-danger">{loadError}</p>}
        {!order && !loadError && <p className="m-0 text-ui-xs text-fg-muted">Yükleniyor…</p>}

        {detail && order && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-ui-xs text-fg-muted">
              <ConversationCountry code={order.country} />
              <span>{detail.channelName ?? 'Kanal'}</span>
              <span>· {formatPanelDate(order.confirmedAt ?? order.createdAt, true)}</span>
              <span className="ml-auto font-mono text-ui-sm font-bold text-fg">{formatOrderMoney(order.total, order.currency)}</span>
            </div>

            <button type="button" onClick={() => onOpenConversation(order.conversationId)}
              className={`${primaryButtonClass} self-start ${focusRing} ${motionFast}`}>
              <MessageSquare size={12} aria-hidden /> Konuşmayı aç
            </button>

            <section className="flex flex-col gap-1.5">
              <h3 className="m-0 flex items-center gap-1.5 text-ui-xs font-bold uppercase text-fg-muted">
                <ShieldCheck size={12} aria-hidden /> Müşterinin onayladığı metin
              </h3>
              {order.confirmationText ? (
                <pre className="m-0 whitespace-pre-wrap break-words rounded-lg border border-border-soft bg-bg-subtle p-3 font-sans text-ui-xs leading-relaxed text-fg">
                  {order.confirmationText}
                </pre>
              ) : (
                <p className="m-0 text-ui-xs italic text-fg-muted">
                  Bot onay metni yok (eski sipariş ya da temsilci müşteri adına onayladı).
                </p>
              )}
            </section>

            <section className="flex flex-col gap-1.5">
              <h3 className="m-0 text-ui-xs font-bold uppercase text-fg-muted">Sipariş</h3>
              <ChatOrderDetails order={order} />
              {order.paidAt && <p className="m-0 text-ui-xs text-fg-muted">Ödeme alındı: {formatPanelDate(order.paidAt, true)}</p>}
              {commands && (
                <ChatOrderDestinationStatus order={order} canWrite={detail.canWrite} busy={busy}
                  onSend={() => void commands.sendToDestination()} />
              )}
            </section>

            {error && <p role="alert" className="m-0 break-words text-ui-xs text-danger">{error}</p>}
            {detail.canWrite && commands ? (
              <ChatOrderActions key={order.version} order={order} busy={busy} commands={commands} onEdit={() => setEditing(true)} />
            ) : (
              <p className="m-0 text-ui-xs text-fg-muted">Bu kanalın ekibinde olmadığınız için siparişi değiştiremezsiniz.</p>
            )}
            {editing && (
              <ChatOrderFormDialog mode="edit" order={order} onClose={() => setEditing(false)}
                onSaved={() => { setEditing(false); void refresh(); }} />
            )}
          </>
        )}
      </div>
    </aside>
  );
}
