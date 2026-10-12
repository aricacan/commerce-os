'use client';

import { Bot, Loader2, X } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import { CatchupCandidateRow, CatchupSkippedSection, CatchupSummaryCard } from './HandoffCatchupParts';
import { OmniDialogShell } from './OmniDialogShell';
import { useHandoffCatchup } from './useHandoffCatchup';

const EXPLANATION =
  'Bot, seçili konuşmalarda devri kapatır, müşteriye kısa özür mesajı yazar ve son cevapsız mesajına cevap verir.';

// "Botla devam ettir": devredilmiş ama 24 saat penceresi hâlâ açık konuşmaları toplu olarak bota geri alır.
export function HandoffCatchupDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const state = useHandoffCatchup();
  const { preview, selected, loading, running, error, summary } = state;
  const eligible = preview?.eligible ?? [];
  const allSelected = eligible.length > 0 && eligible.every((c) => selected.has(c.conversationId));

  const handleClose = () => {
    if (summary) onDone();
    onClose();
  };

  return (
    <OmniDialogShell
      onClose={running ? () => undefined : handleClose}
      closeOnEscape={!running}
      ariaLabel="Devredilenleri bota geri al"
      panelClassName="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-bg shadow-xl"
    >
      <header className="flex items-start gap-3 border-b border-border-soft p-4">
        <Bot size={18} className="mt-0.5 shrink-0 text-fg-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-ui-md font-bold text-fg">Botla devam ettir</h2>
          <p className="text-ui-xs text-fg-muted">{EXPLANATION}</p>
        </div>
        <button type="button" onClick={handleClose} disabled={running} aria-label="Kapat"
          className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-fg-muted hover:bg-bg-subtle disabled:opacity-40 ${motionFast} ${focusRing}`}>
          <X size={16} aria-hidden />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {summary && <CatchupSummaryCard summary={summary} />}
        {loading && <p className="p-6 text-center text-ui-sm text-fg-muted">Yükleniyor…</p>}
        {error && <p role="alert" className="m-4 rounded-lg border border-danger/30 bg-danger-soft p-3 text-ui-sm text-danger">{error}</p>}
        {!loading && !error && eligible.length === 0 && (
          <p className="p-6 text-center text-ui-sm text-fg-muted">Geri alınabilecek devredilmiş konuşma yok.</p>
        )}
        {eligible.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border-soft px-4 py-2 text-ui-xs text-fg-muted">
              <span>{eligible.length} uygun konuşma</span>
              <button type="button" onClick={state.toggleEvery} disabled={running}
                className={`cursor-pointer font-semibold text-fg hover:underline disabled:opacity-40 ${focusRing}`}>
                {allSelected ? 'Tümünü kaldır' : 'Tümünü seç'}
              </button>
            </div>
            <ul>
              {eligible.map((c) => (
                <CatchupCandidateRow key={c.conversationId} candidate={c} now={state.loadedAt}
                  checked={selected.has(c.conversationId)} disabled={running}
                  onToggle={() => state.toggleOne(c.conversationId)} />
              ))}
            </ul>
          </>
        )}
        {preview && <CatchupSkippedSection skipped={preview.skipped} />}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border-soft p-3">
        <button type="button" onClick={() => void state.reload()} disabled={loading || running}
          className={`h-9 cursor-pointer rounded-lg border border-border bg-card px-3 text-ui-sm font-semibold text-fg hover:bg-bg-subtle disabled:opacity-40 ${motionFast} ${focusRing}`}>
          Yenile
        </button>
        <button type="button" onClick={() => void state.run()} disabled={selected.size === 0 || running || loading}
          className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-fg px-3 text-ui-sm font-semibold text-bg hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 ${motionFast} ${focusRing}`}>
          {running && <Loader2 size={14} className="animate-spin" aria-hidden />}
          {running ? 'Çalışıyor…' : `Seçilenleri çalıştır (${selected.size})`}
        </button>
      </footer>
    </OmniDialogShell>
  );
}
