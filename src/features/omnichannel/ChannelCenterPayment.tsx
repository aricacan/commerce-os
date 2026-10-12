'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ChannelDto, PaymentOptionDto, PaymentOptionSaveDto } from '../../lib/api/omnichannel';
import type { ChannelEffectiveSettingsDto, ChannelPaymentRowDto } from '../../lib/api/omnichannel-channel-settings';
import { PAYMENT_LEVEL_LABELS } from './channelScopeRules';
import { secondaryButtonClass } from './formClasses';
import { PaymentOptionForm } from './PaymentOptionForm';
import { PaymentOptionRow } from './PaymentOptionRow';
import { PAYMENT_METHOD_LABELS, type PaymentOptionDraft } from './paymentOptionDraft';
import { PAYMENT_SCOPE, PAYMENT_SCOPE_EXPLANATION } from './paymentScope';
import { ScopeBadge } from './ScopeBadge';
import { SettingsLink } from './SettingsLink';
import { useBrands } from './useBrands';
import { usePaymentOptionActions } from './usePaymentOptionActions';
import { usePaymentTargets } from './usePaymentTargets';
import { useOmnichannelCountries } from './useOmnichannelCountries';

interface Props {
  channel: ChannelDto;
  settings: ChannelEffectiveSettingsDto;
  onChanged: () => Promise<void>;
}

type EditorState =
  | { mode: 'closed' }
  | { mode: 'new'; preset: Partial<PaymentOptionDraft> }
  | { mode: 'edit'; option: PaymentOptionDto };

const rowNote = (row: ChannelPaymentRowDto) => (row.presented ? undefined : 'Müşteriye sunulmaz (pasif ya da eksik bilgi).');

// Kanal Merkezi › Ödeme: bu kanalda müşteriye sunulacak yöntemler ve hangi kapsamdan geldikleri. Yalnız kanala ve
// kanalın profiline özel satırlar burada düzenlenir; üst kapsam satırları başka kanalları da etkilediği için
// Hesap geneli › Ödeme'de (tüm kanallar görünümü) düzenlenir.
export function ChannelCenterPayment({ channel, settings, onChanged }: Props) {
  const { payment } = settings;
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const actions = usePaymentOptionActions(onChanged);
  const { brands } = useBrands();
  const { countries } = useOmnichannelCountries();
  const { channels, profiles } = usePaymentTargets();

  const ownIds = new Set([...payment.channelRowIds, ...payment.profileRowIds]);
  const handleSave = async (body: PaymentOptionSaveDto) => {
    const editing = editor.mode === 'edit' ? editor.option : null;
    if (await actions.save(editing, body)) setEditor({ mode: 'closed' });
  };

  const scopeName = (option: PaymentOptionDto) =>
    option.channelId != null ? 'Bu kanal' : (settings.catalog.profileName ?? 'Katalog profili');

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-xs font-bold text-[var(--fg)]">Müşteriye sunulan yöntemler</h3>
            <ScopeBadge label={`Kaynak: ${PAYMENT_LEVEL_LABELS[payment.level]}`} tone="info" />
          </div>
          {editor.mode === 'closed' && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButtonClass}
                onClick={() => setEditor({ mode: 'new', preset: { scope: PAYMENT_SCOPE.Channel, channelId: String(channel.id) } })}>
                <Plus size={13} /> Bu kanala özel yöntem ekle
              </button>
              {settings.catalog.profileId !== null && (
                <button type="button" className={secondaryButtonClass}
                  onClick={() => setEditor({
                    mode: 'new',
                    preset: { scope: PAYMENT_SCOPE.Profile, catalogProfileId: String(settings.catalog.profileId) },
                  })}>
                  <Plus size={13} /> Profil için ekle
                </button>
              )}
            </div>
          )}
        </div>

        <p className="m-0 text-[11px] text-[var(--fg-muted)]">{PAYMENT_SCOPE_EXPLANATION}</p>

        {editor.mode !== 'closed' && (
          <PaymentOptionForm
            key={editor.mode === 'edit' ? editor.option.id : 'new'}
            initial={editor.mode === 'edit' ? editor.option : null}
            preset={editor.mode === 'new' ? editor.preset : undefined}
            brands={brands}
            countries={countries}
            channels={channels}
            profiles={profiles}
            saving={actions.saving}
            onSave={(body) => void handleSave(body)}
            onCancel={() => setEditor({ mode: 'closed' })}
          />
        )}

        {payment.rows.length === 0 ? (
          <p className="m-0 text-[var(--fg-muted)]">Bu kanalda sunulacak yöntem yok.</p>
        ) : (
          <div className="divide-y divide-[var(--border-soft)]">
            {payment.rows.map((row) => ownIds.has(row.option.id) ? (
              <PaymentOptionRow
                key={row.option.id}
                option={row.option}
                scopeLabel={scopeName(row.option)}
                note={rowNote(row)}
                onToggle={() => void actions.toggle(row.option)}
                onEdit={() => setEditor({ mode: 'edit', option: row.option })}
                onDelete={() => void actions.remove(row.option, `${scopeName(row.option)} kapsamındaki yöntem silinecek.`)}
              />
            ) : (
              <ReadOnlyPaymentRow key={row.option.id} row={row} levelLabel={PAYMENT_LEVEL_LABELS[payment.level]} />
            ))}
          </div>
        )}
      </section>

      <p className="m-0 text-[11px] text-[var(--fg-muted)]">
        Marka, ülke ve genel kapsam satırları başka kanalları da etkiler:{' '}
        <SettingsLink target={{ tab: 'account', sub: 'payments' }}>Bu ayarı tüm kanallar için gör</SettingsLink>
      </p>
    </div>
  );
}

function ReadOnlyPaymentRow({ row, levelLabel }: { row: ChannelPaymentRowDto; levelLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0 font-bold text-[var(--fg)]">
        {PAYMENT_METHOD_LABELS[row.option.method]}
        <span className="font-normal text-[var(--fg-muted)]">{` · ${levelLabel} kapsamı`}</span>
      </span>
      <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--fg-muted)]">
        {rowNote(row) ?? 'Sunuluyor'}
        <span className="text-[var(--fg-muted)]">· düzenleme Hesap geneli › Ödeme&apos;de</span>
      </span>
    </div>
  );
}
