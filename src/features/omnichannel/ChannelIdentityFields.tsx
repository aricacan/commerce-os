'use client';

import type { ChannelDraft, ChannelDraftPatch } from './channelDraft';
import { formInputClass, labelClass } from './formClasses';
import { IDENTIFIER_LABEL } from './shared';

interface Props {
  draft: ChannelDraft;
  patch: ChannelDraftPatch;
  /** Düzenlemede kimlik değişmez. */
  isEdit: boolean;
}

// Görünen ad ve dış kimlik (telefon / sayfa / e-posta adresi). Kanal türü yeni kanalda 1. adımda seçilir.
export function ChannelIdentityFields({ draft, patch, isEdit }: Props) {
  const identifier = IDENTIFIER_LABEL[draft.type];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Görünen ad *</label>
        <input
          value={draft.displayName}
          onChange={(e) => patch({ displayName: e.target.value })}
          placeholder="Örn: StoreB WhatsApp Satış"
          className={formInputClass}
        />
      </div>
      <div>
        <label className={labelClass}>{identifier.label} *</label>
        <input
          value={draft.externalIdentifier}
          onChange={(e) => patch({ externalIdentifier: e.target.value })}
          placeholder={identifier.placeholder}
          disabled={isEdit}
          className={`${formInputClass} font-mono`}
        />
      </div>
    </div>
  );
}
