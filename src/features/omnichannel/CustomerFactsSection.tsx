'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { customerCrmApi, type FactKey } from '../../lib/api/customer-crm';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EmptyLine, PanelSection, ghostButtonClass, inputClass, type CustomerSectionProps } from './CustomerPanelParts';
import { CustomerFactEditor } from './CustomerFactEditor';
import { CustomerFactRow } from './CustomerFactRow';
import { FACT_LABELS, isFactKey, missingFactKeys } from './customerProfileRules';

// Bot ve temsilcinin öğrendiği müşteri bilgileri (şehir, ödeme tercihi, işletme tipi…). Temsilcinin
// yazdığı değer botunkini ezer; silinen bilgi bot yeniden öğrenene kadar boş kalır.
export function CustomerFactsSection({ profile, readOnly, onChanged }: CustomerSectionProps) {
  const [addingKey, setAddingKey] = useState<FactKey | null>(null);
  const { notify, confirm } = useFeedback();
  const missing = missingFactKeys(profile.facts);

  const save = async (key: FactKey, value: string): Promise<boolean> => {
    try {
      await customerCrmApi.setFact(profile.id, key, value);
      await onChanged();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    }
  };

  const remove = async (key: string, label: string) => {
    const ok = await confirm({ title: `"${label}" bilgisi silinsin mi?`, confirmLabel: 'Sil', danger: true });
    if (!ok) return;
    try {
      await customerCrmApi.removeFact(profile.id, key);
      await onChanged();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <PanelSection title="Bilgiler" count={profile.facts.length}
      action={!readOnly && addingKey === null && missing.length > 0 && (
        <button type="button" className={ghostButtonClass} onClick={() => setAddingKey(missing[0])}>
          <Plus size={12} /> Ekle
        </button>
      )}>
      {profile.facts.length === 0 && addingKey === null && (
        <EmptyLine>Henüz bilgi yok. Bot konuşmadan şehir, ödeme tercihi gibi bilgileri öğrendikçe burada görünür.</EmptyLine>
      )}
      <dl className="flex flex-col gap-2">
        {profile.facts.map((fact) => (
          <CustomerFactRow key={fact.key} fact={fact} readOnly={readOnly || !isFactKey(fact.key)}
            onSave={(value) => (isFactKey(fact.key) ? save(fact.key, value) : Promise.resolve(false))}
            onRemove={(label) => void remove(fact.key, label)} />
        ))}
      </dl>
      {addingKey !== null && (
        <div className="flex flex-col gap-1.5">
          <select value={addingKey} onChange={(e) => setAddingKey(e.target.value as FactKey)}
            className={inputClass} aria-label="Bilgi türü">
            {missing.map((key) => <option key={key} value={key}>{FACT_LABELS[key]}</option>)}
          </select>
          <CustomerFactEditor initialValue="" onCancel={() => setAddingKey(null)}
            onSave={async (value) => { if (await save(addingKey, value)) setAddingKey(null); }} />
        </div>
      )}
    </PanelSection>
  );
}
