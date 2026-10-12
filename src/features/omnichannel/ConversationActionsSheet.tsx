'use client';

import type { ReactNode } from 'react';
import { Bot, BotOff, CheckCircle2, UserRound, type LucideIcon } from 'lucide-react';
import type { ConversationSummaryDto } from '../../lib/api/omnichannel';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ConversationAssignControl } from './ConversationAssignControl';
import { ConversationTopicControl } from './ConversationTopicControl';

interface Props {
  open: boolean;
  onClose: () => void;
  conversation: ConversationSummaryDto;
  canWrite: boolean;
  onToggleCustomer?: () => void;
  onToggleBot: () => void;
  onResolve: () => void;
  onChanged: (conversation: ConversationSummaryDto) => void;
  onError: (message: string) => void;
}

// Telefonda sohbet başlığının "⋯" sayfası: masaüstünde başlıkta duran konu, atama,
// bot ve çözüldü kontrolleri burada, başparmakla erişilebilir satırlar olarak.
export function ConversationActionsSheet({
  open, onClose, conversation, canWrite, onToggleCustomer, onToggleBot, onResolve, onChanged, onError,
}: Props) {
  // Tek seferlik işlemden sonra sayfa kapanır; seçiciler açık kalır ki yeni değer görünsün.
  const runAndClose = (action: () => void) => () => { action(); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose} title="Konuşma işlemleri">
      <div className="flex flex-col gap-1 px-3 pb-2">
        {canWrite && (
          <>
            <SheetRow label="Konu">
              <ConversationTopicControl conversation={conversation} onChanged={onChanged} onError={onError} large />
            </SheetRow>
            <SheetRow label="Sorumlu">
              <ConversationAssignControl conversation={conversation} onChanged={onChanged} onError={onError} large />
            </SheetRow>
            <SheetAction
              Icon={conversation.isBotActive ? BotOff : Bot}
              label={conversation.isBotActive ? 'Botu bu konuşmada durdur' : 'Botu bu konuşmada aç'}
              onClick={runAndClose(onToggleBot)}
            />
            <SheetAction Icon={CheckCircle2} label="Çözüldü olarak işaretle" onClick={runAndClose(onResolve)} />
          </>
        )}
        {onToggleCustomer && (
          <SheetAction Icon={UserRound} label="Müşteri panelini aç" onClick={runAndClose(onToggleCustomer)} />
        )}
      </div>
    </BottomSheet>
  );
}

function SheetRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--border-soft)] px-2 py-1.5">
      <span className="text-ui-sm font-semibold text-[var(--fg-muted)]">{label}</span>
      {children}
    </div>
  );
}

function SheetAction({ Icon, label, onClick }: { Icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 items-center gap-3 rounded-xl px-2 text-left text-ui-md font-semibold text-[var(--fg)] transition-colors active:bg-[var(--bg-subtle)]"
    >
      <Icon size={18} className="text-[var(--fg-muted)]" aria-hidden />
      {label}
    </button>
  );
}
