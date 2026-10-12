'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Send } from 'lucide-react';
import type { HandoffRouteTestResultDto } from '../../lib/api/omnichannel-handoff-routes';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { inputClass, labelClass, secondaryButtonClass } from './formClasses';

// Bağlantılar bölümünün ortak parçaları: kart kabuğu, gizli alan, deneme satırı.

export function ConnectionCard({ title, icon, custom, children }: {
  title: string; icon: ReactNode; custom: boolean; children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[12px] font-bold text-[var(--fg)]">{icon}{title}</span>
        <span className={`rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-semibold ${
          custom ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
        }`}>
          {custom ? 'Kendi bağlantısı' : 'Genel ayar'}
        </span>
      </div>
      {children}
    </div>
  );
}

// Kayıtlı gizli değer asla gösterilmez: boş bırakılırsa korunur, "Kayıtlıyı sil" ile kaydedince kalkar.
export function SecretField({ label, value, onChange, stored, clear, onClearChange, placeholder }: {
  label: string; value: string; onChange: (value: string) => void;
  stored: boolean; clear: boolean; onClearChange: (clear: boolean) => void; placeholder: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className={labelClass}>{label}</label>
        {stored && (
          <button type="button" onClick={() => onClearChange(!clear)}
            className="mb-1 text-[10.5px] font-semibold text-[var(--fg-muted)] hover:text-rose-500">
            {clear ? 'Silmeyi geri al' : 'Kayıtlıyı sil'}
          </button>
        )}
      </div>
      <input type="password" autoComplete="new-password" value={value} disabled={clear}
        onChange={(e) => onChange(e.target.value)}
        placeholder={clear ? 'Kaydedince silinecek' : stored ? 'Kayıtlı — değiştirmek için yazın' : placeholder}
        className={`${inputClass} disabled:opacity-50`} />
    </div>
  );
}

export function TestRow<TResult extends HandoffRouteTestResultDto = HandoffRouteTestResultDto>({
  placeholder, buttonLabel, successMessage, onTest, onResult,
}: {
  placeholder: string; buttonLabel: string; successMessage: string;
  onTest: (value: string) => Promise<TResult>;
  // Sonuç geldikten sonra (başarılı ya da değil) ek bilgiyi (ör. sertifika parmak izi) üst karta iletir.
  onResult?: (result: TResult) => void;
}) {
  const [value, setValue] = useState('');
  const [testing, setTesting] = useState(false);
  const { notify } = useFeedback();

  const run = async () => {
    setTesting(true);
    try {
      const result = await onTest(value.trim());
      onResult?.(result);
      if (result.ok) notify.success(successMessage);
      else notify.error(result.error ?? 'Deneme gönderilemedi.');
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3 sm:flex-row">
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className={inputClass} />
      <button type="button" onClick={() => void run()} disabled={testing} className={secondaryButtonClass}>
        <Send size={12} /> {testing ? 'Gönderiliyor…' : buttonLabel}
      </button>
    </div>
  );
}
