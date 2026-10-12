'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { shopifyApi, type ShopifyStoreDto } from '../../lib/api/shopify';
import { describeError } from '../../lib/errors';
import { focusRing } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { GUARD_MAX_PERCENT, GUARD_MIN_PERCENT, parseGuardPercent } from './priceGuardRules';
import { toUpdateDto } from './storeRules';
import { fieldClass, ghostButtonClass } from './styles';

interface Props {
  store: ShopifyStoreDto;
  disabled: boolean;
  onSaved: () => Promise<void>;
}

const textOf = (percent: number | null) => (percent === null ? '' : String(percent));

// Fiyat güvenliği: bir yazmada varyant fiyatı bu yüzdeden fazla değişirse (Hub ürün güncelleme ve Excel içe aktarma)
// yazma, kullanıcı onaylamadan Shopify'a gitmez. Boş = kapalı.
export function StorePriceGuardSettings({ store, disabled, onSaved }: Props) {
  const { notify } = useFeedback();
  const [text, setText] = useState(textOf(store.priceChangeGuardPercent));
  const [saving, setSaving] = useState(false);
  const parsed = parseGuardPercent(text);
  const changed = parsed !== undefined && parsed !== store.priceChangeGuardPercent;

  const save = async () => {
    if (parsed === undefined) return;
    setSaving(true);
    try {
      await shopifyApi.update(store.id, toUpdateDto(store, { priceChangeGuardPercent: parsed }));
      notify.success('Fiyat güvenlik eşiği kaydedildi.');
      await onSaved();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset disabled={disabled || saving} className="m-0 flex flex-col gap-3 rounded-lg border border-border-soft p-3">
      <legend className="px-1 text-ui-xs font-semibold text-fg">Fiyat güvenliği</legend>
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-ui-2xs font-semibold text-fg-muted">Onay gerektiren fiyat değişimi (%)</span>
        <input
          className={fieldClass} inputMode="numeric" placeholder="Kapalı" value={text}
          onChange={(e) => setText(e.target.value)} aria-invalid={parsed === undefined}
        />
        <span className="text-ui-2xs text-fg-muted">
          {GUARD_MIN_PERCENT}–{GUARD_MAX_PERCENT} arası yüzde; boş bırakırsanız kapalı. Örn. 30: bir varyantın fiyatı %30&apos;dan fazla değişirse yazmadan önce onay istenir.
        </span>
        {parsed === undefined && <span role="alert" className="text-ui-2xs text-danger">Geçerli bir tam sayı girin ya da boş bırakın.</span>}
      </label>
      {changed && (
        <button type="button" className={`${ghostButtonClass} ${focusRing} self-start`} onClick={() => void save()}>
          <Save size={14} aria-hidden /> Kaydet
        </button>
      )}
    </fieldset>
  );
}
