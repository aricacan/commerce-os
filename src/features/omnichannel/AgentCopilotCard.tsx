'use client';

import { RefreshCw, Sparkles, Wrench, X } from 'lucide-react';
import { COPILOT_STATE } from '../../lib/api/copilot';
import { badgeBase, badgeTone, focusRing, motionFast, surfaceCard } from '../shared/design';
import type { AgentCopilotState } from './useAgentCopilot';

interface Props {
  copilot: AgentCopilotState;
  // Seçenek yazma alanına alınır (müşterinin dilinde; düzenlenip temsilci tarafından gönderilir).
  onUse: (text: string) => void;
  // Kartı kapatır (yardımcı varsayılan kapalıdır; üst çubuktaki "Yardımcı" düğmesiyle açılır).
  onClose: () => void;
}

const OPTION_CLASS =
  `flex w-full min-w-0 cursor-pointer flex-col gap-1 rounded-xl border border-border-soft bg-card p-2.5 text-left hover:border-fg/30 hover:bg-bg-subtle ${motionFast} ${focusRing}`;

// Devir sonrası temsilci yardımcısı kartı (FAZ 7): kısa özet, müşterinin açık sorusu ve araçlarla hazırlanmış cevap
// seçenekleri. Seçenek tıklanınca yazma alanına gelir; köşeli parantezli boşluklar temsilcinin dolduracağı yerlerdir.
// Kart ekranın en çok %40'ını kaplar (içi kayar); başlık satırı — yenile ve kapat — hep görünür kalır.
export function AgentCopilotCard({ copilot, onUse, onClose }: Props) {
  const { dto, generating, error } = copilot;

  return (
    <section aria-label="Devir sonrası temsilci yardımcısı" className={`${surfaceCard} flex max-h-[40vh] min-h-0 min-w-0 flex-col`}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border-soft px-3 py-1.5">
        <Sparkles size={14} className="shrink-0 text-[var(--bot-accent)]" aria-hidden />
        <h3 className="m-0 min-w-0 flex-1 truncate text-ui-sm font-bold text-fg">Temsilci yardımcısı</h3>
        <button type="button" onClick={() => void copilot.refresh()} disabled={generating} aria-label="Önerileri yenile" title="Önerileri yenile"
          className={`flex size-7 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-subtle disabled:opacity-40 ${motionFast} ${focusRing}`}>
          <RefreshCw size={13} aria-hidden className={generating ? 'animate-spin motion-reduce:animate-none' : undefined} />
        </button>
        <button type="button" onClick={onClose} aria-label="Yardımcıyı kapat" title="Kapat"
          className={`flex size-7 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-subtle hover:text-fg ${motionFast} ${focusRing}`}>
          <X size={15} aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 min-w-0 flex-col gap-2 overflow-y-auto p-3">
        {generating && <p role="status" className="m-0 text-ui-xs text-fg-muted">Bot ürün ve fiyat bilgisini kontrol ederek seçenek hazırlıyor…</p>}
        {error && <p role="alert" className="m-0 text-ui-xs text-danger">{error}</p>}
        {dto?.summary && <p className="m-0 text-ui-xs text-fg-muted"><span className="font-semibold text-fg">Özet:</span> {dto.summary}</p>}
        {dto?.openQuestion && <p className="m-0 text-ui-xs text-fg"><span className="font-semibold">Müşterinin sorusu:</span> {dto.openQuestion}</p>}
        {dto?.state === COPILOT_STATE.Failed && (
          <p className="m-0 text-ui-xs text-fg-muted">Şu an öneri yok — cevabı kendiniz yazabilirsiniz.</p>
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          {dto?.options.map((option, index) => (
            <button key={`${dto.suggestionId}-${index}`} type="button" className={OPTION_CLASS}
              onClick={() => { const text = copilot.pick(index); if (text) onUse(text); }}>
              <span className="flex items-center gap-1.5">
                <span className="text-ui-xs font-semibold text-fg">{option.label}</span>
                {option.hasBlanks && <span className={`${badgeBase} ${badgeTone.warning}`}>Boşluk doldurulacak</span>}
              </span>
              <span className="whitespace-pre-wrap break-words text-ui-sm text-fg">{option.text}</span>
              {option.textTr && option.textTr !== option.text && (
                <span className="break-words text-ui-2xs text-fg-muted">TR: {option.textTr}</span>
              )}
            </button>
          ))}
        </div>
        {dto && dto.toolsUsed.length > 0 && (
          <p className="m-0 flex items-center gap-1 text-ui-2xs text-fg-subtle">
            <Wrench size={11} aria-hidden /> Kontrol edilen: {dto.toolsUsed.join(', ')}
          </p>
        )}
      </div>
    </section>
  );
}
