'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import type { OlderMessagesState } from './useChatMessages';

interface Props {
  older: OlderMessagesState;
  // Gözlemcinin kökü: sohbetin kaydırma kapsayıcısı (sayfa değil).
  rootRef: RefObject<HTMLDivElement | null>;
}

// Tepeye 200 px kala ister: kullanıcı en üste varmadan sayfa çoğunlukla gelmiş olur.
const PRELOAD_MARGIN = '200px 0px 0px 0px';

// Sohbet akışının tepesi: görünür olunca bir önceki sayfayı ister. Sayfa yüklenip sınır hâlâ görünürse (kısa
// mesajlar ekranı doldurmadı) gözlemci yeniden kurulur ve bir sonraki sayfa da gelir.
export function OlderMessagesSentinel({ older, rootRef }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { hasMore, loading, error, load } = older;

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore || loading || error !== null || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) void load(); },
      { root: rootRef.current, rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, error, load, rootRef]);

  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} className="flex min-h-8 shrink-0 items-center justify-center text-ui-xs text-fg-muted">
      {loading && (
        <span role="status" className="inline-flex items-center gap-1.5">
          <Loader2 size={13} className="animate-spin" aria-hidden /> Daha eski mesajlar yükleniyor…
        </span>
      )}
      {error !== null && (
        <button
          type="button"
          onClick={() => void load()}
          className="cursor-pointer rounded-full px-3 py-1 font-semibold text-danger hover:bg-bg-subtle"
        >
          Eski mesajlar yüklenemedi — tekrar dene
        </button>
      )}
    </div>
  );
}
