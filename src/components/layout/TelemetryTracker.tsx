'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { startTelemetry, trackPageView } from '../../lib/telemetry';

// Uygulama kabuğuna bir kez yerleşir: sayfa geçişlerini ve pencere seviyesindeki hataları
// telemetriye bağlar. Görsel çıktısı yok (bkz. lib/telemetry.ts kuralları).
export function TelemetryTracker() {
  const pathname = usePathname();

  useEffect(() => startTelemetry(), []);

  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  return null;
}
