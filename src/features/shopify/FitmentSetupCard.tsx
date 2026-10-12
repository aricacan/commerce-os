'use client';

import { CheckCircle2, Wrench } from 'lucide-react';
import type { ShopifyFitmentSetupDto } from '../../lib/api/shopify-fitment';
import { surfaceCard } from '../shared/design';
import { primaryButtonClass } from './styles';

interface Props {
  status: ShopifyFitmentSetupDto;
  busy: boolean;
  onSetup: () => void;
}

// Kurulum durumu: iki tanım (vehicle metaobject + ürün metafield'ı) hazırsa özet, değilse "Kur" düğmesi.
export function FitmentSetupCard({ status, busy, onSetup }: Props) {
  if (status.isReady) {
    return (
      <p className={`${surfaceCard} m-0 flex items-center gap-2 p-3 text-ui-xs text-fg`}>
        <CheckCircle2 size={14} aria-hidden /> Kurulum tamam: &quot;Araç&quot; kaydı ve ürün üzerindeki &quot;Araç uyumluluğu&quot; alanı mağazada var.
      </p>
    );
  }

  return (
    <section className={`${surfaceCard} flex flex-col gap-2 p-3`} aria-label="Araç uyumluluğu kurulumu">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Kurulum gerekli</h3>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-ui-xs text-fg-muted">
        <li>{status.vehicleDefinitionExists ? 'Tamam' : 'Eksik'}: &quot;Araç&quot; kayıt tanımı (marka, model, yıl aralığı)</li>
        <li>{status.productMetafieldExists ? 'Tamam' : 'Eksik'}: ürün üzerinde &quot;Araç uyumluluğu&quot; alanı</li>
      </ul>
      <div>
        <button type="button" className={primaryButtonClass} disabled={busy} onClick={onSetup}>
          <Wrench size={14} aria-hidden /> {busy ? 'Kuruluyor…' : 'Kurulumu yap'}
        </button>
      </div>
    </section>
  );
}
