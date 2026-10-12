'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  crmApi, customersApi,
  type CustomerListItemDto, type CustomerSegment, type CustomerSummaryDto, type CustomerTagDto,
} from '../../lib/api/customers';
import { CHANNEL_TYPE, type ChannelType } from '../../lib/api/omnichannel';
import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import { describeError } from '../../lib/errors';
import { useOmnichannelCountries } from './useOmnichannelCountries';
import { channelTypeMeta } from './shared';
import { inputClass } from './CustomerPanelParts';
import { CustomerListRow } from './CustomerListRow';
import { CustomerSummaryStrip } from './CustomerSummaryStrip';
import { CustomerSegmentNav } from './CustomerSegmentNav';
import { FilterToolbar } from './FilterToolbar';
import { InboxFilterSelect } from './InboxFilterSelect';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const CHANNEL_OPTIONS: FilterSelectOption[] = Object.values(CHANNEL_TYPE)
  .map((type) => ({ value: String(type), label: channelTypeMeta(type).label }));

interface Props {
  selectedId: number | null;
  onSelect: (profileId: number) => void;
  // Panel kapanınca artar: liste ve özet yeniden okunur (birleşme/düzenleme yansısın).
  reloadToken: number;
}

// Kanallar üstü müşteri listesi. Üstte KPI şeridi (kart = segment kısayolu), altında segment
// sekmeleri; arama (ad, her biçimde telefon, e-posta, kanal kimliği, araç) + ülke/kanal/etiket süzgeci.
// Hepsi sunucuda süzülür ve sayfalanır. Özet ucu yoksa şerit ve sekmeler gizlenir, liste çalışır.
export function CustomerDirectory({ selectedId, onSelect, reloadToken }: Props) {
  const { countries } = useOmnichannelCountries();
  const [tags, setTags] = useState<CustomerTagDto[]>([]);
  const [summary, setSummary] = useState<CustomerSummaryDto | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [segment, setSegment] = useState<CustomerSegment>('all');
  const [country, setCountry] = useState('');
  const [channelType, setChannelType] = useState<ChannelType | null>(null);
  const [tagId, setTagId] = useState('');
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<CustomerListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { crmApi.tags().then(setTags).catch(() => setTags([])); }, []);

  useEffect(() => {
    customersApi.summary().then(setSummary).catch(() => setSummary(null));
  }, [reloadToken]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await customersApi.list({
        search: debouncedSearch || undefined,
        countryCode: country || undefined,
        channelType: channelType ?? undefined,
        tagId: tagId ? Number(tagId) : undefined,
        segment,
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(describeError(e));
    }
  }, [debouncedSearch, country, channelType, tagId, segment, page]);

  useEffect(() => { void load(); }, [load, reloadToken]);

  // Her süzgeç değişikliği ilk sayfaya döner.
  const filterSetter = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPage(0); };
  const changeSegment = filterSetter(setSegment);
  const changeCountry = filterSetter(setCountry);
  const changeChannel = filterSetter(setChannelType);
  const changeTag = filterSetter(setTagId);
  // Segment sekmesi süzgeç sayılmaz: KPI şeridi/sekmeler zaten görünür ve kendi "Tümü"sü var.
  const activeFilterCount = [channelType !== null, country !== '', tagId !== ''].filter(Boolean).length;
  const clearFilters = () => {
    setSearch('');
    setChannelType(null);
    setCountry('');
    setTagId('');
    setPage(0);
  };

  const countryOptions = useMemo<FilterSelectOption[]>(
    () => countries.map((c) => ({ value: c.code, label: c.name })), [countries]);
  const tagOptions = useMemo<FilterSelectOption[]>(
    () => tags.map((t) => ({ value: String(t.id), label: t.name })), [tags]);

  return (
    <>
      {summary && (
        <>
          <CustomerSummaryStrip summary={summary} segment={segment} channelType={channelType} countryCode={country}
            countries={countries} onSegment={changeSegment} onChannel={changeChannel} onCountry={changeCountry} />
          <CustomerSegmentNav value={segment} summary={summary} onChange={changeSegment} />
        </>
      )}

      <FilterToolbar
        activeCount={activeFilterCount}
        canClear={activeFilterCount > 0 || search !== ''}
        onClear={clearFilters}
        search={(
          <div className="relative min-w-0 flex-1">
            <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, telefon, e-posta ya da araç"
              aria-label="Müşteri ara" className={`${inputClass} h-10 pl-7 md:h-9`} />
          </div>
        )}
        filters={(
          <>
            <InboxFilterSelect ariaLabel="Kanal" placeholder="Tüm kanallar" options={CHANNEL_OPTIONS}
              value={channelType === null ? '' : String(channelType)}
              onChange={(v) => changeChannel(v === '' ? null : (Number(v) as ChannelType))} />
            <InboxFilterSelect ariaLabel="Ülke" placeholder="Tüm ülkeler" options={countryOptions}
              value={country} onChange={changeCountry} />
            <InboxFilterSelect ariaLabel="Etiket" placeholder="Tüm etiketler" options={tagOptions}
              value={tagId} onChange={changeTag} />
          </>
        )}
      />

      {error && <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>}

      {/* shrink-0 şart: overflow-hidden flex öğesinin min-height'ı 0 olur; kaydırma kutusu
          dolunca liste ezilip satırların çoğu kesiliyor, sayfa da kaymıyordu. */}
      <div className="shrink-0 divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
        {items.length === 0 && (
          <div className="p-6 text-center text-[var(--fg-muted)]">
            {debouncedSearch
              ? `"${debouncedSearch}" için müşteri bulunamadı. Telefonu farklı biçimde ya da aracı marka/model olarak dene.`
              : 'Müşteri bulunamadı. Profiller yeni mesajlarla oluşur.'}
          </div>
        )}
        {items.map((c) => (
          <CustomerListRow key={c.id} customer={c} selected={c.id === selectedId} onSelect={() => onSelect(c.id)} />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="flex-1 text-[var(--fg-muted)]">{total.toLocaleString('tr-TR')} müşteri</span>
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Önceki</button>
        <span className="text-[var(--fg-muted)]">Sayfa {page + 1}</span>
        <button type="button" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Sonraki</button>
      </div>
    </>
  );
}
