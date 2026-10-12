import { ShieldAlert } from 'lucide-react';
import type { CustomerListItemDto } from '../../lib/api/customers';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { channelTypeMeta } from './shared';
import { formatPanelDate, tagClass } from './CustomerPanelParts';

interface Props {
  customer: CustomerListItemDto;
  selected: boolean;
  onSelect: () => void;
}

// Müşteri listesinin satırı: bayrak, ad, kanallar, telefon, etiketler ve son görülme.
export function CustomerListRow({ customer, selected, onSelect }: Props) {
  return (
    <button type="button" onClick={onSelect} aria-current={selected || undefined}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--bg-subtle)]/40 ${selected ? 'bg-[var(--bg-subtle)]' : ''}`}>
      <span className="flex w-5 shrink-0 justify-center">
        {customer.countryCode && <CountryFlag code={customer.countryCode} size={16} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 truncate font-semibold text-[var(--fg)]">
          {customer.isAnonymized && <ShieldAlert size={12} className="shrink-0 text-[var(--fg-muted)]" />}
          {customer.displayName ?? 'İsimsiz müşteri'}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
          {customer.channelTypes.map((t) => {
            const meta = channelTypeMeta(t);
            return <meta.Icon key={t} size={11} color={meta.color} />;
          })}
          {customer.primaryPhone && <span className="font-mono">+{customer.primaryPhone}</span>}
        </span>
      </div>
      <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
        {customer.tags.map((t) => (
          <span key={t.id} className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tagClass(t.color)}`}>{t.name}</span>
        ))}
      </div>
      <span className="w-24 shrink-0 text-right text-[11px] text-[var(--fg-muted)]">{formatPanelDate(customer.lastSeenAt)}</span>
    </button>
  );
}
