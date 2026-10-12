'use client';

import { Loader2 } from 'lucide-react';

interface SaveBarProps {
  error: string | null;
  hasSavedPolicy: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

// Yapışkan kaydet çubuğu. Kayıtlı ayar varsa "Kaydet" önce değişikliğin hangi siparişlere
// uygulanacağını sorar (bkz. ApplyToDialog).
export function SaveBar({ error, hasSavedPolicy, saving, onCancel, onSave }: SaveBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 md:-mx-6 md:px-6">
      <span className={`text-xs ${error ? 'text-rose-500' : 'text-[var(--fg-muted)]'}`}>
        {error ?? (hasSavedPolicy
          ? 'Kaydedilmemiş değişiklik var — kaydederken eski siparişlere uygulanıp uygulanmayacağını seçeceksiniz.'
          : 'Kayıtlı ayar yok — kaydedince tüm siparişler bu ayarla hesaplanır.')}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-[6px] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-[var(--fg)] px-4 text-xs font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:opacity-40 cursor-pointer"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Kaydet
        </button>
      </div>
    </div>
  );
}
