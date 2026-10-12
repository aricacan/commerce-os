'use client';

import { maintenanceApi } from '../../lib/api/omnichannel-maintenance';
import { MaintenanceRow } from './MaintenanceRow';
import { secondaryButtonClass } from './formClasses';
import {
  EMPTY_NAME_BACKFILL_PROGRESS, runNameBackfill, type NameBackfillOutcome, type NameBackfillProgress,
} from './nameBackfillRunner';
import { useBackfillRun, type BackfillRunControls } from './useBackfillRun';

const OUTCOME_TEXT: Record<NameBackfillOutcome, string> = {
  done: 'Bitti: adı bilinmeyen kişi kalmadı.',
  stopped: 'Durduruldu. Tekrar başlatınca baştan tarar; adı dolanlar atlanır.',
  stalled: 'Sunucu ilerlemedi; kalanlar Meta\'dan okunamıyor olabilir.',
};

const runNames = (controls: BackfillRunControls<NameBackfillProgress>) =>
  runNameBackfill({ fetchPage: maintenanceApi.backfillContactNames, ...controls });

// Adı bilinmeyen Facebook/Instagram kişilerine Meta'dan ad doldurur; sayfa sayfa, durdurulabilir.
export function ContactNameBackfillRow() {
  const { running, progress, outcome, error, start, stop } = useBackfillRun(runNames, EMPTY_NAME_BACKFILL_PROGRESS);

  return (
    <MaintenanceRow
      title="Müşteri isimlerini Meta'dan doldur"
      description="Gelen kutusunda yalnız numarayla görünen Facebook/Instagram kişilerine adını yazar; adı bilinen kişinin “İsimsiz müşteri” profilini de adlandırır."
      error={error}
      actions={running ? (
        <button type="button" className={secondaryButtonClass} onClick={stop}>Durdur</button>
      ) : (
        <button type="button" className={secondaryButtonClass} onClick={() => void start()}>Başlat</button>
      )}
    >
      {progress && <ProgressLine progress={progress} running={running} />}
      {progress && <FailureReasons reasons={progress.failureReasons} />}
      {outcome && <p className="m-0 text-ui-xs text-fg-muted">{OUTCOME_TEXT[outcome]}</p>}
    </MaintenanceRow>
  );
}

function ProgressLine({ progress, running }: { progress: NameBackfillProgress; running: boolean }) {
  const remaining = progress.remaining === null ? 'hesaplanıyor' : String(progress.remaining);
  return (
    <p className="m-0 text-ui-xs text-fg" aria-live="polite">
      {running && 'Çalışıyor… '}
      <strong>{progress.named}</strong> isim dolduruldu · {progress.profilesNamed} müşteri profili adlandı
      {' · '}{progress.failed} okunamadı · kalan {remaining}
    </p>
  );
}

// Okunamayanların Meta nedeni: "13 × (#100) ..." — izin/özellik eksikliği mi geçici hata mı ayırt edilsin.
function FailureReasons({ reasons }: { reasons: NameBackfillProgress['failureReasons'] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-ui-xs text-fg-muted">
      {reasons.map((r) => (
        <li key={r.reason} className="min-w-0 break-words">
          <strong className="text-fg">{r.count} ×</strong> {r.reason}
        </li>
      ))}
    </ul>
  );
}
