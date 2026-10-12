'use client';

import { Download, ShieldAlert } from 'lucide-react';
import { customersApi } from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { PanelSection, formatPanelDate, ghostButtonClass, type CustomerSectionProps } from './CustomerPanelParts';

// KVKK/GDPR: pazarlama izni herkes; dışa aktarma ve silme yalnız yöneticide (backend 403 döner).
export function CustomerPrivacySection({ profile, readOnly, onChanged }: CustomerSectionProps) {
  const { notify, confirm } = useFeedback();

  const run = async (action: () => Promise<unknown>, success?: string) => {
    try {
      await action();
      if (success) notify.success(success);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const exportData = async () => {
    try {
      const data = await customersApi.exportData(profile.id);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `musteri-${profile.id}-veri.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const anonymize = async () => {
    const ok = await confirm({
      title: 'Müşterinin kişisel verileri silinsin mi?',
      body: 'Ad, telefon, e-posta, kanal kimliği, mesaj içerikleri, ekler, notlar, araçlar ve görevler kalıcı olarak silinir. Bu işlem GERİ ALINAMAZ.',
      confirmLabel: 'Kalıcı olarak sil',
      danger: true,
    });
    if (ok) await run(() => customersApi.anonymize(profile.id), 'Kişisel veriler silindi.');
  };

  return (
    <PanelSection title="KVKK / izinler" defaultOpen={false}>
      {profile.anonymizedAt ? (
        <p className="flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]">
          <ShieldAlert size={13} /> Kişisel veriler {formatPanelDate(profile.anonymizedAt)} tarihinde silindi.
        </p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-xs text-[var(--fg)]">
            <input type="checkbox" checked={profile.marketingOptIn} disabled={readOnly}
              onChange={(e) => void run(() => customersApi.update(profile.id, { marketingOptIn: e.target.checked }))} />
            Pazarlama iletisi izni
            {profile.marketingOptInAt && (
              <span className="text-[10.5px] text-[var(--fg-muted)]">({formatPanelDate(profile.marketingOptInAt)})</span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={ghostButtonClass} onClick={() => void exportData()}>
              <Download size={12} /> Verileri indir (JSON)
            </button>
            <button type="button" onClick={() => void anonymize()}
              className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-rose-500/40 px-2 text-[11px] text-rose-600 hover:bg-rose-500/10">
              <ShieldAlert size={12} /> Verileri sil (anonimleştir)
            </button>
          </div>
        </>
      )}
    </PanelSection>
  );
}
