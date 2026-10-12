'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/auth';
import { AppSplash } from '../../components/layout/AppSplash';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { OfflineBanner } from '../../components/layout/OfflineBanner';
import { TelemetryTracker } from '../../components/layout/TelemetryTracker';
import { useMobile } from '../../hooks/useMobile';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useCommandPalette } from '../../stores/command-palette';
import { stashInstallFromUrl } from '../../features/shopify/pendingInstall';
import { isSystemAdmin, SYSTEM_ADMIN_HOME } from '../../lib/system-admin';

const AiFloatingWidget = dynamic(() => import('../../components/ai/AiFloatingWidget').then((module) => module.AiFloatingWidget), { ssr: false });
const SlotMachinePanel = dynamic(() => import('../../features/slot-machine/SlotMachinePanel').then((module) => module.SlotMachinePanel), { ssr: false });
const CommandPalette = dynamic(() => import('../../components/ui/CommandPalette').then((module) => module.CommandPalette), { ssr: false });
const ShortcutsHelp = dynamic(() => import('../../components/ui/ShortcutsHelp').then((module) => module.ShortcutsHelp), { ssr: false });
const SpotlightTour = dynamic(() => import('../../features/tour/SpotlightTour').then((module) => module.SpotlightTour), { ssr: false });
const PageHelpModal = dynamic(() => import('../../features/tour/PageHelpModal').then((module) => module.PageHelpModal), { ssr: false });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, initFromStorage } = useAuthStore();
  const router = useRouter();
  const isMobile = useMobile();
  const commandPaletteOpen = useCommandPalette((state) => state.open);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Ctrl+K, g→X, /, ? kısayolları tek dinleyicide (bkz. useKeyboardShortcuts).
  const { helpOpen, closeHelp } = useKeyboardShortcuts();

  // 🎰 Easter egg: IRP'nin herhangi bir yerinde "adnan" yazılırsa slot makinesi açılır
  const [slotOpen, setSlotOpen] = useState(false);
  const konamiBuffer = useRef('');

  useEffect(() => {
    const TRIGGER = 'adnan';
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const ch = e.key.length === 1 ? e.key.toLowerCase() : '';
      if (!ch) return;
      konamiBuffer.current = (konamiBuffer.current + ch).slice(-TRIGGER.length);
      if (konamiBuffer.current === TRIGGER) {
        konamiBuffer.current = '';
        setSlotOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      stashInstallFromUrl(new URL(window.location.href));
      router.replace('/login');
      return;
    }

    // ANA SISTEM hesabinin bu kabukta HICBIR isi yok: kiraci baglami yoktur, dolayisiyla
    // magaza secici, moduller ve tum KPI'lar onun icin anlamsiz. Backend zaten kiraci
    // uclarini 403'luyor (SystemAdminScopeMiddleware) ama bu yalnizca VERIYI engelliyordu -
    // arayuz kabugu yine de aciliyordu: kullanici bombos bir ciro/siparis/kar paneli
    // goruyordu. Yanlis ve kafa karistirici.
    //
    // Tek kapi: (app) grubunun layout'u. Altindaki her sayfa (dashboard, siparisler,
    // urunler, finans, ayarlar...) otomatik kapsanir - her sayfaya ayri kontrol koymak
    // gerekmez ve yarin eklenecek sayfa da korunur.
    if (isSystemAdmin(user.roles)) {
      router.replace(SYSTEM_ADMIN_HOME);
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <AppSplash done={false} />;
  }

  if (!user) return null;

  // Yonlendirme tamamlanana kadar kabugu CIZME. Bu satir olmadan sistem hesabi, router
  // yonlendirmeyi isleyene kadar bir an icin DEMO panelini gorurdu.
  if (isSystemAdmin(user.roles)) return null;

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Sidebar — masaüstünde görünür, mobilde gizli */}
      {!isMobile && <Sidebar />}
      {isMobile && mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-[60] border-0 bg-black/45"
          />
          <Sidebar mobile onClose={() => setMobileMenuOpen(false)} />
        </>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--bg)',
        paddingBottom: 0,
      }}>
        <Topbar isMobile={isMobile} onMobileMenuOpen={() => setMobileMenuOpen(true)} />
        <OfflineBanner />
        <TelemetryTracker />
        <main style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          {children}
        </main>
      </div>

      {/* Ctrl/Cmd+K komut paleti ve `?` kısayol yardımı */}
      {commandPaletteOpen && <CommandPalette />}
      {helpOpen && <ShortcutsHelp open onClose={closeHelp} />}
      <SpotlightTour />
      <PageHelpModal />

      {/* 🎰 Gizli slot makinesi — "adnan" ile açılır */}
      {slotOpen && <SlotMachinePanel onClose={() => setSlotOpen(false)} />}

      {/* Aivar — TEK kabuk: masaüstünde sağ-altta yüzen kart, mobilde kullanıcı menüsü /
          kısayolla açılan tam ekran sayfa (bkz. AiFloatingWidget.tsx). Eski ayrı dock paneli
          (AiChatPanel) aynı sohbetin ikinci bir kopyasıydı, kaldırıldı. */}
      <AiFloatingWidget />
    </div>
  );
}
