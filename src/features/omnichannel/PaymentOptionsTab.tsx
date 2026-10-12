'use client';

import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import type { PaymentOptionDto, PaymentOptionSaveDto } from '../../lib/api/omnichannel';
import { secondaryButtonClass } from './formClasses';
import { PaymentOptionForm } from './PaymentOptionForm';
import { PaymentOptionRow } from './PaymentOptionRow';
import { GROUP_CHANNEL, GROUP_PROFILE, groupPaymentOptions } from './paymentOptionDraft';
import { ANY_COUNTRY, PAYMENT_SCOPE_EXPLANATION } from './paymentScope';
import { useBrands } from './useBrands';
import { countryLabel, useOmnichannelCountries } from './useOmnichannelCountries';
import { usePaymentOptionActions } from './usePaymentOptionActions';
import { usePaymentOptions } from './usePaymentOptions';
import { usePaymentTargets } from './usePaymentTargets';

// Editör durumu: kapalı, yeni kayıt ya da mevcut bir kaydın düzenlenmesi.
type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; option: PaymentOptionDto };

// Sohbet siparişi ödeme yöntemleri + IBAN (P15). Uçlar yalnız yöneticiye açık (IBAN hassas).
export function PaymentOptionsTab() {
  const { options, loading, error, reload } = usePaymentOptions();
  const { brands } = useBrands();
  const { countries } = useOmnichannelCountries();
  const { channels, profiles } = usePaymentTargets();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const actions = usePaymentOptionActions(reload);

  const brandName = (brandId: number | null) =>
    brandId === null ? 'Tüm markalar' : (brands.find((b) => b.id === brandId)?.name ?? `Marka #${brandId}`);
  const countryName = (code: string) => {
    const country = countries.find((c) => c.code === code);
    return country ? countryLabel(country) : code;
  };
  const groupTitle = (key: string) => {
    if (key === GROUP_CHANNEL) return 'Kanal bazlı';
    if (key === GROUP_PROFILE) return 'Katalog profili bazlı';
    return key === ANY_COUNTRY ? 'Tüm ülkeler' : countryName(key);
  };
  // Satırın grup başlığında söylenmeyen kısmı: kanal/profil adı ya da marka.
  const scopeLabel = (option: PaymentOptionDto) => {
    if (option.channelId != null) return channels.find((c) => c.id === option.channelId)?.displayName ?? `Kanal #${option.channelId}`;
    if (option.catalogProfileId != null) return profiles.find((p) => p.id === option.catalogProfileId)?.name ?? `Profil #${option.catalogProfileId}`;
    return brandName(option.brandId);
  };

  const handleSave = async (body: PaymentOptionSaveDto) => {
    const editing = editor.mode === 'edit' ? editor.option : null;
    if (await actions.save(editing, body)) setEditor({ mode: 'closed' });
  };

  const handleDelete = (option: PaymentOptionDto) => actions.remove(
    option, option.country === ANY_COUNTRY ? scopeLabel(option) : `${countryName(option.country)} · ${scopeLabel(option)}`);

  const groups = groupPaymentOptions(options);

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Ödeme Yöntemleri</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Bot sohbet siparişinde bu yöntemleri sunar. {PAYMENT_SCOPE_EXPLANATION}{' '}
            Havale yalnız geçerli IBAN, &quot;Siteye yönlendir&quot; yalnız geçerli adresle sunulur.
          </p>
        </div>
        {editor.mode === 'closed' && (
          <button type="button" onClick={() => setEditor({ mode: 'new' })} className={secondaryButtonClass}>
            <Plus size={13} /> Yöntem Ekle
          </button>
        )}
      </div>

      {editor.mode !== 'closed' && (
        <PaymentOptionForm
          key={editor.mode === 'edit' ? editor.option.id : 'new'}
          initial={editor.mode === 'edit' ? editor.option : null}
          brands={brands}
          countries={countries}
          channels={channels}
          profiles={profiles}
          saving={actions.saving}
          onSave={(body) => void handleSave(body)}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}

      {error && <div className="text-[11px] text-rose-500">{error}</div>}
      {loading && <div className="py-2 text-[var(--fg-muted)]">Ödeme yöntemleri yükleniyor…</div>}
      {!loading && !error && groups.length === 0 && (
        <div className="py-2 text-[var(--fg-muted)]">Henüz ödeme yöntemi tanımlı değil.</div>
      )}

      {groups.map((group) => (
        <section key={group.key}
          className="flex flex-col gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
          <h3 className="text-xs font-bold text-[var(--fg)]">{groupTitle(group.key)}</h3>
          <div className="divide-y divide-[var(--border-soft)]">
            {group.options.map((option) => (
              <PaymentOptionRow key={option.id} option={option} scopeLabel={scopeLabel(option)}
                onToggle={() => void actions.toggle(option)}
                onEdit={() => setEditor({ mode: 'edit', option })}
                onDelete={() => void handleDelete(option)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
