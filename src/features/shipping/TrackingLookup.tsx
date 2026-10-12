'use client';

import { useState } from 'react';
import { Search, PackageSearch, Loader2 } from 'lucide-react';
import {
  shippingApi,
  type CarrierDto, type TrackingLookupResult,
} from '../../lib/api/shipping';
import {
  ShipmentStatusBadge,
} from './shared';
import { FilterSelect } from '../../components/ui/FilterSelect';

export function TrackingLookup({ carriers }: { carriers: CarrierDto[] }) {
  const usable = carriers.filter((c) => c.isSupported && c.isActive);

  const [carrierId, setCarrierId] = useState<string>(usable[0]?.id ? String(usable[0].id) : '');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingLookupResult | null>(null);

  const canQuery = carrierId !== '' && trackingNumber.trim().length > 0 && !loading;

  const handleQuery = async () => {
    if (!canQuery) return;
    setLoading(true);
    setResult(null);
    try {
      setResult(await shippingApi.lookupTracking(Number(carrierId), trackingNumber.trim()));
    } catch (e) {
      setResult({
        success: false, status: null, deliveredAt: null, events: [],
        error: e instanceof Error ? e.message : 'Sorgu başarısız.',
      });
    } finally {
      setLoading(false);
    }
  };

  const carrierOptions = [
    { value: '', label: 'Taşıyıcı Seç' },
    ...usable.map((c) => ({ value: String(c.id), label: c.displayName })),
  ];

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs flex flex-col gap-2.5 text-xs">
      <div className="flex items-center gap-2">
        <PackageSearch size={15} className="text-[var(--fg-muted)]" />
        <span className="font-bold text-xs text-[var(--fg)]">Canlı Takip No ile Sorgula</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-44">
          <FilterSelect
            value={carrierId}
            onChange={setCarrierId}
            placeholder="Taşıyıcı Seç"
            height="h-8"
            options={carrierOptions}
          />
        </div>

        <input
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleQuery(); }}
          placeholder="Kargo takip no (örn. 34299102931)"
          className="h-8 flex-1 min-w-[200px] rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />

        <button
          type="button"
          onClick={() => void handleQuery()}
          disabled={!canQuery}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          <span>{loading ? 'Sorgulanıyor...' : 'Sorgula'}</span>
        </button>
      </div>

      {result && (
        <div className="mt-1 p-2.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 flex flex-col gap-1.5 text-[11px]">
          {result.success ? (
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--fg)]">Durum:</span>
              {result.status != null && <ShipmentStatusBadge status={result.status} />}
              {result.deliveredAt && (
                <span className="text-[var(--fg-muted)]">
                  Teslim: {new Date(result.deliveredAt).toLocaleDateString('tr-TR')}
                </span>
              )}
            </div>
          ) : (
            <div className="text-rose-500">{result.error ?? 'Kargo bulunamadı.'}</div>
          )}

          {result.events && result.events.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[var(--border-soft)]">
              {result.events.map((ev, i) => (
                <div key={i} className="flex items-center justify-between text-[10.5px] text-[var(--fg-muted)]">
                  <span>{ev.description}</span>
                  <span>{ev.occurredAt ? new Date(ev.occurredAt).toLocaleString('tr-TR') : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
