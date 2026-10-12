'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { omnichannelApi, type WhatsAppTemplateDto } from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';
import { cardButtonClass, dialogCloseButtonClass } from './formClasses';
import { OmniDialogShell } from './OmniDialogShell';

const SECTION_LABEL_CLASS = 'mb-1 text-ui-2xs font-bold uppercase text-[var(--fg-muted)]';
// Metin alanında da h-8 durur; min-h onu ezer (eski satır içi stille aynı davranış).
const FIELD_CLASS =
  'h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-ui-sm text-[var(--fg)] outline-none';

// WhatsApp Cloud API template yönetimi — kanal kartındaki "Template'ler" butonundan açılır.
// (Eskiden WhatsAppEmbeddedSignup kartının içindeydi; tek-panel birleştirmesiyle buraya taşındı.)
export function WhatsAppTemplatesDialog({
  channelId, channelName, onClose,
}: { channelId: number; channelName: string; onClose: () => void }) {
  const [templates, setTemplates] = useState<WhatsAppTemplateDto[]>([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    setError(null);
    try { setTemplates(await omnichannelApi.getWhatsAppTemplates(channelId)); }
    catch (e) { setError(describeError(e)); }
  }, [channelId]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (!name.trim() || !body.trim()) return;
    setBusy(true); setError(null);
    try {
      await omnichannelApi.createWhatsAppTemplate(channelId, {
        name: name.trim().toLowerCase(), language: 'tr', category: 'UTILITY',
        components: [{ type: 'BODY', text: body.trim() }],
      });
      setName(''); setBody('');
      notify.success('Şablon Meta onayına gönderildi.');
      await load();
    } catch (e) { setError(describeError(e)); }
    finally { setBusy(false); }
  };

  return (
    <OmniDialogShell
      onClose={onClose}
      layer="form"
      panelClassName="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="m-0 text-ui-lg font-bold">WhatsApp Şablon Yönetimi</h2>
          <div className="mt-0.5 text-ui-sm text-[var(--fg-muted)]">{channelName}</div>
        </div>
        <button onClick={onClose} className={dialogCloseButtonClass} aria-label="Kapat"><X size={18} /></button>
      </div>

      <div className="flex flex-col gap-3.5">
        <div>
          <div className={SECTION_LABEL_CLASS}>Kayıtlı şablonlar</div>
          <div className="mt-1.5 text-ui-sm text-[var(--fg-muted)]">
            {templates.length === 0
              ? 'Henüz şablon yok.'
              : templates.map((t) => `${t.name} · ${t.language} · ${t.status}`).join(' | ')}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-[var(--border)] pt-3.5">
          <div className={SECTION_LABEL_CLASS}>Yeni şablon</div>
          <input value={name} onChange={(e) => setName(e.target.value.replace(/[^a-z0-9_]/g, ''))} placeholder="template_adi" className={FIELD_CLASS} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mesaj metni" className={`${FIELD_CLASS} min-h-[70px] resize-y`} />
          <div className="flex justify-end">
            <button type="button" disabled={busy || !name || !body} onClick={() => void create()} className={`${cardButtonClass} disabled:opacity-50`}>
              {busy ? 'Gönderiliyor…' : 'Şablon oluştur'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-[3px] bg-[rgba(var(--danger-rgb),0.1)] px-2.5 py-1.5 text-ui-xs font-semibold text-[var(--danger)]">
            {error}
          </div>
        )}
      </div>
    </OmniDialogShell>
  );
}
