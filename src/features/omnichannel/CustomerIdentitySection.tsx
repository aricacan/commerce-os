'use client';

import { useState } from 'react';
import { BadgeCheck, Mail, Phone, Plus, Split, Trash2 } from 'lucide-react';
import {
  customersApi, IDENTITY_TYPE, type IdentityType,
} from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { channelTypeMeta } from './shared';
import {
  PanelSection, ghostButtonClass, iconButtonClass, inputClass, primaryButtonClass, type CustomerSectionProps,
} from './CustomerPanelParts';

interface Props extends CustomerSectionProps {
  onOpenConversation?: (conversationId: number) => void;
  // Eklenen kimlik başka profildeydi ve iki profil birleşti: panel kalan profile geçer.
  onSwitchProfile: (profileId: number) => void;
}

// Kanal kayıtları + telefon/e-posta (doğrulanmışsa rozetli). Temsilcinin yazdığı telefon/e-posta
// başka bir müşteride kayıtlıysa iki profil aynı kişidir ve backend OTOMATİK birleştirir.
export function CustomerIdentitySection({ profile, readOnly, onChanged, onOpenConversation, onSwitchProfile }: Props) {
  const [type, setType] = useState<IdentityType>(IDENTITY_TYPE.Phone);
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const { notify, confirm } = useFeedback();

  const add = async () => {
    setBusy(true);
    try {
      const result = await customersApi.addIdentity(profile.id, type, value);
      setValue('');
      setAdding(false);
      if (result.merged) notify.success('Bu bilgi başka bir profilde kayıtlıydı; iki profil birleştirildi.');
      // Eski backend merged/profileId göndermez → yalnız yeniden yükle.
      if (result.merged && result.profileId !== profile.id) onSwitchProfile(result.profileId);
      else await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (identityId: number) => {
    try {
      await customersApi.removeIdentity(profile.id, identityId);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const split = async (contactId: number) => {
    const ok = await confirm({
      title: 'Bu kanal kaydı ayrı bir müşteri olsun mu?',
      body: 'Yanlış birleştirmeyi geri alır. Kayıt kendi konuşmalarıyla yeni bir profile taşınır.',
      confirmLabel: 'Ayır',
    });
    if (!ok) return;
    try {
      await customersApi.split(contactId);
      notify.success('Kanal kaydı ayrıldı.');
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <PanelSection title="Kimlikler ve kanallar" count={profile.channels.length + profile.identities.length}
      action={!readOnly && !adding && (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          <Plus size={12} /> Ekle
        </button>
      )}>
      <ul className="flex flex-col gap-1.5">
        {profile.channels.map((c) => {
          const meta = channelTypeMeta(c.channelType);
          return (
            <li key={c.contactId} className="flex items-center gap-2 text-xs">
              <meta.Icon size={13} color={meta.color} />
              <button type="button" disabled={!c.latestConversationId || !onOpenConversation}
                onClick={() => c.latestConversationId && onOpenConversation?.(c.latestConversationId)}
                className="min-w-0 flex-1 truncate text-left text-[var(--fg)] enabled:hover:underline">
                {c.channelName} · <span className="font-mono text-[var(--fg-muted)]">{c.externalId}</span>
              </button>
              {!readOnly && profile.channels.length > 1 && (
                <button type="button" className={iconButtonClass} title="Ayrı müşteri yap" onClick={() => void split(c.contactId)}>
                  <Split size={12} />
                </button>
              )}
            </li>
          );
        })}
        {profile.identities.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-xs">
            {i.type === IDENTITY_TYPE.Phone ? <Phone size={13} className="text-[var(--fg-muted)]" /> : <Mail size={13} className="text-[var(--fg-muted)]" />}
            <span className="min-w-0 flex-1 truncate font-mono text-[var(--fg)]">
              {i.type === IDENTITY_TYPE.Phone ? `+${i.value}` : i.value}
            </span>
            {i.verified && <span title="Kanal tarafından doğrulandı"><BadgeCheck size={13} className="text-emerald-500" /></span>}
            {!readOnly && !i.verified && (
              <button type="button" className={iconButtonClass} title="Kaldır" onClick={() => void remove(i.id)}>
                <Trash2 size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="flex items-center gap-1.5">
          <select value={type} onChange={(e) => setType(Number(e.target.value) as IdentityType)}
            className={`${inputClass} w-20 flex-none`}>
            <option value={IDENTITY_TYPE.Phone}>Telefon</option>
            <option value={IDENTITY_TYPE.Email}>E-posta</option>
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}
            placeholder={type === IDENTITY_TYPE.Phone ? '+90 532 …' : 'ad@ornek.com'} />
          <button type="button" className={primaryButtonClass} disabled={busy || value.trim().length < 3} onClick={() => void add()}>
            Kaydet
          </button>
          <button type="button" className={ghostButtonClass} onClick={() => { setAdding(false); setValue(''); }}>
            İptal
          </button>
        </div>
      )}
    </PanelSection>
  );
}
