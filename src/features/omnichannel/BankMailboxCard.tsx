'use client';

import { useCallback, useEffect, useState } from 'react';
import { Inbox, PlugZap } from 'lucide-react';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { formatDateTime } from '@/lib/format';
import {
  BANK_MAILBOX_PORT_MAX, BANK_MAILBOX_PORT_MIN, BANK_MAILBOX_SECURITY, BANK_MAILBOX_SECURITY_LABELS,
  bankMailboxApi, type BankMailboxSecurity, type BankMailboxSettingsDto,
} from '../../lib/api/omnichannel-bank-mailbox';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { BankMailboxHints } from './BankMailboxHints';
import {
  bankMailboxDraftError, draftFromSettings, parseSenders, portForSecurity, type BankMailboxDraft,
} from './bankMailboxRules';
import { chipClass, formInputClass, labelClass, primaryButtonClass, secondaryButtonClass, textareaClass } from './formClasses';
import { SecretField } from './HandoffConnectionParts';
import { useBankTemplates } from './useBankTransactions';

const SECURITY_OPTIONS = Object.values(BANK_MAILBOX_SECURITY) as BankMailboxSecurity[];
const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' };

// "Posta kutusundan otomatik al" (yalnız yönetici): bankanın zamanlanmış ekstre e-postası ayrı bir posta
// kutusundan 15 dakikada bir okunur, eki içe aktarılır. İzinli gönderen listesi ZORUNLU (sahte e-posta koruması).
export function BankMailboxCard() {
  const { notify } = useFeedback();
  const { templates } = useBankTemplates();
  const [settings, setSettings] = useState<BankMailboxSettingsDto | null>(null);
  const [draft, setDraft] = useState<BankMailboxDraft | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = useCallback((next: BankMailboxSettingsDto) => {
    setSettings(next);
    setDraft(draftFromSettings(next));
  }, []);

  useEffect(() => {
    bankMailboxApi.get().then(apply).catch(() => setForbidden(true));
  }, [apply]);

  if (forbidden) {
    return <p className="text-[11px] text-[var(--fg-muted)]">Posta kutusundan otomatik alma yalnız yöneticilere açıktır.</p>;
  }
  if (!settings || !draft) return null;

  const patch = (change: Partial<BankMailboxDraft>) => setDraft({ ...draft, ...change });
  const invalid = bankMailboxDraftError(draft, settings.hasPassword);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(async () => {
    apply(await bankMailboxApi.save({
      isEnabled: draft.enabled, imapHost: draft.host.trim() || null, imapPort: Number(draft.port), security: draft.security,
      username: draft.username.trim() || null, password: draft.password.trim() || null, clearPassword: draft.clearPassword,
      allowedSenders: parseSenders(draft.senders), importTemplateId: draft.templateId ? Number(draft.templateId) : null,
    }));
    notify.success('Posta kutusu ayarı kaydedildi.');
  });

  const test = () => run(async () => {
    const result = await bankMailboxApi.test();
    if (result.ok) notify.success(`Bağlantı başarılı. Okunmamış mesaj: ${result.unreadCount} (hiçbiri işaretlenmedi).`);
    else notify.error(result.error ?? 'Bağlantı kurulamadı.');
  });

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--fg)]">
        <input type="checkbox" checked={draft.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="h-3.5 w-3.5" />
        <Inbox size={14} className="text-[var(--fg-muted)]" /> Bankanın ekstre e-postasını otomatik al
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_96px]">
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>IMAP sunucusu</span>
          <input value={draft.host} onChange={(e) => patch({ host: e.target.value })} placeholder="mail.firma.com" className={formInputClass} />
        </label>
        <label className="flex flex-col">
          <span className={labelClass}>Port</span>
          <input type="number" inputMode="numeric" min={BANK_MAILBOX_PORT_MIN} max={BANK_MAILBOX_PORT_MAX}
            value={draft.port} onChange={(e) => patch({ port: e.target.value })} className={formInputClass} />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECURITY_OPTIONS.map((option) => (
          <label key={option} className={chipClass}>
            <input type="radio" checked={draft.security === option} className="h-3.5 w-3.5"
              onChange={() => patch({ security: option, port: portForSecurity(draft.port, option) })} />
            <span>{BANK_MAILBOX_SECURITY_LABELS[option]}</span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>Kullanıcı adı</span>
          <input value={draft.username} autoComplete="off" onChange={(e) => patch({ username: e.target.value })}
            placeholder="ekstre@firma.com" className={formInputClass} />
        </label>
        <SecretField label="Parola" value={draft.password} onChange={(password) => patch({ password })} stored={settings.hasPassword}
          clear={draft.clearPassword} onClearChange={(clearPassword) => patch({ clearPassword })} placeholder="Posta kutusu parolası" />
      </div>

      <label className="flex flex-col">
        <span className={labelClass}>İzinli göndericiler (her satıra bir adres ya da @alanadi.com)</span>
        <textarea value={draft.senders} rows={2} onChange={(e) => patch({ senders: e.target.value })}
          placeholder="ekstre@banka.com.tr" className={textareaClass} />
      </label>

      <label className="flex min-w-0 flex-col sm:max-w-xs">
        <span className={labelClass}>Ek hangi banka şablonuyla okunsun</span>
        <FilterSelect value={draft.templateId} placeholder="Şablon seç" height="h-8.5" minWidth="100%" showAllOption={false}
          options={templates.map((t) => ({ value: String(t.id), label: t.bankName }))} onChange={(templateId) => patch({ templateId })} />
      </label>

      <LastRun settings={settings} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {invalid && <span className="mr-auto text-[11px] text-rose-500">{invalid}</span>}
        <button type="button" disabled={busy} onClick={() => void test()} className={secondaryButtonClass}>
          <PlugZap size={13} /> Bağlantıyı test et
        </button>
        <button type="button" disabled={busy || invalid !== null} onClick={() => void save()} className={primaryButtonClass}>
          {busy ? 'İşleniyor…' : 'Kaydet'}
        </button>
      </div>

      <BankMailboxHints />
    </div>
  );
}

function LastRun({ settings }: { settings: BankMailboxSettingsDto }) {
  if (!settings.lastRunAt) return null;
  const when = formatDateTime(settings.lastRunAt, 'tr', DATE_FORMAT);

  return (
    <div className="rounded-[4px] bg-[var(--bg-subtle)] px-3 py-2 text-[11px]">
      <span className="text-[var(--fg-muted)]">Son çalışma {when} — {settings.lastImportedCount} yeni hareket.</span>
      {settings.lastError && <p className="mt-1 font-semibold text-rose-500">Son hata: {settings.lastError}</p>}
    </div>
  );
}
