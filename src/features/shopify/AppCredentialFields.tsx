import type { AppCredentialsDraft } from './storeRules';
import { fieldClass } from './styles';

interface Props {
  value: AppCredentialsDraft;
  onChange: (next: AppCredentialsDraft) => void;
  // Kayıtlı bir secret varsa alan boş bırakılabilir görünsün ("••••• kayıtlı"); secret asla geri gösterilmez.
  secretSaved?: boolean;
}

// Mağazaya özel Shopify uygulamasının Client ID / Client Secret alanları (bağlama formu ve mağaza kartında ortak).
export function AppCredentialFields({ value, onChange, secretSaved = false }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-ui-2xs text-fg-muted">
        Dev Dashboard → Uygulamanız → Uygulama ayarları → Kimlik bilgileri. Yalnız bu mağaza için kullanılır; secret sadece
        yazılır, sonra gösterilmez.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-ui-xs font-semibold text-fg">Client ID</span>
          <input className={fieldClass} value={value.clientId} autoComplete="off" spellCheck={false}
            onChange={(e) => onChange({ ...value, clientId: e.target.value })} />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-ui-xs font-semibold text-fg">Client Secret</span>
          <input className={fieldClass} type="password" value={value.clientSecret} autoComplete="new-password" spellCheck={false}
            placeholder={secretSaved ? '••••• kayıtlı' : ''}
            onChange={(e) => onChange({ ...value, clientSecret: e.target.value })} />
        </label>
      </div>
    </div>
  );
}
