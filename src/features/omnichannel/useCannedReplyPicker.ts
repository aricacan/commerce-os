'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { omnichannelApi, type CannedReplyDto } from '../../lib/api/omnichannel';

const MAX_VISIBLE = 8;

export interface CannedReplyPickerState {
  containerRef: RefObject<HTMLDivElement | null>;
  replies: CannedReplyDto[] | null;
  matches: CannedReplyDto[];
  visible: boolean;
  activeIndex: number;
  toggle: () => void;
  pick: (reply: CannedReplyDto) => void;
  // Yazma alanının tuşları: ↑/↓ gezinir, Enter seçer, Escape kapatır. true = tuş tüketildi.
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => boolean;
}

// "/" ile başlayan taslak = arama. Liste düğmeyle ya da "/" ile açılır; Escape ya da dışarı
// tıklama kapatır (açık "/" araması, taslak değişene kadar kapalı kalır).
export function useCannedReplyPicker(draft: string, onPick: (reply: CannedReplyDto) => void): CannedReplyPickerState {
  const [replies, setReplies] = useState<CannedReplyDto[] | null>(null);
  const [open, setOpen] = useState(false);
  const [dismissedDraft, setDismissedDraft] = useState<string | null>(null);
  // Vurgu, açıldığı aramaya bağlıdır: arama değişince kendiliğinden başa döner.
  const [cursor, setCursor] = useState({ key: '', index: 0 });
  const loadStarted = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const slashQuery = draft.startsWith('/') ? draft.slice(1).trim().toLocaleLowerCase('tr') : null;
  const visible = open || (slashQuery !== null && dismissedDraft !== draft);

  // Liste ilk ihtiyaçta bir kez yüklenir; hata olursa seçici boş kalır, sohbet etkilenmez.
  useEffect(() => {
    if (!visible || loadStarted.current) return;
    loadStarted.current = true;
    void omnichannelApi.getCannedReplies().then(setReplies).catch(() => setReplies([]));
  }, [visible]);

  const matches = useMemo(() => {
    const all = replies ?? [];
    if (!slashQuery) return all.slice(0, MAX_VISIBLE);
    return all
      .filter((r) => r.title.toLocaleLowerCase('tr').includes(slashQuery) || r.body.toLocaleLowerCase('tr').includes(slashQuery))
      .slice(0, MAX_VISIBLE);
  }, [replies, slashQuery]);

  const cursorKey = `${open}|${slashQuery ?? ''}`;
  const activeIndex = cursor.key === cursorKey ? cursor.index : 0;

  const close = () => {
    setOpen(false);
    if (slashQuery !== null) setDismissedDraft(draft);
  };

  useEffect(() => {
    if (!visible) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (draft.startsWith('/')) setDismissedDraft(draft);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [visible, draft]);

  const pick = (reply: CannedReplyDto) => {
    onPick(reply);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!visible) return false;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return true;
    }
    if (matches.length === 0) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setCursor({ key: cursorKey, index: (activeIndex + step + matches.length) % matches.length });
      return true;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      pick(matches[Math.min(activeIndex, matches.length - 1)]);
      return true;
    }
    return false;
  };

  return {
    containerRef, replies, matches, visible, activeIndex,
    toggle: () => (visible ? close() : setOpen(true)),
    pick, handleKeyDown,
  };
}
