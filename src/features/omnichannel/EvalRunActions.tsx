'use client';

import { useState } from 'react';
import { Download, Gavel, Play, Square, Trash2 } from 'lucide-react';
import { omnichannelEvalApi, type EvalRunDto } from '../../lib/api/omnichannel-eval';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { evalRunTitle, isEvalRunActive, isEvalRunResumable } from './evalRules';
import { secondaryButtonClass } from './formClasses';
import { saveBlob } from './saveBlob';

interface Props {
  run: EvalRunDto;
  maskPii: boolean;
  onChanged: () => Promise<void>;
}

// Koşu eylemleri: sonuçları ve dış yargıç paketini indir, koşarken iptal, onayla sil (veri seti ve sonuçlar da gider).
export function EvalRunActions({ run, maskPii, onChanged }: Props) {
  const { notify, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  const active = isEvalRunActive(run);

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
    const { fileName, blob } = await omnichannelEvalApi.downloadEvalResults(run.id);
    saveBlob(blob, fileName);
  });

  const downloadJudgePackage = () => perform(async () => {
    const { fileName, blob } = await omnichannelEvalApi.downloadJudgePackage(run.id, maskPii);
    saveBlob(blob, fileName);
  });

  const cancel = () => perform(async () => {
    await omnichannelEvalApi.cancelEvalRun(run.id);
    await onChanged();
  }, 'Koşu iptal edildi.');

  const resume = () => perform(async () => {
    await omnichannelEvalApi.resumeEvalRun(run.id);
    await onChanged();
  }, 'Koşu kaldığı yerden sürüyor.');

  const remove = async () => {
    const ok = await confirm({
      title: `"${evalRunTitle(run)}" silinsin mi?`,
      body: 'Yüklenen veri seti ve tüm sonuçlar kalıcı olarak silinir.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    await perform(async () => {
      await omnichannelEvalApi.deleteEvalRun(run.id);
      await onChanged();
    }, 'Koşu silindi.');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {run.turnsDone > 0 && (
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void download()}>
          <Download size={13} aria-hidden /> Sonuçlar
        </button>
      )}
      {run.turnsDone > 0 && (
        <button
          type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void downloadJudgePackage()}
          title={maskPii ? 'Kişisel veri maskelenmiş paket' : 'Ham metinli paket (yalnız yönetici)'}
        >
          <Gavel size={13} aria-hidden /> Yargıç paketi
        </button>
      )}
      {active ? (
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void cancel()}>
          <Square size={13} aria-hidden /> İptal et
        </button>
      ) : (
        <>
          {isEvalRunResumable(run) && (
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => void resume()}>
              <Play size={13} aria-hidden /> Sürdür
            </button>
          )}
          <button
            type="button" aria-label="Koşuyu sil" title="Koşuyu sil" className={secondaryButtonClass}
            disabled={busy} onClick={() => void remove()}
          >
            <Trash2 size={13} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
