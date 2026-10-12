'use client';

import { useState } from 'react';
import { maintenanceApi, type MetaPermissionProbeResultDto } from '../../lib/api/omnichannel-maintenance';
import { maintenanceErrorText } from './maintenanceErrors';
import { MaintenanceRow } from './MaintenanceRow';
import { probeCallText } from './metaPermissionProbeRules';
import { secondaryButtonClass } from './formClasses';

// Meta App Review yorum izinleri için gereken "başarılı test çağrısı": yalnız okur, yorum yazmaz.
export function MetaPermissionProbeRow() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<MetaPermissionProbeResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await maintenanceApi.probeMetaPermissions());
    } catch (e) {
      setError(maintenanceErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <MaintenanceRow
      title="Meta izin testi (yorumlar)"
      description="Meta, yorum izinleri için önce başarılı bir API çağrısı ister; bu test yalnız okur, yorum yazmaz. Çalıştırdıktan ~24 saat sonra Meta App Review'da izin düğmeleri açılır."
      error={error}
      actions={(
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={run}>
          {busy ? 'Çalışıyor…' : 'Çalıştır'}
        </button>
      )}
    >
      {result && <ProbeSummary result={result} />}
    </MaintenanceRow>
  );
}

function ProbeSummary({ result }: { result: MetaPermissionProbeResultDto }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 text-ui-xs font-semibold text-fg">{result.summary}</p>
      {result.channels.map((channel) => (
        <div key={channel.channelId} className="flex min-w-0 flex-col gap-0.5">
          <span className="text-ui-xs font-semibold text-fg">{channel.channelName} · {channel.channelType}</span>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {channel.calls.map((call) => (
              <li key={call.call} className="break-words text-ui-xs text-fg-muted">
                <span className="text-fg">{call.permission}</span> · {probeCallText(call)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
