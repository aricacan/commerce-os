'use client';

import { useState, type SyntheticEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { shopifyPaymentShippingApi, type ShopifyCarrierDto } from '../../lib/api/shopify-payment-shipping';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  carriers: ShopifyCarrierDto[];
}

export const CARRIERS_QUERY_KEY = 'carriers';

// Mağazanın kargo firmaları: ad + isteğe bağlı takip linki şablonu ({tracking} yerine takip numarası yazılır).
// Liste boş başlar; firma tanımlamak zorunlu değildir (kargolamada serbest metin de girilebilir).
export function CarrierManager({ storeId, carriers }: Props) {
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shopify', CARRIERS_QUERY_KEY, storeId] });

  const run = async (action: () => Promise<unknown>, successText: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      notify.success(successText);
      await refresh();
      return true;
    } catch (e) {
      notify.error(explorerErrorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: SyntheticEvent) => {
    event.preventDefault();
    const saved = await run(
      () => shopifyPaymentShippingApi.addCarrier(storeId, { name: name.trim(), trackingUrlTemplate: template.trim() || undefined }),
      'Kargo firması eklendi.',
    );
    if (saved) {
      setName('');
      setTemplate('');
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md bg-bg-subtle p-3" aria-label="Kargo firmaları">
      <h4 className="m-0 text-ui-xs font-bold text-fg">Kargo firmaları</h4>
      {carriers.length === 0 && <p className="m-0 text-ui-2xs text-fg-muted">Henüz firma tanımlı değil; kargolamada firma adını serbest yazabilirsiniz.</p>}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {carriers.map((carrier) => (
          <li key={carrier.id} className="flex items-center justify-between gap-2 text-ui-xs text-fg">
            <span className="min-w-0 break-all">{carrier.name}{carrier.trackingUrlTemplate ? ` — ${carrier.trackingUrlTemplate}` : ''}</span>
            <button
              type="button" className={ghostButtonClass} aria-label={`${carrier.name} firmasını sil`} disabled={busy}
              onClick={() => void run(() => shopifyPaymentShippingApi.deleteCarrier(storeId, carrier.id), 'Kargo firması silindi.')}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => void add(e)} className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 basis-36 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Firma adı
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex min-w-0 flex-[2] basis-48 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Takip linki şablonu (isteğe bağlı)
          <input value={template} placeholder="https://firma.example/takip?no={tracking}" onChange={(e) => setTemplate(e.target.value)} className={fieldClass} />
        </label>
        <button type="submit" className={primaryButtonClass} disabled={busy || name.trim() === ''}>Firma ekle</button>
      </form>
    </div>
  );
}
