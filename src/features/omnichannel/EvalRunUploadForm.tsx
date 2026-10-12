'use client';

import { useRef } from 'react';
import { FileJson, Play } from 'lucide-react';
import type { BotPipelinesDto } from '../../lib/api/omnichannel-eval';
import type { DatasetSummary } from './evalRules';
import { formInputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import { ServerScoringToggle } from './ServerScoringToggle';
import { useEvalRunUpload } from './useEvalRunUpload';

interface Props {
  pipelines: BotPipelinesDto;
  onStarted: () => Promise<void>;
}

// Yeni değerlendirme koşusu: veri seti (.json) + bot hattı sürümü + isteğe bağlı ad + isteğe bağlı sunucu puanlaması.
export function EvalRunUploadForm({ pipelines, onStarted }: Props) {
  const upload = useEvalRunUpload(onStarted);
  const fileInput = useRef<HTMLInputElement>(null);
  const pipelineVersion = upload.version || pipelines.default;

  const handleStart = async () => {
    if (await upload.start(pipelineVersion) && fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-soft bg-card p-3">
      <div className="grid min-w-0 gap-3 sm:grid-cols-3">
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>Veri seti</span>
          <input
            ref={fileInput} type="file" accept=".json,application/json"
            onChange={(e) => void upload.selectFile(e.target.files?.[0] ?? null)}
            className={`${formInputClass} file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-fg`}
          />
        </label>
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>Bot sürümü</span>
          <select value={pipelineVersion} onChange={(e) => upload.setVersion(e.target.value)} className={formInputClass}>
            {pipelines.versions.map((version) => (
              <option key={version} value={version}>{version === pipelines.default ? `${version} (varsayılan)` : version}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>Ad (isteğe bağlı)</span>
          <input
            value={upload.name} onChange={(e) => upload.setName(e.target.value)} maxLength={120}
            placeholder="ör. FAZ 2 sonrası" className={formInputClass}
          />
        </label>
      </div>

      <ServerScoringToggle checked={upload.serverScoring} disabled={upload.starting} onChange={upload.setServerScoring} />

      {upload.fileError && <p role="alert" className="m-0 text-ui-xs text-danger">{upload.fileError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <DatasetSummaryText dataset={upload.dataset?.summary ?? null} />
        <div className="flex items-center gap-2">
          {upload.dataset && (
            <button type="button" className={secondaryButtonClass} disabled={upload.starting} onClick={() => {
              void upload.selectFile(null);
              if (fileInput.current) fileInput.current.value = '';
            }}>
              Temizle
            </button>
          )}
          <button
            type="button" className={primaryButtonClass} onClick={() => void handleStart()}
            disabled={!upload.dataset || !pipelineVersion || upload.starting}
          >
            <Play size={13} aria-hidden /> {upload.starting ? 'Yükleniyor…' : 'Koşuyu başlat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DatasetSummaryText({ dataset }: { dataset: DatasetSummary | null }) {
  if (!dataset) {
    return <span className="text-ui-xs text-fg-muted">Biçim: {'{version, conversations:[{id, msgs:[{r, x}]}]}'}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-ui-xs text-fg">
      <FileJson size={13} className="text-fg-muted" aria-hidden />
      <strong className="tabular-nums">{dataset.conversations.toLocaleString('tr-TR')}</strong> konuşma ·
      <strong className="tabular-nums">{dataset.botTurns.toLocaleString('tr-TR')}</strong> bot turu
    </span>
  );
}
