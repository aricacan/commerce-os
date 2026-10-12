'use client';

// ⚠️ BU BILESEN SU AN HICBIR YERDEN RENDER EDILMIYOR (3 Eyl 2026 olu-kod taramasi).
//
// Musteri 360 hizli erisim dugmesi (mobil FAB).
//
// SILINMEDI cunku kullaniciya gorunen bir OZELLIGI temsil ediyor ve kaldirilmasinin
// bilincli mi kazara mi oldugu belirsiz. OPERASYON_MERKEZI.md hala "Operasyon Merkezi ve Musteri 360 sol panelin en altindaki Calisma Alani bolumunde bulunur" diyor — dokuman ile kod ayrismis durumda.
//
// Karar verilene kadar burada duruyor. Kullanilmayacaksa silinmeli — dosyayi
// yorumla birlikte birakmak, ozelligin var oldugu yanilgisini surdurur.

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMobile } from '../../hooks/useMobile';
import { useI18n } from '../../lib/i18n';
import { text } from '../../features/shared/design';

const Customer360Modal = dynamic(() => import('./Customer360Modal').then((module) => module.Customer360Modal), { ssr: false });

// Mobilde görünen kayan "360" ikonu — AppLayout'ta mount edilir (bkz. (app)/layout.tsx),
// tıklanınca Customer360Modal açılır. Sol-alt köşede kalır; ancak z-index'i modal ve alt
// panellerden düşük tutulur. Böylece filtre/tarih gibi kritik mobil kontrollerin üstünü kapatmaz.
// Masaüstünde bu FAB YOK — Sidebar kendi "Müşteri 360" girişini gösterir (bkz. Sidebar.tsx),
// panel genişledikçe o da genişleyip etiket gösterir; mobilde Sidebar hiç render edilmediği
// için bu kayan buton tek erişim noktası olarak kalıyor.
export function Customer360Fab() {
  const [open, setOpen] = useState(false);
  const isMobile = useMobile();
  const { lang } = useI18n();

  if (!isMobile) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={lang === 'tr' ? 'Müşteri 360' : 'Customer 360'}
        aria-label={lang === 'tr' ? 'Müşteri 360 panelini aç' : 'Open Customer 360 panel'}
        style={{
          position: 'fixed',
          left: isMobile ? 12 : 20,
          bottom: isMobile ? 'calc(60px + env(safe-area-inset-bottom) + 14px)' : 20,
          zIndex: 40,
          width: 46, height: 46, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent)', color: '#fff', border: 'none',
          boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
          cursor: 'pointer',
          transition: 'transform 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span style={{ fontSize: text.xs, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>360</span>
      </button>

      {open && <Customer360Modal isOpen onClose={() => setOpen(false)} />}
    </>
  );
}
