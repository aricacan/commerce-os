'use client';

import { Search } from 'lucide-react';
import type { ConversationFilter, InboxChannelDto } from '../../lib/api/omnichannel';
import { motionFast } from '../shared/design';
import { FilterToolbar } from './FilterToolbar';
import { InboxFilterSelects } from './InboxFilterSelects';
import { countActiveInboxFilters, EMPTY_INBOX_FILTERS, type InboxFilters, type InboxView } from './inboxFilters';

// Gelen kutusu ve pano sekmelerinin üst filtre çubuğu. Bütün filtreler tutarlı açılır menüdür;
// seçili sayısı görünür, "Temizle" hepsini tek tuşla sıfırlar. Masaüstü/telefon yerleşimi ortak
// FilterToolbar'da (Müşteriler ekranıyla aynı).
interface Props {
  channels: InboxChannelDto[];
  value: InboxFilters;
  onChange: (value: InboxFilters) => void;
  counts: Partial<Record<ConversationFilter, number>>;
  view: InboxView;
}

export function InboxFilterBar({ channels, value, onChange, counts, view }: Props) {
  const activeCount = countActiveInboxFilters(value, view);

  return (
    <FilterToolbar
      className="border-b border-border bg-card px-4 py-3"
      activeCount={activeCount}
      canClear={activeCount > 0 || value.search !== ''}
      onClear={() => onChange(EMPTY_INBOX_FILTERS)}
      search={(
        <label className="relative flex min-w-0 flex-1 items-center md:w-64 md:flex-none">
          <Search size={14} className="pointer-events-none absolute left-3 text-fg-muted" aria-hidden />
          <input
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="İsim veya numara ara..."
            aria-label="Konuşma ara"
            className={`h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-base text-fg placeholder:text-fg-subtle md:h-9 md:text-ui-sm focus:border-fg/40 focus-visible:ring-2 focus-visible:ring-fg/10 ${motionFast} outline-none`}
          />
        </label>
      )}
      filters={<InboxFilterSelects channels={channels} value={value} onChange={onChange} counts={counts} view={view} />}
    />
  );
}
