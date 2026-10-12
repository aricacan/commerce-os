'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Route } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import { BotTraceItem } from './BotTraceItem';
import { secondaryButtonClass } from './formClasses';
import { INFO_SECTION_CLASS, INFO_SECTION_HEADING_CLASS } from './infoSectionStyle';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useBotTraces } from './useBotTraces';

// "Ayrıntılar" › "Bot tur izi": botun her turda hangi yoldan geçtiği, sonucu, süresi, jetonu ve araç
// çağrıları. Varsayılan kapalı; açılınca yüklenir (her konuşma açılışında iz okunmaz).
export function BotTraceSection({ conversationId }: { conversationId: number }) {
  const [open, setOpen] = useState(false);
  const traces = useBotTraces(conversationId);
  const Chevron = open ? ChevronDown : ChevronRight;

  const toggle = () => {
    setOpen((wasOpen) => !wasOpen);
    traces.load();
  };

  return (
    <section aria-label="Bot tur izi" className={INFO_SECTION_CLASS}>
      <div className={INFO_SECTION_HEADING_CLASS}>
        <button
          type="button" onClick={toggle} aria-expanded={open}
          className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md bg-transparent p-0 text-left ${focusRing}`}
        >
          <Chevron size={13} className="shrink-0 text-fg-muted" aria-hidden />
          <Route size={13} className="shrink-0 text-fg-muted" aria-hidden />
          <span className="font-bold text-fg">Bot tur izi</span>
          {traces.loaded && <span className="text-ui-xs tabular-nums text-fg-muted">{traces.items.length}</span>}
        </button>
        {open && traces.loaded && !traces.updatePending && (
          <button
            type="button" onClick={traces.reload} aria-label="İzleri yenile" disabled={traces.loading}
            className={`inline-flex cursor-pointer items-center rounded-md bg-transparent p-1 text-fg-muted hover:text-fg ${focusRing} ${motionFast}`}
          >
            <RefreshCw size={12} className={traces.loading ? 'animate-spin' : ''} aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <div className="flex min-w-0 flex-col gap-2">
          {traces.updatePending && <UpdatePendingNotice />}
          {traces.error && <p className="m-0 text-ui-xs text-danger">{traces.error}</p>}
          {traces.loading && traces.items.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">İzler yükleniyor…</p>}
          {traces.loaded && !traces.loading && !traces.error && !traces.updatePending && traces.items.length === 0 && (
            <p className="m-0 text-ui-xs text-fg-muted">Bu konuşmada kayıtlı bot turu yok.</p>
          )}
          {traces.items.length > 0 && (
            <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0">
              {traces.items.map((trace) => <BotTraceItem key={trace.id} trace={trace} />)}
            </ul>
          )}
          {traces.nextBeforeId !== null && (
            <button type="button" className={`${secondaryButtonClass} self-start`} disabled={traces.loading} onClick={traces.loadMore}>
              {traces.loading ? 'Yükleniyor…' : 'Daha eski turlar'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
