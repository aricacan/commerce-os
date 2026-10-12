'use client';

interface Props {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

// Koşu başlatırken "turları sunucuda yapay zekâyla puanla" seçimi. Varsayılan kapalı: her tur ek bir model çağrısıdır;
// kapalıyken sonuç dosyası ve dış yargıç paketi yine indirilir, yalnız hızlı puan sütunları boş kalır.
export function ServerScoringToggle({ checked, disabled = false, onChange }: Props) {
  return (
    <label className={`inline-flex items-center gap-2 text-xs text-fg ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
      <input
        type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 shrink-0"
      />
      Sunucuda yapay zekâ ile puanla (token harcar)
    </label>
  );
}
