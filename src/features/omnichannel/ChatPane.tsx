'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Sparkles, FileText, Wand2 } from 'lucide-react';
import {
  omnichannelApi, CONVERSATION_STATUS,
  type CannedReplyDto, type ConversationSummaryDto, type InboxChannelDto, type MessageDto, type BotReplyDraftDto,
  type MessageStatusChangedDto,
} from '../../lib/api/omnichannel';
import { useMobile } from '../../hooks/useMobile';
import { useAuthStore } from '../../stores/auth';
import { MessageBubble } from './MessageBubble';
import { MessageThread } from './MessageThread';
import { focusRing, motionFast } from '../shared/design';
import { MetaWindowNotice, ServiceWindowNotice } from './ServiceWindowNotice';
import { ChatHeader } from './ChatHeader';
import { ConversationInfoButton } from './ConversationInfoButton';
import { ConversationInfoDrawer } from './ConversationInfoDrawer';
import { ConversationInfoPanel } from './ConversationInfoPanel';
import { TemplatePickerDialog } from './TemplatePickerDialog';
import { AutoTranslateToggle } from './AutoTranslateToggle';
import { TranslationPreview } from './TranslationPreview';
import { TranscriptTranslateBar } from './TranscriptTranslateBar';
import { useTranscriptTranslation } from './useTranscriptTranslation';
import { countUntranslated, differsFromOriginal, isTranscriptTranslatable } from './transcriptTranslationRules';
import { PilotDraftCard } from './PilotDraftCard';
import { ConsultationPanel } from './ConsultationPanel';
import { AgentCopilotCard } from './AgentCopilotCard';
import { CopilotToggleButton } from './CopilotToggleButton';
import { useAgentCopilot } from './useAgentCopilot';
import { hasBlanks } from './copilotRules';
import { BotInstructionPanel } from './BotInstructionPanel';
import { BotInstructionsSection } from './BotInstructionsSection';
import { activeInstructions, instructionNotes } from './botInstructionRules';
import { useConversationInstructions } from './useConversationInstructions';
import { useBotInstructionPanel } from './useBotInstructionPanel';
import { ComposerInputRow } from './ComposerInputRow';
import { useConversationDigest } from './useConversationDigest';
import { summarizeConversationInfo, useConversationInfo } from './useConversationInfo';
import { useConversationWindows } from './useConversationWindows';
import { useOutgoingTranslation } from './useOutgoingTranslation';
import { useCustomerLanguage } from './useCustomerLanguage';
import { useChatMessages } from './useChatMessages';
import { useChatScroll } from './useChatScroll';
import { OlderMessagesSentinel } from './OlderMessagesSentinel';
import { useChatComposer } from './useChatComposer';
import { useAddToGoldSet } from './useAddToGoldSet';
import { useFlagWrongMessage } from './useFlagWrongMessage';
import { useMessageDeletion } from './useMessageDeletion';
import { appendUnique, lastInboundId } from './chatMessages';
import { cannedReplyOrigin, isForeignLanguage } from './outgoingTranslation';
import { describeError } from '../../lib/errors';

interface Props {
  conversation: ConversationSummaryDto;
  channel: InboxChannelDto | undefined;
  // Canlı gelen mesajlar üst bileşende toplanır ve buraya akar.
  liveMessages: MessageDto[];
  // Tik güncellemeleri — REST'ten yüklenmiş mesajlara da uygulanır.
  statusChanges: MessageStatusChangedDto[];
  // Değiştiğinde mesajlar REST'ten yeniden yüklenir (SignalR yeniden bağlandı).
  reloadToken: number;
  onBack?: () => void;
  // Sunucudan dönen güncel konuşma (bot/durum/konu/atama değişti).
  onConversationChanged: (conversation: ConversationSummaryDto) => void;
  // Yerel kısmi güncelleme — bayat konuşma nesnesi (ör. okunmamış sayı) listeye geri yazılmasın.
  onConversationPatched: (conversationId: number, patch: Partial<ConversationSummaryDto>) => void;
  // Müşteri paneli (Faz 4 CRM) aç/kapa.
  customerOpen?: boolean;
  onToggleCustomer?: () => void;
}

const COMPOSER_CHIP_CLASS =
  `inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3 text-ui-sm font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg ${motionFast} ${focusRing}`;

export function ChatPane({
  conversation, channel, liveMessages, statusChanges, reloadToken, onBack, onConversationChanged,
  onConversationPatched, customerOpen = false, onToggleCustomer,
}: Props) {
  const isMobile = useMobile();
  const myId = useAuthStore((state) => state.user?.id ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  // Ekip tanımlı kanalda ekip dışı kullanıcı yalnız okur (backend de 403 döner).
  // Alanı göndermeyen eski backend'de yazma açık kalır.
  const canWrite = channel?.canWrite ?? true;
  const [templateOpen, setTemplateOpen] = useState(false);
  // "Ayrıntılar" paneli varsayılan kapalı: devir/takip/sipariş/özet mesajların yerini kaplamasın.
  const [infoOpen, setInfoOpen] = useState(false);
  const infoPanelId = useId();
  const copilotPanelId = useId();
  // Temsilci yardımcısı varsayılan KAPALI: üst çubuktaki "Yardımcı" düğmesiyle açılır. "Ayrıntılar" ile aynı anda açık
  // durmaz (ikisi de mesajların üstünü kaplar; üst üste binmesin).
  const [copilotOpen, setCopilotOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const windows = useConversationWindows(conversation, canWrite);
  const { isWhatsApp, serviceWindow, agentWindow, freeTextBlocked } = windows;

  const scrollRef = useRef<HTMLDivElement>(null);

  const chat = useChatMessages(conversation.id, liveMessages, statusChanges, reloadToken);
  const { messages, setMessages, pilotDrafts, setPilotDrafts } = chat;
  const error = actionError ?? chat.loadError;

  // Çeviri yardımcıları (Gelen Kutusu v2 §4). Dil özetten BAĞIMSIZ ve modelsiz gelir; yeni
  // müşteri mesajında yeniden sorulur. Dil uç yoksa (eski backend) özetin dili kullanılır.
  const { digest, loading: digestLoading, refresh: refreshDigest } = useConversationDigest(conversation.id);
  const quickLanguage = useCustomerLanguage(conversation.id, chat.loading ? undefined : lastInboundId(messages));
  const customerLanguage = quickLanguage ?? digest?.customerLanguage ?? null;
  const outgoing = useOutgoingTranslation(conversation.id, customerLanguage);
  const transcript = useTranscriptTranslation(conversation.id);
  const translatableCount = useMemo(() => messages.filter(isTranscriptTranslatable).length, [messages]);
  const untranslatedCount = useMemo(
    () => countUntranslated(messages, new Set(transcript.translations.keys())),
    [messages, transcript.translations],
  );
  const info = useConversationInfo({ conversationId: conversation.id, reloadToken, messageCount: messages.length });
  // "Bota talimat ver": yeni mesajda tek seferlik talimat düşmüş olabilir, liste tazelenir.
  const instructions = useConversationInstructions(conversation.id, reloadToken + messages.length);
  const instructionNoteList = useMemo(() => instructionNotes(instructions.instructions), [instructions.instructions]);
  const currentInstructions = activeInstructions(instructions.instructions);
  const instructionPanel = useBotInstructionPanel({
    conversationId: conversation.id,
    create: instructions.create,
    onReplySent: () => void chat.reload(),
  });
  const infoSummary = summarizeConversationInfo(info, {
    digest,
    windowWarning: windows.warning,
    pendingConsultation: canWrite && conversation.pendingConsultation === true,
  });
  // Çekmece kapanınca odak açan düğmeye döner (klavye kullanıcısı kaybolmasın).
  const closeInfo = () => {
    setInfoOpen(false);
    infoButtonRef.current?.focus();
  };
  const toggleInfo = () => {
    setInfoOpen((open) => !open);
    setCopilotOpen(false);
  };
  const toggleCopilot = () => {
    setCopilotOpen((open) => !open);
    setInfoOpen(false);
  };

  // Temsilci yazınca sunucu botu her durumda kapatır — bayat isBotActive'e bakılmaz.
  const markBotStopped = () => onConversationPatched(conversation.id, { isBotActive: false });
  const flagWrong = useFlagWrongMessage();
  const addToGold = useAddToGoldSet();
  const deleteMessage = useMessageDeletion({ conversationId: conversation.id, setMessages, onConversationChanged });
  // Devir sonrası temsilci yardımcısı (FAZ 7): yeni müşteri mesajında seçenekler yenilenir.
  // Öneri üretimi (token harcar) yalnız yardımcı açıkken yapılır; kapalıyken kayıtlı öneri okunur.
  const copilot = useAgentCopilot(conversation.id, chat.loading ? null : lastInboundId(messages), canWrite, copilotOpen);
  const composer = useChatComposer({
    conversationId: conversation.id,
    myId,
    outgoing,
    setMessages,
    onAgentSent: (body) => {
      markBotStopped();
      copilot.recordSent(body);
    },
    setError: setActionError,
  });
  // Yardımcıdan alınan metinde doldurulmamış "[...]" boşluğu varsa gönderilmez.
  const sendDraft = () => {
    if (copilot.hasPicked() && hasBlanks(composer.draft)) {
      setActionError('Köşeli parantezli boşlukları doldurmadan gönderemezsiniz.');
      return;
    }
    void composer.send();
  };

  // Yeni mesajda en alta iner; yukarıda eski sayfa yüklenince okunan yer korunur.
  useChatScroll(scrollRef, messages);

  // Agent Copilot (Faz 8) — taslak yanıtı YAZMA ALANINA doldurur, göndermez. Öneri
  // müşterinin dilinde üretilir; yeniden çevrilmez.
  const suggestReply = async () => {
    setSuggesting(true);
    setActionError(null);
    try {
      const { text } = await omnichannelApi.suggestReply(conversation.id);
      if (text) composer.changeDraft(text, 'customerLanguage');
      else setActionError('Öneri üretilemedi, elle yazabilirsiniz.');
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setSuggesting(false);
    }
  };

  const runConversationAction = async (action: () => Promise<ConversationSummaryDto>) => {
    try {
      onConversationChanged(await action());
    } catch (e) {
      setActionError(describeError(e));
    }
  };

  // Güncel değer prop'tan okunur — InboxTab canlı olaylarla konuşmayı tazeler.
  const toggleBot = () => runConversationAction(() => omnichannelApi.setBotActive(conversation.id, !conversation.isBotActive));
  const resolve = () => runConversationAction(() => omnichannelApi.setStatus(conversation.id, CONVERSATION_STATUS.Resolved));

  // Kart açıldı/kapandı bilgisi canlı güncellemeyle konuşma nesnesine gelir; mesaj ve yeniden bağlanma da tazeler.
  const consultRefreshKey = `${reloadToken}:${messages.length}:${conversation.pendingConsultation === true}`;
  const handleConsultAnswered = () => {
    onConversationPatched(conversation.id, { pendingConsultation: false });
    void chat.reload();
  };

  const removePilotDraft = (id: number) => setPilotDrafts((prev) => prev.filter((x) => x.id !== id));

  const approvePilotDraft = async (item: BotReplyDraftDto) => {
    try {
      await omnichannelApi.approveBotDraft(item.id);
      removePilotDraft(item.id);
      await chat.reload();
    } catch (e) { setActionError(describeError(e)); }
  };

  // Bot taslağı müşterinin dilindedir — düzenlenip gönderilirken yeniden çevrilmez.
  const editPilotDraft = async (item: BotReplyDraftDto) => {
    composer.changeDraft(item.body, 'customerLanguage');
    try {
      await omnichannelApi.rejectBotDraft(item.id);
      removePilotDraft(item.id);
    } catch (e) { setActionError(describeError(e)); }
  };

  const rejectPilotDraft = async (item: BotReplyDraftDto) => {
    try {
      await omnichannelApi.rejectBotDraft(item.id);
      removePilotDraft(item.id);
    } catch (e) { setActionError(describeError(e)); }
  };

  const appendSent = (saved: MessageDto) => {
    setMessages((prev) => appendUnique(prev, [saved]));
    markBotStopped();
  };

  const pickCannedReply = (reply: CannedReplyDto) => composer.changeDraft(reply.body, cannedReplyOrigin(reply.language));

  // Toplu çeviri açıkken (gizli değilse) mesajın çevirisi; aslıyla aynıysa (zaten hedef dilde) gösterilmez.
  const transcriptTranslationOf = (message: MessageDto) => {
    const text = transcript.visible ? transcript.translations.get(message.id) : undefined;
    if (text === undefined || transcript.translatedLanguage === null || !differsFromOriginal(message.body, text)) return undefined;
    return { text, language: transcript.translatedLanguage };
  };

  const composerOpen = canWrite && !freeTextBlocked;
  const translateToggle = composerOpen && outgoing.relevant && (
    <AutoTranslateToggle
      targetLanguage={isForeignLanguage(customerLanguage) ? customerLanguage : null}
      enabled={outgoing.enabled}
      onChange={outgoing.setEnabled}
      compact={isMobile}
    />
  );
  const showTemplateButton = composerOpen && isWhatsApp;
  // Yalnızca bot devredilmişken anlamlı — bot açıkken zaten kendisi cevaplıyor.
  const showSuggestButton = composerOpen && !conversation.isBotActive;
  const translateOnSend = outgoing.relevant && outgoing.enabled;

  // Açık pencerenin uyarısı (kapanmak üzere / insan temsilci etiketi) "Ayrıntılar" panelinde durur.
  const infoWindowNotice = windows.warning === 'whatsappClosingSoon'
    ? <ServiceWindowNotice {...serviceWindow} onPickTemplate={() => setTemplateOpen(true)} />
    : windows.warning === 'metaAgentTag' && <MetaWindowNotice agentWindowOpen agentRemainingMs={agentWindow.remainingMs} />;

  const infoButton = (
    <ConversationInfoButton
      summary={infoSummary}
      open={infoOpen}
      onToggle={toggleInfo}
      controlsId={isMobile ? undefined : infoPanelId}
      isMobile={isMobile}
      compact={!isMobile}
      buttonRef={infoButtonRef}
    />
  );
  const copilotAvailable = canWrite && (copilot.visible || copilot.generating);
  const copilotButton = copilotAvailable && (
    <CopilotToggleButton
      open={copilotOpen}
      onToggle={toggleCopilot}
      optionCount={copilot.dto?.options.length ?? 0}
      generating={copilot.generating}
      controlsId={copilotPanelId}
    />
  );

  return (
    <div className="flex h-full min-w-0 flex-col">
      <ChatHeader
        conversation={conversation}
        brandName={channel?.brandName ?? undefined}
        canWrite={canWrite}
        isMobile={isMobile}
        onBack={onBack}
        customerOpen={customerOpen}
        onToggleCustomer={onToggleCustomer}
        onToggleBot={() => void toggleBot()}
        onResolve={() => void resolve()}
        onChanged={onConversationChanged}
        onError={setActionError}
        infoSlot={isMobile ? infoButton : undefined}
        toolbarSlot={isMobile ? undefined : (
          <>
            <TranscriptTranslateBar
              translation={transcript}
              translatableCount={translatableCount}
              untranslatedCount={untranslatedCount}
              compact
            />
            <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-border-soft" />
            {infoButton}
            {copilotButton}
          </>
        )}
      />

      {/* Mesajlar — kalan tüm yüksekliği alır. Zemin hafif gri: beyaz müşteri balonu ancak böyle ayrışıyor.
          "Ayrıntılar" çekmecesi bu alanın üstüne açılır; yazma alanını örtmez. */}
      {isMobile && (
        <TranscriptTranslateBar
          translation={transcript}
          translatableCount={translatableCount}
          untranslatedCount={untranslatedCount}
        />
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-bg px-3 py-4 [overflow-anchor:none] md:px-6 md:py-5">
          <OlderMessagesSentinel older={chat.older} rootRef={scrollRef} />
          <MessageThread
            messages={messages}
            loading={chat.loading}
            notes={instructionNoteList}
            renderMessage={(m, showSender) => (
              <MessageBubble
                message={m}
                showSender={showSender}
                supportsDeliveryReceipts={channel?.supportsDeliveryReceipts ?? false}
                supportsReadReceipts={channel?.supportsReadReceipts ?? false}
                onRetry={composer.retry}
                onDelete={canWrite ? deleteMessage : undefined}
                translatable={isForeignLanguage(customerLanguage)}
                channelType={conversation.channelType}
                onFlagWrong={canWrite ? (bot) => { void flagWrong.flag(bot.id); } : undefined}
                flagged={flagWrong.flaggedIds.has(m.id)}
                onAddToGold={canWrite ? (agent) => { void addToGold.add(agent.id); } : undefined}
                addedToGold={addToGold.addedIds.has(m.id)}
                transcriptTranslation={transcriptTranslationOf(m)}
              />
            )}
          />
        </div>
        <ConversationInfoDrawer id={infoPanelId} open={infoOpen} onClose={closeInfo} isMobile={isMobile}>
          <ConversationInfoPanel
            info={info}
            digest={digest}
            digestLoading={digestLoading}
            onRefreshDigest={refreshDigest}
            windowNotice={infoWindowNotice}
            instructionsSection={currentInstructions.length > 0 && (
              <BotInstructionsSection instructions={currentInstructions} canWrite={canWrite} onRemove={instructions.remove} />
            )}
            canWrite={canWrite}
          />
        </ConversationInfoDrawer>
      </div>

      {/* Yazma alanı — telefonda alttaki güvenli alan (ana ekran çubuğu) kadar boşluk bırakır. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-card px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {error && <span className="text-ui-sm text-[var(--danger)]">{error}</span>}

        {!canWrite && (
          <span className="text-xs text-[var(--fg-muted)]">
            {channel?.isActive === false
              ? 'Kanal pasif — geçmiş yazışmaları görebilirsiniz; cevap yazmak için kanalı Kanallar ekranından aktif edin.'
              : 'Bu kanalın ekibinde değilsiniz — konuşmayı görebilirsiniz, yalnızca kanal ekibi yazabilir.'}
          </span>
        )}

        {canWrite && (
          <ConsultationPanel
            conversationId={conversation.id}
            refreshKey={consultRefreshKey}
            onAnswered={handleConsultAnswered}
          />
        )}

        {canWrite && copilotOpen && (
          <div id={copilotPanelId}>
            <AgentCopilotCard
              copilot={copilot}
              onUse={(text) => composer.changeDraft(text, 'customerLanguage')}
              onClose={() => setCopilotOpen(false)}
            />
          </div>
        )}

        {canWrite && pilotDrafts.map((item) => (
          <PilotDraftCard
            key={item.id}
            draft={item}
            onApprove={() => void approvePilotDraft(item)}
            onEdit={() => void editPilotDraft(item)}
            onReject={() => void rejectPilotDraft(item)}
          />
        ))}

        {/* Pencere kapalı: yazma alanı gizlenir, nedeni burada söylenir. Kapanmak üzere uyarısı "Ayrıntılar"da. */}
        {windows.whatsappClosed && (
          <ServiceWindowNotice {...serviceWindow} onPickTemplate={() => setTemplateOpen(true)} />
        )}

        {windows.metaClosed && <MetaWindowNotice agentWindowOpen={false} agentRemainingMs={agentWindow.remainingMs} />}

        {canWrite && instructionPanel.open && (
          <BotInstructionPanel key={conversation.id} panel={instructionPanel} />
        )}

        {canWrite && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Pencere açıkken de şablon gönderilebilir (ör. hazır kargo bildirimi). */}
            {showTemplateButton && (
              <button type="button" onClick={() => setTemplateOpen(true)} className={COMPOSER_CHIP_CLASS}>
                <FileText size={13} aria-hidden />
                Şablon gönder
              </button>
            )}
            {showSuggestButton && (
              <button
                type="button"
                onClick={() => void suggestReply()}
                disabled={suggesting}
                className={`${COMPOSER_CHIP_CLASS} disabled:opacity-60`}
              >
                <Sparkles size={13} aria-hidden />
                {suggesting ? 'Öneri hazırlanıyor…' : 'Cevap öner'}
              </button>
            )}
            {/* Bot açıkken de, devirdeyken de: talimat saklanır, bot cevaplarında uygular. */}
            <button
              type="button"
              onClick={instructionPanel.toggle}
              aria-expanded={instructionPanel.open}
              className={COMPOSER_CHIP_CLASS}
            >
              <Wand2 size={13} aria-hidden />
              Bota talimat ver
            </button>
          </div>
        )}

        {!isMobile && translateToggle}

        {composerOpen && outgoing.translating && (
          <span className="text-xs text-[var(--fg-muted)]" aria-live="polite">Çevriliyor…</span>
        )}

        {composerOpen && translateOnSend && composer.draftOrigin === 'customerLanguage' && composer.draft.trim() !== '' && (
          <span className="text-xs text-[var(--fg-muted)]">Metin müşterinin dilinde — çevrilmeden gönderilir.</span>
        )}

        {composerOpen && composer.preview && (
          <TranslationPreview
            preview={composer.preview}
            attachmentName={composer.pendingAttachmentName}
            sending={composer.sending}
            onChange={outgoing.editPreview}
            onSend={() => void composer.sendPreview()}
            onCancel={composer.cancelPreview}
          />
        )}

        {composerOpen && (
          <ComposerInputRow
            draft={composer.draft}
            onDraftChange={composer.changeDraft}
            onPickCannedReply={pickCannedReply}
            onSend={sendDraft}
            onFileSelected={(file) => void composer.sendFile(file)}
            sending={composer.sending}
            translating={outgoing.translating}
            translateOnSend={translateOnSend && composer.draftOrigin === 'agent'}
            isMobile={isMobile}
            leadingControl={isMobile ? translateToggle : undefined}
          />
        )}
      </div>

      {templateOpen && (
        <TemplatePickerDialog
          conversationId={conversation.id}
          onClose={() => setTemplateOpen(false)}
          onSent={appendSent}
        />
      )}
    </div>
  );
}
