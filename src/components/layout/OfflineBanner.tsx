'use client';

import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi, ServerCrash } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { subscribeApiHealth } from '../../lib/api/core';

export function OfflineBanner() {
  const { lang } = useI18n();
  const [isOffline, setIsOffline] = useState(false);
  const wasOfflineRef = useRef(false);
  const [showRestored, setShowRestored] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  useEffect(() => subscribeApiHealth(setApiUnreachable), []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      wasOfflineRef.current = true;
    }

    const handleOffline = () => {
      setIsOffline(true);
      wasOfflineRef.current = true;
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      if (wasOfflineRef.current) {
        setShowRestored(true);
        setTimeout(() => {
          setShowRestored(false);
          wasOfflineRef.current = false;
        }, 3500);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="w-full bg-[var(--card)] border-b border-[var(--border-soft)] text-[var(--fg)] text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 shadow-xs z-50 transition-all">
        <WifiOff size={14} className="text-amber-500 shrink-0" />
        <span>
          {lang === 'tr'
            ? 'İnternet bağlantısı kesildi. Çevrimdışı moddasınız.'
            : 'Internet connection lost. You are offline.'}
        </span>
      </div>
    );
  }

  if (apiUnreachable) {
    return (
      <div className="w-full bg-[var(--card)] border-b border-[var(--border-soft)] text-[var(--fg)] text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 shadow-xs z-50 transition-all">
        <ServerCrash size={14} className="text-amber-500 shrink-0" />
        <span>
          {lang === 'tr'
            ? 'Sunucuya ulaşılamıyor. Veri akışı durdu — bağlantı düzelince otomatik devam eder.'
            : "Can't reach the server. Data has stopped updating — it'll resume automatically once reachable."}
        </span>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="w-full bg-[var(--card)] border-b border-emerald-500/30 text-[var(--fg)] text-xs font-semibold py-2 px-4 flex items-center justify-center gap-2 shadow-xs z-50 transition-all">
        <Wifi size={14} className="text-emerald-500 shrink-0" />
        <span>
          {lang === 'tr'
            ? 'İnternet bağlantısı yeniden sağlandı.'
            : 'Internet connection restored.'}
        </span>
      </div>
    );
  }

  return null;
}
