'use client';

import { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { omnichannelEvalApi, type BotPipelinesDto } from '../../lib/api/omnichannel-eval';
import { botPipelinesApi } from '../../lib/api/omnichannel-pipelines';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { isServerUpdatePending, SERVER_UPDATE_PENDING_TEXT } from './botTraceRules';
import { VERSION_UNSET } from './channelBotRules';
import { formInputClass, labelClass, primaryButtonClass } from './formClasses';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: BotPipelinesDto };

// Hesap geneli varsayılan bot sürümü: kanalda sürüm seçilmemişse bu çalışır; "Otomatik" = en yeni kayıtlı sürüm.
// Değiştirmek yalnız yöneticiye (asıl denetim sunucuda); diğerleri etkin değeri okur.
export function BotPipelineDefaultsCard() {
  const isAdmin = useIsOmnichannelAdmin();
  const { notify } = useFeedback();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [live, setLive] = useState(VERSION_UNSET);
  const [shadow, setShadow] = useState(VERSION_UNSET);
  const [saving, setSaving] = useState(false);

  const apply = (data: BotPipelinesDto) => {
    setState({ kind: 'ready', data });
    setLive(data.tenantDefault ?? VERSION_UNSET);
    setShadow(data.tenantDefaultShadow ?? VERSION_UNSET);
  };

  useEffect(() => {
    let cancelled = false;
    omnichannelEvalApi.getPipelines()
      .then((data) => { if (!cancelled) apply(data); })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState(isServerUpdatePending(e) ? { kind: 'pending' } : { kind: 'error', message: describeError(e) });
      });
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      apply(await botPipelinesApi.saveDefaults({
        liveVersion: live === VERSION_UNSET ? null : live,
        shadowVersion: shadow === VERSION_UNSET ? null : shadow,
      }));
      notify.success('Varsayılan bot sürümü kaydedildi — 30 sn içinde tüm kanallara yansır.');
    } catch (e) {
      notify.error(isServerUpdatePending(e) ? SERVER_UPDATE_PENDING_TEXT : describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-label="Varsayılan bot sürümü" className="flex min-w-0 flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex items-start gap-2">
        <GitBranch size={14} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="m-0 text-xs font-bold text-fg">Varsayılan bot sürümü</h3>
          <p className="m-0 text-[10.5px] text-fg-muted">
            Kanal Merkezi › Bot › Sürüm&apos;de seçim yapılmamış kanallarda çalışır. Kanala özel seçim her zaman önce gelir.
          </p>
        </div>
      </div>
      {state.kind === 'loading' && <p className="m-0 text-ui-xs text-fg-muted">Yükleniyor…</p>}
      {state.kind === 'pending' && <UpdatePendingNotice />}
      {state.kind === 'error' && <p role="alert" className="m-0 text-ui-xs text-danger">{state.message}</p>}
      {state.kind === 'ready' && (
        <DefaultsForm
          data={state.data} live={live} shadow={shadow} editable={isAdmin} saving={saving}
          onLiveChange={setLive} onShadowChange={setShadow} onSave={() => void save()}
        />
      )}
    </section>
  );
}

interface FormProps {
  data: BotPipelinesDto;
  live: string;
  shadow: string;
  editable: boolean;
  saving: boolean;
  onLiveChange: (value: string) => void;
  onShadowChange: (value: string) => void;
  onSave: () => void;
}

function DefaultsForm({ data, live, shadow, editable, saving, onLiveChange, onShadowChange, onSave }: FormProps) {
  const dirty = live !== (data.tenantDefault ?? VERSION_UNSET) || shadow !== (data.tenantDefaultShadow ?? VERSION_UNSET);
  const disabled = !editable || saving;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-40 flex-1 flex-col">
        <span className={labelClass}>Canlı sürüm</span>
        <select value={live} disabled={disabled} onChange={(e) => onLiveChange(e.target.value)} className={formInputClass}>
          <option value={VERSION_UNSET}>Otomatik — en yeni ({data.default || '—'})</option>
          {data.versions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      <label className="flex min-w-40 flex-1 flex-col">
        <span className={labelClass}>Gölge sürüm</span>
        <select value={shadow} disabled={disabled} onChange={(e) => onShadowChange(e.target.value)} className={formInputClass}>
          <option value={VERSION_UNSET}>Kapalı</option>
          {data.versions.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>
      {editable && (
        <button type="button" onClick={onSave} disabled={!dirty || saving} className={primaryButtonClass}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      )}
      <p className="m-0 basis-full text-ui-xs text-fg-muted">
        Şu an seçimsiz kanallarda çalışan: <strong className="text-fg">{data.effectiveDefault || '—'}</strong>.
        Gölge, kanalın kendi gölge seçimi yoksa uygulanır; canlıyla aynı sürümse çalışmaz.
      </p>
    </div>
  );
}
