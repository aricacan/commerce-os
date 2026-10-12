'use client';

import { Search, X } from 'lucide-react';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import { focusRing, motionFast } from '../shared/design';
import { InboxFilterSelect } from './InboxFilterSelect';
import {
  hasActiveOrderFilters, ORDER_PAYMENT_OPTIONS, ORDER_SHOPIFY_OPTIONS, orderStatusOptions, type OrderListFilters,
} from './chatOrderListRules';

interface Props {
  filters: OrderListFilters;
  countryOptions: FilterSelectOption[];
  channelOptions: FilterSelectOption[];
  onChange: (patch: Partial<OrderListFilters>) => void;
  onReset: () => void;
}

// Siparişler filtre çubuğu: arama + durum/ülke/kanal/ödeme/Shopify (ortak FilterSelect) + tarih aralığı
// + "Taslaklar dahil".
// Telefonda yatay kaydırılır; her seçici aynı yükseklikte.
export function OrderFilters({ filters, countryOptions, channelOptions, onChange, onReset }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex min-w-0 items-center">
        <Search size={14} className="pointer-events-none absolute left-3 text-fg-muted" aria-hidden />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Sipariş no, Shopify no, ad soyad ya da telefon"
          aria-label="Siparişlerde ara"
          className={`h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-ui-sm text-fg md:h-9 ${focusRing}`}
        />
      </label>

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <InboxFilterSelect ariaLabel="Durum" placeholder="Tüm durumlar" options={orderStatusOptions(filters.includeDrafts)}
          value={filters.status} onChange={(status) => onChange({ status })} />
        <InboxFilterSelect ariaLabel="Ülke" placeholder="Tüm ülkeler" options={countryOptions}
          value={filters.country} onChange={(country) => onChange({ country })} />
        <InboxFilterSelect ariaLabel="Kanal" placeholder="Tüm kanallar" options={channelOptions}
          value={filters.channelId} onChange={(channelId) => onChange({ channelId })} />
        <InboxFilterSelect ariaLabel="Ödeme yöntemi" placeholder="Tüm ödemeler" options={ORDER_PAYMENT_OPTIONS}
          value={filters.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })} />
        <InboxFilterSelect ariaLabel="Shopify durumu" placeholder="Shopify: tümü" options={ORDER_SHOPIFY_OPTIONS}
          value={filters.shopify} onChange={(shopify) => onChange({ shopify })} />
        <label className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-ui-sm text-fg md:h-9 ${focusRing}`}>
          <input type="checkbox" className="h-4 w-4" checked={filters.includeDrafts}
            onChange={(e) => onChange({ includeDrafts: e.target.checked, status: '' })} />
          Taslaklar dahil
        </label>
        <DateRangePicker
          className="shrink-0"
          includeAll
          value={filters.datePreset}
          onChange={(datePreset) => onChange({ datePreset })}
          customFrom={filters.customFrom}
          customTo={filters.customTo}
          onCustomChange={(customFrom, customTo) => onChange({ datePreset: 'custom', customFrom, customTo })}
        />
        {hasActiveOrderFilters(filters) && (
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-2.5 text-ui-sm font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg md:h-9 ${focusRing} ${motionFast}`}
          >
            <X size={13} aria-hidden /> Temizle
          </button>
        )}
      </div>
    </div>
  );
}
