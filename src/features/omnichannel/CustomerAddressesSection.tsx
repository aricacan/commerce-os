'use client';

import { MapPin, Trash2 } from 'lucide-react';
import type { CustomerAddressDto } from '../../lib/api/customer-crm';
import { chatOrdersApi } from '../../lib/api/omnichannel-chat-orders';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EmptyLine, PanelSection, iconButtonClass, type CustomerSectionProps } from './CustomerPanelParts';
import { formatOrderAddress } from './chatOrderRules';

// Botun sohbet siparişlerinden kaydettiği teslimat adresleri (müşteri detayıyla birlikte gelir).
export function CustomerAddressesSection({ profile, readOnly, onChanged }: CustomerSectionProps) {
  const { notify, confirm } = useFeedback();

  const remove = async (address: CustomerAddressDto) => {
    const ok = await confirm({
      title: 'Adres silinsin mi?',
      body: 'Adres kalıcı olarak silinir (KVKK). Geçmiş siparişlerdeki teslimat bilgisi etkilenmez.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    try {
      await chatOrdersApi.deleteAddress(profile.id, address.id);
      notify.success('Adres silindi.');
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <PanelSection title="Adresler" count={profile.addresses.length} defaultOpen={false}>
      {profile.addresses.length === 0 && (
        <EmptyLine>Kayıtlı adres yok. Müşteri sohbetten sipariş verince bot buraya kaydeder.</EmptyLine>
      )}
      <ul className="flex flex-col gap-2">
        {profile.addresses.map((address) => (
          <AddressRow key={address.id} address={address} readOnly={readOnly} onRemove={() => void remove(address)} />
        ))}
      </ul>
    </PanelSection>
  );
}

function AddressRow({ address, readOnly, onRemove }: {
  address: CustomerAddressDto;
  readOnly: boolean;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--fg-muted)]" aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold text-[var(--fg)]">{address.fullName ?? 'İsimsiz'}</span>
          {address.isDefault && (
            <span className="shrink-0 rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-px text-[10px] font-semibold text-[var(--fg-muted)]">
              Varsayılan
            </span>
          )}
        </span>
        <span className="break-words text-[10.5px] text-[var(--fg-muted)]">
          {[formatOrderAddress(address), address.country].filter(Boolean).join(' · ')}
        </span>
        {address.phone && <span className="text-[10.5px] text-[var(--fg-muted)]">{address.phone}</span>}
      </div>
      {!readOnly && (
        <button type="button" className={iconButtonClass} title="Adresi sil" aria-label="Adresi sil" onClick={onRemove}>
          <Trash2 size={12} />
        </button>
      )}
    </li>
  );
}
