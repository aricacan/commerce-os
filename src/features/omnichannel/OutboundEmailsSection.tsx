'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import type { FilterSelectOption } from '../../components/ui/FilterSelect';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { secondaryButtonClass } from './formClasses';
import { OutboundEmailFilterBar } from './OutboundEmailFilterBar';
import { OutboundEmailList } from './OutboundEmailList';
import { EMPTY_OUTBOUND_FILTERS } from './outboundEmailRules';
import { useOutboundEmails } from './useOutboundEmails';

interface Props {
  onOpenConversation?: (conversationId: number) => void;
}

// Kanal adı yalnız etiket için; yüklenemezse liste "Kanal #id" ile çalışmaya devam eder.
function useChannelOptions(): FilterSelectOption[] {
  const [options, setOptions] = useState<FilterSelectOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    omnichannelApi.getChannels()
      .then((channels) => {
        if (!cancelled) setOptions(channels.map((c) => ({ value: String(c.id), label: c.displayName })));
      })
      .catch(() => { if (!cancelled) setOptions([]); });
    return () => { cancelled = true; };
  }, []);
  return options;
}

// Hesap geneli › Gönderilen e-postalar: sistemin ne zaman kime hangi maili gönderdiği (devir, sipariş, bildirim, cevap).
export function OutboundEmailsSection({ onOpenConversation }: Props) {
  const [filters, setFilters] = useState(EMPTY_OUTBOUND_FILTERS);
  const [version, setVersion] = useState(0);
  const channelOptions = useChannelOptions();
  const channelNames = useMemo(() => new Map(channelOptions.map((o) => [Number(o.value), o.label])), [channelOptions]);
  const { data, loading, error, page, setPage } = useOutboundEmails(filters, version);

  return (
    <section className="flex w-full flex-1 flex-col gap-3 p-4 text-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Gönderilen e-postalar</h2>
            {data && <span className="text-[var(--fg-muted)]">{data.totalCount}</span>}
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Sistemin gönderdiği devir, sipariş, bildirim ve cevap e-postaları: ne zaman, kime, hangi konuyla gitti, ulaştı mı.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => setVersion((v) => v + 1)} className={secondaryButtonClass}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Yenile
        </button>
      </div>

      <OutboundEmailFilterBar filters={filters} channelOptions={channelOptions} onChange={setFilters} />

      <OutboundEmailList data={data} loading={loading} error={error} page={page} channelNames={channelNames}
        onPageChange={setPage} onOpenConversation={onOpenConversation} />
    </section>
  );
}
