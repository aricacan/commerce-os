'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote, Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';

const PRESET_NOTE_KEYS = [
  'order_note_preset_not_prepared',
  'order_note_preset_preparing',
  'order_note_preset_shipped',
  'order_note_preset_awaiting_stock',
  'order_note_preset_contacted_customer',
  'order_note_preset_problem',
] as const;

interface OrderNoteEditorProps {
  orderId: number;
  note: string | null;
  queryKey: readonly unknown[];
}

export function OrderNoteEditor({ orderId, note, queryKey }: OrderNoteEditorProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const presetNotes = PRESET_NOTE_KEYS.map((key) => t(key));

  useEffect(() => {
    setMounted(true);
  }, []);

  const mutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (newNote: string | null) => orderApi.updateNote(orderId, newNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setOpen(false);
      setShowCustomInput(false);
      setCustomText('');
      toast.success(t('order_note_saved'));
    },
    onError: () => toast.error(t('order_note_save_failed')),
  });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 240;
    const popoverHeight = 260;

    let left = rect.right - popoverWidth;
    if (left < 10) left = Math.max(10, rect.left);
    if (left + popoverWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popoverWidth - 10);
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < popoverHeight && rect.top > popoverHeight;
    const top = openUpward ? Math.max(10, rect.top - popoverHeight - 4) : rect.bottom + 4;

    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, showCustomInput]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false);
        setShowCustomInput(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={note ?? t('order_note_add')}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 4,
          border: `1px solid ${note ? 'var(--accent)' : 'var(--border)'}`,
          background: note ? 'var(--accent-soft)' : 'var(--card)',
          color: note ? 'var(--accent)' : 'var(--fg-muted)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', maxWidth: 150,
        }}
      >
        <StickyNote size={12} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note || t('order_note_add')}
        </span>
      </button>

      {open && mounted && coords && createPortal(
        <div
          ref={popupRef}
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 99999,
            width: 240,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!showCustomInput ? (
            <>
              {presetNotes.map((preset) => (
                <button
                  key={preset}
                  onClick={() => mutation.mutate(preset)}
                  disabled={mutation.isPending}
                  style={{
                    textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none',
                    background: note === preset ? 'var(--accent-soft)' : 'transparent',
                    color: note === preset ? 'var(--accent)' : 'var(--fg)',
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (note !== preset) e.currentTarget.style.background = 'var(--card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (note !== preset) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {preset}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />
              <button
                onClick={() => setShowCustomInput(true)}
                style={{
                  textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none',
                  background: 'transparent', color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {t('order_note_write_custom')}
              </button>
              {note && (
                <button
                  onClick={() => mutation.mutate(null)}
                  disabled={mutation.isPending}
                  style={{
                    textAlign: 'left', padding: '7px 10px', borderRadius: 6, border: 'none',
                    background: 'transparent', color: 'var(--danger)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {t('order_note_clear')}
                </button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                autoFocus
                rows={3}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={t('order_note_placeholder')}
                style={{
                  width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--fg)', fontSize: 12, outline: 'none', resize: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowCustomInput(false); setCustomText(''); }}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <X size={11} /> {t('order_note_cancel')}
                </button>
                <button
                  onClick={() => customText.trim() && mutation.mutate(customText.trim())}
                  disabled={!customText.trim() || mutation.isPending}
                  style={{
                    padding: '4px 8px', borderRadius: 4, border: 'none',
                    background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 600,
                    cursor: !customText.trim() || mutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: !customText.trim() || mutation.isPending ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <Check size={11} /> {t('save')}
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
