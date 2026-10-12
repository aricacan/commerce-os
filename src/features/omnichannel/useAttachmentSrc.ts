'use client';

import { useEffect, useState } from 'react';
import { BASE, uploadHeaders } from '../../lib/api/core';

const INTERNAL_PREFIX = '/api/';

// Ekin tarayıcıda gösterilecek adresi.
//
// Kanalın verdiği adres (Messenger/Instagram CDN) doğrudan kullanılır. Kendi ucumuz ise
// oturum başlığı ister; <img src> başlık gönderemediği için dosya fetch ile çekilip geçici
// blob adresine çevrilir (bileşen kapanınca serbest bırakılır).
export function useAttachmentSrc(url: string): { src: string | null; failed: boolean } {
  const isInternal = url.startsWith(INTERNAL_PREFIX);
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isInternal) return;

    let objectUrl: string | null = null;
    let cancelled = false;
    const controller = new AbortController();

    void fetch(`${BASE}/${url.slice(INTERNAL_PREFIX.length)}`, { headers: uploadHeaders(), signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobSrc(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, isInternal]);

  return { src: isInternal ? blobSrc : url, failed };
}
