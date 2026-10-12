'use client';

import { useState } from 'react';
import { CheckCircle2, PlugZap, XCircle } from 'lucide-react';
import {
  omnichannelApi, type EmailConnectionTestRequest, type EmailConnectionTestResultDto, type EmailProbeResultDto,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { secondaryButtonClass } from './formClasses';

interface Props {
  /** Adres ya da zorunlu sunucu alanı eksikse null: düğme pasif kalır. */
  request: EmailConnectionTestRequest | null;
}

interface TestOutcome {
  /** Sonucun hangi girdiye ait olduğu; girdi değişince eski sonuç gösterilmez. */
  signature: string;
  result: EmailConnectionTestResultDto | null;
  error: string | null;
}

function ProbeLine({ label, probe }: { label: string; probe: EmailProbeResultDto }) {
  const Icon = probe.ok ? CheckCircle2 : XCircle;
  return (
    <div className={`flex items-start gap-1.5 text-xs ${probe.ok ? 'text-[var(--fg)]' : 'text-rose-500'}`}>
      <Icon size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span><strong>{label}:</strong> {probe.ok ? 'Bağlandı ve giriş yapıldı.' : probe.error}</span>
    </div>
  );
}

// "Bağlantıyı test et": kanal kaydedilmeden IMAP ve SMTP'yi ayrı ayrı dener. Hiçbir şey kaydedilmez/gönderilmez;
// parola yalnız istekte gider, sonuçta ve ekranda yer almaz.
export function EmailConnectionTest({ request }: Props) {
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const signature = JSON.stringify(request);
  const current = outcome?.signature === signature ? outcome : null;

  const runTest = async () => {
    if (!request) return;
    setBusy(true);
    try {
      setOutcome({ signature, result: await omnichannelApi.testEmailConnection(request), error: null });
    } catch (e) {
      setOutcome({ signature, result: null, error: describeError(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => void runTest()} disabled={!request || busy} className={`${secondaryButtonClass} self-start`}>
        <PlugZap size={13} /> {busy ? 'Deneniyor…' : 'Bağlantıyı test et'}
      </button>
      {current?.result && (
        <>
          <ProbeLine label="IMAP (gelen)" probe={current.result.imap} />
          <ProbeLine label="SMTP (giden)" probe={current.result.smtp} />
        </>
      )}
      {current?.error && <div className="text-xs text-rose-500">{current.error}</div>}
    </div>
  );
}
