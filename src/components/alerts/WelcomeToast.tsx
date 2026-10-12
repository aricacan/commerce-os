'use client';

import { useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useWelcomeToast } from '../../stores/welcome-toast';
import { useFeedbackPanel } from '../../stores/feedback-panel';
import { useI18n } from '../../lib/i18n';
import type { TranslationKey } from '../../lib/translations/tr';

function greetingKey(): TranslationKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'welcome_greeting_morning';
  if (h >= 11 && h < 18) return 'welcome_greeting_day';
  if (h >= 18 && h < 22) return 'welcome_greeting_evening';
  return 'welcome_greeting_night';
}

const AUTO_DISMISS_MS = 6000;

export function WelcomeToast() {
  const { t } = useI18n();
  const name = useWelcomeToast((s) => s.name);
  const clear = useWelcomeToast((s) => s.clear);
  const openFeedback = useFeedbackPanel((s) => s.openPanel);

  useEffect(() => {
    if (!name) return;
    const timer = setTimeout(clear, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [name, clear]);

  if (!name) return null;

  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="fixed bottom-4 right-4 z-[10000] w-[min(290px,calc(100vw-32px))]">
      <div className="welcome-toast-card relative flex items-start gap-3 rounded-[4px] border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-3 shadow-lg overflow-hidden backdrop-blur-xs">
        {/* Sol: Kompakt Profil İkonu & Çevrimiçi Noktası */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200">
          <span>{initial}</span>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#18191e]" />
        </div>

        {/* Orta: İçerik */}
        <div className="min-w-0 flex-1 space-y-0.5 pr-4">
          <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            {t(greetingKey())}
          </div>
          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate">
            {name}
          </div>

          <button
            type="button"
            onClick={() => {
              openFeedback();
              clear();
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer pt-0.5"
          >
            <span>{t('welcome_feedback_cta')}</span>
            <ArrowRight size={11} />
          </button>
        </div>

        {/* Sağ: Kapat Butonu */}
        <button
          type="button"
          onClick={clear}
          aria-label={t('close')}
          className="absolute top-2 right-2 p-1 rounded-[2px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>

        {/* Alt: Sade Nötr Süre Çubuğu (Kırmızı/Turuncu Çırtlak Renkler Kaldırıldı) */}
        <div
          className="welcome-progress absolute left-0 bottom-0 h-[1.5px] bg-zinc-300 dark:bg-zinc-700 origin-left"
          style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }}
        />
      </div>

      <style>{`
        .welcome-toast-card { animation: welcomeFade 0.2s ease both; }
        @keyframes welcomeFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .welcome-progress { animation-name: welcomeCountdown; animation-timing-function: linear; animation-fill-mode: forwards; width: 100%; }
        @keyframes welcomeCountdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        @media (prefers-reduced-motion: reduce) {
          .welcome-toast-card, .welcome-progress { animation: none; }
        }
      `}</style>
    </div>
  );
}
