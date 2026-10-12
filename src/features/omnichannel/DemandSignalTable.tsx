import { PackageX } from 'lucide-react';
import type { DemandSignalGroupDto } from '../../lib/api/omnichannel-demand';
import { formatDate } from '../../lib/format';
import { DEMAND_OUTCOME_LABELS, categoryLabel, vehicleLabel, yearsLabel } from './demandSignalRules';

interface Props {
  groups: DemandSignalGroupDto[];
  loading: boolean;
  onOpenConversation: (conversationId: number) => void;
}

const ROW_GRID =
  'md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_4rem_4.5rem_minmax(0,1.1fr)_6rem_minmax(0,1fr)] md:items-center md:gap-3';
const HEADERS = ['Araç', 'Ürün türü', 'Talep', 'Müşteri', 'Sonuç', 'Son talep', 'Örnek konuşmalar'];

function GroupRow({ group, onOpenConversation }: { group: DemandSignalGroupDto; onOpenConversation: Props['onOpenConversation'] }) {
  const years = yearsLabel(group);
  return (
    <li className={`flex flex-col gap-1 px-3 py-2.5 text-xs ${ROW_GRID}`}>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold text-[var(--fg)]">{vehicleLabel(group)}</span>
        {(years || group.countries.length > 0) && (
          <span className="truncate text-[10.5px] text-[var(--fg-muted)]">
            {[years, group.countries.join(', ')].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      <span className="truncate text-[var(--fg)]">{categoryLabel(group)}</span>
      <span className="font-bold tabular-nums text-[var(--fg)]">{group.count}</span>
      <span className="tabular-nums text-[var(--fg-muted)]">{group.uniqueCustomers}</span>
      <span className="flex flex-wrap gap-1">
        {group.outcomes.map((outcome) => (
          <span key={outcome}
            className="inline-flex rounded-[4px] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fg)]">
            {DEMAND_OUTCOME_LABELS[outcome]}
          </span>
        ))}
      </span>
      <span className="text-[var(--fg-muted)]">{formatDate(group.lastAt)}</span>
      <span className="flex flex-wrap gap-1">
        {group.samples.map((sample) => (
          <button key={sample.conversationId} type="button" title={sample.query}
            onClick={() => onOpenConversation(sample.conversationId)}
            className="cursor-pointer rounded-[4px] border border-[var(--border)] px-1.5 py-0.5 text-[10.5px] text-[var(--fg)] hover:bg-[var(--bg-subtle)]">
            #{sample.conversationId}
          </button>
        ))}
      </span>
    </li>
  );
}

// Araç + ürün türü bazında talep listesi; en çok sorulan en üstte (sıra sunucudan gelir).
export function DemandSignalTable({ groups, loading, onOpenConversation }: Props) {
  return (
    <div className="overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
      <div className={`hidden border-b border-[var(--border-soft)] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] ${ROW_GRID}`}>
        {HEADERS.map((header) => <span key={header}>{header}</span>)}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-3 py-10 text-[var(--fg-muted)]">
          <PackageX size={20} aria-hidden />
          <p>Bu dönemde bizde olmayan bir ürün sorulmadı.</p>
        </div>
      ) : (
        <ul className={`m-0 list-none divide-y divide-[var(--border-soft)] p-0 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {groups.map((group, index) => (
            <GroupRow key={`${index}|${vehicleLabel(group)}|${categoryLabel(group)}`} group={group}
              onOpenConversation={onOpenConversation} />
          ))}
        </ul>
      )}
    </div>
  );
}
