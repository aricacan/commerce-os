'use client';

import { useState } from 'react';
import { Stethoscope, MessageSquareText } from 'lucide-react';
import {
  CHANNEL_TYPE, omnichannelApi, type BrandDto, type ChannelCredentialsInput, type ChannelDto,
} from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { ChannelAssignmentFields } from './ChannelAssignmentFields';
import { ChannelDiagnosisDialog } from './ChannelDiagnosisDialog';
import { ChannelCredentialFields } from './ChannelCredentialFields';
import { ChannelIdentityFields } from './ChannelIdentityFields';
import { ChannelScopeFields } from './ChannelScopeFields';
import { ChannelTeamSection } from './ChannelTeamSection';
import { ChannelWelcomeFields } from './ChannelWelcomeFields';
import { canSaveDraft, hasTouchedCredentials, isDraftDirty, toUpdateBody } from './channelDraft';
import { channelUpdateBody } from './channelUpdateBody';
import { primaryButtonClass, secondaryButtonClass } from './formClasses';
import { useChannelDraft } from './useChannelDraft';
import { WhatsAppTemplatesDialog } from './WhatsAppTemplatesDialog';

interface Props {
  channel: ChannelDto;
  brands: BrandDto[];
  onChanged: () => Promise<void>;
}

// Kanal Merkezi › Genel: kanalın temel alanları ve bağlantısı (kimlik / API bilgileri) SATIR İÇİ düzenlenir; tek
// Kaydet hepsini yazar. Bot aç/kapa gibi tek anahtarlık değişiklik anında kaydedilir. Kanal ekibi satır içi yönetilir.
export function ChannelCenterGeneral({ channel, brands, onChanged }: Props) {
  const [credentials, setCredentials] = useState<ChannelCredentialsInput>({});
  const [diagnosing, setDiagnosing] = useState(false);
  const [templates, setTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const { notify } = useFeedback();
  const { draft: edited, patch, reset } = useChannelDraft(channel, true);

  // Bot açık/kapalı kendi anahtarından kaydedilir; taslağa girmez, kayıtta sunucudaki değer korunur.
  const draft = { ...edited, botEnabled: channel.botEnabled };
  const credentialsTouched = hasTouchedCredentials(credentials);
  const dirty = isDraftDirty(draft, channel) || credentialsTouched;
  const isEmail = channel.type === CHANNEL_TYPE.Email;

  const toggleBot = async () => {
    try {
      await omnichannelApi.updateChannel(channel.id, channelUpdateBody(channel, { botEnabled: !channel.botEnabled }));
      notify.success(channel.botEnabled ? 'Bu kanalda bot kapatıldı.' : 'Bu kanalda bot açıldı.');
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const discard = () => { reset(); setCredentials({}); };

  const save = async () => {
    setSaving(true);
    try {
      await omnichannelApi.updateChannel(channel.id, toUpdateBody(channel, draft, credentialsTouched ? credentials : null));
      setCredentials({});
      notify.success('Kanal bilgileri kaydedildi.');
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-xs font-bold text-[var(--fg)]">Kanal bilgileri</h3>
          <div className="flex flex-wrap items-center gap-2">
            {channel.type === CHANNEL_TYPE.WhatsApp && (
              <button type="button" className={secondaryButtonClass} onClick={() => setTemplates(true)}>
                <MessageSquareText size={13} /> Şablonlar
              </button>
            )}
            <button type="button" className={secondaryButtonClass} onClick={() => setDiagnosing(true)}>
              <Stethoscope size={13} /> Teşhis et
            </button>
          </div>
        </div>

        <div className="flex max-w-xl flex-col gap-4">
          <ChannelIdentityFields draft={draft} patch={patch} isEdit />
          <ChannelScopeFields draft={draft} patch={patch} brands={brands} channel={channel} />
          <ChannelAssignmentFields draft={draft} patch={patch} channelId={channel.id} />
          {!isEmail && <ChannelWelcomeFields draft={draft} patch={patch} />}
          <ChannelCredentialFields
            type={channel.type}
            isEdit
            credentials={credentials}
            onChange={(change) => setCredentials((previous) => ({ ...previous, ...change }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            disabled={saving || !dirty || !canSaveDraft(draft, true)}
            onClick={() => void save()}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {dirty && (
            <button type="button" className={secondaryButtonClass} disabled={saving} onClick={discard}>
              Değişiklikleri at
            </button>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 border-t border-[var(--border-soft)] pt-3 text-xs font-semibold text-[var(--fg)]">
          <input type="checkbox" checked={channel.botEnabled} onChange={() => void toggleBot()} className="h-4 w-4 rounded-[3px]" />
          <span>AI bot cevabı aktif (bu kanaldan gelen mesajları bot karşılar)</span>
        </label>
      </section>

      <section className="min-w-0 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
        <ChannelTeamSection channelId={channel.id} />
      </section>

      {templates && (
        <WhatsAppTemplatesDialog channelId={channel.id} channelName={channel.displayName} onClose={() => setTemplates(false)} />
      )}
      {diagnosing && (
        <ChannelDiagnosisDialog channelId={channel.id} channelName={channel.displayName} onClose={() => setDiagnosing(false)} />
      )}
    </div>
  );
}
