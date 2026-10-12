'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { shopifyProductsApi, type ShopifyProductImageDto } from '../../lib/api/shopify-products';
import { ALT_MAX_LENGTH, isAltOverLimit } from './imageAltRules';
import { fieldClass, ghostButtonClass } from './styles';
import { useWriteAction } from './useWriteAction';

interface Props {
  storeId: number;
  productId: number;
  image: ShopifyProductImageDto;
  position: number;
  disabled: boolean;
  onChanged: () => Promise<void>;
}

// Tek görselin alt metni: görünür ve düzenlenebilir; boş kaydetmek alt metni temizler.
export function ProductImageAlt({ storeId, productId, image, position, disabled, onChanged }: Props) {
  const { busy, run } = useWriteAction(onChanged);
  const [alt, setAlt] = useState(image.alt ?? '');
  const unchanged = alt.trim() === (image.alt ?? '');
  const over = isAltOverLimit(alt);

  return (
    <div className="flex flex-col gap-1">
      <input
        className={`${fieldClass} ${image.alt ? '' : 'border-warning'}`} value={alt} placeholder="Alt metin yok"
        aria-label={`${position}. görsel alt metni`} onChange={(e) => setAlt(e.target.value)}
      />
      <div className="flex items-center justify-between gap-1">
        <span className={`text-ui-2xs ${over ? 'text-danger' : 'text-fg-muted'}`}>{alt.trim().length}/{ALT_MAX_LENGTH}</span>
        <button
          type="button" className={ghostButtonClass} aria-label={`${position}. görsel alt metnini kaydet`}
          disabled={disabled || busy || unchanged || over}
          onClick={() => void run(() => shopifyProductsApi.updateImageAlt(storeId, productId, image.id, alt.trim()), 'Alt metin kaydedildi.')}
        >
          <Save size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
