'use client';

import { useState } from 'react';
import { KeyRound, Save, Trash2 } from 'lucide-react';
import { shopifyApi, type ShopifyStoreDto } from '../../lib/api/shopify';
import { describeError } from '../../lib/errors';
import { focusRing } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { AppCredentialFields } from './AppCredentialFields';
import { EMPTY_APP_CREDENTIALS, validateAppCredentials, type AppCredentialsDraft } from './storeRules';
import { ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  store: ShopifyStoreDto;
  disabled: boolean;
  onSaved: () => Promise<void>;
}

// Mağazanın kendi Shopify uygulaması (Client ID/Secret): güncelle ya da temizle (genel uygulamaya dön).
// Anahtar değişince eski token yeni uygulamayla uyuşmaz: "Yeniden bağlan" ile yeniden onaylanmalı.
export function StoreAppCredentials({ store, disabled, onSaved }: Props) {
  const { notify, confirm } = useFeedback();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AppCredentialsDraft>(EMPTY_APP_CREDENTIALS);
  const [busy, setBusy] = useState(false);

  const finish = async (message: string) => {
    notify.success(message);
    setDraft(EMPTY_APP_CREDENTIALS);
    setOpen(false);
    await onSaved();
  };

  const save = async () => {
    const result = validateAppCredentials(draft);
    if (!result.ok) { notify.error(result.error); return; }
    if (!result.credentials) { notify.error('Client ID ve Client Secret girin.'); return; }
    setBusy(true);
    try {
      await shopifyApi.setAppCredentials(store.id, result.credentials);
      await finish('Uygulama anahtarı kaydedildi. Şimdi "Yeniden bağlan" deyin.');
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    const ok = await confirm({
      title: 'Mağazaya özel uygulama anahtarı silinsin mi?',
      body: 'Mağaza genel uygulamaya döner; yeniden bağlanmanız gerekir.',
      confirmLabel: 'Anahtarı sil',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await shopifyApi.clearAppCredentials(store.id);
      await finish('Mağaza genel uygulamaya döndü. Şimdi "Yeniden bağlan" deyin.');
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={disabled} onClick={() => setOpen(true)}>
        <KeyRound size={14} aria-hidden /> Uygulama anahtarı
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border border-border p-3">
      <p className="m-0 text-ui-xs text-fg">
        {store.usesOwnApp ? `Mağazaya özel uygulama · Client ID: ${store.appClientId}` : 'Genel uygulama kullanılıyor.'}
      </p>
      <AppCredentialFields value={draft} onChange={setDraft} secretSaved={store.usesOwnApp} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${primaryButtonClass} ${focusRing}`} disabled={busy} onClick={() => void save()}>
          <Save size={14} aria-hidden /> Kaydet
        </button>
        {store.usesOwnApp && (
          <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={busy} onClick={() => void clear()}>
            <Trash2 size={14} aria-hidden /> Anahtarı sil
          </button>
        )}
        <button type="button" className={`${ghostButtonClass} ${focusRing}`} disabled={busy} onClick={() => setOpen(false)}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
