'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { Eye, Save, Send, Wand2, X } from 'lucide-react';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import {
  INSTRUCTION_MODE, INSTRUCTION_SCOPE, PREVIEW_STATE, type InstructionMode, type InstructionScope,
} from '../../lib/api/omnichannel-instructions';
import { focusRing, motionFast, surfaceCard } from '../shared/design';
import { InstructionPreviewBox } from './InstructionPreviewBox';
import {
  INSTRUCTION_COUNTER_VISIBLE_FROM, INSTRUCTION_MAX_LENGTH, INSTRUCTION_MODE_HINTS, INSTRUCTION_MODE_LABELS,
  INSTRUCTION_SCOPE_HINTS, INSTRUCTION_SCOPE_LABELS, defaultExpiryInput, expiryFromInput, scopeOptions,
} from './botInstructionRules';
import type { BotInstructionPanelState } from './useBotInstructionPanel';
import { useIsOmnichannelAdmin } from './useIsOmnichannelAdmin';

interface Props {
  panel: BotInstructionPanelState;
}

const MODE_OPTIONS = [INSTRUCTION_MODE.Persistent, INSTRUCTION_MODE.OneShot].map((value) => ({
  value, label: INSTRUCTION_MODE_LABELS[value], hint: INSTRUCTION_MODE_HINTS[value],
}));

const REPLY_SEPARATOR = '\n\n';

const BUTTON_CLASS =
  `inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-ui-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${motionFast} ${focusRing}`;

// "Bota talimat ver" v2 (FAZ 7): talimat yazılır → "Önizle" botun araçlarla (katalog/fiyat/stok/link) ne cevap
// vereceğini gösterir, hiçbir şey göndermeden → temsilci onaylar (gerekirse düzenler) ve cevap bot olarak gider.
// Talimatın kendisi müşteriye gitmez. Bot konuşmada kapalı olsa da önizleme çalışır.
export function BotInstructionPanel({ panel }: Props) {
  const isAdmin = useIsOmnichannelAdmin();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<InstructionMode>(INSTRUCTION_MODE.Persistent);
  const [scope, setScope] = useState<InstructionScope>(INSTRUCTION_SCOPE.Conversation);
  const [expiry, setExpiry] = useState(() => defaultExpiryInput(Date.now()));
  // Temsilcinin önizleme üzerinde yaptığı düzenleme; düzenleme yoksa önizlemenin metni gönderilir.
  const [edited, setEdited] = useState<string | null>(null);
  const textId = useId();
  const instruction = text.trim();
  const scopes = scopeOptions(mode, isAdmin);
  const effectiveScope = scopes.includes(scope) ? scope : INSTRUCTION_SCOPE.Conversation;
  const busy = panel.sending || panel.previewing;
  // Önizleme birden çok mesajsa boş satırla birleşir.
  const previewText = panel.preview?.replies.join(REPLY_SEPARATOR) ?? '';
  const draft = edited ?? previewText;
  const canSend = panel.preview?.state === PREVIEW_STATE.Ready && draft.trim() !== '' && !busy;

  const body = () => ({
    text: instruction, mode, scope: effectiveScope,
    expiresAt: mode === INSTRUCTION_MODE.Persistent ? expiryFromInput(expiry) : undefined,
  });

  const preview = async () => {
    if (instruction === '' || busy) return;
    setEdited(null);
    await panel.requestPreview(instruction);
  };

  const changeText = (value: string) => {
    setText(value);
    // Talimat değişince eski önizleme geçersiz.
    if (panel.preview) panel.clearPreview();
    setEdited(null);
  };

  // Enter yeni satırdır (talimat uzun olabilir); Ctrl/Cmd+Enter önizler, Esc kapatır.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') panel.close();
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void preview();
    }
  };

  return (
    <section aria-label="Bota talimat ver" className={`${surfaceCard} flex min-w-0 flex-col gap-2 p-3`}>
      <div className="flex min-w-0 items-center gap-2">
        <Wand2 size={14} className="shrink-0 text-fg-muted" aria-hidden />
        <label htmlFor={textId} className="min-w-0 flex-1 text-ui-sm font-bold text-fg">Bota talimat ver</label>
        <button type="button" onClick={panel.close} aria-label="Kapat"
          className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg ${motionFast} ${focusRing}`}>
          <X size={14} aria-hidden />
        </button>
      </div>

      <textarea id={textId} value={text} onChange={(e) => changeText(e.target.value)} onKeyDown={handleKeyDown}
        maxLength={INSTRUCTION_MAX_LENGTH} rows={3} autoFocus
        placeholder="örn. Müşteriye 4 mm paspasın linkini gönder; kargo süresini 2 gün söyle."
        className="min-h-20 w-full min-w-0 resize-y rounded-xl border border-border bg-card px-3 py-2 font-[inherit] text-base leading-snug text-fg outline-none placeholder:text-fg-subtle focus:border-fg/40 focus:ring-2 focus:ring-fg/10 md:text-ui-md" />
      <p className="m-0 text-ui-xs text-fg-muted">
        Talimat müşteriye gitmez. Bot cevabını müşterinin dilinde, araçlarla (ürün, fiyat, stok, link) yazar; önce görürsünüz.
      </p>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <SegmentedControl value={mode} options={MODE_OPTIONS} onChange={setMode} size="sm" />
        <select aria-label="Kapsam" value={effectiveScope} onChange={(e) => setScope(e.target.value as InstructionScope)}
          className={`h-8 rounded-lg border border-border bg-card px-2 text-ui-xs text-fg ${focusRing}`}>
          {scopes.map((value) => <option key={value} value={value}>{INSTRUCTION_SCOPE_LABELS[value]}</option>)}
        </select>
        {mode === INSTRUCTION_MODE.Persistent && (
          <label className="inline-flex items-center gap-1.5 text-ui-xs text-fg-muted">
            Bitiş
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
              className={`h-8 rounded-lg border border-border bg-card px-2 text-ui-xs text-fg ${focusRing}`} />
          </label>
        )}
      </div>
      <span className="text-ui-2xs text-fg-subtle">{INSTRUCTION_SCOPE_HINTS[effectiveScope]} {INSTRUCTION_MODE_HINTS[mode]}</span>

      {panel.preview && <InstructionPreviewBox preview={panel.preview} draft={draft} onDraftChange={setEdited} />}

      {panel.error && <p role="alert" className="m-0 break-words text-ui-xs text-danger">{panel.error}</p>}

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-ui-2xs tabular-nums text-fg-subtle">
          {text.length >= INSTRUCTION_COUNTER_VISIBLE_FROM ? `${text.length}/${INSTRUCTION_MAX_LENGTH}` : ''}
        </span>
        <button type="button" disabled={instruction === '' || busy} onClick={() => void panel.submit(body())}
          className={`${BUTTON_CLASS} border border-border bg-card text-fg hover:bg-bg-subtle`}>
          <Save size={14} aria-hidden /> Yalnız kaydet
        </button>
        <button type="button" disabled={instruction === '' || busy} onClick={() => void preview()}
          className={`${BUTTON_CLASS} border border-border bg-card text-fg hover:bg-bg-subtle`}>
          <Eye size={14} aria-hidden /> {panel.previewing ? 'Bot düşünüyor…' : 'Önizle'}
        </button>
        <button type="button" disabled={!canSend}
          onClick={() => void panel.submit({ ...body(), sendText: draft.trim(), previewText })}
          className={`${BUTTON_CLASS} bg-fg text-bg hover:opacity-85`}>
          <Send size={14} aria-hidden /> {panel.sending ? 'Gönderiliyor…' : 'Onayla ve gönder'}
        </button>
      </div>
    </section>
  );
}
