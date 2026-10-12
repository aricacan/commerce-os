'use client';

import { useMemo, useState } from 'react';
import { Bot, RotateCcw } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';
import { focusRing, motionFast } from '../shared/design';
import { ConversationListPager } from './ConversationListPager';
import { HandoffBulkBar } from './HandoffBulkBar';
import { HandoffCatchupDialog } from './HandoffCatchupDialog';
import { HandoffQueueFilters } from './HandoffQueueFilters';
import { HandoffResolveDialog } from './HandoffResolveDialog';
import { HandoffTicketItem } from './HandoffTicketItem';
import { SettingsLink } from './SettingsLink';
import { useAssignableAgents } from './useAssignableAgents';
import { useHandoffQueue } from './useHandoffQueue';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';
import { useNowTick } from './useNowTick';
import { useOmnichannelCountries } from './useOmnichannelCountries';

interface Props {
  // Kuyruktan sohbete atlama — gelen kutusu sekmesine geçer.
  onOpenConversation?: (conversationId: number) => void;
}

// Devirler v2 (FAZ 7): botun insana bıraktığı işler — sayfalı, süzülebilir, canlı. Sıra sunucudan gelir (öncelik
// puanı); seçilen kayıtlar toplu atanır ya da sonuçlandırılır. Sonuçlandırmada sonuç (çözüldü / bota geri ver /
// kapat) zorunludur.
export function HandoffQueueTab({ onOpenConversation }: Props) {
  const queue = useHandoffQueue();
  const agents = useAssignableAgents();
  const { countries } = useOmnichannelCountries();
  const myId = useAuthStore((state) => state.user?.id ?? null);
  const now = useNowTick();
  const canCatchup = useIsOmnichannelAdmin();
  const [catchupOpen, setCatchupOpen] = useState(false);
  // Sonuçlandırılacak kayıtlar: tek kayıt ya da seçim.
  const [resolving, setResolving] = useState<number[] | null>(null);
  const countryCodes = useMemo(() => countries.map((c) => c.code).sort(), [countries]);
  const { data } = queue;

  const confirmResolve = async (outcome: Parameters<typeof queue.resolve>[1], note: string) => {
    if (resolving && await queue.resolve(resolving, outcome, note)) setResolving(null);
  };

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
      <header className="flex min-w-0 flex-wrap items-center gap-2">
        <Bot size={16} className="text-fg-muted" aria-hidden />
        <h2 className="m-0 text-ui-md font-bold text-fg">Devirler</h2>
        <span className="text-ui-sm tabular-nums text-fg-muted">{data.legacy ? data.items.length : data.total}</span>
        <div className="flex-1" />
        {canCatchup && (
          <button type="button" onClick={() => setCatchupOpen(true)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-ui-xs font-semibold text-fg hover:bg-bg-subtle ${motionFast} ${focusRing}`}>
            <RotateCcw size={13} aria-hidden /> Botla devam ettir
          </button>
        )}
      </header>

      <p className="m-0 max-w-3xl text-ui-xs text-fg-muted">
        Bot yalnız gerçekten devam edemediğinde devreder. Müşteriye talep numarası ve beklenen dönüş süresi otomatik
        gider; süre mesai saatine göre işler.
      </p>
      {canCatchup && <SettingsLink target={{ tab: 'account', sub: 'sentemails' }}>Devir e-postaları kime ne zaman gitti?</SettingsLink>}

      <HandoffQueueFilters filter={queue.filter} onChange={queue.setFilter} countries={countryCodes} />

      <HandoffBulkBar
        count={queue.selected.size}
        agents={agents}
        busy={queue.busy}
        onAssign={(assignee) => void queue.assign([...queue.selected], assignee)}
        onResolve={() => setResolving([...queue.selected])}
        onClear={queue.clearSelection}
      />

      {queue.error && <p role="alert" className="m-0 rounded-lg bg-danger-soft p-3 text-ui-sm text-danger">{queue.error}</p>}

      <div className="flex min-w-0 flex-col gap-3">
        {!queue.loading && data.items.length === 0 && !queue.error && (
          <div className="rounded-xl border border-border-soft bg-card p-8 text-center text-ui-sm text-fg-muted">
            Bu süzgeçte bekleyen devir yok.
          </div>
        )}
        {data.items.map((ticket) => (
          <HandoffTicketItem
            key={ticket.id}
            ticket={ticket}
            agents={agents}
            myId={myId}
            now={now}
            selected={queue.selected.has(ticket.id)}
            busy={queue.busy}
            onToggleSelected={() => queue.toggleSelected(ticket.id)}
            onOpen={onOpenConversation}
            onTakeOver={() => void queue.takeOver(ticket.id)}
            onAssign={(assignee) => void queue.assign([ticket.id], assignee)}
            onResolve={() => setResolving([ticket.id])}
          />
        ))}
      </div>

      {!data.legacy && (
        <ConversationListPager
          page={queue.page}
          pageSize={queue.pageSize}
          loadedCount={data.items.length}
          total={data.total}
          loading={queue.loading}
          onPageChange={queue.setPage}
          onPageSizeChange={queue.setPageSize}
        />
      )}

      {resolving && (
        <HandoffResolveDialog count={resolving.length} busy={queue.busy}
          onConfirm={(outcome, note) => void confirmResolve(outcome, note)} onClose={() => setResolving(null)} />
      )}
      {catchupOpen && <HandoffCatchupDialog onClose={() => setCatchupOpen(false)} onDone={() => void queue.reload()} />}
    </div>
  );
}
