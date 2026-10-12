'use client';

import { useEffect, useState } from 'react';
import { goldApi, type GoldRunDetailDto, type GoldRunResultDto } from '../../lib/api/omnichannel-gold';
import { describeError } from '../../lib/errors';
import { GoldScoreDelta } from './GoldScoreDelta';
import { formatGoldScore } from './goldSetRules';

// Bir koşunun senaryo senaryo raporu: referans cevap ↔ botun cevabı, puan ve önceki koşuya göre fark (P35).
// Sunucu en kötüyü en üste sıralar.
export function GoldRunDetail({ runId }: { runId: number }) {
  const [detail, setDetail] = useState<GoldRunDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    goldApi.getRun(runId)
      .then((result) => { if (!cancelled) { setDetail(result); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) { setDetail(null); setError(describeError(e)); } });
    return () => { cancelled = true; };
  }, [runId]);

  if (error) return <p className="m-0 text-ui-xs text-danger">{error}</p>;
  if (!detail) return <p className="m-0 text-ui-xs text-fg-muted">Koşu yükleniyor…</p>;

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Koşu sonuçları">
      {detail.results.map((result) => <ResultCard key={result.scenarioId} result={result} />)}
    </ul>
  );
}

function ResultCard({ result }: { result: GoldRunResultDto }) {
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-lg border border-border-soft bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-ui-sm font-semibold text-fg">{result.scenarioTitle}</span>
        <span className="flex shrink-0 items-center gap-2 text-ui-sm">
          <span className="font-bold tabular-nums text-fg">
            {result.judgeFailed ? 'Puansız' : formatGoldScore(result.score)}
          </span>
          <GoldScoreDelta delta={result.scoreDelta} />
        </span>
      </div>

      {!result.deterministicPassed && result.deterministicNotes && (
        <p className="m-0 text-ui-xs text-danger">{result.deterministicNotes}</p>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        <ReplyBox label="Referans cevap" text={result.referenceReply} />
        <ReplyBox label="Botun cevabı" text={result.actualReply} />
      </div>

      {result.diffNote && <p className="m-0 text-ui-xs text-fg-muted">{result.diffNote}</p>}
    </li>
  );
}

function ReplyBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded bg-bg-subtle p-2">
      <span className="text-[10.5px] font-semibold uppercase text-fg-muted">{label}</span>
      <p className="m-0 whitespace-pre-wrap break-words text-ui-xs text-fg">{text || '(cevap yok)'}</p>
    </div>
  );
}
