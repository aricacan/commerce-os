'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, FileText } from 'lucide-react';
import { omnichannelApi, type MessageDto, type SendableTemplateDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { OmniDialogShell } from './OmniDialogShell';

// Meta'nın tek değer sınırı; backend de aynı sınırı uygular (TemplateRenderer).
const MAX_PARAMETER_LENGTH = 1024;

// {{1}}, {{2}}… yerine girilen değerleri koyar; boş kalanlar köşeli parantezle görünür.
function renderPreview(bodyText: string, values: string[]): string {
  return bodyText.replace(/\{\{(\d{1,3})\}\}/g, (_, n: string) => values[Number(n) - 1]?.trim() || `[${n}]`);
}

// Onaylı WhatsApp şablonunu seçip doldurma. Metin Meta'dan gelir; temsilci yalnız
// boşlukları doldurur, önizlemede müşterinin göreceği metni görür.
export function TemplatePickerDialog({
  conversationId, onClose, onSent,
}: { conversationId: number; onClose: () => void; onSent: (message: MessageDto) => void }) {
  const [templates, setTemplates] = useState<SendableTemplateDto[] | null>(null);
  const [selected, setSelected] = useState<SendableTemplateDto | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    omnichannelApi.getSendableTemplates(conversationId)
      .then((list) => { if (!cancelled) setTemplates(list); })
      .catch((e: unknown) => { if (!cancelled) { setTemplates([]); setError(describeError(e)); } });
    return () => { cancelled = true; };
  }, [conversationId]);

  const choose = (template: SendableTemplateDto) => {
    setSelected(template);
    setValues(Array.from({ length: template.parameterCount }, () => ''));
    setError(null);
  };

  const preview = useMemo(() => (selected ? renderPreview(selected.bodyText, values) : ''), [selected, values]);
  const complete = values.every((v) => v.trim().length > 0);

  const send = async () => {
    if (!selected || !complete || sending) return;
    setSending(true);
    setError(null);
    try {
      const message = await omnichannelApi.sendTemplateMessage({
        conversationId, templateName: selected.name, language: selected.language, parameters: values,
      });
      onSent(message);
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <OmniDialogShell
      onClose={onClose}
      ariaLabel="Şablon gönder"
      panelClassName="flex max-h-[90vh] w-full max-w-xl flex-col rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-xl"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] p-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Şablon gönder</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Kapat"
          className="flex h-7 w-7 items-center justify-center rounded text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] transition cursor-pointer">
          <X size={16} />
        </button>
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto p-4 text-xs">
        {templates === null && <p className="py-6 text-center text-[var(--fg-muted)]">Şablonlar Meta&apos;dan okunuyor…</p>}

        {templates?.length === 0 && !error && (
          <p className="leading-relaxed text-[var(--fg-muted)]">
            Gönderilebilir onaylı şablon yok. Kanallar ekranındaki şablon düğmesinden yeni bir şablon oluşturup
            Meta onayını bekleyin (genelde birkaç dakika sürer).
          </p>
        )}

        {templates && templates.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-[var(--fg)]">1. Şablonu seçin</span>
            <div className="flex flex-col gap-1.5">
              {templates.map((t) => (
                <button
                  key={`${t.name}-${t.language}`}
                  type="button"
                  onClick={() => choose(t)}
                  className={`rounded-md border p-2.5 text-left transition cursor-pointer ${
                    selected?.name === t.name && selected.language === t.language
                      ? 'border-[var(--fg)] bg-[var(--bg-subtle)]'
                      : 'border-[var(--border-soft)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="font-mono text-[11px] font-bold text-[var(--fg)]">{t.name} · {t.language}</div>
                  <div className="mt-1 line-clamp-2 text-[var(--fg-muted)]">{t.bodyText}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && selected.parameterCount > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-[var(--fg)]">2. Boşlukları doldurun</span>
            {values.map((value, i) => (
              <label key={i} className="flex items-center gap-2">
                <span className="w-10 shrink-0 font-mono text-[var(--fg-muted)]">{`{{${i + 1}}}`}</span>
                <input
                  value={value}
                  maxLength={MAX_PARAMETER_LENGTH}
                  onChange={(e) => setValues((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                  className="h-8 flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg-muted)]"
                />
              </label>
            ))}
          </div>
        )}

        {selected && (
          <div className="flex flex-col gap-1.5">
            <span className="font-bold text-[var(--fg)]">Müşterinin göreceği mesaj</span>
            <p className="whitespace-pre-wrap rounded-md bg-[var(--bg-subtle)] p-3 leading-relaxed text-[var(--fg)]">{preview}</p>
          </div>
        )}

        {error && <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5 text-rose-500">{error}</div>}
      </div>

      <footer className="flex justify-end gap-2 border-t border-[var(--border-soft)] p-3">
        <button type="button" onClick={onClose}
          className="h-8 rounded border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer">
          Vazgeç
        </button>
        <button type="button" onClick={() => void send()} disabled={!selected || !complete || sending}
          className="h-8 rounded bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90 transition cursor-pointer disabled:opacity-40">
          {sending ? 'Gönderiliyor…' : 'Gönder'}
        </button>
      </footer>
    </OmniDialogShell>
  );
}
