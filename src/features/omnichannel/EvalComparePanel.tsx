'use client';

import { useCallback, useState } from 'react';
import { GitCompare } from 'lucide-react';
import type { EvalRunDto } from '../../lib/api/omnichannel-eval';
import { EMPTY_COMPARE_FILTERS, qualityApi, type CompareFilters } from '../../lib/api/omnichannel-quality';
import { EvalCompareFilters } from './EvalCompareFilters';
import { EvalCompareRow } from './EvalCompareRow';
import { evalRunTitle } from './evalRules';
import { formInputClass } from './formClasses';
import { comparableRuns, defaultComparePair } from './qualityCenterRules';
import { QualityPager } from './QualityPager';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useServerResource } from './useServerResource';

interface Props {
  runs: readonly EvalRunDto[];
  onOpenConversation: (conversationId: number) => void;
}

// İki koşunun karşılaştırması: yalnız sonucu farklı turlar, yan yana cevaplar ve boyut farkları. Varsayılan çift: aynı
// listedeki en yeni iki tamamlanmış koşu (taban eski, hedef yeni).
export function EvalComparePanel({ runs, onOpenConversation }: Props) {
  const candidates = comparableRuns(runs);
  const fallback = defaultComparePair(candidates);
  const [pick, setPick] = useState<{ base: number | null; target: number | null }>({ base: null, target: null });
  const baseId = pick.base ?? fallback.base;
  const targetId = pick.target ?? fallback.target;

  if (candidates.length < 2) {
    return (
      <section className="flex flex-col gap-2">
        <Heading />
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
          Karşılaştırma için en az iki koşu gerekir (ör. aynı veri seti v3 ve v4 ile).
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <Heading />
      <div className="grid gap-2 sm:grid-cols-2">
        <RunSelect label="Taban koşu" runs={candidates} value={baseId} onChange={(id) => setPick((p) => ({ ...p, base: id }))} />
        <RunSelect label="Hedef koşu" runs={candidates} value={targetId} onChange={(id) => setPick((p) => ({ ...p, target: id }))} />
      </div>
      {baseId !== null && targetId !== null && baseId !== targetId
        ? <CompareResults key={`${baseId}-${targetId}`} baseId={baseId} targetId={targetId} onOpenConversation={onOpenConversation} />
        : <p className="m-0 text-ui-xs text-fg-muted">İki farklı koşu seçin.</p>}
    </section>
  );
}

function Heading() {
  return (
    <div className="flex items-center gap-2">
      <GitCompare size={14} className="text-fg-muted" aria-hidden />
      <h3 className="m-0 text-ui-sm font-bold text-fg">Koşuları karşılaştır</h3>
    </div>
  );
}

function RunSelect({ label, runs, value, onChange }: {
  label: string; runs: readonly EvalRunDto[]; value: number | null; onChange: (id: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-ui-2xs font-semibold uppercase text-fg-muted">
      {label}
      <select value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} className={formInputClass}>
        {runs.map((run) => <option key={run.id} value={run.id}>{`${evalRunTitle(run)} · ${run.pipelineVersion} · #${run.id}`}</option>)}
      </select>
    </label>
  );
}

function CompareResults({ baseId, targetId, onOpenConversation }: {
  baseId: number; targetId: number; onOpenConversation: (conversationId: number) => void;
}) {
  const [filters, setFilters] = useState<CompareFilters>(EMPTY_COMPARE_FILTERS);
  const [page, setPage] = useState(0);
  const load = useCallback(() => qualityApi.compare(baseId, targetId, filters, page), [baseId, targetId, filters, page]);
  const compare = useServerResource(load, JSON.stringify([filters, page]));
  const data = compare.data;

  const changeFilters = (next: CompareFilters) => { setFilters(next); setPage(0); };

  if (compare.updatePending) return <UpdatePendingNotice />;
  return (
    <div className="flex min-w-0 flex-col gap-3" aria-busy={compare.loading}>
      {compare.error && <p role="alert" className="m-0 text-ui-xs text-danger">{compare.error}</p>}
      {data && (
        <>
          <p className="m-0 text-ui-xs text-fg-muted">
            {data.comparedTurns.toLocaleString('tr-TR')} ortak turdan {data.differentTurns.toLocaleString('tr-TR')} tanesi farklı ·{' '}
            <span className="font-semibold text-success">{data.improved} iyileşti</span> ·{' '}
            <span className="font-semibold text-danger">{data.regressed} kötüleşti</span>
          </p>
          <EvalCompareFilters facets={data.facets} value={filters} onChange={changeFilters} />
          {data.items.length === 0 && (
            <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
              Bu süzgeçlerle farklı tur yok.
            </p>
          )}
          <ul className={`m-0 flex list-none flex-col gap-2 p-0 ${compare.loading ? 'opacity-60' : ''}`}>
            {data.items.map((row) => (
              <EvalCompareRow key={`${row.conversationKey}-${row.turnNumber}`} row={row} onOpenConversation={onOpenConversation} />
            ))}
          </ul>
          <QualityPager page={page} total={data.total} loading={compare.loading} label="Karşılaştırma sayfaları" onChange={setPage} />
        </>
      )}
      {compare.loading && !data && <p className="m-0 text-ui-xs text-fg-muted">Turlar karşılaştırılıyor…</p>}
    </div>
  );
}
