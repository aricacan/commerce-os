'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ShopifyTotalDto } from '../../lib/api/shopify-explorer';
import { describePager } from './pagerRules';
import { ghostButtonClass } from './styles';

interface Props {
  pageNumber: number;
  hasPrevious: boolean;
  hasNext: boolean;
  busy: boolean;
  // Toplam kayıt/sayfa sayısı; sayılamadıysa verilmez ve yalnız "Sayfa X" görünür.
  total?: ShopifyTotalDto | null;
  onPrevious: () => void;
  onNext: () => void;
}

export function PagerBar({ pageNumber, hasPrevious, hasNext, busy, total, onPrevious, onNext }: Props) {
  return (
    <nav aria-label="Sayfalama" className="flex items-center justify-end gap-2">
      <button type="button" className={ghostButtonClass} disabled={!hasPrevious || busy} onClick={onPrevious}>
        <ChevronLeft size={14} aria-hidden /> Önceki
      </button>
      <span className="text-ui-xs text-fg-muted">{describePager(pageNumber, total)}</span>
      <button type="button" className={ghostButtonClass} disabled={!hasNext || busy} onClick={onNext}>
        Sonraki <ChevronRight size={14} aria-hidden />
      </button>
    </nav>
  );
}
