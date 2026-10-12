'use client';

import { CustomCheckbox } from '../../components/ui/CustomCheckbox';

interface Props {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

// Satır/başlık seçim kutusu: ortak CustomCheckbox'a erişilebilir ad ve klavye desteği ekler.
export function BulkSelectBox({ checked, label, disabled, onChange }: Props) {
  return (
    <span
      role="checkbox" aria-checked={checked} aria-label={label} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
      className="inline-flex shrink-0 items-center"
      onKeyDown={(e) => {
        if (disabled || (e.key !== ' ' && e.key !== 'Enter')) return;
        e.preventDefault();
        onChange(!checked);
      }}
    >
      <CustomCheckbox checked={checked} disabled={disabled} onChange={onChange} />
    </span>
  );
}
