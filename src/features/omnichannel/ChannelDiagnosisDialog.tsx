'use client';

import { formatDateTime } from '@/lib/format';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { X, RefreshCw, Stethoscope } from 'lucide-react';
import {
  omnichannelApi, CHANNEL_VERDICT, DIAGNOSTIC_STATUS,
  type ChannelDiagnosisDto, type ChannelVerdict,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { DiagnosticCheckCard } from './DiagnosticCheckCard';
import { OmniDialogShell } from './OmniDialogShell';

const VERDICT_STYLE: Record<ChannelVerdict, string> = {
  [CHANNEL_VERDICT.Healthy]:  'border-emerald-500/40 bg-emerald-500/10',
  [CHANNEL_VERDICT.Degraded]: 'border-amber-500/40 bg-amber-500/10',
  [CHANNEL_VERDICT.Broken]:   'border-rose-500/40 bg-rose-500/10',
};

// Kanal teşhisi: "bağlı mı?" yerine "neden çalışmıyor ve ne yapmalıyım?" sorusunu
// sade Türkçe cevaplar. Kontrolleri backend yapar; bu ekran yalnız anlatır.
export function ChannelDiagnosisDialog({
  channelId, channelName, onClose,
}: { channelId: number; channelName: string; onClose: () => void }) {
  const [diagnosis, setDiagnosis] = useState<ChannelDiagnosisDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDiagnosis(await omnichannelApi.diagnoseChannel(channelId));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void run(); }, 0);
    return () => window.clearTimeout(timer);
  }, [run]);

  return (
    <OmniDialogShell
      onClose={onClose}
      closeOnEscape
      ariaLabel={`${channelName} kanal teşhisi`}
      panelClassName="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--border-soft)] p-4">
        <div className="flex items-center gap-2.5">
          <Stethoscope size={18} className="text-[var(--fg-muted)]" />
          <div>
            <h2 className="text-sm font-bold text-[var(--fg)]">Kanal Teşhisi</h2>
            <p className="text-[11px] text-[var(--fg-muted)]">{channelName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="inline-flex h-7 items-center gap-1.5 rounded border border-[var(--border)] px-2.5 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Yeniden kontrol et
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-7 w-7 items-center justify-center rounded text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 overflow-y-auto p-4">
        {loading && !diagnosis && (
          <p className="py-10 text-center text-xs text-[var(--fg-muted)]">
            Kanal kontrol ediliyor… Meta hesabı, son mesajlar ve gönderim hataları inceleniyor.
          </p>
        )}

        {error && (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-500">
            Teşhis yapılamadı: {error}
          </div>
        )}

        {diagnosis && <DiagnosisBody diagnosis={diagnosis} />}
      </div>
    </OmniDialogShell>
  );
}

function DiagnosisBody({ diagnosis }: { diagnosis: ChannelDiagnosisDto }) {
  const problems = diagnosis.checks.filter(
    (c) => c.status === DIAGNOSTIC_STATUS.Failed || c.status === DIAGNOSTIC_STATUS.Warning,
  );
  const fine = diagnosis.checks.filter((c) => !problems.includes(c));

  return (
    <>
      <section className={`rounded-md border p-3.5 ${VERDICT_STYLE[diagnosis.verdict]}`}>
        <p className="text-sm font-bold text-[var(--fg)]">{diagnosis.headline}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--fg)]">{diagnosis.explanation}</p>
        <p className="mt-2 text-[10.5px] text-[var(--fg-muted)]">
          Son kontrol: {formatDateTime(diagnosis.checkedAt)}
        </p>
      </section>

      {problems.length > 0 && (
        <CheckGroup title="İlgilenilmesi gerekenler" hint="Ayrıntı ve yapılacaklar için satıra tıklayın.">
          {problems.map((c) => <DiagnosticCheckCard key={c.key} check={c} />)}
        </CheckGroup>
      )}

      <CheckGroup title={problems.length > 0 ? 'Diğer kontroller' : 'Yapılan kontroller'}>
        {fine.map((c) => <DiagnosticCheckCard key={c.key} check={c} />)}
      </CheckGroup>
    </>
  );
}

function CheckGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">{title}</h3>
        {hint && <span className="text-[10.5px] text-[var(--fg-muted)]">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
