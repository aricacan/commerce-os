'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { LEXICON_CANDIDATE_STATUS } from '../../lib/api/omnichannel-lexicon';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { CANDIDATE_STATUS_OPTIONS } from './qualityCenterRules';
import { formInputClass, secondaryButtonClass } from './formClasses';
import { LexiconCandidateRow } from './LexiconCandidateRow';
import { QualityPager } from './QualityPager';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useLexiconCandidates } from './useLexiconCandidates';

// Sözlük › Adaylar: müşterinin yazıp sözlükte bulunamayan kelimeler. Her onay bir anlam ister (toplu onay yok);
// toplu işlem yalnız reddetmedir.
export function LexiconCandidatesPanel() {
  const state = useLexiconCandidates();
  const { notify, confirm } = useFeedback();
  const [searchDraft, setSearchDraft] = useState('');
  const data = state.page.data;
  const pending = state.query.status === LEXICON_CANDIDATE_STATUS.Pending;

  const run = async (action: () => Promise<string>) => {
    try {
      notify.success(await action());
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const rejectSelected = async () => {
    const count = state.selected.size;
    if (!await confirm({ title: `${count} aday reddedilsin mi?`, confirmLabel: 'Reddet', danger: true })) return;
    await run(async () => {
      const result = await state.rejectSelected();
      return `${result.processed} aday reddedildi.`;
    });
  };

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-busy={state.page.loading}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Durum" value={state.query.status} className={`${formInputClass} w-auto`}
          onChange={(e) => state.filter({ status: Number(e.target.value) as typeof state.query.status })}
        >
          {CANDIDATE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <form
          className="flex min-w-48 flex-1 items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); state.filter({ search: searchDraft }); }}
        >
          <input
            type="search" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Kelime ya da cümlede ara" aria-label="Adaylarda ara" className={formInputClass}
          />
          <button type="submit" className={secondaryButtonClass} aria-label="Ara"><Search size={13} aria-hidden /></button>
        </form>
      </div>

      {pending && state.selected.size > 0 && (
        <div role="region" aria-label="Toplu işlem" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-subtle px-3 py-2">
          <span className="text-ui-xs font-semibold text-fg">{state.selected.size} aday seçildi</span>
          <button type="button" className={`${secondaryButtonClass} ml-auto`} onClick={() => void rejectSelected()}>
            <X size={13} aria-hidden /> Seçilenleri reddet
          </button>
        </div>
      )}

      {state.page.updatePending && <UpdatePendingNotice />}
      {state.page.error && <p role="alert" className="m-0 text-ui-xs text-danger">{state.page.error}</p>}
      {state.page.loading && !data && <p className="m-0 text-ui-xs text-fg-muted">Adaylar yükleniyor…</p>}
      {data && data.items.length === 0 && (
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
          {pending
            ? 'Bekleyen aday yok. Botun anlamadığı kelimeler konuşmalardan buraya kendiliğinden düşer.'
            : 'Bu durumda aday yok.'}
        </p>
      )}
      {data && data.items.length > 0 && (
        <ul className={`m-0 flex list-none flex-col gap-2 p-0 ${state.page.loading ? 'opacity-60' : ''}`}>
          {data.items.map((candidate) => (
            <LexiconCandidateRow
              key={candidate.id} candidate={candidate} selected={state.selected.has(candidate.id)}
              onToggle={() => state.toggle(candidate.id)}
              onApprove={async (fields) => {
                await state.approve(candidate.id, fields);
                notify.success('Sözlüğe eklendi; bot bir sonraki turda kullanır.');
              }}
              onReject={() => void run(async () => { await state.reject(candidate.id); return 'Aday reddedildi.'; })}
            />
          ))}
        </ul>
      )}
      {data && (
        <QualityPager page={state.query.page} total={data.total} loading={state.page.loading} label="Aday sayfaları" onChange={state.goToPage} />
      )}
    </section>
  );
}
