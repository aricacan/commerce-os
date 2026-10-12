'use client';

import { useState } from 'react';
import { maintenanceApi, type AutomationEchoRepairResultDto } from '../../lib/api/omnichannel-maintenance';
import { useFeedback } from '../shared/Feedback';
import { maintenanceErrorText } from './maintenanceErrors';
import { MaintenanceRow } from './MaintenanceRow';
import { secondaryButtonClass } from './formClasses';

// Önizlemede bu kadar konuşma numarası listelenir; fazlası "+N" ile özetlenir.
const PREVIEW_ID_LIMIT = 12;

// Meta otomatik cevabının (son 24 saat) yanlışlıkla kapattığı botları bulur: önce önizleme, sonra onaylı onarım.
export function AutomationEchoRepairRow() {
  const { confirm, notify } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AutomationEchoRepairResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (dryRun: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const response = await maintenanceApi.repairAutomationEchoes(dryRun);
      setResult(response);
      if (!dryRun) notify.success(`${response.repairedConversationIds.length} konuşmada bot yeniden açıldı.`);
    } catch (e) {
      setError(maintenanceErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  const handleRepair = async () => {
    const ok = await confirm({
      title: 'Botlar yeniden açılsın mı?',
      body: 'Müşteriye mesaj gitmez, yalnız bot yeniden açılır.',
      confirmLabel: 'Botları yeniden aç',
    });
    if (ok) await run(false);
  };

  const canRepair = result?.dryRun === true && result.repairedConversationIds.length > 0;

  return (
    <MaintenanceRow
      title="Otomatik cevabın kapattığı botlar"
      description="Meta'nın otomatik cevabı temsilci yazmış gibi görünüp botu kapatmış olabilir (son 24 saat)."
      error={error}
      actions={(
        <>
          <button type="button" className={secondaryButtonClass} disabled={busy} onClick={() => run(true)}>
            Önizle
          </button>
          {canRepair && (
            <button type="button" className={secondaryButtonClass} disabled={busy} onClick={handleRepair}>
              Botları yeniden aç
            </button>
          )}
        </>
      )}
    >
      {result && <RepairSummary result={result} />}
    </MaintenanceRow>
  );
}

function RepairSummary({ result }: { result: AutomationEchoRepairResultDto }) {
  const ids = result.repairedConversationIds;
  if (ids.length === 0) return <p className="m-0 text-ui-xs text-fg-muted">Otomatik cevap yüzünden kapanmış bot yok.</p>;

  const shown = ids.slice(0, PREVIEW_ID_LIMIT).map((id) => `#${id}`).join(', ');
  const extra = ids.length > PREVIEW_ID_LIMIT ? ` +${ids.length - PREVIEW_ID_LIMIT}` : '';
  const [opened, marked] = result.dryRun ? ['açılacak', 'işaretlenecek'] : ['açıldı', 'işaretlendi'];
  return (
    <p className="m-0 break-words text-ui-xs text-fg">
      <strong>{ids.length} konuşmada bot {opened}</strong>, {result.reclassifiedMessageCount} mesaj otomatik cevap
      olarak {marked}: <span className="text-fg-muted">{shown}{extra}</span>
    </p>
  );
}
