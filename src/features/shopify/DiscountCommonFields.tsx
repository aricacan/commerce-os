'use client';

import { CustomCheckbox } from '../../components/ui/CustomCheckbox';
import type { DiscountCommonState } from './discountKindRules';
import { fieldClass } from './styles';

interface Props {
  value: DiscountCommonState;
  onChange: (value: DiscountCommonState) => void;
}

const CODE_MAX_LENGTH = 50;
const labelClass = 'flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted';

// Her kod indiriminde ortak alanlar: kod, başlık, geçerlilik aralığı, kullanım limiti, müşteri başına bir kez.
export function DiscountCommonFields({ value, onChange }: Props) {
  const set = <K extends keyof DiscountCommonState>(key: K, next: DiscountCommonState[K]) => onChange({ ...value, [key]: next });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          Kod (müşteri sepette yazar)
          <input required value={value.code} maxLength={CODE_MAX_LENGTH} onChange={(e) => set('code', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Başlık (boşsa kod)
          <input value={value.title} onChange={(e) => set('title', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Başlangıç (boşsa şimdi / mevcut)
          <input type="datetime-local" value={value.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Bitiş (boşsa süresiz)
          <input type="datetime-local" value={value.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Toplam kullanım limiti (boşsa sınırsız)
          <input inputMode="numeric" value={value.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} className={fieldClass} />
        </label>
      </div>
      <div className="flex items-center gap-2 text-ui-xs text-fg">
        <CustomCheckbox checked={value.appliesOncePerCustomer} onChange={(checked) => set('appliesOncePerCustomer', checked)} />
        Müşteri başına yalnız bir kez
      </div>
    </div>
  );
}
