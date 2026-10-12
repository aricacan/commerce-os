'use client';

import { useState } from 'react';
import { Download, Play, Trash2 } from 'lucide-react';
import type { BotPipelinesDto } from '../../lib/api/omnichannel-eval';
import { qualityApi, type QualityDatasetDto } from '../../lib/api/omnichannel-quality';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { formatTraceTime } from './botTraceRules';
import { formInputClass, secondaryButtonClass } from './formClasses';
import { datasetSourceLabel, datasetTitle } from './qualityCenterRules';
import { saveBlob } from './saveBlob';
import { ServerScoringToggle } from './ServerScoringToggle';

interface Props {
  dataset: QualityDatasetDto;
  pipelines: BotPipelinesDto | null;
  onChanged: () => void;
}

const count = (value: number) => value.toLocaleString('tr-TR');

// Tek veri seti: ad + sürüm, kaynak, sayılar; indir, seçilen bot sürümüyle (isteğe bağlı sunucu puanlamasıyla)
// koşuya gönder, sil.
export function QualityDatasetRow({ dataset, pipelines, onChanged }: Props) {
  const { notify, confirm } = useFeedback();
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [serverScoring, setServerScoring] = useState(false);
  const pipelineVersion = version || pipelines?.effectiveDefault || '';

  const perform = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await action();
      if (success) notify.success(success);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const download = () => perform(async () => {
    const { fileName, blob } = await qualityApi.downloadDataset(dataset.id);
    saveBlob(blob, fileName);
  });

  const startRun = () => perform(async () => {
    await qualityApi.startDatasetRun(dataset.id, pipelineVersion, serverScoring);
    setServerScoring(false);
  }, `Koşu kuyruğa alındı (${pipelineVersion}). Koşular bölümünden izleyin.`);

  const remove = async () => {
    const ok = await confirm({
      title: `"${datasetTitle(dataset)}" silinsin mi?`, body: 'Veri seti kalıcı olarak silinir; koşular etkilenmez.',
      confirmLabel: 'Sil', danger: true,
    });
    if (ok) await perform(async () => { await qualityApi.deleteDataset(dataset.id); onChanged(); }, 'Veri seti silindi.');
  };

  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border-soft bg-card p-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-ui-sm font-bold text-fg">{datasetTitle(dataset)}</span>
        <span className="text-ui-2xs text-fg-subtle">
          {datasetSourceLabel(dataset.source)} · {count(dataset.conversations)} konuşma · {count(dataset.turns)} bot turu ·{' '}
          {formatTraceTime(dataset.createdAt)}{dataset.createdByName ? ` · ${dataset.createdByName}` : ''}
        </span>
        {dataset.description && <span className="text-ui-2xs text-fg-muted">{dataset.description}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pipelines && pipelines.versions.length > 0 && (
          <>
            <select
              aria-label="Bot sürümü" value={pipelineVersion} onChange={(e) => setVersion(e.target.value)}
              className={`${formInputClass} w-auto`}
            >
              {pipelines.versions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <ServerScoringToggle checked={serverScoring} disabled={busy} onChange={setServerScoring} />
            <button type="button" className={secondaryButtonClass} disabled={busy || !pipelineVersion} onClick={() => void startRun()}>
              <Play size={13} aria-hidden /> Koştur
            </button>
          </>
        )}
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void download()}>
          <Download size={13} aria-hidden /> İndir
        </button>
        <button
          type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void remove()}
          aria-label="Veri setini sil" title="Veri setini sil"
        >
          <Trash2 size={13} aria-hidden />
        </button>
      </div>
    </li>
  );
}
