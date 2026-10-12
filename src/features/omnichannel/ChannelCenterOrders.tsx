'use client';

import { useState } from 'react';
import { Pencil, RotateCcw, Send } from 'lucide-react';
import type { ChannelDto } from '../../lib/api/omnichannel';
import { ORDER_DESTINATION_KIND, type OrderDestinationOptionDto } from '../../lib/api/omnichannel-order-destinations';
import { PAYMENT_LEVEL_LABELS } from './channelScopeRules';
import { secondaryButtonClass } from './formClasses';
import { ORDER_DESTINATION_EXPLANATION, optionKey, ruleBodyFor } from './orderDestinationRules';
import { OrderDestinationEditor } from './OrderDestinationEditor';
import { ScopeBadge } from './ScopeBadge';
import { SettingsLink } from './SettingsLink';
import { useChannelOrderDestination } from './useChannelOrderDestination';
import { useOrderDestinationActions } from './useOrderDestinationActions';

interface Props {
  channel: ChannelDto;
}

// Kanal Merkezi › Siparişler: bu kanalda onaylanan siparişlerin yazılacağı yer ve hangi kapsamdan geldiği.
// Yalnız KANALA özel kural burada düzenlenir ("bu kanal için özelleştir"); üst kapsam kuralları başka kanalları
// da etkilediği için Hesap geneli › Sipariş hedefi'nde düzenlenir.
export function ChannelCenterOrders({ channel }: Props) {
  const { effective, loading, error, reload } = useChannelOrderDestination(channel.id);
  const actions = useOrderDestinationActions(reload);
  const [editing, setEditing] = useState(false);

  if (loading) return <p className="m-0 text-[11px] text-[var(--fg-muted)]">Sipariş hedefi yükleniyor…</p>;
  if (!effective) return <p className="m-0 text-[11px] text-rose-500">{error ?? 'Sipariş hedefi okunamadı.'}</p>;

  const ownRule = effective.level === 'Channel' && effective.ruleId !== null;
  const usingDefault = effective.level === 'BuiltInDefault';

  const handleSave = async (option: OrderDestinationOptionDto) => {
    const body = ruleBodyFor({ channelId: channel.id }, option);
    const saved = await actions.save(ownRule ? effective.ruleId : null, body, option);
    if (saved) setEditing(false);
  };

  const handleReset = () => {
    if (effective.ruleId === null) return;
    void actions.remove(effective.ruleId, 'Bu kanal üst kapsamın hedefini izlemeye döner.');
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0 text-xs font-bold text-[var(--fg)]">Siparişlerin yazılacağı yer</h3>
          <ScopeBadge label={`Kaynak: ${PAYMENT_LEVEL_LABELS[effective.level]}`} tone="info" />
        </div>

        <p className="m-0 text-xs font-bold text-[var(--fg)]">
          {usingDefault && <span className="font-normal text-[var(--fg-muted)]">Seçim yapılmadı — şu an: </span>}
          {effective.label}
        </p>
        {effective.notice && <p role="status" className="m-0 text-[11px] text-[var(--warning)]">{effective.notice}</p>}
        {effective.kind === ORDER_DESTINATION_KIND.None && (
          <p role="status" className="m-0 text-[11px] text-[var(--warning)]">Bu kanalda gönderim durduruldu: siparişler yalnız panelde kalır.</p>
        )}

        {editing ? (
          <OrderDestinationEditor
            country={channel.country}
            initialKey={ownRule ? optionKey(effective.kind, effective.targetId) : ''}
            saving={actions.saving}
            onSave={(option) => void handleSave(option)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)}>
              {ownRule ? <><Pencil size={13} aria-hidden /> Hedefi değiştir</> : <><Send size={13} aria-hidden /> Bu kanal için özelleştir</>}
            </button>
            {ownRule && (
              <button type="button" className={secondaryButtonClass} onClick={handleReset}>
                <RotateCcw size={13} aria-hidden /> Genele döndür
              </button>
            )}
          </div>
        )}

        <p className="m-0 text-[11px] text-[var(--fg-muted)]">{ORDER_DESTINATION_EXPLANATION}</p>
      </section>

      <p className="m-0 text-[11px] text-[var(--fg-muted)]">
        Marka, ülke ve genel kapsam kuralları başka kanalları da etkiler:{' '}
        <SettingsLink target={{ tab: 'account', sub: 'orderdest' }}>Tüm kanallar için gör</SettingsLink>
      </p>
    </div>
  );
}
