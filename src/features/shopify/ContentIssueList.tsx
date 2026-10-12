'use client';

import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { SHOPIFY_CONTENT_PROBLEM, type ShopifyContentIssueDto } from '../../lib/api/shopify-content';
import { PROBLEM_META } from './contentRules';
import { StatusBadge } from './StatusBadge';
import { ghostButtonClass } from './styles';

interface Props {
  products: ShopifyContentIssueDto[];
  // Öneri istenen ürün (düğme meşgul gösterilir).
  suggestingId: number | null;
  onSuggest: (product: ShopifyContentIssueDto) => void;
  // "Görsel alt metni yok" sorunu olan üründe alt metin önerisi açılır.
  onSuggestAlt: (product: ShopifyContentIssueDto) => void;
}

// Sorunlu ürünler: ad + sorun rozetleri + "AI önerisi" (+ alt metin sorunu varsa "Alt metin önerisi") düğmeleri.
export function ContentIssueList({ products, suggestingId, onSuggest, onSuggestAlt }: Props) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {products.map((product) => (
        <li key={product.id} className="flex flex-col gap-2 rounded-md border border-border-soft bg-card px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 basis-48 break-words text-ui-sm font-bold text-fg">{product.title}</span>
            {product.problems.includes(SHOPIFY_CONTENT_PROBLEM.ImageAltMissing) && (
              <button type="button" className={ghostButtonClass} onClick={() => onSuggestAlt(product)}>
                <ImageIcon size={14} aria-hidden /> Alt metin önerisi
              </button>
            )}
            <button
              type="button" className={ghostButtonClass} disabled={suggestingId !== null} onClick={() => onSuggest(product)}
            >
              <Sparkles size={14} aria-hidden /> {suggestingId === product.id ? 'Öneri hazırlanıyor…' : 'AI önerisi'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {product.problems.map((problem) => (
              <StatusBadge key={problem} label={PROBLEM_META[problem].label} tone={PROBLEM_META[problem].tone} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
