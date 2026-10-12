'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { qualityApi } from '../../lib/api/omnichannel-quality';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EVAL_DATASET_MAX_BYTES, EVAL_DATASET_MAX_MB, parseEvalDataset } from './evalRules';
import { formInputClass, labelClass, secondaryButtonClass } from './formClasses';

// JSON veri seti yükleme (backups/omnichannel-eval/conversations-*.json biçimi). Dosya tarayıcıda önce doğrulanır;
// aynı adla yükleme yeni sürüm açar.
export function QualityDatasetUpload({ onUploaded }: { onUploaded: () => void }) {
  const { notify } = useFeedback();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const select = async (next: File | null) => {
    setFile(null);
    setError(null);
    if (!next) return;
    if (next.size > EVAL_DATASET_MAX_BYTES) {
      setError(`Dosya en fazla ${EVAL_DATASET_MAX_MB} MB olabilir.`);
      return;
    }
    const check = parseEvalDataset(await next.text());
    if (!check.ok) setError(check.error);
    else setFile(next);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const dataset = await qualityApi.uploadDataset(file, name);
      notify.success(`"${dataset.name}" v${dataset.version} yüklendi (${dataset.conversations} konuşma).`);
      setFile(null);
      setName('');
      if (fileInput.current) fileInput.current.value = '';
      onUploaded();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border-soft bg-card p-3">
      <div className="grid min-w-0 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>JSON yükle</span>
          <input
            ref={fileInput} type="file" accept=".json,application/json"
            onChange={(e) => void select(e.target.files?.[0] ?? null)}
            className={`${formInputClass} file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-semibold file:text-fg`}
          />
        </label>
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>Ad (aynı ad = yeni sürüm)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="ör. Ekim 250" className={formInputClass} />
        </label>
        <button type="button" className={secondaryButtonClass} disabled={!file || uploading} onClick={() => void upload()}>
          <Upload size={13} aria-hidden /> {uploading ? 'Yükleniyor…' : 'Yükle'}
        </button>
      </div>
      {error && <p role="alert" className="m-0 text-ui-xs text-danger">{error}</p>}
    </div>
  );
}
