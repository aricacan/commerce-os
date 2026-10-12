'use client';

import { maintenanceApi } from '../../lib/api/omnichannel-maintenance';
import type { BackfillOutcome } from './cursorBackfill';
import {
  EMPTY_CUSTOMER_BACKFILL_PROGRESS, runCustomer360Backfill, type Customer360BackfillProgress,
} from './customer360BackfillRunner';
import { MaintenanceRow } from './MaintenanceRow';
import { secondaryButtonClass } from './formClasses';
import { useBackfillRun, type BackfillRunControls } from './useBackfillRun';

const OUTCOME_TEXT: Record<BackfillOutcome, string> = {
  done: 'Bitti: tüm geçmiş konuşmalar müşteri kayıtlarına işlendi.',
  stopped: 'Durduruldu. Tekrar başlatınca baştan tarar; işlenmiş kayıtlar kopyalanmaz.',
  stalled: 'Sunucu ilerlemedi; birkaç dakika sonra yeniden deneyin.',
};

const runCustomers = (controls: BackfillRunControls<Customer360BackfillProgress>) =>
  runCustomer360Backfill({ fetchPage: maintenanceApi.backfillCustomer360, ...controls });

// Customer 360 geçmiş veri doldurma: eski mesajlardaki telefon/e-posta, sohbet siparişleri ve konuşma başlangıçları
// müşteri profiline işlenir. Sayfa sayfa, durdurulabilir; tekrar çalıştırmak kopya üretmez.
export function Customer360BackfillRow() {
  const { running, progress, outcome, error, start, stop } =
    useBackfillRun(runCustomers, EMPTY_CUSTOMER_BACKFILL_PROGRESS);

  return (
    <MaintenanceRow
      title="Müşteri kayıtlarını geçmişten doldur"
      description="Geçmiş konuşmalardaki telefon/e-posta, sohbet siparişleri ve zaman çizelgesi olaylarını müşteri profillerine işler; aynı kişiye ait profilleri birleştirir."
      error={error}
      actions={running ? (
        <button type="button" className={secondaryButtonClass} onClick={stop}>Durdur</button>
      ) : (
        <button type="button" className={secondaryButtonClass} onClick={() => void start()}>Başlat</button>
      )}
    >
      {progress && <ProgressLine progress={progress} running={running} />}
      {outcome && <p className="m-0 text-ui-xs text-fg-muted">{OUTCOME_TEXT[outcome]}</p>}
    </MaintenanceRow>
  );
}

function ProgressLine({ progress, running }: { progress: Customer360BackfillProgress; running: boolean }) {
  const remaining = progress.remaining === null ? 'hesaplanıyor' : String(progress.remaining);
  return (
    <p className="m-0 text-ui-xs tabular-nums text-fg" aria-live="polite">
      {running && 'Çalışıyor… '}
      <strong>{progress.processed}</strong> konuşma işlendi · {progress.merged} profil birleşti
      {' · '}{progress.orders} sipariş · {progress.events} olay · kalan {remaining}
    </p>
  );
}
