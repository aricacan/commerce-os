'use client';

import type { OrderDestinationOptionDto } from '../../lib/api/omnichannel-order-destinations';
import { OrderDestinationPicker } from './OrderDestinationPicker';
import { useOrderDestinationOptions } from './useOrderDestinationOptions';

interface Props {
  /** Kapsamın ülkesi (seçenekler buna göre süzülür); boş = ülkeden bağımsız kapsam. */
  country: string | null;
  initialKey: string;
  saving: boolean;
  onSave: (option: OrderDestinationOptionDto) => void;
  onCancel: () => void;
}

// Seçenekleri kapsamın ülkesine göre okuyup seçiciyi gösterir (Kanal Merkezi ve Hesap geneli ortak).
export function OrderDestinationEditor({ country, initialKey, saving, onSave, onCancel }: Props) {
  const { options, loading, error } = useOrderDestinationOptions(country);

  if (loading) return <p className="m-0 text-[11px] text-[var(--fg-muted)]">Hedefler yükleniyor…</p>;
  if (error) return <p className="m-0 text-[11px] text-rose-500">{error}</p>;

  return <OrderDestinationPicker options={options} initialKey={initialKey} saving={saving} onSave={onSave} onCancel={onCancel} />;
}
