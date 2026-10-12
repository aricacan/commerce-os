import { ShieldCheck } from 'lucide-react';
import { inputClass, labelClass, secondaryButtonClass } from './formClasses';
import { formatFingerprint, fingerprintDraftError, normalizeFingerprint } from './handoffSmtpRules';

interface Props {
  value: string;
  onChange: (value: string) => void;
  // Son testte sunucunun sunduğu sertifikanın parmak izi (64 hane hex) — varsa güvenmek için tek tıkla alınır.
  presented: string | null;
}

// "Sertifika doğrulama": boşsa tam doğrulama. Doluysa bağlantı YALNIZ sertifikası tam bu SHA-256 parmak izindeyse kurulur.
export function HandoffSmtpCertificateField({ value, onChange, presented }: Props) {
  const error = fingerprintDraftError(value);
  const alreadyTrusted = presented !== null && normalizeFingerprint(value) === presented;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className={labelClass}>Sertifika doğrulama — güvenilen parmak izi (SHA-256)</label>
        <input value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false}
          placeholder="Boş = tam doğrulama (önerilir)" className={`${inputClass} font-mono`} />
        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">
          Yalnız kendinden imzalı / özel sertifikalı kendi sunucun için doldur. Dolu olunca bağlantı, sertifikası tam bu
          parmak izinde olan sunucuya kurulur; farklı sertifika reddedilir.
        </p>
        {error && <p className="mt-1 text-[11px] text-rose-500">{error}</p>}
      </div>

      {presented && !alreadyTrusted && (
        <div className="flex flex-col gap-2 rounded-[4px] bg-[var(--bg-subtle)] px-3 py-2 sm:flex-row sm:items-center">
          <span className="min-w-0 flex-1 text-[11px] text-[var(--fg-muted)]">
            Sunucunun sunduğu sertifika: <span className="break-all font-mono text-[var(--fg)]">{formatFingerprint(presented)}</span>
          </span>
          <button type="button" onClick={() => onChange(formatFingerprint(presented))} className={secondaryButtonClass}>
            <ShieldCheck size={12} /> Bu sertifikaya güven
          </button>
        </div>
      )}
    </div>
  );
}
