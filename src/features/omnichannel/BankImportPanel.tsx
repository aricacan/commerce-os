'use client';

import { useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { bankApi, type BankImportResultDto } from '../../lib/api/omnichannel-bank';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { BankMappingForm } from './BankMappingForm';
import {
  bankMappingDraftError,
  bankMappingDraftFrom,
  EMPTY_BANK_MAPPING_DRAFT,
  toBankMapping,
  type BankMappingDraft,
} from './bankMatchRules';
import { formInputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import { useBankTemplates } from './useBankTransactions';

const ACCEPTED_FILES = '.csv,.txt,.xlsx';

interface Props {
  onImported: (result: BankImportResultDto) => void;
}

// Döküm yükleme (yalnız yönetici): şablon seç → dosya seç → içe aktar. Şablon yoksa eşleme elle girilir
// ve banka adıyla kaydedilir; bir sonraki yüklemede şablon seçmek yeter.
export function BankImportPanel({ onImported }: Props) {
  const { templates, error, reload } = useBankTemplates();
  const { notify, confirm } = useFeedback();
  const [file, setFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [draft, setDraft] = useState<BankMappingDraft>(EMPTY_BANK_MAPPING_DRAFT);
  const [bankName, setBankName] = useState('');
  const [busy, setBusy] = useState(false);

  if (error) {
    return <p className="text-[11px] text-[var(--fg-muted)]">Döküm yükleme yalnız yöneticilere açıktır. ({error})</p>;
  }

  const pickTemplate = (id: string) => {
    setTemplateId(id);
    const template = templates.find((t) => String(t.id) === id);
    if (!template) return;
    setDraft(bankMappingDraftFrom(template.mapping));
    setBankName(template.bankName);
  };

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

  const handleImport = () => {
    const invalid = bankMappingDraftError(draft);
    if (invalid || !file) { notify.error(invalid ?? 'Bir döküm dosyası seç.'); return; }
    void run(async () => {
      onImported(await bankApi.import(file, toBankMapping(draft)));
      setFile(null);
    });
  };

  const handleSaveTemplate = () => {
    const invalid = bankMappingDraftError(draft);
    if (invalid || !bankName.trim()) { notify.error(invalid ?? 'Banka adını gir.'); return; }
    void run(async () => {
      const saved = await bankApi.saveTemplate({ bankName: bankName.trim(), mapping: toBankMapping(draft) });
      setTemplateId(String(saved.id));
      await reload();
      notify.success('Şablon kaydedildi.');
    });
  };

  const handleDeleteTemplate = async () => {
    const template = templates.find((t) => String(t.id) === templateId);
    if (!template) return;
    const ok = await confirm({ title: 'Şablon silinsin mi?', body: template.bankName, confirmLabel: 'Sil', danger: true });
    if (!ok) return;
    void run(async () => {
      await bankApi.deleteTemplate(template.id);
      setTemplateId('');
      await reload();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>Kayıtlı banka şablonu</span>
          <FilterSelect value={templateId} placeholder="Şablon seç veya aşağıda elle gir" height="h-8.5" minWidth="100%"
            options={templates.map((t) => ({ value: String(t.id), label: t.bankName }))} onChange={pickTemplate} />
        </label>
        <label className="flex min-w-0 flex-col">
          <span className={labelClass}>Döküm dosyası (CSV / Excel)</span>
          <input type="file" accept={ACCEPTED_FILES} className={`${formInputClass} cursor-pointer py-1`}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <BankMappingForm draft={draft} onChange={setDraft} />

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-40 flex-1 flex-col">
          <span className={labelClass}>Şablon adı (banka)</span>
          <input value={bankName} placeholder="Örn. Ziraat" className={formInputClass} onChange={(e) => setBankName(e.target.value)} />
        </label>
        <button type="button" disabled={busy} onClick={handleSaveTemplate} className={secondaryButtonClass}>
          <Save size={13} /> Şablonu kaydet
        </button>
        {templateId && (
          <button type="button" disabled={busy} onClick={() => void handleDeleteTemplate()} className={secondaryButtonClass}>
            Şablonu sil
          </button>
        )}
        <button type="button" disabled={busy || !file} onClick={handleImport} className={primaryButtonClass}>
          <Upload size={13} /> {busy ? 'İşleniyor…' : 'İçe aktar'}
        </button>
      </div>
    </div>
  );
}
