'use client';

import { FileText, Loader2 } from 'lucide-react';
import { MESSAGE_CONTENT_TYPE, type MessageAttachmentDto } from '../../lib/api/omnichannel';
import { useAttachmentSrc } from './useAttachmentSrc';

// Balon içindeki görsel/videonun en büyük ölçüsü (240×280 px).
const MEDIA_CLASS = 'block max-h-[280px] max-w-[240px] rounded-[10px]';

// Balonun içindeki ekler: görsel, video, ses oynatıcı ya da indirilebilir belge.
export function MessageAttachments({ attachments }: { attachments: MessageAttachmentDto[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mb-1 flex flex-col gap-1.5">
      {attachments.map((a) => <AttachmentView key={a.id} attachment={a} />)}
    </div>
  );
}

function AttachmentView({ attachment }: { attachment: MessageAttachmentDto }) {
  const { src, failed } = useAttachmentSrc(attachment.url);
  const label = attachment.fileName ?? 'Ek';

  if (failed) return <span className="text-ui-sm opacity-80">{label} yüklenemedi (bağlantının süresi dolmuş olabilir).</span>;
  if (!src) return <Loader2 size={16} className="animate-spin" aria-label="Ek yükleniyor" />;

  switch (attachment.contentType) {
    case MESSAGE_CONTENT_TYPE.Image:
    case MESSAGE_CONTENT_TYPE.Sticker:
      return (
        <a href={src} target="_blank" rel="noreferrer">
          {/* Kaynak blob ya da harici CDN adresi: next/image optimizasyonu uygulanamaz. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className={MEDIA_CLASS} />
        </a>
      );
    case MESSAGE_CONTENT_TYPE.Video:
      return <video src={src} controls className={MEDIA_CLASS} />;
    case MESSAGE_CONTENT_TYPE.Audio:
      return <audio src={src} controls className="max-w-[240px]" />;
    default:
      return (
        <a href={src} download={label} className="inline-flex items-center gap-1.5 text-inherit">
          <FileText size={15} /> <span className="underline">{label}</span>
        </a>
      );
  }
}
