'use client';

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { focusRing, motionFast } from '../shared/design';

// Omnichannel listelerinin (Gelen Kutusu, Pano, Müşteriler) ORTAK filtre çubuğu. Filtreler her
// ekranda aynı açılır menüdür (InboxFilterSelect); yalnız yerleşim ekrana göre değişir:
//   Masaüstü: arama + bütün menüler tek satırda (sığmazsa alta sarar) + "n filtre seçili".
//   Telefon:  arama + tek "Filtreler (n)" düğmesi; menüler düğmenin açtığı panelde ALT ALTA, tam
//             genişlikte. Yatay kaydırılan menü satırı telefonda menülerin yarısını ekran dışında
//             bırakıyordu; alt alta dizilim hepsini görünür ve parmakla rahat dokunulur kılar.
interface Props {
  search: ReactNode;
  // Açılır menüler (InboxFilterSelect). Telefonda tam genişliğe yayılırlar.
  filters: ReactNode;
  activeCount: number;
  // Verilirse ve sıfırlanacak bir şey varsa "Temizle" düğmesi çıkar.
  onClear?: () => void;
  canClear?: boolean;
  className?: string;
}

export function FilterToolbar({ search, filters, activeCount, onClear, canClear = false, className = '' }: Props) {
  const isMobile = useMobile();
  const [panelOpen, setPanelOpen] = useState(false);

  const clearButton = onClear && canClear && (
    <button
      type="button"
      onClick={onClear}
      className={`flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-lg border-0 bg-transparent px-2 text-ui-xs font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg md:h-9 ${motionFast} ${focusRing}`}
    >
      <X size={13} aria-hidden />
      Temizle
    </button>
  );

  return (
    <div className={`flex shrink-0 flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {search}
        {isMobile ? (
          <button
            type="button"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
            className={`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-ui-sm font-semibold text-fg ${motionFast} ${focusRing}`}
          >
            <SlidersHorizontal size={14} aria-hidden />
            {activeCount > 0 ? `Filtreler (${activeCount})` : 'Filtreler'}
          </button>
        ) : (
          <>
            {filters}
            {activeCount > 0 && <span className="shrink-0 text-ui-xs text-fg-muted">{activeCount} filtre seçili</span>}
          </>
        )}
        {clearButton}
      </div>

      {isMobile && panelOpen && <div className="flex flex-col gap-2">{filters}</div>}
    </div>
  );
}
