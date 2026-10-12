'use client';

import { useId, type ReactNode } from 'react';
import { CustomCheckbox } from '../../components/ui/CustomCheckbox';
import { FormSelect, type FormSelectOption } from '../../components/ui/FormSelect';

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T;
  options: FormSelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

// Etiketli form açılır listesi: tarayıcının yerel açılır kutusu yerine ortak, temalı FormSelect.
export function SelectField<T extends string | number>({ label, value, options, onChange, className = '' }: SelectFieldProps<T>) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-ui-2xs font-semibold text-fg-muted">{label}</span>
      <FormSelect value={value} options={options} onChange={onChange} ariaLabel={label} triggerClassName="h-8 rounded-md" />
    </div>
  );
}

interface CheckboxFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}

// Etiketli onay kutusu: ortak CustomCheckbox + tıklanabilir metin.
export function CheckboxField({ checked, onChange, children, className = 'items-center' }: CheckboxFieldProps) {
  const labelId = useId();
  return (
    <div className={`flex cursor-pointer gap-2 text-ui-xs text-fg ${className}`} onClick={() => onChange(!checked)}>
      <CustomCheckbox checked={checked} onChange={onChange} ariaLabelledBy={labelId} />
      <span id={labelId} className="min-w-0 flex-1 select-none">{children}</span>
    </div>
  );
}
