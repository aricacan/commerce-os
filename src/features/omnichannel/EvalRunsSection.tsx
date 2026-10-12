'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { EvalRunRow } from './EvalRunRow';
import { EvalRunUploadForm } from './EvalRunUploadForm';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useBotPipelines } from './useBotPipelines';
import type { EvalRunsState } from './useEvalRuns';

interface Props {
  runs: EvalRunsState & { reload: () => Promise<void> };
}

// Kalite Merkezi › Koşular › "Değerlendirme koşuları" (FAZ 2): dışa aktarılmış konuşma veri seti seçilen bot sürümünde
// tekrar oynatılır; sunucu hızlı puan verir, asıl karşılaştırma dış yargıç paketiyle yapılır. Koşu listesi üst
// bileşenden gelir (karşılaştırma seçicisi aynı listeyi kullanır, ikinci istek atılmaz).
export function EvalRunsSection({ runs }: Props) {
  const pipelines = useBotPipelines();
  const [maskPii, setMaskPii] = useState(true);
  const updatePending = runs.updatePending || pipelines.updatePending;
  const versions = pipelines.data?.versions ?? [];

  return (
    <section className="flex min-w-0 flex-col gap-2" aria-busy={runs.loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical size={14} className="text-fg-muted" aria-hidden />
          <h3 className="m-0 text-ui-sm font-bold text-fg">Değerlendirme koşuları</h3>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-ui-xs text-fg-muted">
          <input type="checkbox" checked={maskPii} onChange={(e) => setMaskPii(e.target.checked)} />
          Yargıç paketinde kişisel veriyi maskele
        </label>
      </div>
      <p className="m-0 text-ui-xs text-fg-muted">
        Veri setindeki her bot turu seçilen sürümde tekrar oynatılır; müşteriye hiçbir şey gönderilmez.
      </p>

      {updatePending ? <UpdatePendingNotice /> : (
        <>
          {pipelines.error && <p className="m-0 text-ui-xs text-danger">{pipelines.error}</p>}
          {pipelines.data && versions.length > 0 && <EvalRunUploadForm pipelines={pipelines.data} onStarted={runs.reload} />}
          {runs.error && <p className="m-0 text-ui-xs text-danger">{runs.error}</p>}
          {runs.loading && <p className="m-0 text-ui-xs text-fg-muted">Koşular yükleniyor…</p>}
          {!runs.loading && !runs.error && runs.runs.length === 0 && (
            <p className="m-0 text-ui-xs text-fg-muted">Henüz değerlendirme koşusu yok. Bir veri seti yükleyerek başlayın.</p>
          )}
          {runs.runs.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {runs.runs.map((run) => <EvalRunRow key={run.id} run={run} maskPii={maskPii} onChanged={runs.reload} />)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
