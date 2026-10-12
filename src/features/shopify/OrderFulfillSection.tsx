'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import {
  shopifyPaymentShippingApi, type ShopifyFulfillBody, type ShopifyFulfillableLineDto,
} from '../../lib/api/shopify-payment-shipping';
import { surfaceCard } from '../shared/design';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { CheckboxField } from './FormControls';
import { CARRIERS_QUERY_KEY, CarrierManager } from './CarrierManager';
import {
  buildFulfillBody, buildTrackingUrl, clampFulfillQuantity, defaultFulfillQuantities, trackingUrlError, type FulfillFormState,
} from './fulfillmentRules';
import { ExplorerState } from './ExplorerState';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
  orderId: number;
  busy: boolean;
  onFulfill: (body: ShopifyFulfillBody) => Promise<boolean>;
}

const EMPTY_FORM: FulfillFormState = { quantities: {}, company: '', trackingNumber: '', trackingUrl: '', notifyCustomer: false };

// Kargolandı işaretle: kalem/adet seç (kısmi kargolama) + firma, takip no, takip linki (serbest metin) + müşteri bildirimi.
// Firma listesi mağazaya özeldir; seçilen firmanın link şablonu takip numarasından linki kendisi kurar.
export function OrderFulfillSection({ storeId, orderId, busy, onFulfill }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div>
        <button type="button" className={ghostButtonClass} onClick={() => setOpen(true)}>
          <Truck size={14} aria-hidden /> Kargolandı işaretle
        </button>
      </div>
    );
  }
  return <FulfillForm storeId={storeId} orderId={orderId} busy={busy} onFulfill={onFulfill} onClose={() => setOpen(false)} />;
}

interface FormProps extends Props {
  onClose: () => void;
}

function FulfillForm({ storeId, orderId, busy, onFulfill, onClose }: FormProps) {
  const [form, setForm] = useState<FulfillFormState | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [carrierId, setCarrierId] = useState('');

  const lines = useQuery({
    queryKey: ['shopify', 'fulfillable', storeId, orderId],
    queryFn: () => shopifyPaymentShippingApi.fulfillableLines(storeId, orderId),
  });
  const carriers = useQuery({
    queryKey: ['shopify', CARRIERS_QUERY_KEY, storeId],
    queryFn: () => shopifyPaymentShippingApi.carriers(storeId),
  });

  const fulfillable = lines.data ?? [];
  const current: FulfillFormState = form ?? { ...EMPTY_FORM, quantities: defaultFulfillQuantities(fulfillable) };
  const change = (patch: Partial<FulfillFormState>) => setForm({ ...current, ...patch });

  // Link elle yazılmadıysa seçili firmanın şablonundan kurulur.
  const effectiveUrl = current.trackingUrl || buildTrackingUrl(template, current.trackingNumber) || '';
  const body = buildFulfillBody({ ...current, trackingUrl: effectiveUrl });
  const urlError = trackingUrlError(effectiveUrl);

  const pickCarrier = (id: string) => {
    setCarrierId(id);
    const carrier = carriers.data?.find((c) => String(c.id) === id);
    setTemplate(carrier?.trackingUrlTemplate ?? null);
    change({ company: carrier?.name ?? current.company, trackingUrl: '' });
  };

  const submit = async () => {
    if (body && await onFulfill(body)) onClose();
  };

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Kargolama">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Kargolandı işaretle</h3>
      <ExplorerState
        loading={lines.isLoading} error={lines.error} isEmpty={fulfillable.length === 0}
        emptyTitle="Kargolanacak kalem yok" emptyDescription="Sipariş zaten kargolanmış ya da iptal edilmiş olabilir."
        onRetry={() => void lines.refetch()}
      >
        <FulfillLines lines={fulfillable} quantities={current.quantities} onChange={(quantities) => change({ quantities })} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-ui-2xs font-semibold text-fg-muted">Kayıtlı firma</span>
            <SearchableSelect
              value={carrierId} onChange={pickCarrier} placeholder="Serbest metin" searchPlaceholder="Firma ara..."
              options={(carriers.data ?? []).map((carrier) => ({ value: String(carrier.id), label: carrier.name }))}
            />
          </div>
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Kargo firması
            <input value={current.company} onChange={(e) => change({ company: e.target.value })} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Takip numarası
            <input value={current.trackingNumber} onChange={(e) => change({ trackingNumber: e.target.value })} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Takip linki
            <input value={effectiveUrl} onChange={(e) => change({ trackingUrl: e.target.value })} className={fieldClass} />
            {urlError && <span role="alert" className="font-normal text-danger">{urlError}</span>}
          </label>
        </div>
        <CheckboxField checked={current.notifyCustomer} onChange={(notifyCustomer) => change({ notifyCustomer })}>
          Müşteriye Shopify kargo bildirimi gönder
        </CheckboxField>
        <CarrierManager storeId={storeId} carriers={carriers.data ?? []} />
      </ExplorerState>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || body === null} onClick={() => void submit()}>
          Kargolandı olarak işaretle
        </button>
        <button type="button" className={ghostButtonClass} onClick={onClose}>Vazgeç</button>
      </div>
    </section>
  );
}

interface LinesProps {
  lines: ShopifyFulfillableLineDto[];
  quantities: Record<number, number>;
  onChange: (quantities: Record<number, number>) => void;
}

function FulfillLines({ lines, quantities, onChange }: LinesProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {lines.map((line) => (
        <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 text-ui-xs">
          <span className="min-w-0 flex-1 basis-48 break-words text-fg">
            {line.title}
            <span className="block text-ui-2xs text-fg-muted">{line.sku ? `SKU ${line.sku} · ` : ''}Kargolanabilir: {line.remainingQuantity}</span>
          </span>
          <input
            type="number" min={0} max={line.remainingQuantity} aria-label={`${line.title} kargo adedi`}
            value={quantities[line.id] ?? 0}
            onChange={(e) => onChange({ ...quantities, [line.id]: clampFulfillQuantity(Number(e.target.value), line.remainingQuantity) })}
            className={`${fieldClass} w-20`}
          />
        </li>
      ))}
    </ul>
  );
}
