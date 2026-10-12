'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { ArrowLeft, Bot, BotOff, CheckCircle2, MoreHorizontal, UserRound } from 'lucide-react';
import type { ConversationSummaryDto } from '../../lib/api/omnichannel';
import { focusRing, motionFast } from '../shared/design';
import { ChannelPlatformIcon } from './ChannelPlatformIcon';
import { ConversationActionsSheet } from './ConversationActionsSheet';
import { ConversationAssignControl } from './ConversationAssignControl';
import { ConversationAvatar } from './ConversationAvatar';
import { contactTitle } from './contactTitle';
import { ConversationBadges } from './ConversationBadges';
import { ConversationCountry } from './ConversationCountry';
import { ConversationTopicControl } from './ConversationTopicControl';
import { channelIdentity } from './channelIdentity';
import { channelTypeMeta } from './shared';

export interface ChatHeaderProps {
  conversation: ConversationSummaryDto;
  // Kanalın markası (varsa); kanal kimliği satırında hesap adının yanında görünür.
  brandName?: string;
  canWrite: boolean;
  isMobile: boolean;
  onBack?: () => void;
  customerOpen: boolean;
  onToggleCustomer?: () => void;
  onToggleBot: () => void;
  onResolve: () => void;
  onChanged: (conversation: ConversationSummaryDto) => void;
  onError: (message: string) => void;
  // Telefonda: "Ayrıntılar" düğmesi (sayaç + kritik nokta); kişi adının hemen sağında durur.
  infoSlot?: ReactNode;
  // Masaüstünde: konu/sorumlu denetimlerinin yanında, tek satırlık küçük araç çubuğuna girenler
  // (çeviri, Ayrıntılar, Yardımcı). Böylece başlık dikeyde az yer kaplar, gelen kutusuna alan kalır.
  toolbarSlot?: ReactNode;
}

const CHANNEL_ICON_SIZE = 14;
const ICON_BUTTON_CLASS = `flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg ${motionFast} ${focusRing}`;

// Sohbet başlığı. Masaüstünde: kimlik + hızlı eylemler, tek satır rozetler, altında konu/sorumlu araç çubuğu.
// Telefonda yalnız geri + kişi + "⋯" — konu/atama/bot/çözüldü alttan açılan sayfaya taşınır ki mesajlara yer kalsın.
export function ChatHeader(props: ChatHeaderProps) {
  const {
    conversation, brandName, canWrite, isMobile, onBack, customerOpen, onToggleCustomer, onToggleBot, onResolve, onChanged, onError, infoSlot, toolbarSlot,
  } = props;
  const [actionsOpen, setActionsOpen] = useState(false);
  // Sabit referans: sayfa her render'da kapatıcısını yeniden kurmasın.
  const closeActions = useCallback(() => setActionsOpen(false), []);
  const title = contactTitle(conversation);
  const identity = channelIdentity({
    platformLabel: channelTypeMeta(conversation.channelType).label,
    channelName: conversation.channelName,
    brandName,
    country: conversation.country,
  });
  const buttonSize = isMobile ? 'size-10' : 'size-8';

  return (
    <header className="@container shrink-0 border-b border-border bg-card">
      <div className={`flex items-center ${isMobile ? 'gap-2 px-2 py-2' : 'gap-3 px-4 py-2'}`}>
        {onBack && (
          <button type="button" onClick={onBack} className={`${ICON_BUTTON_CLASS} ${buttonSize}`} aria-label="Konuşmalara dön">
            <ArrowLeft size={20} aria-hidden />
          </button>
        )}

        <ConversationAvatar name={title} channelType={conversation.channelType} />

        {/* Uzun ad/numara kesilir; kanal ikinci satırda. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="m-0 truncate text-ui-md font-bold text-fg" title={title}>{title}</h2>
          {/* E-posta: konu satırı adın altında (diğer kanallarda konu yok). */}
          {conversation.subject && (
            <span className="min-w-0 truncate text-ui-sm text-fg" title={conversation.subject}>{conversation.subject}</span>
          )}
          <span className="flex min-w-0 items-center gap-2 text-ui-xs text-fg-muted">
            <span className="flex min-w-0 items-center gap-1" title={identity.tooltip}>
              <ChannelPlatformIcon type={conversation.channelType} size={CHANNEL_ICON_SIZE} />
              <span className="min-w-0 truncate">{identity.label}</span>
              {brandName && <span className="hidden shrink-0 truncate text-fg-subtle @[420px]:inline">· {brandName}</span>}
            </span>
            <ConversationCountry code={conversation.country} />
          </span>
        </div>

        {isMobile && infoSlot}

        {isMobile ? (
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            className={`${ICON_BUTTON_CLASS} ${buttonSize}`}
            aria-label="Konuşma işlemleri"
            aria-haspopup="dialog"
          >
            <MoreHorizontal size={20} aria-hidden />
          </button>
        ) : (
          <DesktopActions
            canWrite={canWrite}
            isBotActive={conversation.isBotActive}
            customerOpen={customerOpen}
            onToggleCustomer={onToggleCustomer}
            onToggleBot={onToggleBot}
            onResolve={onResolve}
          />
        )}
      </div>

      {/* Rozetler tek satır: dar ekranda yatay kaydırılır, sarıp dağılmaz. Rozet yoksa satır hiç çizilmez. */}
      <div className={`flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] empty:hidden ${isMobile ? 'px-3 pb-2' : 'px-4 pb-1.5'}`}>
        <ConversationBadges conversation={conversation} />
      </div>

      {/* Masaüstü araç çubuğu: tek satır, sığmazsa yatay kayar. */}
      {!isMobile && (canWrite || toolbarSlot) && (
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto border-t border-border-soft px-4 py-1 [scrollbar-width:none]">
          {canWrite && (
            <>
              <ConversationTopicControl conversation={conversation} onChanged={onChanged} onError={onError} compact />
              <ConversationAssignControl conversation={conversation} onChanged={onChanged} onError={onError} compact />
            </>
          )}
          {canWrite && toolbarSlot && <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border-soft" />}
          {toolbarSlot}
        </div>
      )}

      {isMobile && (
        <ConversationActionsSheet
          open={actionsOpen}
          onClose={closeActions}
          conversation={conversation}
          canWrite={canWrite}
          onToggleCustomer={onToggleCustomer}
          onToggleBot={onToggleBot}
          onResolve={onResolve}
          onChanged={onChanged}
          onError={onError}
        />
      )}
    </header>
  );
}

interface DesktopActionsProps {
  canWrite: boolean;
  isBotActive: boolean;
  customerOpen: boolean;
  onToggleCustomer?: () => void;
  onToggleBot: () => void;
  onResolve: () => void;
}

function DesktopActions({ canWrite, isBotActive, customerOpen, onToggleCustomer, onToggleBot, onResolve }: DesktopActionsProps) {
  const botLabel = isBotActive ? 'Botu bu konuşmada durdur' : 'Botu bu konuşmada aç';
  const customerLabel = customerOpen ? 'Müşteri panelini kapat' : 'Müşteri panelini aç';

  return (
    <div className="flex shrink-0 items-center gap-1">
      {onToggleCustomer && (
        <button
          type="button"
          onClick={onToggleCustomer}
          aria-pressed={customerOpen}
          aria-label={customerLabel}
          title={customerLabel}
          className={`${ICON_BUTTON_CLASS} size-8 ${customerOpen ? 'bg-bg-subtle text-fg' : ''}`}
        >
          <UserRound size={16} aria-hidden />
        </button>
      )}
      {canWrite && (
        <>
          <button
            type="button"
            onClick={onToggleBot}
            aria-pressed={isBotActive}
            aria-label={botLabel}
            title={botLabel}
            className={`${ICON_BUTTON_CLASS} size-8 ${isBotActive ? 'text-[var(--bot-accent)]' : ''}`}
          >
            {isBotActive ? <Bot size={16} aria-hidden /> : <BotOff size={16} aria-hidden />}
          </button>
          <button
            type="button"
            onClick={onResolve}
            aria-label="Çözüldü olarak işaretle"
            className={`ml-1 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-ui-sm font-semibold text-fg hover:bg-bg-subtle ${motionFast} ${focusRing}`}
            title="Çözüldü olarak işaretle"
          >
            <CheckCircle2 size={14} aria-hidden />
            {/* Başlık darsa (müşteri paneli açıkken) yalnız simge kalır. */}
            <span className="hidden @[520px]:inline">Çözüldü</span>
          </button>
        </>
      )}
    </div>
  );
}
