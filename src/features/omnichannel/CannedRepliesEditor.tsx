'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  CUSTOMER_LANGUAGE_LABELS, CUSTOMER_LANGUAGES, omnichannelApi, type CannedReplyDto, type CannedReplySaveDto,
} from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';
import { compactInputClass } from './formClasses';

const EMPTY: CannedReplySaveDto = { title: '', body: '', language: null };

// Hazır cevap listesi (Faz 9). Her satır kendi başına kaydedilir — menü kaydından bağımsız.
export function CannedRepliesEditor() {
  const [replies, setReplies] = useState<CannedReplyDto[]>([]);
  const [draft, setDraft] = useState<CannedReplySaveDto>(EMPTY);
  const [available, setAvailable] = useState(true);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    try { setReplies(await omnichannelApi.getCannedReplies()); }
    catch { setAvailable(false); } // Uç henüz yayında değilse bölüm gizlenir.
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try { await action(); notify.success(success); await load(); }
    catch (e) { notify.error(describeError(e)); }
  };

  if (!available) return null;

  return (
    <div className="flex flex-col gap-2">
      {replies.map((reply) => (
        <CannedReplyRow
          key={reply.id} reply={reply}
          onSave={(dto) => void run(() => omnichannelApi.updateCannedReply(reply.id, dto), 'Hazır cevap güncellendi.')}
          onDelete={() => void run(() => omnichannelApi.deleteCannedReply(reply.id), 'Hazır cevap silindi.')}
        />
      ))}
      <div className="rounded-[4px] border border-dashed border-[var(--border)] p-3 flex flex-col gap-2">
        <ReplyFields value={draft} onChange={setDraft} />
        <button
          type="button"
          disabled={!draft.title.trim() || !draft.body.trim()}
          onClick={() => void run(async () => { await omnichannelApi.createCannedReply(draft); setDraft(EMPTY); }, 'Hazır cevap eklendi.')}
          className="inline-flex h-8 items-center gap-1.5 self-start rounded-[4px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40"
        >
          <Plus size={13} /> Hazır cevap ekle
        </button>
      </div>
    </div>
  );
}

function CannedReplyRow({ reply, onSave, onDelete }: {
  reply: CannedReplyDto; onSave: (dto: CannedReplySaveDto) => void; onDelete: () => void;
}) {
  const [value, setValue] = useState<CannedReplySaveDto>({ title: reply.title, body: reply.body, language: reply.language });
  const dirty = value.title !== reply.title || value.body !== reply.body || value.language !== reply.language;

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 flex flex-col gap-2">
      <ReplyFields value={value} onChange={setValue} />
      <div className="flex gap-2">
        <button
          type="button" disabled={!dirty} onClick={() => onSave(value)}
          className="inline-flex h-7 items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40"
        >
          <Save size={12} /> Kaydet
        </button>
        <button
          type="button" onClick={onDelete}
          className="inline-flex h-7 items-center gap-1 rounded-[4px] px-2 text-[11px] font-semibold text-rose-500 hover:bg-[var(--bg-subtle)] cursor-pointer"
        >
          <Trash2 size={12} /> Sil
        </button>
      </div>
    </div>
  );
}

function ReplyFields({ value, onChange }: { value: CannedReplySaveDto; onChange: (value: CannedReplySaveDto) => void }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
        <input
          value={value.title} placeholder="Başlık (ör. Kargo süresi)"
          onChange={(e) => onChange({ ...value, title: e.target.value })} className={compactInputClass}
        />
        <select
          value={value.language ?? ''} onChange={(e) => onChange({ ...value, language: e.target.value || null })}
          className={compactInputClass}
        >
          <option value="">Tüm diller</option>
          {CUSTOMER_LANGUAGES.map((code) => (
            <option key={code} value={code}>{CUSTOMER_LANGUAGE_LABELS[code]}</option>
          ))}
        </select>
      </div>
      <textarea
        rows={2} value={value.body} placeholder="Metin"
        onChange={(e) => onChange({ ...value, body: e.target.value })}
        className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
      />
    </>
  );
}
