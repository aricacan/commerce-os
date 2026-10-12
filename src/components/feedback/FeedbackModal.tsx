'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, Trash2, Pencil, Check, Clock, CircleDot, MessageSquare, ChevronDown, Loader2 } from 'lucide-react';
import { useFeedbackPanel } from '../../stores/feedback-panel';
import { feedbackApi } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Feedback, FeedbackStatus } from '../../types/api';
import { pushAlert } from '../../stores/alert-stack';

const STATUS_META: Record<FeedbackStatus, { label: string; Icon: typeof Clock }> = {
  New: { label: 'Yeni', Icon: CircleDot },
  InProgress: { label: 'İşleniyor', Icon: Clock },
  Done: { label: 'Tamamlandı', Icon: Check },
  Rejected: { label: 'Reddedildi', Icon: X },
};

export function FeedbackBoard({ enabled = true }: { enabled?: boolean }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => feedbackApi.list(),
    enabled,
    staleTime: 15_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['feedback'] });

  const create = useMutation({
    mutationFn: (message: string) => feedbackApi.create(message),
    onSuccess: () => { setDraft(''); invalidate(); pushAlert('Geri bildiriminiz gönderildi', 'success'); },
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: number; status: FeedbackStatus }) => feedbackApi.updateStatus(v.id, v.status),
    onSuccess: () => { invalidate(); pushAlert('Geri bildirim durumu güncellendi', 'success'); },
  });
  const editMsg = useMutation({
    mutationFn: (v: { id: number; message: string }) => feedbackApi.updateMessage(v.id, v.message),
    onSuccess: () => { setEditId(null); invalidate(); pushAlert('Geri bildirim güncellendi', 'success'); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => feedbackApi.remove(id),
    onSuccess: () => { invalidate(); pushAlert('Geri bildirim başarıyla silindi', 'info'); },
  });

  return (
    <div className="flex flex-col gap-3.5 min-h-0 flex-1 w-full text-xs">
      {/* Yeni geri bildirim yazma */}
      <div className="flex gap-2.5 p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Bir problem, eksik ya da öneri yazın…"
          rows={2}
          className="flex-1 resize-y min-h-[44px] p-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
        <button
          type="button"
          onClick={() => draft.trim() && create.mutate(draft.trim())}
          disabled={!draft.trim() || create.isPending}
          className="self-stretch flex items-center justify-center gap-1.5 px-4 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer disabled:opacity-40 shrink-0"
        >
          {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          <span>Gönder</span>
        </button>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Yükleniyor…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Henüz geri bildirim eklenmemiş.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((f) => (
              <FeedbackCard
                key={f.id}
                f={f}
                editing={editId === f.id}
                editText={editText}
                onStartEdit={() => { setEditId(f.id); setEditText(f.message); }}
                onEditText={setEditText}
                onSaveEdit={() => editText.trim() && editMsg.mutate({ id: f.id, message: editText.trim() })}
                onCancelEdit={() => setEditId(null)}
                onChangeStatus={(status) => setStatus.mutate({ id: f.id, status })}
                onDelete={() => setDeleteConfirmId(f.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Silme Onay Modal */}
      {deleteConfirmId !== null && (
        <div
          onClick={() => setDeleteConfirmId(null)}
          className="fixed inset-0 z-[40000] flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[4px] border border-rose-500/30 bg-[var(--card)] p-4 shadow-lg space-y-3"
          >
            <h3 className="font-bold text-xs text-[var(--fg)]">Geri Bildirimi Sil</h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              Bu kaydı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="h-8 px-3 rounded-[4px] border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  remove.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="h-8 px-3.5 rounded-[4px] bg-rose-500 text-xs font-bold text-white shadow-xs hover:opacity-90 cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeedbackModal() {
  const open = useFeedbackPanel((s) => s.open);
  const close = useFeedbackPanel((s) => s.closePanel);

  if (!open) return null;

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-[40000] flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-3.5 px-4 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-[var(--fg)]" />
            <h2 className="text-xs font-bold text-[var(--fg)]">Geri Bildirim</h2>
          </div>
          <button onClick={close} className="text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-4 flex flex-col overflow-hidden">
          <FeedbackBoard enabled={open} />
        </div>
      </div>
    </div>
  );
}

function StatusDropdownPicker({ status, onChange }: { status: FeedbackStatus; onChange: (s: FeedbackStatus) => void }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_META[status] || STATUS_META.New;
  const CurrentIcon = st.Icon;

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="inline-flex items-center gap-1.5 h-6 px-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--fg)] cursor-pointer hover:bg-[var(--card-hover)] transition"
      >
        <CurrentIcon size={11} />
        <span>{st.label}</span>
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[130px] rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-1 shadow-lg space-y-0.5">
            {(Object.keys(STATUS_META) as FeedbackStatus[]).map((key) => {
              const meta = STATUS_META[key];
              const MetaIcon = meta.Icon;
              const selected = key === status;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[3px] px-2 py-1 text-[11px] transition cursor-pointer ${
                    selected ? 'bg-[var(--card-hover)] font-bold text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <MetaIcon size={11} />
                    <span>{meta.label}</span>
                  </div>
                  {selected && <Check size={11} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface CardProps {
  f: Feedback;
  editing: boolean;
  editText: string;
  onStartEdit: () => void;
  onEditText: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onChangeStatus: (status: FeedbackStatus) => void;
  onDelete: () => void;
}

function FeedbackCard({ f, editing, editText, onStartEdit, onEditText, onSaveEdit, onCancelEdit, onChangeStatus, onDelete }: CardProps) {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs transition hover:border-[var(--border)]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[var(--fg)]">{f.authorName}</span>
        {f.isMine && (
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-[2px] bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)]">
            Siz
          </span>
        )}
        <StatusDropdownPicker status={f.status} onChange={onChangeStatus} />
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editText}
            onChange={(e) => onEditText(e.target.value)}
            rows={2}
            className="p-2 rounded-[3px] border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--fg)] outline-none"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onSaveEdit}
              className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--fg)] shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Check size={11} />
              <span>Kaydet</span>
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--fg)] leading-relaxed whitespace-pre-wrap flex-1">
          {f.message}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-soft)] text-[10.5px] text-[var(--fg-muted)]">
        <span>{formatDateTime(f.createdAt, 'tr')}</span>
        {!editing && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onStartEdit} title="Düzenle" className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
              <Pencil size={11} />
            </button>
            <button type="button" onClick={onDelete} title="Sil" className="p-1 text-[var(--fg-muted)] hover:text-rose-500 cursor-pointer">
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
