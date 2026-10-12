'use client';

import { useState } from 'react';
import { HANDOFF_REASON, HANDOFF_REASON_LABELS, type HandoffReason } from '../../lib/api/handoff';
import {
  HANDOFF_ROUTE_EVENT, HANDOFF_ROUTE_EVENT_LABELS, HANDOFF_ROUTE_HOURS, HANDOFF_ROUTE_HOURS_LABELS,
  type HandoffRouteDto, type HandoffRouteEvent, type HandoffRouteHours, type HandoffRouteSaveBody, type HandoffRouteUserDto,
} from '../../lib/api/omnichannel-handoff-routes';
import { ORDER_PAYMENT_METHODS, type BrandDto, type CountryDto, type PaymentMethod } from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { chipClass, inputClass, labelClass } from './formClasses';
import { PAYMENT_METHOD_LABELS } from './paymentOptionDraft';
import { countryLabel } from './useOmnichannelCountries';

interface Props {
  initial: HandoffRouteDto | null;
  /** Yeni kuralda ön seçili ülke (Kanal Merkezi'nde kanalın ülkesi). */
  defaultCountry?: string | null;
  countries: CountryDto[];
  users: HandoffRouteUserDto[];
  brands: BrandDto[];
  saving: boolean;
  onSave: (body: HandoffRouteSaveBody) => void;
  onCancel: () => void;
}

const EVENTS = Object.values(HANDOFF_ROUTE_EVENT) as HandoffRouteEvent[];
const REASONS = Object.values(HANDOFF_REASON) as HandoffReason[];
const HOURS = Object.values(HANDOFF_ROUTE_HOURS) as HandoffRouteHours[];

const EVENT_HINTS: Record<HandoffRouteEvent, string> = {
  [HANDOFF_ROUTE_EVENT.Handoff]: 'Bot konuşmayı temsilciye devrettiğinde. Devir kuralları "Cevap bekliyor" bildirimlerini de alır.',
  [HANDOFF_ROUTE_EVENT.Order]: 'Müşteri sohbetten siparişi onayladığında (Test Alanı siparişleri hariç).',
  [HANDOFF_ROUTE_EVENT.AwaitingReply]:
    'Müşteri yazdı ve bizden cevap bekliyor (bot kapalı). Temsilci cevap verene kadar konuşma başına bir kez; geçmiş içe aktarma, Meta otomatik cevapları ve Test Alanı hariç.',
};

// Virgül, boşluk ya da satır sonuyla ayrılmış listeyi diziye çevirir.
const splitList = (text: string) => text.split(/[\s,;]+/).map((x) => x.trim()).filter((x) => x.length > 0);

export function HandoffRouteEditor({ initial, defaultCountry = null, countries, users, brands, saving, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [eventType, setEventType] = useState<HandoffRouteEvent>(initial?.eventType ?? HANDOFF_ROUTE_EVENT.Handoff);
  const [country, setCountry] = useState(initial?.country ?? defaultCountry ?? '');
  const [reasons, setReasons] = useState<HandoffReason[]>(initial?.reasons ?? []);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initial?.paymentMethods ?? []);
  const [brandIds, setBrandIds] = useState<number[]>(initial?.brandIds ?? []);
  const [hours, setHours] = useState<HandoffRouteHours>(initial?.hours ?? HANDOFF_ROUTE_HOURS.Any);
  const [slackText, setSlackText] = useState((initial?.slackChannelIds ?? []).join('\n'));
  const [userIds, setUserIds] = useState<number[]>(initial?.userIds ?? []);
  const [emailText, setEmailText] = useState((initial?.emails ?? []).join('\n'));

  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  const isOrder = eventType === HANDOFF_ROUTE_EVENT.Order;
  const isHandoff = eventType === HANDOFF_ROUTE_EVENT.Handoff;

  const slackChannelIds = splitList(slackText);
  const emails = splitList(emailText);
  const missing = [
    !name.trim() && 'ad',
    !country && 'ülke',
    slackChannelIds.length + emails.length + userIds.length === 0 && 'en az bir hedef',
  ].filter((x): x is string => typeof x === 'string');

  // Olaya ait olmayan koşul gönderilmez (sunucu da saklamaz).
  const submit = () => {
    if (missing.length > 0) return;
    onSave({
      name: name.trim(), eventType, country, hours, slackChannelIds, userIds, emails, brandIds,
      reasons: isHandoff ? reasons : [],
      paymentMethods: isOrder ? paymentMethods : [],
      isActive: initial?.isActive ?? true,
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="text-[12px] font-bold text-[var(--fg)]">{initial ? `Kuralı düzenle: ${initial.name}` : 'Yeni bildirim kuralı'}</div>

      <div>
        <label className={labelClass}>Olay *</label>
        <div className="flex flex-wrap gap-2">
          {EVENTS.map((e) => (
            <label key={e} className={chipClass}>
              <input type="radio" checked={eventType === e} onChange={() => setEventType(e)} className="h-3.5 w-3.5" />
              <span>{HANDOFF_ROUTE_EVENT_LABELS[e]}</span>
            </label>
          ))}
        </div>
        <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">{EVENT_HINTS[eventType]}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Kural adı *</label>
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)}
            placeholder={isOrder ? 'Örn: Kosova siparişleri' : 'Örn: Kosova destek'} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ülke *</label>
          <FilterSelect
            value={country}
            onChange={setCountry}
            placeholder="Ülke seçin"
            height="h-8.5"
            options={countries.filter((c) => c.isActive || c.code === initial?.country)
              .map((c) => ({ value: c.code, label: countryLabel(c) }))}
          />
        </div>
      </div>

      {isOrder ? (
        <div>
          <label className={labelClass}>Ödeme yöntemi (hiçbiri seçilmezse tümü)</label>
          <div className="flex flex-wrap gap-2">
            {ORDER_PAYMENT_METHODS.map((m) => (
              <label key={m} className={chipClass}>
                <input type="checkbox" checked={paymentMethods.includes(m)}
                  onChange={() => setPaymentMethods((c) => toggle(c, m))} className="h-3.5 w-3.5" />
                <span>{PAYMENT_METHOD_LABELS[m]}</span>
              </label>
            ))}
          </div>
        </div>
      ) : isHandoff && (
        <div>
          <label className={labelClass}>Devir nedeni (hiçbiri seçilmezse tüm nedenler)</label>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <label key={r} className={chipClass}>
                <input type="checkbox" checked={reasons.includes(r)} onChange={() => setReasons((c) => toggle(c, r))} className="h-3.5 w-3.5" />
                <span>{HANDOFF_REASON_LABELS[r]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div>
          <label className={labelClass}>Marka (kanalın markası; hiçbiri seçilmezse tümü)</label>
          <div className="flex flex-wrap gap-2">
            {brands.map((b) => (
              <label key={b.id} className={chipClass}>
                <input type="checkbox" checked={brandIds.includes(b.id)}
                  onChange={() => setBrandIds((c) => toggle(c, b.id))} className="h-3.5 w-3.5" />
                <span>{b.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Ne zaman</label>
        <div className="flex flex-wrap gap-2">
          {HOURS.map((h) => (
            <label key={h} className={chipClass}>
              <input type="radio" checked={hours === h} onChange={() => setHours(h)} className="h-3.5 w-3.5" />
              <span>{HANDOFF_ROUTE_HOURS_LABELS[h]}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Slack kanal kimlikleri</label>
          <textarea value={slackText} onChange={(e) => setSlackText(e.target.value)} rows={3}
            placeholder="C0123ABCD (her satıra bir tane)" className={`${inputClass} font-mono`} />
          <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
            Slack&apos;te kanal adına tıklayın → en altta &quot;Kanal Kimliği&quot;. Bot kanala eklenmiş olmalı.
          </div>
        </div>
        <div>
          <label className={labelClass}>E-posta adresleri</label>
          <textarea value={emailText} onChange={(e) => setEmailText(e.target.value)} rows={3}
            placeholder="destek@firma.com (her satıra bir tane)" className={inputClass} />
          <div className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
            Aşağıdaki Bağlantılar&apos;daki SMTP (yoksa sistemin genel e-posta ayarı) ile gider; hata kuralda görünür.
          </div>
        </div>
      </div>

      <div>
        <label className={labelClass}>Kişiler (panel + telefon bildirimi)</label>
        {users.length === 0 ? (
          <div className="text-[11px] text-[var(--fg-muted)]">Kullanıcı listesi alınamadı.</div>
        ) : (
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {users.map((u) => (
              <label key={u.userId} className={chipClass} title={u.email}>
                <input type="checkbox" checked={userIds.includes(u.userId)}
                  onChange={() => setUserIds((c) => toggle(c, u.userId))} className="h-3.5 w-3.5" />
                <span>{u.displayName}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {missing.length > 0 && <span className="mr-auto text-[11px] text-[var(--fg-muted)]">Eksik: {missing.join(', ')}</span>}
        <button type="button" onClick={onCancel} disabled={saving}
          className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)]">
          Vazgeç
        </button>
        <button type="button" onClick={submit} disabled={saving || missing.length > 0}
          className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40">
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}
