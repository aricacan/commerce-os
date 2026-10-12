import { AlertTriangle, CircleHelp, MessageCircleReply } from 'lucide-react';
import type { ConversationSummary } from './conversationGroups';
import { ConversationToneLegend } from './ConversationToneLegend';
import { URGENT_HINT } from './stageRules';

interface Props {
  summary: ConversationSummary;
}

// Liste başlığı: "kaç konuşma" + yalnız sıfırdan büyükse acil / cevap bekleyen sayacı + renk
// açıklaması düğmesi. Yüzlerce konuşmada nereye bakılacağını tek satırda söyler.
export function ConversationListSummary({ summary }: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border-soft px-4 py-2 text-ui-xs text-fg-muted">
      <span className="font-semibold tabular-nums text-fg">{summary.total} konuşma</span>
      {summary.urgent > 0 && (
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-danger">
          <AlertTriangle size={11} aria-hidden /> {summary.urgent} acil
          <span title={URGENT_HINT} aria-label={URGENT_HINT} role="img" className="inline-flex cursor-help text-fg-subtle">
            <CircleHelp size={11} aria-hidden />
          </span>
        </span>
      )}
      {summary.awaitingReply > 0 && (
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-warning">
          <MessageCircleReply size={11} aria-hidden /> {summary.awaitingReply} cevap bekliyor
        </span>
      )}
      <ConversationToneLegend />
    </div>
  );
}

