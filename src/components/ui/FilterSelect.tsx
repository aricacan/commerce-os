'use client';

import { useEffect, useRef, useState, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface FilterSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  /** Seçeneğin üstüne gelince görünen açıklama. */
  hint?: string;
}

export function FilterSelect({
  value,
  options,
  placeholder,
  onChange,
  minWidth = 140,
  height = 'h-8',
  searchable = false,
  className = '',
  variant = 'compact',
  showAllOption = true,
  dropUp = false,
  ariaLabel,
  triggerClassName = 'rounded-[4px]',
  highlightActive = false,
}: {
  value: string;
  options: FilterSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
  minWidth?: number | string;
  height?: string;
  searchable?: boolean;
  className?: string;
  /**
   * 'trigger' varyantı, tarih seçicinin de kullandığı ortak `.dropdown-trigger`
   * stilini uygular (36px, 6px köşe, gölge). Aynı filtre çubuğunda iki farklı
   * yükseklik yan yana durunca çubuk dağınık görünüyordu.
   */
  variant?: 'compact' | 'trigger';
  /**
   * Listenin başındaki "hepsi" satırı (boş değer). Değer kümesi zaten tüm seçenekleri
   * kapsıyorsa (ör. Tümü/Yurt İçi/Yurt Dışı) bu satır TIKLANDIĞINDA HİÇBİR ŞEY
   * YAPMAYAN ölü bir seçenek olur — o durumda kapatılır.
   */
  showAllOption?: boolean;
  /**
   * Listeyi YUKARI doğru açar. Sayfanın dibindeki seçicilerde (sol paneldeki firma
   * seçici gibi) aşağı açılan liste ekranın dışında kalıp hiç görünmüyordu.
   */
  dropUp?: boolean;
  /** Düğmenin ekran okuyucu adı; görünen metin seçili değer olduğu için alanın ne olduğunu söylemez. */
  ariaLabel?: string;
  /** Düğmenin köşe yuvarlaklığı; varsayılan eski sıkı görünüm. */
  triggerClassName?: string;
  /** Bir değer seçiliyken düğmeyi vurgular — "burada filtre var" bir bakışta görünsün. */
  highlightActive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number; minWidth: number } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // useCallback ZORUNLU: bu fonksiyon asagidaki iki effect'in bagimligi (react-hooks/
  // exhaustive-deps). Memoize edilmeseydi her render'da yeni kimlik alir, effect'ler
  // yeniden calisir, setCoords tekrar render tetikler -> sonsuz dongu. Kimlik yalnizca
  // dropUp/minWidth degisince degisir, yani setCoords kaynakli render'lar effect'i
  // yeniden tetiklemez.
  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupEstimatedHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const shouldDropUp = dropUp || (spaceBelow < popupEstimatedHeight && rect.top > popupEstimatedHeight);

      // Yukarı açılırken ALT kenar düğmeye sabitlenir. Üst kenarı tahmini yükseklikten
      // hesaplamak, liste kısa olduğunda (ör. iki firmalık seçici) paneli düğmeden kopuk
      // havada bırakıyordu.
      setCoords({
        ...(shouldDropUp
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        left: rect.left,
        minWidth: Math.max(rect.width, typeof minWidth === 'number' ? minWidth : 150),
      });
    }
  }, [dropUp, minWidth]);

  useLayoutEffect(() => {
    if (open) {
      updateCoords();
    }
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    if (searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popupRef.current &&
        !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape "işlendi" diye işaretlenir: menüyü içeren kabuk (ör. sunum modu) aynı tuşla
      // kendini de kapatmasın — kullanıcı yalnız bu menüyü kapatmak istedi.
      e.preventDefault();
      setOpen(false);
    };

    const onScrollOrResize = () => {
      if (open) updateCoords();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, searchable, updateCoords]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    // Türkçe küçültme: toLowerCase "İSTANBUL"u "i̇stanbul" (birleşen noktalı) yapıyor ve
    // "istanbul" araması eşleşmiyordu; "I" da "ı" yerine "i" oluyordu.
    const lower = (text: string) => text.toLocaleLowerCase('tr-TR');
    const s = lower(search);
    return options.filter(
      (o) => lower(o.label).includes(s) || (o.sublabel && lower(o.sublabel).includes(s))
    );
  }, [options, search]);

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      style={{ minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={variant === 'trigger'
          ? 'dropdown-trigger w-full justify-between'
          : `flex w-full ${height} items-center justify-between gap-2 ${triggerClassName} border px-2.5 ${highlightActive && value !== '' ? 'border-[var(--fg)]/40 bg-[var(--bg-subtle)]' : 'border-[var(--border)] bg-[var(--card)]'} text-xs font-semibold text-[var(--fg)] outline-none transition hover:bg-[var(--bg-subtle)] focus:border-[var(--fg)] focus-visible:ring-2 focus-visible:ring-[var(--fg)]/20 cursor-pointer`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-[var(--fg-muted)] transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && mounted && (isMobile || coords) && createPortal(
        <>
          <button
            type="button"
            className="filter-select-mobile-backdrop"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />
          <div
            ref={popupRef}
            role="listbox"
            style={
              isMobile
                ? undefined
                : {
                    position: 'fixed',
                    top: coords?.top,
                    bottom: coords?.bottom,
                    left: coords?.left ?? 0,
                    minWidth: coords?.minWidth ?? 150,
                    zIndex: 99999,
                  }
            }
            className="filter-select-popup flex max-h-64 flex-col gap-0.5 overflow-hidden rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-1 shadow-xl"
          >
            <div className="dropdown-mobile-handle sm:hidden" />
            {(searchable || options.length > 8) && (
              <div className="relative p-1 border-b border-[var(--border-soft)] mb-0.5">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                <input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ara..."
                  className="h-7 w-full rounded-[3px] border border-[var(--border)] bg-[var(--bg)] pl-7 pr-2 text-xs text-[var(--fg)] outline-none"
                />
              </div>
            )}

            <div className="overflow-y-auto max-h-56 space-y-0.5">
              {showAllOption && (
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={`flex w-full items-center justify-between rounded-[3px] px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                    !value
                      ? 'bg-[var(--bg-subtle)] font-bold text-[var(--fg)]'
                      : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] font-medium'
                  }`}
                  onClick={() => pick('')}
                >
                  <span className="truncate">{placeholder}</span>
                  {!value && <Check size={12} className="shrink-0 text-[var(--fg)]" />}
                </button>
              )}
              {filteredOptions.map((o) => {
                const isSelected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    title={o.hint}
                    className={`flex w-full items-center justify-between rounded-[3px] px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--bg-subtle)] font-bold text-[var(--fg)]'
                        : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] font-medium'
                    }`}
                    onClick={() => pick(o.value)}
                  >
                    <div className="truncate">
                      <span>{o.label}</span>
                      {o.sublabel && <span className="ml-1.5 text-ui-xs text-[var(--fg-muted)]">({o.sublabel})</span>}
                    </div>
                    {isSelected && <Check size={12} className="shrink-0 text-[var(--fg)]" />}
                  </button>
                );
              })}
              {filteredOptions.length === 0 && (
                <div className="py-2 text-center text-xs text-[var(--fg-muted)]">Sonuç bulunamadı</div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
