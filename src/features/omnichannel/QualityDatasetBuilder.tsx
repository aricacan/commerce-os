'use client';

import { useCallback, useState } from 'react';
import { Hammer } from 'lucide-react';
import { omnichannelApi } from '../../lib/api/omnichannel';
import {
  EMPTY_DATASET_FILTERS, QUALITY_PAGE_SIZE, qualityApi, type DatasetConversationFilters,
} from '../../lib/api/omnichannel-quality';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { formInputClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import { dayAfter, toggleId } from './qualityCenterRules';
import { QualityDatasetConversationItem } from './QualityDatasetConversationItem';
import { QualityDatasetFilters } from './QualityDatasetFilters';
import { QualityField } from './QualityField';
import { QualityPager } from './QualityPager';
import { useLoad } from './useLoad';
import { useServerResource } from './useServerResource';

interface Props {
  onOpenConversation: (conversationId: number) => void;
  onBuilt: () => void;
}

// Canlı konuşmalardan veri seti: süzgeçle (tarih, kanal, ülke, devirli, "Yanlış" işaretli) listele, konuşmaları seç,
// ad ver ve kur. Bitiş günü dahildir. Seçim sayfalar arasında korunur (en fazla 500 konuşma).
export function QualityDatasetBuilder({ onOpenConversation, onBuilt }: Props) {
  const { notify } = useFeedback();
  const { data: channels } = useLoad(omnichannelApi.getChannels);
  const [filters, setFilters] = useState<DatasetConversationFilters>(EMPTY_DATASET_FILTERS);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [name, setName] = useState('');
  const [building, setBuilding] = useState(false);
  const load = useCallback(
    () => qualityApi.getDatasetConversations({ ...filters, to: dayAfter(filters.to) }, page), [filters, page]);
  const conversations = useServerResource(load, JSON.stringify([filters, page]));
  const items = conversations.data?.items ?? [];

  const change = (patch: Partial<DatasetConversationFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(0); };
  const selectPage = () => setSelected((current) => new Set([...current, ...items.map((c) => c.conversationId)]));

  const build = async () => {
    setBuilding(true);
    try {
      const dataset = await qualityApi.buildDataset(name, '', [...selected]);
      notify.success(
        `"${dataset.name}" v${dataset.version} kuruldu: ${dataset.conversations} konuşma, ${dataset.turns} bot turu.`);
      onBuilt();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <QualityDatasetFilters value={filters} channels={channels ?? []} onChange={change} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-ui-xs text-fg-muted">
        <span>{(conversations.data?.total ?? 0).toLocaleString('tr-TR')} konuşma · {selected.size} seçili</span>
        <div className="flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={selectPage} disabled={items.length === 0}>
            Sayfadakileri seç
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => setSelected(new Set())} disabled={selected.size === 0}>
            Seçimi temizle
          </button>
        </div>
      </div>

      {conversations.error && <p role="alert" className="m-0 text-ui-xs text-danger">{conversations.error}</p>}
      <ul className={`m-0 flex max-h-96 list-none flex-col gap-1 overflow-y-auto p-0 ${conversations.loading ? 'opacity-60' : ''}`}>
        {items.map((conversation) => (
          <QualityDatasetConversationItem
            key={conversation.conversationId} conversation={conversation} selected={selected.has(conversation.conversationId)}
            onToggle={() => setSelected((current) => toggleId(current, conversation.conversationId))}
            onOpen={() => onOpenConversation(conversation.conversationId)}
          />
        ))}
      </ul>
      <QualityPager
        page={page} total={conversations.data?.total ?? 0} loading={conversations.loading} label="Konuşma sayfaları"
        onChange={setPage}
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <QualityField label="Set adı (aynı ad = yeni sürüm)">
          <input
            value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="ör. Ekim devirleri"
            className={formInputClass}
          />
        </QualityField>
        <button type="button" className={primaryButtonClass} disabled={building || selected.size === 0} onClick={() => void build()}>
          <Hammer size={13} aria-hidden /> {building ? 'Kuruluyor…' : `Seti kur (${selected.size})`}
        </button>
      </div>
      <p className="m-0 text-ui-2xs text-fg-subtle">
        Sayfa başına {QUALITY_PAGE_SIZE} konuşma. Set kişisel veri taşır; yalnız yöneticiler indirebilir.
      </p>
    </div>
  );
}
