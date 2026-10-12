'use client';

import { CHANNEL_TYPE, type ChannelCredentialsInput } from '../../lib/api/omnichannel';
import { ChannelAssignmentFields } from './ChannelAssignmentFields';
import { ChannelCredentialFields } from './ChannelCredentialFields';
import { ChannelIdentityFields } from './ChannelIdentityFields';
import { ChannelWelcomeFields } from './ChannelWelcomeFields';
import { EmailConnectionTest } from './EmailConnectionTest';
import { emailTestRequest, missingCredentialLabels } from './channelCredentialRules';
import type { ChannelDraft, ChannelDraftPatch } from './channelDraft';

interface Props {
  draft: ChannelDraft;
  patch: ChannelDraftPatch;
  credentials: ChannelCredentialsInput;
  onCredentialsChange: (change: Partial<ChannelCredentialsInput>) => void;
}

// Elle kayıt alanları: ad, kimlik, anahtarlar, temsilci politikası, karşılama ve bot. Meta ile bağlanan kanallarda
// (WhatsApp / Facebook / Instagram) "Elle gir" altında açılır; e-posta ve TikTok için ana formdur.
export function ChannelManualFields({ draft, patch, credentials, onCredentialsChange }: Props) {
  const isEmail = draft.type === CHANNEL_TYPE.Email;
  const missing = missingCredentialLabels(draft.type, credentials);

  return (
    <div className="flex flex-col gap-4">
      <ChannelIdentityFields draft={draft} patch={patch} isEdit={false} />
      <ChannelCredentialFields type={draft.type} isEdit={false} credentials={credentials} onChange={onCredentialsChange} />
      {isEmail && <EmailConnectionTest request={emailTestRequest(draft, credentials)} />}
      <ChannelAssignmentFields draft={draft} patch={patch} />

      {/* E-postada bot karşılamaz */}
      {!isEmail && (
        <div className="border-t border-[var(--border-soft)] pt-2">
          <ChannelWelcomeFields draft={draft} patch={patch} />
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--fg)]">
        <input
          type="checkbox"
          checked={draft.botEnabled}
          onChange={(e) => patch({ botEnabled: e.target.checked })}
          className="h-4 w-4 rounded-[3px]"
        />
        <span>AI bot cevabı aktif (Bu kanaldan gelen mesajları AI Chatbot karşılasın)</span>
      </label>

      {missing.length > 0 && (
        <div className="rounded-[3px] bg-amber-500/10 p-2 text-xs text-[var(--fg)]">
          Kaydetmek için şu alanlar gerekli: {missing.join(', ')}.
        </div>
      )}
    </div>
  );
}
