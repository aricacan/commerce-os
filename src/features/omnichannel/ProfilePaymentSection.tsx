'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { PaymentOptionDto, PaymentOptionSaveDto } from '../../lib/api/omnichannel';
import { secondaryButtonClass } from './formClasses';
import { PaymentOptionForm } from './PaymentOptionForm';
import { PaymentOptionRow } from './PaymentOptionRow';
import { PAYMENT_SCOPE } from './paymentScope';
import { useBrands } from './useBrands';
import { useOmnichannelCountries } from './useOmnichannelCountries';
import { usePaymentOptionActions } from './usePaymentOptionActions';
import { usePaymentOptions } from './usePaymentOptions';
import { usePaymentTargets } from './usePaymentTargets';

type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; option: PaymentOptionDto };

// Profil Merkezi › Ödeme: yalnız bu katalog profiline bağlı ödeme satırları. Bu satırlar profili kullanan TÜM
// kanallara geçerlidir (kanala özel satır yoksa); kanal bazlı olanlar Kanal Merkezi'ndedir.
export function ProfilePaymentSection({ profileId, profileName }: { profileId: number; profileName: string }) {
  const { options, loading, error, reload } = usePaymentOptions();
  const { brands } = useBrands();
  const { countries } = useOmnichannelCountries();
  const { channels, profiles } = usePaymentTargets();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const actions = usePaymentOptionActions(reload);
  const rows = options.filter((o) => o.catalogProfileId === profileId);

  const handleSave = async (body: PaymentOptionSaveDto) => {
    if (await actions.save(editor.mode === 'edit' ? editor.option : null, body)) setEditor({ mode: 'closed' });
  };

  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-xs font-bold text-[var(--fg)]">Ödeme yöntemleri (profil kapsamı)</h3>
        {editor.mode === 'closed' && (
          <button type="button" className={secondaryButtonClass} onClick={() => setEditor({ mode: 'new' })}>
            <Plus size={13} /> Profil için yöntem ekle
          </button>
        )}
      </div>

      {editor.mode !== 'closed' && (
        <PaymentOptionForm
          key={editor.mode === 'edit' ? editor.option.id : 'new'}
          initial={editor.mode === 'edit' ? editor.option : null}
          preset={{ scope: PAYMENT_SCOPE.Profile, catalogProfileId: String(profileId) }}
          brands={brands}
          countries={countries}
          channels={channels}
          profiles={profiles}
          saving={actions.saving}
          onSave={(body) => void handleSave(body)}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}

      {error && <p className="m-0 text-rose-500">{error}</p>}
      {loading && <p className="m-0 text-[var(--fg-muted)]">Ödeme yöntemleri yükleniyor…</p>}
      {!loading && rows.length === 0 && (
        <p className="m-0 text-[var(--fg-muted)]">
          Bu profile bağlı satır yok; profili kullanan kanallar marka/ülke/genel kapsamdaki yöntemleri kullanır.
        </p>
      )}
      <div className="divide-y divide-[var(--border-soft)]">
        {rows.map((option) => (
          <PaymentOptionRow
            key={option.id}
            option={option}
            scopeLabel={profileName}
            onToggle={() => void actions.toggle(option)}
            onEdit={() => setEditor({ mode: 'edit', option })}
            onDelete={() => void actions.remove(option, `${profileName} profil kapsamındaki yöntem silinecek.`)}
          />
        ))}
      </div>
    </section>
  );
}
