'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  title: string;
  startIndex?: number;
  onClose: () => void;
}

// Ürün görsellerini tam ekran gezdiren tek sorumluluklu bileşen. Portal kullanır çünkü
// çağıran satır/kart tıklamayı yakalayan bir `role="button"` içinde duruyor; DOM'da
// üstte durmadan overlay z-index'i tablo scroll konteynerinin altında kalıyordu.
export function ImageLightbox({ images, title, startIndex = 0, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const total = images.length;

  const go = useCallback((delta: number) => {
    setIndex((current) => (current + delta + total) % total);
  }, [total]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (total === 0) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 p-6"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div className="flex w-full items-start justify-between gap-4">
        <span className="text-sm font-medium text-white/90">{title}</span>
        <button type="button" onClick={onClose} aria-label="Kapat" className="rounded p-1 text-white/70 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="flex w-full flex-1 items-center justify-center gap-4" onClick={(event) => event.stopPropagation()}>
        {total > 1 && (
          <button type="button" onClick={() => go(-1)} aria-label="Önceki görsel" className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
            <ChevronLeft size={28} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[index]} alt={`${title} ${index + 1}`} className="max-h-[70vh] max-w-full object-contain" />
        {total > 1 && (
          <button type="button" onClick={() => go(1)} aria-label="Sonraki görsel" className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white">
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {total > 1 && (
        <div className="flex max-w-full flex-wrap items-center justify-center gap-2 overflow-x-auto" onClick={(event) => event.stopPropagation()}>
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Görsel ${i + 1}`}
              aria-current={i === index}
              className="rounded border-2 p-0"
              style={{ borderColor: i === index ? 'var(--accent)' : 'transparent' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-12 w-12 rounded object-cover" />
            </button>
          ))}
        </div>
      )}

      <span className="text-xs text-white/60">{index + 1} / {total}</span>
    </div>,
    document.body,
  );
}
