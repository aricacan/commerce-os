'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { aiUsageApi, type AiUsageToggleDto } from '../../lib/api/omnichannel-ai-usage';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { aiUsageRows, type AiUsageRow } from './aiUsageRules';
import { isServerUpdatePending } from './botTraceRules';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'hidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; toggles: AiUsageToggleDto[] };

// Kendiliğinden çalışan yapay zekâ işlerinin aç/kapa anahtarları (hepsi varsayılan kapalı). Müşteri sohbeti ve
// temsilci yolu burada değildir. Eski backend'de uç yoksa kart hiç görünmez (ön yüz backend'den önce yayına çıkar).
export function AiUsageCard() {
  const isAdmin = useIsOmnichannelAdmin();
  const { notify } = useFeedback();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [savingFeature, setSavingFeature] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    aiUsageApi.get()
      .then((toggles) => { if (!cancelled) setState({ kind: 'ready', toggles }); })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState(isServerUpdatePending(e) ? { kind: 'hidden' } : { kind: 'error', message: describeError(e) });
      });
    return () => { cancelled = true; };
  }, []);

  const toggle = async (row: AiUsageRow, enabled: boolean) => {
    setSavingFeature(row.feature);
    try {
      setState({ kind: 'ready', toggles: await aiUsageApi.set(row.feature, enabled) });
      notify.success(`${row.label} ${enabled ? 'açıldı' : 'kapatıldı'}.`);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSavingFeature(null);
    }
  };

  if (state.kind === 'hidden') return null;

  return (
    <section aria-label="Yapay zekâ kullanımı" className="flex min-w-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex items-start gap-2">
        <Sparkles size={14} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="m-0 text-xs font-bold text-fg">Yapay zekâ kullanımı — arka plan işleri</h3>
          <p className="m-0 text-[10.5px] text-fg-muted">
            Kendiliğinden çalışan ve token harcayan işler; siz açmadıkça çalışmazlar. Müşteriye cevap, temsilci
            yardımcısı ve çeviri bu ayarlardan etkilenmez.
          </p>
        </div>
      </div>
      {state.kind === 'loading' && <p className="m-0 text-ui-xs text-fg-muted">Yükleniyor…</p>}
      {state.kind === 'error' && <p role="alert" className="m-0 text-ui-xs text-danger">{state.message}</p>}
      {state.kind === 'ready' && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {aiUsageRows(state.toggles).map((row) => (
            <AiUsageToggleRow
              key={row.feature} row={row} editable={isAdmin} saving={savingFeature === row.feature}
              disabled={savingFeature !== null} onChange={(enabled) => void toggle(row, enabled)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface RowProps {
  row: AiUsageRow;
  editable: boolean;
  saving: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}

function AiUsageToggleRow({ row, editable, saving, disabled, onChange }: RowProps) {
  const locked = !editable || disabled;
  return (
    <li className="flex min-w-0 flex-col gap-1">
      <label className={`flex min-w-0 items-start gap-2.5 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox" role="switch" checked={row.enabled} disabled={locked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] disabled:opacity-50"
        />
        <span className="flex min-w-0 flex-col gap-0.5 break-words">
          <span className="text-xs font-semibold leading-tight text-fg">
            {row.label}{saving ? ' — kaydediliyor…' : ''}
          </span>
          <span className="text-[10.5px] leading-snug text-fg-muted">{row.hint}</span>
        </span>
      </label>
      {row.offNote && !row.enabled && (
        <p className="m-0 ml-6.5 text-[10.5px] font-semibold text-warning">{row.offNote}</p>
      )}
    </li>
  );
}
