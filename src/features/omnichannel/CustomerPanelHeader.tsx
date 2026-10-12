'use client';

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import {
  customersApi, LIFECYCLE_STAGE, type CustomerProfileUpdateInput, type LifecycleStage,
} from '../../lib/api/customers';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { useOmnichannelCountries } from './useOmnichannelCountries';
import { CustomerChannelChips } from './CustomerChannelChips';
import { formatPanelDate, iconButtonClass, inputClass, type CustomerSectionProps } from './CustomerPanelParts';
import { LANGUAGE_OPTIONS } from './customerProfileRules';

const STAGE_LABELS: Record<LifecycleStage, string> = {
  [LIFECYCLE_STAGE.Lead]: 'Aday',
  [LIFECYCLE_STAGE.Customer]: 'Müşteri',
  [LIFECYCLE_STAGE.Vip]: 'VIP',
  [LIFECYCLE_STAGE.Churned]: 'Kayıp',
};

// Panelin kimlik kartı: ad (yerinde düzenlenir), ülke, aşama, tercih edilen dil, ilk/son görülme ve
// bağlı kanallar. Dil seçimi botun bu müşteriye hangi dilde yazacağını belirler.
export function CustomerPanelHeader({ profile, readOnly, onChanged }: CustomerSectionProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName ?? '');
  const { countries } = useOmnichannelCountries();
  const { notify } = useFeedback();

  const update = async (body: CustomerProfileUpdateInput) => {
    try {
      await customersApi.update(profile.id, body);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const saveName = async () => {
    await update({ displayName: name.trim() });
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border-soft)] px-4 py-3">
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} maxLength={256} autoFocus
            aria-label="Müşteri adı" onKeyDown={(e) => { if (e.key === 'Enter') void saveName(); }} />
          <button type="button" className={iconButtonClass} title="Kaydet" onClick={() => void saveName()}><Check size={14} /></button>
          <button type="button" className={iconButtonClass} title="İptal" onClick={() => setEditing(false)}><X size={14} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {profile.countryCode && <CountryFlag code={profile.countryCode} size={18} />}
          <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--fg)]">{profile.displayName ?? 'İsimsiz müşteri'}</h3>
          {profile.countryCode && <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">{profile.countryCode}</span>}
          {!readOnly && (
            <button type="button" className={iconButtonClass} title="Adı düzenle"
              onClick={() => { setName(profile.displayName ?? ''); setEditing(true); }}>
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}
      <CustomerChannelChips channels={profile.channels} />
      <div className="grid grid-cols-3 gap-1.5">
        <select value={profile.lifecycleStage} disabled={readOnly} aria-label="Aşama" title="Aşama"
          onChange={(e) => void update({ lifecycleStage: Number(e.target.value) as LifecycleStage })}
          className={inputClass}>
          {Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={profile.countryCode ?? ''} disabled={readOnly} aria-label="Ülke" title="Ülke"
          onChange={(e) => void update({ countryCode: e.target.value })} className={inputClass}>
          <option value="">Ülke yok</option>
          {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <select value={profile.preferredLanguage ?? ''} disabled={readOnly} aria-label="Tercih edilen dil" title="Tercih edilen dil"
          onChange={(e) => void update({ preferredLanguage: e.target.value })} className={inputClass}>
          <option value="">Dil yok</option>
          {LANGUAGE_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      <p className="text-[10.5px] text-[var(--fg-muted)]">
        İlk görülme {formatPanelDate(profile.firstSeenAt)} · son görülme {formatPanelDate(profile.lastSeenAt, true)}
      </p>
    </div>
  );
}
