'use client';

import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useWelcomeToast } from '../../stores/welcome-toast';

// Sayfa açılır açılmaz teklif etmiyoruz — kullanıcı önce ne baktığını görsün.
const APPEAR_DELAY_MS = 6_000;

// Ana ekrana kurulum teklifi. İki farklı yol var:
//   • Chrome/Edge/Android → tarayıcı `beforeinstallprompt` verir, tek tıkla kurulur.
//   • iOS Safari → böyle bir API YOK, kullanıcıya elle adımlar gösterilir.
// Kurulu (standalone) çalışıyorsa veya kullanıcı ertelediyse hiç render edilmez.
export function InstallPrompt() {
  const { canPrompt, isStandalone, isIos, isSnoozed, promptInstall, snooze } = usePwaInstall();
  const [delayPassed, setDelayPassed] = useState(false);

  // Karşılama toast'ı (girişten sonra ~10 sn) ekrandayken beklemek ZORUNDA: mobilde
  // ikisi de alta yaslandığı için üst üste binerlerdi. Toast kapanınca teklif belirir.
  const welcomeVisible = useWelcomeToast((s) => s.name !== null);

  useEffect(() => {
    const timer = setTimeout(() => setDelayPassed(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const shouldRender =
    delayPassed && !welcomeVisible && !isStandalone && !isSnoozed && (canPrompt || isIos);
  if (!shouldRender) return null;

  return (
    <div
      role="dialog"
      aria-label="Uygulamayı ana ekrana ekle"
      className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-[9000] md:inset-x-auto md:left-6 md:bottom-6 md:w-[380px]"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-lg)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]">
            <Download size={18} className="text-white" />
          </span>

          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-semibold text-[var(--fg)]">Uygulama olarak ekle</p>
            <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
              {isIos
                ? 'Ana ekrana ekleyince tarayıcı çubuğu olmadan, uygulama gibi açılır.'
                : 'Ana ekrandan tek dokunuşla aç, bildirimleri anında al.'}
            </p>
          </div>

          <button
            type="button"
            onClick={snooze}
            aria-label="Kapat"
            className="ml-auto shrink-0 rounded-lg p-1 text-[var(--fg-subtle)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
          >
            <X size={16} />
          </button>
        </div>

        {isIos ? <IosSteps /> : <InstallAction onInstall={promptInstall} onSnooze={snooze} />}
      </div>
    </div>
  );
}

function InstallAction({
  onInstall,
  onSnooze,
}: {
  onInstall: () => Promise<boolean>;
  onSnooze: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            // Kullanıcı reddederse teklif tükenir; tekrar bunaltmamak için erteliyoruz.
            const accepted = await onInstall();
            if (!accepted) onSnooze();
          } finally {
            setBusy(false);
          }
        }}
        className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-h)] disabled:opacity-60"
      >
        {busy ? 'Yükleniyor…' : 'Yükle'}
      </button>

      <button
        type="button"
        onClick={onSnooze}
        className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
      >
        Şimdi değil
      </button>
    </div>
  );
}

// iOS'ta kurulum tamamen elle. Adımları ikonlarıyla göstermek, "Paylaş'a bas"
// yazmaktan çok daha anlaşılır oluyor — kullanıcı ikonu ekranda arayabiliyor.
function IosSteps() {
  return (
    <ol className="flex flex-col gap-2 rounded-xl bg-[var(--bg-subtle)] p-3">
      <li className="flex items-center gap-2 text-xs text-[var(--fg)]">
        <Share size={15} className="shrink-0 text-[var(--accent)]" />
        <span>
          Alttaki <strong>Paylaş</strong> simgesine dokun
        </span>
      </li>
      <li className="flex items-center gap-2 text-xs text-[var(--fg)]">
        <SquarePlus size={15} className="shrink-0 text-[var(--accent)]" />
        <span>
          <strong>Ana Ekrana Ekle</strong>&apos;yi seç
        </span>
      </li>
    </ol>
  );
}
