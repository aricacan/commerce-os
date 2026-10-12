'use client';

import { formatTime } from '@/lib/format';
import {
  Check, Clock, AlertCircle, Image as ImageIcon, Video, Mic, FileText, MapPin,
  Sticker, Contact, HelpCircle, type LucideIcon,
} from 'lucide-react';
import {
  DELIVERY_STATUS, MESSAGE_CONTENT_TYPE,
  type ChannelType, type DeliveryStatus, type MessageDto,
} from '../../lib/api/omnichannel';
import { useAuthStore } from '../../stores/auth';
import { AddToGoldButton } from './AddToGoldButton';
import { FailedMessageActions } from './FailedMessageActions';
import { FlagWrongButton } from './FlagWrongButton';
import { MessageAttachments } from './MessageAttachments';
import { MessageTranslation } from './MessageTranslation';
import { SenderBadge } from './SenderBadge';
import { TranscriptMessageTranslation } from './TranscriptMessageTranslation';
import { canFlagWrong } from './correctionRules';
import { canAddToGold } from './goldSetRules';
import { canDeleteMessage } from './messageDeletionRules';
import { AGENT_FALLBACK_LABEL, agentNameOf, isOutgoingSender, senderKindOf, senderLabelOf } from './messageSender';
import { SENDER_BUBBLE_CLASS, SENDER_META_CLASS } from './senderStyles';
import { useMessageTranslation } from './useMessageTranslation';

interface Props {
  message: MessageDto;
  // Kanalın yetenekleri — desteklenmeyen aşama için tik yerine açıklama gösterilir.
  supportsDeliveryReceipts: boolean;
  supportsReadReceipts: boolean;
  // Test Alanında gerçek kanal yok: tik anlamsız, gösterilmez.
  showDeliveryStatus?: boolean;
  // Gönderilemeyen temsilci/bot mesajını yazma alanına geri koyar.
  onRetry?: (message: MessageDto) => void;
  // Gönderilemeyen temsilci mesajını siler (Meta 24 saat penceresi reddi gibi); Test Alanında yok.
  onDelete?: (message: MessageDto) => Promise<void>;
  // Konuşma Türkçe değilse her mesaj (müşteri, bot, temsilci) Türkçeye çevrilebilir (Gelen Kutusu v2 §4).
  translatable?: boolean;
  // Panel dışından yazılan cevabın etiketi için ("Facebook'tan"); Test Alanında yok.
  channelType?: ChannelType;
  // Bot mesajını "yanlış" işaretler (P36). Yalnız yazma yetkisi olan temsilciye verilir; Test Alanında yok.
  onFlagWrong?: (message: MessageDto) => void;
  flagged?: boolean;
  // Temsilci cevabını Kalite Merkezi senaryolarına ekler (P35). Yalnız yazma yetkisi olan temsilciye verilir; Test Alanında yok.
  onAddToGold?: (message: MessageDto) => void;
  addedToGold?: boolean;
  // Giden mesajın üstündeki gönderen rozeti. Sohbet akışı ardışık aynı gönderende yalnız ilkine verir;
  // ötekilerde etiket saat satırında küçük yazılır — her giden balonun kimin olduğu okunur.
  showSender?: boolean;
  // "Tüm sohbeti çevir" sonucu. Varsa tek-mesaj çevirisi yerine bu gösterilir (aynı mesajda iki kutu olmasın).
  transcriptTranslation?: { text: string; language: string };
}

// Metinsiz medya mesajı boş balon çizmesin: ek adresi yoksa (ör. indirilemeyen WhatsApp
// medyası) türüne göre etiketli bir yer tutucu gösterilir.
const MEDIA_PLACEHOLDER: Record<number, { Icon: LucideIcon; label: string }> = {
  [MESSAGE_CONTENT_TYPE.Image]: { Icon: ImageIcon, label: 'Fotoğraf' },
  [MESSAGE_CONTENT_TYPE.Video]: { Icon: Video, label: 'Video' },
  [MESSAGE_CONTENT_TYPE.Audio]: { Icon: Mic, label: 'Sesli mesaj' },
  [MESSAGE_CONTENT_TYPE.Document]: { Icon: FileText, label: 'Belge' },
  [MESSAGE_CONTENT_TYPE.Location]: { Icon: MapPin, label: 'Konum' },
  [MESSAGE_CONTENT_TYPE.Sticker]: { Icon: Sticker, label: 'Çıkartma' },
  [MESSAGE_CONTENT_TYPE.ContactCard]: { Icon: Contact, label: 'Kişi kartı' },
};
const UNSUPPORTED_PLACEHOLDER = { Icon: HelpCircle, label: 'Desteklenmeyen içerik' };

function MediaPlaceholder({ contentType }: { contentType: number }) {
  const { Icon, label } = MEDIA_PLACEHOLDER[contentType] ?? UNSUPPORTED_PLACEHOLDER;
  return (
    <span className="inline-flex items-center gap-1.5 italic opacity-85">
      <Icon size={14} aria-hidden /> {label}
    </span>
  );
}

// Tik göstergesi. Renk balonun meta tonundan (currentColor) gelir — koyu temsilci
// balonunda açık, indigo bot balonunda indigo.
//
// Tasarım kararı: kanalın desteklemediği aşama için tik ÇİZİLMEZ ama kullanıcı da
// karanlıkta bırakılmaz — başlıkta (title) neden gelmediği yazar. Sessizce eksik tik
// "sistem bozuk mu?" algısı yaratır; en sık gelen destek sorusu budur.
function DeliveryTicks({ status, supportsDelivery, supportsRead }: {
  status: DeliveryStatus;
  supportsDelivery: boolean;
  supportsRead: boolean;
}) {
  if (status === DELIVERY_STATUS.Pending) return <Clock size={13} aria-label="Gönderiliyor" />;
  if (status === DELIVERY_STATUS.Failed) return <AlertCircle size={13} aria-label="Gönderilemedi" />;

  // Kaç tik çizileceği: gönderildi 1, ulaştı 2, görüldü 3.
  const tickCount = status === DELIVERY_STATUS.Read ? 3
    : status === DELIVERY_STATUS.Delivered ? 2
    : 1;

  const isRead = status === DELIVERY_STATUS.Read;
  const hint = isRead ? 'Görüldü'
    : status === DELIVERY_STATUS.Delivered
      ? (supportsRead ? 'Ulaştı — henüz görülmedi' : 'Ulaştı (bu kanal okundu bilgisi vermez)')
      : (supportsDelivery ? 'Gönderildi' : 'Gönderildi (bu kanal teslim bilgisi vermez)');

  // Tikler üst üste bindirilerek WhatsApp'ın tanıdık görünümü elde ediliyor.
  return (
    <span className={`inline-flex items-center ${isRead ? 'opacity-100' : 'opacity-80'}`} title={hint} aria-label={hint}>
      {Array.from({ length: tickCount }, (_, i) => (
        <Check key={i} size={13} className={i === 0 ? undefined : '-ml-[7px]'} />
      ))}
    </span>
  );
}

// Kullanıcı metin seçiyorsa (kopyalamak için sürüklediyse) tıklama çeviri açmasın.
function hasTextSelection(): boolean {
  return (window.getSelection()?.toString().length ?? 0) > 0;
}

export function MessageBubble({
  message, supportsDeliveryReceipts, supportsReadReceipts, showDeliveryStatus = true, onRetry, onDelete, translatable = false,
  channelType, onFlagWrong, flagged = false, onAddToGold, addedToGold = false, showSender = true,
  transcriptTranslation,
}: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);
  const translation = useMessageTranslation(message.id);
  const kind = senderKindOf(message);
  const label = senderLabelOf(message, currentUserId, channelType);

  if (kind === 'system') {
    return (
      <div className="flex flex-col items-center gap-1 self-center">
        <span className="text-ui-2xs font-semibold text-[var(--fg-muted)]">{label}</span>
        <p className="rounded-2xl bg-[var(--bg-subtle)] px-3 py-1 text-center text-ui-xs text-[var(--fg-muted)]">
          {message.body}
        </p>
      </div>
    );
  }

  const isOutgoing = isOutgoingSender(kind);
  const failed = message.deliveryStatus === DELIVERY_STATUS.Failed;
  const attachments = message.attachments ?? [];
  // Geçici (negatif id) balon henüz sunucuda yok — çevrilemez.
  const canTranslate = translatable && !!message.body && message.id > 0 && !transcriptTranslation;

  const time = formatTime(message.createdAt);

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] flex-col gap-1 md:max-w-[68%] ${isOutgoing ? 'items-end' : 'items-start'}`}>
        {showSender && isOutgoingSender(kind) && (
          <SenderBadge kind={kind} label={label} avatarName={agentNameOf(message, currentUserId) ?? AGENT_FALLBACK_LABEL} />
        )}

        <div
          onClick={canTranslate ? () => { if (!hasTextSelection()) translation.toggle(); } : undefined}
          className={`whitespace-pre-wrap break-words px-3.5 py-2 text-ui-md leading-relaxed ${SENDER_BUBBLE_CLASS[kind]} ${
            canTranslate ? 'cursor-pointer' : ''
          }`}
        >
          <MessageAttachments attachments={attachments} />
          {message.body
            || (attachments.length === 0 && message.contentType !== MESSAGE_CONTENT_TYPE.Text
              && <MediaPlaceholder contentType={message.contentType} />)}

          <span className={`mt-1 flex items-center justify-end gap-1.5 text-ui-2xs ${SENDER_META_CLASS[kind]}`}>
            {isOutgoing && !showSender && <span className="font-semibold">{label} ·</span>}
            {time}
            {isOutgoing && showDeliveryStatus && (
              <DeliveryTicks
                status={message.deliveryStatus}
                supportsDelivery={supportsDeliveryReceipts}
                supportsRead={supportsReadReceipts}
              />
            )}
          </span>
        </div>

        {transcriptTranslation && (
          <TranscriptMessageTranslation
            text={transcriptTranslation.text}
            language={transcriptTranslation.language}
            align={isOutgoing ? 'end' : 'start'}
          />
        )}

        {canTranslate && (
          <MessageTranslation
            translation={translation.translation}
            visible={translation.visible}
            loading={translation.loading}
            error={translation.error}
            onToggle={translation.toggle}
            align={isOutgoing ? 'end' : 'start'}
          />
        )}

        {/* Gönderim hatası balonun ALTINDA, kırmızı — temsilci neden gitmediğini
            sunucu loglarına bakmadan görsün. Türkçe açıklama varsa o; ham Meta metni ipucunda. */}
        {failed && (message.failureHint || message.failureReason) && (
          <span
            title={message.failureHint ? message.failureReason ?? undefined : undefined}
            className="max-w-[360px] text-right text-ui-xs text-[var(--danger)]"
          >
            {message.failureHint ?? message.failureReason}
          </span>
        )}
        {onFlagWrong && canFlagWrong(message) && (
          <FlagWrongButton flagged={flagged} onFlag={() => onFlagWrong(message)} />
        )}
        {onAddToGold && canAddToGold(message) && (
          <AddToGoldButton added={addedToGold} onAdd={() => onAddToGold(message)} />
        )}
        {failed && isOutgoing && (
          <FailedMessageActions
            onRetry={onRetry && message.body ? () => onRetry(message) : undefined}
            onDelete={onDelete && canDeleteMessage(message) ? () => onDelete(message) : undefined}
          />
        )}
      </div>
    </div>
  );
}
