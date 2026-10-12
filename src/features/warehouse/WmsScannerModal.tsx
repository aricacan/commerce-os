'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (rawValue: string) => void;
}

export function WmsScannerModal({ open, onClose, onScan }: Props) {
  const { videoRef, isScanning, hasPermission, startScan, stopScan, isHttps } =
    useBarcodeScanner({ onScan: (text) => { onScan(text.trim()); onClose(); } });

  useEffect(() => {
    if (!open) return;
    if (isHttps) startScan();
    return () => stopScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
      <div style={{ background: 'var(--card)', borderRadius: 12, padding: 16, width: 360, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>Barkod Tara</p>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)' }}><X size={18} /></button>
        </div>
        {!isHttps ? (
          <p style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Kamera erişimi için HTTPS gerekli.</p>
        ) : hasPermission === false ? (
          <p style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>Kamera izni verilmedi.</p>
        ) : (
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
          </div>
        )}
        <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginTop: 8, textAlign: 'center' }}>
          {isScanning ? 'Barkodu kameraya gösterin...' : 'Kamera başlatılıyor...'}
        </p>
      </div>
    </div>
  );
}
