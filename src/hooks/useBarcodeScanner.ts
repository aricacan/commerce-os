'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseBarcodeScanner {
  onScan: (text: string) => void;
  onError?: (err: unknown) => void;
}

// Telefon sensörü hep aynı fiziksel yönde durur; tarayıcı akışı cihaz o anki
// tutuluşuna göre döndürür. Sabit (ör. hep 1920x1080 "yatay") bir çözünürlük
// istersen, kullanıcı telefonu dikey tutunca akış görüntüsü CSS kutusuna
// uymaz ve object-fit:cover onu farklı kırpar/kaydırır. Çözüm: kutunun/akışın
// en-boy oranını CİHAZIN O ANKİ tutuluşuna göre iste.
function isPortrait(): boolean {
  if (typeof window === 'undefined') return true;
  return window.innerHeight >= window.innerWidth;
}

export function useBarcodeScanner({ onScan, onError }: UseBarcodeScanner) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readerRef  = useRef<any>(null);
  const [isScanning,    setIsScanning]    = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  // Her başlat/durdur çağrısını numaralandırır — bir stopScan() sonrası hâlâ
  // devam eden eski bir startScan() promise'i geri döndüğünde kendini eski
  // (iptal edilmiş) nesil olarak tanıyıp state/ref'e dokunmaz. Bunsuz, hızlı
  // açıp-kapatma sırasında zxing'in decode callback'i unmount olmuş video
  // elementine erişmeye çalışıp React ağacını çökertiyordu.
  const generationRef = useRef(0);
  const restartingRef = useRef(false);

  // HTTPS kontrolü — http://localhost geliştirme ortamında da kamera çalışır
  const isHttps = typeof window !== 'undefined'
    ? (window.location.protocol === 'https:' || window.location.hostname === 'localhost')
    : true;

  const stopScan = useCallback(() => {
    generationRef.current += 1;
    // zxing'in reset()'i, akış zaten kapanmışsa veya video elementi DOM'dan
    // kaldırılmışsa senkron fırlatabiliyor — bu fırlatma bir useEffect
    // cleanup'ı içinde yakalanmazsa React'ın kök hata sınırına kadar çıkıp
    // tüm paneli "sistem yenileniyor" gibi görünen bir çökmeye götürüyordu.
    try {
      readerRef.current?.reset();
    } catch (err) {
      console.warn('Kamera durdurulurken hata (yok sayıldı):', err);
    }
    setIsScanning(false);
  }, []);

  const startScan = useCallback(async () => {
    if (!isHttps || !videoRef.current || readerRef.current) return;
    const generation = ++generationRef.current;

    try {
      // Lazy import — SSR'de yüklenmez
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      if (generation !== generationRef.current) return; // bu arada durduruldu

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      setIsScanning(true);
      setHasPermission(null);

      const portrait = isPortrait();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: portrait ? 1080 : 1920 },
          height: { ideal: portrait ? 1920 : 1080 },
        },
      };

      await reader.decodeFromConstraints(constraints, videoRef.current, (result, err) => {
        if (generation !== generationRef.current) return; // eski nesil, yok say
        if (result) {
          setHasPermission(true);
          stopScan();
          onScan(result.getText());
        } else if (err) {
          // NotFoundException her frame'de atar — sadece gerçek hataları ilet
          if ((err as Error).name !== 'NotFoundException') {
            onError?.(err);
          }
        }
      });

      if (generation !== generationRef.current) return;
      setHasPermission(true);
    } catch (err) {
      if (generation !== generationRef.current) return;
      setHasPermission(false);
      setIsScanning(false);
      onError?.(err);
    }
  }, [isHttps, onScan, onError, stopScan]);

  // Cihaz gerçekten döndürülünce (dikey↔yatay) akışı yeniden başlat. Önceden
  // her `resize` olayında (klavye açılması, mobil adres çubuğunun gizlenmesi
  // gibi kamera görünümüyle ilgisi olmayan durumlarda da) yeniden başlatma
  // tetikleniyordu — bu da art arda stream açma/kapama döngüsüne ve
  // yukarıdaki çökme senaryosuna yol açıyordu. matchMedia gerçek yön
  // değişiminde tetiklenir, sahte resize'larda tetiklenmez.
  useEffect(() => {
    if (!isScanning || typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia('(orientation: portrait)');
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleOrientationChange = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (restartingRef.current) return;
        restartingRef.current = true;
        stopScan();
        startScan().finally(() => { restartingRef.current = false; });
      }, 350);
    };

    mql.addEventListener('change', handleOrientationChange);
    return () => {
      if (timer) clearTimeout(timer);
      mql.removeEventListener('change', handleOrientationChange);
    };
  }, [isScanning, stopScan, startScan]);

  // Unmount'ta kamerayı temizle
  useEffect(() => () => {
    generationRef.current += 1;
    try {
      readerRef.current?.reset();
    } catch {
      // unmount sırasında yok sayılır
    }
  }, []);

  return { videoRef, isScanning, hasPermission, startScan, stopScan, isHttps };
}
