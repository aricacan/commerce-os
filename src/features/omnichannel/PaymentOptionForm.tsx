'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import {
  PAYMENT_METHOD,
  type BrandDto,
  type ChannelDto,
  type CountryDto,
  type PaymentMethod,
  type PaymentOptionDto,
  type PaymentOptionSaveDto,
} from '../../lib/api/omnichannel';
import type { CatalogProfileDto } from '../../lib/api/omnichannel-catalog';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { formInputClass, labelClass, primaryButtonClass, secondaryButtonClass, textareaClass } from './formClasses';
import { PaymentScopeFields } from './PaymentScopeFields';
import {
  PAYMENT_METHOD_LABELS,
  paymentOptionDraftError,
  paymentOptionDraftFrom,
  toPaymentOptionSaveDto,
  type PaymentOptionDraft,
} from './paymentOptionDraft';

interface Props {
  // null → yeni kayıt; dolu → düzenleme.
  initial: PaymentOptionDto | null;
  // Yeni kayıtta ön seçili kapsam (ör. Kanal Merkezi'nden: kapsam = o kanal). Düzenlemede yok sayılır.
  preset?: Partial<PaymentOptionDraft>;
  brands: BrandDto[];
  countries: CountryDto[];
  channels: ChannelDto[];
  profiles: CatalogProfileDto[];
  saving: boolean;
  onSave: (body: PaymentOptionSaveDto) => void;
  onCancel: () => void;
}

// Sunucudaki PaymentOptionLimits ile aynı.
const BANK_NAME_MAX_LENGTH = 80;
const ACCOUNT_HOLDER_MAX_LENGTH = 120;
const WEBSITE_URL_MAX_LENGTH = 512;
const MESSAGE_TEMPLATE_MAX_LENGTH = 500;
// Boşluklu gösterim: 34 karakter + 8 grup arası boşluk.
const IBAN_INPUT_MAX_LENGTH = 42;
const SORT_ORDER_MAX = 999;
const TEMPLATE_ROWS = 3;

const METHOD_OPTIONS = Object.values(PAYMENT_METHOD).map((method) => ({
  value: String(method), label: PAYMENT_METHOD_LABELS[method],
}));

const methodFromValue = (value: string): PaymentMethod | undefined =>
  Object.values(PAYMENT_METHOD).find((method) => String(method) === value);

export function PaymentOptionForm({ initial, preset, brands, countries, channels, profiles, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<PaymentOptionDraft>(() => ({ ...paymentOptionDraftFrom(initial), ...(initial ? {} : preset) }));

  const set = <K extends keyof PaymentOptionDraft>(key: K, value: PaymentOptionDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const validationError = paymentOptionDraftError(draft);
  const isBankTransfer = draft.method === PAYMENT_METHOD.BankTransfer;
  const isRedirect = draft.method === PAYMENT_METHOD.RedirectToWebsite;

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-3">
      <PaymentScopeFields draft={draft} brands={brands} countries={countries} channels={channels} profiles={profiles}
        currentCountry={initial?.country ?? null} onChange={set} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Yöntem *</label>
          <FilterSelect value={String(draft.method)} height="h-8.5" placeholder="Yöntem seçin" showAllOption={false}
            onChange={(v) => { const method = methodFromValue(v); if (method) set('method', method); }}
            options={METHOD_OPTIONS} />
        </div>
        <div>
          <label className={labelClass}>Gösterilme sırası</label>
          <input type="number" min={0} max={SORT_ORDER_MAX} value={draft.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value))} className={formInputClass} />
          <p className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
            Müşteriye ödeme butonlarının hangi sırayla gösterileceği; tek yöntem varsa etkisi yoktur.
          </p>
        </div>
      </div>

      {isBankTransfer && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>IBAN</label>
            <input value={draft.iban} maxLength={IBAN_INPUT_MAX_LENGTH} placeholder="TR00 0000 0000 0000 0000 0000 00"
              onChange={(e) => set('iban', e.target.value.toUpperCase())} className={`${formInputClass} font-mono`} />
          </div>
          <div>
            <label className={labelClass}>Banka</label>
            <input value={draft.bankName} maxLength={BANK_NAME_MAX_LENGTH} placeholder="Örn: Ziraat Bankası"
              onChange={(e) => set('bankName', e.target.value)} className={formInputClass} />
          </div>
          <div>
            <label className={labelClass}>Hesap sahibi</label>
            <input value={draft.accountHolder} maxLength={ACCOUNT_HOLDER_MAX_LENGTH} placeholder="Ad soyad / unvan"
              onChange={(e) => set('accountHolder', e.target.value)} className={formInputClass} />
          </div>
        </div>
      )}

      {isRedirect && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Site adresi *</label>
            <input value={draft.websiteUrl} maxLength={WEBSITE_URL_MAX_LENGTH} placeholder="https://www.example.com"
              onChange={(e) => set('websiteUrl', e.target.value)} className={formInputClass} />
            <p className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
              Bu yöntem tek başınaysa sohbette sipariş açılmaz; müşteriye bu adres (ürün sayfası aynı sitedeyse o) gönderilir.
            </p>
          </div>
          <div>
            <label className={labelClass}>Müşteriye mesaj</label>
            <textarea value={draft.messageTemplate} maxLength={MESSAGE_TEMPLATE_MAX_LENGTH} rows={TEMPLATE_ROWS}
              placeholder="Boşsa müşterinin diline göre (TR/EN/SQ) hazır mesaj gider."
              onChange={(e) => set('messageTemplate', e.target.value)} className={textareaClass} />
            <p className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
              {'Adresin yerine geçmesi için {link} yazın; yazmazsanız adres mesajın sonuna eklenir.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--fg)]">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Aktif (bot müşteriye sunar)
          </label>
          {validationError && <span className="text-[11px] text-rose-500">{validationError}</span>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            <X size={13} /> Vazgeç
          </button>
          <button type="button" onClick={() => onSave(toPaymentOptionSaveDto(draft))}
            disabled={saving || validationError !== null} className={primaryButtonClass}>
            <Save size={13} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
