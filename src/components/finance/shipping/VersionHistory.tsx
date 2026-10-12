'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { History, Trash2 } from 'lucide-react';
import { shippingPoliciesApi, type ShippingPolicyDto } from '../../../lib/api/shipping-policies';
import { PRICING_METHOD_OPTIONS } from './policyDraft';
import { pushAlert } from '../../../stores/alert-stack';
import { SectionCard } from './ui';

const formatDay = (isoDay: string) => new Date(`${isoDay}T00:00:00`).toLocaleDateString('tr-TR');

const methodLabel = (version: ShippingPolicyDto) =>
  PRICING_METHOD_OPTIONS.find((o) => o.key === version.pricingMethod)?.label ?? version.pricingMethod;

interface VersionHistoryProps {
  region: string;
  versions: ShippingPolicyDto[];
}

// Kapsamın tarihli sürümleri: her sipariş kendi tarihinde geçerli sürümle hesaplanır. En yeni
// sürümü silmek bir önceki fiyata geri dönmek demektir.
export function VersionHistory({ region, versions }: VersionHistoryProps) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: shippingPoliciesApi.removeVersion,
    onSuccess: () => {
      pushAlert('Sürüm silindi.', 'success', 4000);
      queryClient.invalidateQueries({ queryKey: ['shipping-policies', region] });
    },
    onError: (err) => pushAlert(err instanceof Error ? err.message : 'Silinemedi.', 'error', 6000),
  });

  if (versions.length < 2) return null;

  return (
    <SectionCard tour="shipping-versions" title="Fiyat geçmişi">
      <ul className="m-0 flex list-none flex-col divide-y divide-[var(--border-soft)] rounded-[6px] border border-[var(--border-soft)] p-0">
        {versions.map((version, index) => (
          <li key={version.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <History size={13} className="shrink-0 text-[var(--fg-muted)]" />
              <div className="flex min-w-0 flex-col">
                <span className="text-xs font-semibold text-[var(--fg)]">
                  {version.validFrom ? `${formatDay(version.validFrom)} sonrası` : 'Başlangıçtan'}
                  {index === 0 && <span className="ml-1.5 rounded-[4px] bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">güncel</span>}
                </span>
                <span className="text-[10.5px] text-[var(--fg-muted)]">{methodLabel(version)}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Sürümü sil"
              disabled={remove.isPending}
              onClick={() => confirm('Bu sürüm silinsin mi? O tarihteki siparişler bir önceki sürümle hesaplanır.') && remove.mutate(version.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-40 cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
