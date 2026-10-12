'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useTourStore } from './tour-store';

export function PageHelpModal() {
  const { activeHelpModal, closeHelpModal, startTour, completedTours } = useTourStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!activeHelpModal) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHelpModal();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeHelpModal, closeHelpModal]);

  if (!activeHelpModal) return null;

  const isCompleted = completedTours[activeHelpModal.id];

  const handleStartTour = () => {
    const item = activeHelpModal;
    closeHelpModal();

    if (item.tourSteps && item.tourSteps.length > 0) {
      const firstTargetExists = typeof document !== 'undefined' && !!document.querySelector(item.tourSteps[0].target);
      if (!firstTargetExists && pathname !== item.href) {
        router.push(item.href);
      }
      setTimeout(() => {
        startTour(item.id, item.tourSteps!, true);
      }, 120);
    }
  };

  return (
    <div className="fixed inset-0 z-[45000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeHelpModal}
      />

      {/* Modal Card - Sert hatlı, beyaz, kurumsal */}
      <div
        style={{ width: 'min(92vw, 440px)' }}
        className="relative z-10 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-zinc-900 dark:text-zinc-100 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-[2px] bg-zinc-100 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                {activeHelpModal.badge || 'Rehber'}
              </span>
              {isCompleted && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Tur Tamamlandı
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
              {activeHelpModal.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={closeHelpModal}
            className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Description */}
        <div className="py-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">
            Bu Sayfa Ne İşe Yarar?
          </h4>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal">
            {activeHelpModal.description}
          </p>
        </div>

        {/* Features */}
        {activeHelpModal.features && activeHelpModal.features.length > 0 && (
          <div className="pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
              Öne Çıkan Özellikler
            </h4>
            <ul className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
              {activeHelpModal.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11.5px] leading-snug">
                  <span className="text-zinc-500 dark:text-zinc-400 font-bold">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeHelpModal}
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            Kapat
          </button>

          {activeHelpModal.tourSteps && activeHelpModal.tourSteps.length > 0 && (
            <button
              type="button"
              onClick={handleStartTour}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-[4px] bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-3.5 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>
                {isCompleted ? 'İnteraktif Rehberi Yeniden Başlat' : 'İnteraktif Sayfa Turunu Başlat'}
              </span>
              <span className="text-[10px] bg-zinc-700 dark:bg-zinc-300 text-zinc-100 dark:text-zinc-900 px-1.5 py-0.5 rounded-[2px] font-medium">
                {activeHelpModal.tourSteps.length} Adım
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
