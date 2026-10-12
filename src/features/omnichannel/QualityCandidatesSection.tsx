'use client';

import { useState } from 'react';
import { Inbox, RefreshCw, Search } from 'lucide-react';
import { QUALITY_CANDIDATE_STATUS, type QualityCandidateDto } from '../../lib/api/omnichannel-quality';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { formInputClass, secondaryButtonClass } from './formClasses';
import { QualityApproveDialog } from './QualityApproveDialog';
import { QualityBulkBar } from './QualityBulkBar';
import { QualityCandidateCard } from './QualityCandidateCard';
import { CANDIDATE_STATUS_OPTIONS, SIGNAL_OPTIONS } from './qualityCenterRules';
import { QualityPager } from './QualityPager';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useQualityCandidates } from './useQualityCandidates';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

const chipClass = (active: boolean) =>
  `inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-ui-xs font-semibold transition-colors ${
    active ? 'border-fg bg-fg text-bg' : 'border-border-soft text-fg-muted hover:bg-bg-subtle hover:text-fg'
  }`;

// Kalite Merkezi › Adaylar: devir, "Yanlış" işareti, temsilci yardımcısı cevabı, yedek/hatalı tur ve düşük denetim
// puanından otomatik düşen turlar (tur başına tek aday). Onay altın senaryo üretir; isteğe bağlı onaylı cevap.
export function QualityCandidatesSection({ onOpenConversation }: Props) {
  const state = useQualityCandidates();
  const { notify } = useFeedback();
  const [searchDraft, setSearchDraft] = useState('');
  const [approving, setApproving] = useState<QualityCandidateDto | null>(null);
  const [collecting, setCollecting] = useState(false);
  const data = state.page.data;
  const pending = state.query.status === QUALITY_CANDIDATE_STATUS.Pending;

  const collect = async () => {
    setCollecting(true);
    try {
      const result = await state.collect();
      notify.success(`${result.created} yeni aday, ${result.updated} güncellenen aday.`);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setCollecting(false);
    }
  };

  const reject = async (id: number) => {
    try {
      await state.reject(id);
      notify.success('Aday reddedildi.');
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-busy={state.page.loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox size={14} className="text-fg-muted" aria-hidden />
          <h3 className="m-0 text-ui-sm font-bold text-fg">Aday kutusu</h3>
        </div>
        <button type="button" className={secondaryButtonClass} disabled={collecting} onClick={() => void collect()}>
          <RefreshCw size={13} aria-hidden /> {collecting ? 'Toplanıyor…' : 'Şimdi topla'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Durum" value={state.query.status} onChange={(e) => state.filter({ status: Number(e.target.value) })}
          className={`${formInputClass} w-auto`}
        >
          {CANDIDATE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <form
          className="flex min-w-48 flex-1 items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); state.filter({ search: searchDraft }); }}
        >
          <input
            type="search" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Müşteri, bot ya da sebep metninde ara" aria-label="Adaylarda ara" className={formInputClass}
          />
          <button type="submit" className={secondaryButtonClass} aria-label="Ara"><Search size={13} aria-hidden /></button>
        </form>
      </div>

      <div role="group" aria-label="Sinyal süzgeci" className="flex flex-wrap gap-1.5">
        <button type="button" className={chipClass(state.query.signal === null)} onClick={() => state.filter({ signal: null })}>
          Tümü
        </button>
        {SIGNAL_OPTIONS.map((option) => {
          const count = data?.signalCounts.find((c) => c.signal === option.signal)?.count ?? 0;
          return (
            <button
              key={option.signal} type="button" className={chipClass(state.query.signal === option.signal)}
              onClick={() => state.filter({ signal: option.signal })}
            >
              {option.label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {pending && state.selected.size > 0 && <QualityBulkBar count={state.selected.size} onRun={state.bulk} />}

      {state.page.updatePending && <UpdatePendingNotice />}
      {state.page.error && <p role="alert" className="m-0 text-ui-xs text-danger">{state.page.error}</p>}
      {state.page.loading && !data && <p className="m-0 text-ui-xs text-fg-muted">Adaylar yükleniyor…</p>}
      {data && data.items.length === 0 && (
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
          {pending ? 'Bekleyen aday yok. Devirler ve "Yanlış" işaretleri buraya kendiliğinden düşer.' : 'Bu durumda aday yok.'}
        </p>
      )}
      {data && data.items.length > 0 && (
        <ul className={`m-0 flex list-none flex-col gap-2 p-0 ${state.page.loading ? 'opacity-60' : ''}`}>
          {data.items.map((candidate) => (
            <QualityCandidateCard
              key={candidate.id} candidate={candidate} selected={state.selected.has(candidate.id)}
              onToggle={() => state.toggle(candidate.id)} onApprove={() => setApproving(candidate)}
              onReject={() => void reject(candidate.id)} onOpenConversation={onOpenConversation}
            />
          ))}
        </ul>
      )}
      {data && (
        <QualityPager page={state.query.page} total={data.total} loading={state.page.loading} label="Aday sayfaları" onChange={state.goToPage} />
      )}

      {approving && (
        <QualityApproveDialog
          candidate={approving} onClose={() => setApproving(null)}
          onApprove={async (input) => {
            await state.approve(approving.id, input);
            notify.success('Aday onaylandı; senaryo oluşturuldu.');
            setApproving(null);
          }}
        />
      )}
    </section>
  );
}
