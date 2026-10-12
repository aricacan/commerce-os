'use client';

import { useState } from 'react';
import { omnichannelEvalApi } from '../../lib/api/omnichannel-eval';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EVAL_DATASET_MAX_BYTES, EVAL_DATASET_MAX_MB, parseEvalDataset, type DatasetSummary } from './evalRules';

interface SelectedDataset {
  file: File;
  summary: DatasetSummary;
}

// Koşu başlatma formunun durumu: dosya tarayıcıda okunup biçimi doğrulanır, sayılar yüklemeden önce gösterilir.
export function useEvalRunUpload(onStarted: () => Promise<void>) {
  const { notify } = useFeedback();
  const [dataset, setDataset] = useState<SelectedDataset | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  // Sunucu puanlaması ek token harcar: her koşuda kullanıcı açıkça seçer, başarılı başlatmadan sonra kapanır.
  const [serverScoring, setServerScoring] = useState(false);
  const [starting, setStarting] = useState(false);

  const selectFile = async (file: File | null) => {
    setDataset(null);
    setFileError(null);
    if (!file) return;
    if (file.size > EVAL_DATASET_MAX_BYTES) {
      setFileError(`Dosya ${EVAL_DATASET_MAX_MB} MB'tan büyük.`);
      return;
    }
    const check = parseEvalDataset(await file.text());
    if (check.ok) setDataset({ file, summary: check.summary });
    else setFileError(check.error);
  };

  const start = async (pipelineVersion: string): Promise<boolean> => {
    if (!dataset || !pipelineVersion) return false;
    setStarting(true);
    try {
      await omnichannelEvalApi.startEvalRun({ file: dataset.file, pipelineVersion, name, serverScoring });
      notify.success('Değerlendirme koşusu sıraya alındı.');
      setDataset(null);
      setName('');
      setServerScoring(false);
      await onStarted();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    } finally {
      setStarting(false);
    }
  };

  return {
    dataset, fileError, name, setName, version, setVersion, serverScoring, setServerScoring, starting, selectFile, start,
  };
}
