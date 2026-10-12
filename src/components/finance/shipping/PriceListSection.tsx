'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { hasAnyPrice, type ZonePrices } from './policyDraft';
import { SectionCard, Segmented, ZoneHeader, ZonePriceInputs } from './ui';

export interface PriceListItem {
  id: number;
  name: string;
  detail: string;
}

interface PriceListSectionProps {
  zones: string[];
  currency: string;
  items: PriceListItem[];
  prices: Record<number, ZonePrices>;
  defaultPrices: ZonePrices;
  onPricesChange: (prices: Record<number, ZonePrices>) => void;
  onDefaultChange: (prices: ZonePrices) => void;
}

type Filter = 'all' | 'custom';

// Adım 2 (kategori yöntemi): en üstte "diğer tüm kategoriler", altında her kategori bir satır;
// sütunlar teslimat bölgeleri. Boş bırakılan kategori üstteki ortak fiyatı öder.
export function PriceListSection({ zones, currency, items, prices, defaultPrices, onPricesChange, onDefaultChange }: PriceListSectionProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const customCount = Object.values(prices).filter(hasAnyPrice).length;

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr-TR');
    return items
      .filter((item) => !term || item.name.toLocaleLowerCase('tr-TR').includes(term))
      .filter((item) => filter === 'all' || hasAnyPrice(prices[item.id]))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [items, search, filter, prices]);

  const setItemPrice = (id: number, zone: string, value: string) =>
    onPricesChange({ ...prices, [id]: { ...prices[id], [zone]: value } });

  return (
    <SectionCard tour="shipping-step2" title="2 · Kategori fiyatları">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[6px] border border-[var(--border)] bg-[var(--bg)] px-2.5 focus-within:border-[var(--fg)]">
          <Search size={13} className="shrink-0 text-[var(--fg-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kategori ara"
            className="w-full bg-transparent text-xs text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)]"
          />
        </label>
        <Segmented
          value={filter}
          options={[{ key: 'all', label: 'Tümü' }, { key: 'custom', label: `Fiyatlı (${customCount})` }]}
          onChange={setFilter}
        />
      </div>

      <div className="overflow-x-auto rounded-[6px] border border-[var(--border-soft)]">
        <div className="min-w-fit">
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]">
            <ZoneHeader zones={zones} first="Kategori" />
          </div>
          <div className="flex items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-3 py-2">
            <div className="flex min-w-40 flex-1 flex-col">
              <span className="text-xs font-semibold text-[var(--fg)]">Diğer tüm kategoriler</span>
              <span className="text-[10.5px] text-[var(--fg-subtle)]">Fiyatı girilmemiş kategoriler; boşsa desi tarifesi</span>
            </div>
            <ZonePriceInputs
              zones={zones}
              prices={defaultPrices}
              currency={currency}
              rowLabel="Diğer tüm kategoriler"
              placeholder="Desi"
              onChange={(zone, value) => onDefaultChange({ ...defaultPrices, [zone]: value })}
            />
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {visible.length === 0 ? (
              <p className="m-0 p-6 text-center text-xs text-[var(--fg-muted)]">
                {filter === 'custom' ? 'Fiyatlı kategori yok — hepsi ortak fiyatı öder.' : 'Sonuç yok.'}
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-soft)] p-0">
                {visible.map((item) => {
                  const itemPrices = prices[item.id] ?? {};
                  return (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="flex min-w-40 flex-1 flex-col">
                        <span className={`truncate text-xs text-[var(--fg)] ${hasAnyPrice(itemPrices) ? 'font-semibold' : ''}`}>{item.name}</span>
                        <span className="text-[10.5px] text-[var(--fg-subtle)]">{item.detail}</span>
                      </div>
                      <ZonePriceInputs
                        zones={zones}
                        prices={itemPrices}
                        currency={currency}
                        rowLabel={item.name}
                        placeholder="Ortak"
                        onChange={(zone, value) => setItemPrice(item.id, zone, value)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
