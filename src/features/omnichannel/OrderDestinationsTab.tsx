'use client';

import { useState } from 'react';
import { PackageCheck, Plus } from 'lucide-react';
import type { OrderDestinationOptionDto, OrderDestinationRuleDto } from '../../lib/api/omnichannel-order-destinations';
import { secondaryButtonClass } from './formClasses';
import { ORDER_DESTINATION_EXPLANATION, optionKey, ruleBodyFor } from './orderDestinationRules';
import { ErpSendStateCard } from './ErpSendStateCard';
import { OrderDestinationEditor } from './OrderDestinationEditor';
import { OrderDestinationRuleForm } from './OrderDestinationRuleForm';
import { OrderDestinationRuleRow } from './OrderDestinationRuleRow';
import { ANY_COUNTRY, PAYMENT_SCOPE, PAYMENT_SCOPE_LABELS, scopeOf } from './paymentScope';
import { ScopeBadge } from './ScopeBadge';
import { useBrands } from './useBrands';
import { countryLabel, useOmnichannelCountries } from './useOmnichannelCountries';
import { useOrderDestinationActions } from './useOrderDestinationActions';
import { useOrderDestinationRules } from './useOrderDestinationRules';
import { usePaymentTargets } from './usePaymentTargets';

type EditorState = { mode: 'closed' } | { mode: 'general' } | { mode: 'new' } | { mode: 'edit'; ruleId: number };

const GENERAL_SCOPE = { channelId: null, catalogProfileId: null, brandId: null, country: ANY_COUNTRY } as const;
const DEFAULT_TARGET_TEXT =
  'Her ülkede ülkenin sipariş senkronu açık Shopify mağazası (mağaza yoksa sipariş panelde kalır).';

// Hesap geneli › Sipariş hedefi: tüm kanallar için varsayılan hedef ve marka/ülke kuralları. Kanala özel kural
// Kanal Merkezi › Siparişler'de düzenlenir; burada yalnız silinebilir.
export function OrderDestinationsTab() {
  const { rules, loading, error, reload } = useOrderDestinationRules();
  const { brands } = useBrands();
  const { countries } = useOmnichannelCountries();
  const { channels, profiles } = usePaymentTargets();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const actions = useOrderDestinationActions(reload);

  const general = rules.find((rule) => scopeOf(rule) === PAYMENT_SCOPE.General) ?? null;
  const others = rules.filter((rule) => rule !== general);

  const countryName = (code: string) => {
    const country = countries.find((c) => c.code === code);
    return country ? countryLabel(country) : code;
  };
  const scopeLabel = (rule: OrderDestinationRuleDto) => {
    if (rule.channelId !== null) return channels.find((c) => c.id === rule.channelId)?.displayName ?? `Kanal #${rule.channelId}`;
    if (rule.catalogProfileId !== null) return profiles.find((p) => p.id === rule.catalogProfileId)?.name ?? `Profil #${rule.catalogProfileId}`;
    const brand = rule.brandId === null ? null : (brands.find((b) => b.id === rule.brandId)?.name ?? `Marka #${rule.brandId}`);
    const place = rule.country === ANY_COUNTRY ? null : countryName(rule.country);
    return [brand, place].filter(Boolean).join(' · ') || PAYMENT_SCOPE_LABELS[scopeOf(rule)];
  };

  const close = () => setEditor({ mode: 'closed' });
  // Genel kural ve mevcut kuralın düzenlenmesi kapsamı korur; yalnız hedef değişir.
  const saveTarget = async (existing: OrderDestinationRuleDto | null, option: OrderDestinationOptionDto) => {
    const body = ruleBodyFor(existing ?? GENERAL_SCOPE, option);
    if (await actions.save(existing?.id ?? null, body, option)) close();
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div>
        <div className="flex items-center gap-2">
          <PackageCheck size={16} className="text-[var(--fg-muted)]" aria-hidden />
          <h2 className="text-sm font-bold text-[var(--fg)]">Sipariş hedefi</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
          Müşterinin onayladığı sohbet siparişlerinin yazılacağı yer. {ORDER_DESTINATION_EXPLANATION}
        </p>
      </div>

      <ErpSendStateCard />

      {error && <div className="text-[11px] text-rose-500">{error}</div>}
      {loading && <div className="py-2 text-[var(--fg-muted)]">Hedef kuralları yükleniyor…</div>}

      {!loading && (
        <section className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-bold text-[var(--fg)]">Varsayılan hedef (tüm kanallar)</h3>
            {general === null && <ScopeBadge label="Seçim yapılmadı" tone="neutral" />}
          </div>
          <p className="m-0 text-[var(--fg)]">{general ? general.targetLabel : DEFAULT_TARGET_TEXT}</p>
          {editor.mode === 'general' ? (
            <OrderDestinationEditor country={null} saving={actions.saving} onCancel={close}
              initialKey={general ? optionKey(general.kind, general.targetId) : ''}
              onSave={(option) => void saveTarget(general, option)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => setEditor({ mode: 'general' })}>
                {general ? 'Varsayılanı değiştir' : 'Varsayılan hedef seç'}
              </button>
              {general && (
                <button type="button" className={secondaryButtonClass}
                  onClick={() => void actions.remove(general.id, 'Varsayılan hedef kalkar; kuralı olmayan kapsamlarda siparişler ülkenin Shopify mağazasına yazılır.')}>
                  Varsayılanı kaldır
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {!loading && (
        <section className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-[var(--fg)]">Kapsam kuralları</h3>
            {editor.mode === 'closed' && (
              <button type="button" className={secondaryButtonClass} onClick={() => setEditor({ mode: 'new' })}>
                <Plus size={13} aria-hidden /> Kural ekle
              </button>
            )}
          </div>

          {editor.mode === 'new' && (
            <OrderDestinationRuleForm brands={brands} countries={countries} saving={actions.saving} onCancel={close}
              onSave={(body, option) => void actions.save(null, body, option).then((saved) => { if (saved) close(); })} />
          )}

          {others.length === 0 && editor.mode !== 'new' && (
            <p className="m-0 text-[var(--fg-muted)]">Marka, ülke ya da kanal bazlı kural yok.</p>
          )}

          <div className="divide-y divide-[var(--border-soft)]">
            {others.map((rule) => {
              const kind = scopeOf(rule);
              const editable = kind !== PAYMENT_SCOPE.Channel && kind !== PAYMENT_SCOPE.Profile;
              return (
                <div key={rule.id}>
                  <OrderDestinationRuleRow rule={rule} scopeLabel={scopeLabel(rule)} editable={editable}
                    onEdit={() => setEditor({ mode: 'edit', ruleId: rule.id })}
                    onDelete={() => void actions.remove(rule.id, `${scopeLabel(rule)} kapsamı üst kapsamın hedefini izlemeye döner.`)} />
                  {editor.mode === 'edit' && editor.ruleId === rule.id && (
                    <div className="pb-3">
                      <OrderDestinationEditor country={rule.country === ANY_COUNTRY ? null : rule.country}
                        initialKey={optionKey(rule.kind, rule.targetId)} saving={actions.saving} onCancel={close}
                        onSave={(option) => void saveTarget(rule, option)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
