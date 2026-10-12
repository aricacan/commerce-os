'use client';

// Onaylar (moderasyon) Ayarlar altına GERİ ALINDI (18 Eyl 2026).
//
// Bir süre Monitoring modülünün sekmesiydi ve bu sayfa oraya yönlendiriyordu. Ama
// Monitoring "sistem sağlıklı mı" sorusunu yanıtlıyor; onay kuyruğu bir operasyon işi,
// üstelik kalıcı bir ayar ekranı gibi kullanılıyor. Monitoring dört bölüme indirilirken
// (Sağlık · Hatalar · Yavaş İstekler · Geçmiş) buraya taşındı.
import { ApprovalsWorkspace } from '../../../../features/system/ApprovalsWorkspace';

export default function SystemModerationPage() {
  return <ApprovalsWorkspace />;
}
