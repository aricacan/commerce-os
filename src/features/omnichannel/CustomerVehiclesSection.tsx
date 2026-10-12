'use client';

import { useState } from 'react';
import { Bot, Car, Plus, Star, Trash2 } from 'lucide-react';
import {
  customersApi, DATA_SOURCE, type CustomerVehicleDto, type CustomerVehicleInput,
} from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { EmptyLine, PanelSection, ghostButtonClass, iconButtonClass, type CustomerSectionProps } from './CustomerPanelParts';
import { CustomerVehicleForm } from './CustomerVehicleForm';
import { vehicleLabel } from './customerProfileRules';

// PUT tüm alanları yazar: birincil yaparken nesil/gövde tipi de aynen geri gönderilir (eski backend
// göndermezse null — o sürümde zaten saklanmıyordu).
const toInput = (v: CustomerVehicleDto, isPrimary: boolean): CustomerVehicleInput => ({
  make: v.make, model: v.model, year: v.year, generation: v.generation ?? null, bodyType: v.bodyType ?? null, isPrimary,
});

// Müşterinin araçları. Bot başka kanalda aracı tekrar sormasın diye birincil araç
// konuşmaya yüklenir; temsilcinin eklediği/seçtiği bilgi botun öğrendiğini ezer.
export function CustomerVehiclesSection({ profile, readOnly, onChanged }: CustomerSectionProps) {
  const [adding, setAdding] = useState(false);
  const { notify } = useFeedback();

  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    try {
      await action();
      await onChanged();
      return true;
    } catch (e) {
      notify.error(describeError(e));
      return false;
    }
  };

  const add = async (vehicle: CustomerVehicleInput) => {
    if (await run(() => customersApi.addVehicle(profile.id, vehicle))) setAdding(false);
  };

  return (
    <PanelSection title="Araçlar" count={profile.vehicles.length}
      action={!readOnly && !adding && (
        <button type="button" className={ghostButtonClass} onClick={() => setAdding(true)}>
          <Plus size={12} /> Ekle
        </button>
      )}>
      {profile.vehicles.length === 0 && !adding && (
        <EmptyLine>Kayıtlı araç yok. Müşteri aracını söyleyince bot buraya ekler.</EmptyLine>
      )}
      <ul className="flex flex-col gap-1.5">
        {profile.vehicles.map((v) => (
          <li key={v.id} className="flex items-center gap-2 text-xs">
            <Car size={13} className={v.isPrimary ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'} />
            <span className={`min-w-0 flex-1 truncate ${v.isPrimary ? 'font-semibold text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`}
              title={vehicleLabel(v)}>
              {vehicleLabel(v)}
            </span>
            {v.source === DATA_SOURCE.Bot && (
              <span title="Bot konuşmadan öğrendi"><Bot size={12} className="text-[var(--fg-muted)]" /></span>
            )}
            {!readOnly && !v.isPrimary && (
              <button type="button" className={iconButtonClass} title="Birincil araç yap"
                onClick={() => void run(() => customersApi.updateVehicle(profile.id, v.id, toInput(v, true)))}>
                <Star size={12} />
              </button>
            )}
            {!readOnly && (
              <button type="button" className={iconButtonClass} title="Sil"
                onClick={() => void run(() => customersApi.removeVehicle(profile.id, v.id))}>
                <Trash2 size={12} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <CustomerVehicleForm isPrimary={profile.vehicles.length === 0} onSave={add} onCancel={() => setAdding(false)} />
      )}
    </PanelSection>
  );
}
