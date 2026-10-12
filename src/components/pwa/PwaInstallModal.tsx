'use client';

import { useState, useEffect, useRef } from 'react';
import { Download, Share2, Copy, Check, X, Smartphone, Laptop, SquarePlus, Share, ShieldCheck, Link as LinkIcon } from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  canPrompt: boolean;
  isStandalone: boolean;
  isIos: boolean;
  promptInstall: () => Promise<boolean>;
}

export function PwaInstallModal({
  isOpen,
  onClose,
  canPrompt,
  isStandalone,
  isIos,
  promptInstall,
}: PwaInstallModalProps) {
  const [copied, setCopied] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [appInstallUrl, setAppInstallUrl] = useState('');
  const autoTriedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppInstallUrl(`${window.location.origin}?install=true`);
    }
  }, []);

  // ?install=true ile açıldığında: tarayıcı istemcisi hazır olur olmaz (canPrompt)
  // yüklemeyi otomatik dene. Tarayıcı kullanıcı hareketi şart koşarsa promptInstall
  // sessizce false döner ve kullanıcı aşağıdaki butona basar — patlamaz.
  useEffect(() => {
    if (!isOpen || autoTriedRef.current) return;
    if (!canPrompt || isStandalone || isIos) return;
    autoTriedRef.current = true;
    setInstalling(true);
    void promptInstall().then((ok) => { if (ok) onClose(); }).finally(() => setInstalling(false));
  }, [isOpen, canPrompt, isStandalone, isIos, promptInstall, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appInstallUrl || `${window.location.origin}?install=true`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleNativeShare = async () => {
    const targetUrl = appInstallUrl || `${window.location.origin}?install=true`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ERP Yükle',
          text: 'ERP PWA uygulamasını doğrudan cihazınıza yükleyin:',
          url: targetUrl,
        });
      } catch {
        // Kullanıcı iptal etti
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDirectInstall = async () => {
    setInstalling(true);
    try {
      const accepted = await promptInstall();
      if (accepted) {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-lg)] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg)] shadow-xs">
              <Download size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--fg)]">Uygulamayı İndir / Yükle</h3>
              <p className="text-[11px] text-[var(--fg-muted)]">ERP PWA</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] p-1 text-[var(--fg-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--fg)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3.5 max-h-[80vh] overflow-y-auto">
          {/* Status / Direct Action */}
          {isStandalone ? (
            <div className="flex items-center gap-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-soft)] p-3 text-[var(--fg)]">
              <ShieldCheck size={18} className="shrink-0 text-[var(--fg-muted)]" />
              <div className="text-xs">
                <p className="font-semibold">Uygulama Yüklü & Çalışıyor</p>
                <p className="text-[11px] text-[var(--fg-muted)]">Bağımsız PWA modunda aktiftir.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                disabled={installing || !canPrompt}
                onClick={handleDirectInstall}
                className="w-full flex items-center justify-center gap-2 rounded-[6px] bg-[var(--fg)] px-4 py-2.5 text-xs font-semibold text-[var(--bg)] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40 shadow-xs"
              >
                <Download size={15} />
                <span>{installing ? 'Yükleniyor…' : canPrompt ? 'Doğrudan Cihaza Yükle' : 'Yükleme İstemcisi Bekleniyor'}</span>
              </button>
              {canPrompt && (
                <p className="text-[10.5px] text-center text-[var(--fg-muted)] font-medium">
                  ✓ Tarayıcınız tek tıkla doğrudan yüklemeyi destekliyor.
                </p>
              )}
            </div>
          )}

          {/* Platform İndirme Yönergeleri */}
          {!isStandalone && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">Platform Yönergeleri</p>

              {isIos ? (
                <div className="flex flex-col gap-2 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--fg)]">
                    <Smartphone size={14} className="text-[var(--fg-muted)]" />
                    <span>iOS Safari:</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--fg)]">
                    <Share size={13} className="text-[var(--fg-muted)] shrink-0" />
                    <span>1. Alttaki <strong>Paylaş</strong> simgesine dokunun.</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--fg)]">
                    <SquarePlus size={13} className="text-[var(--fg-muted)] shrink-0" />
                    <span>2. <strong>Ana Ekrana Ekle</strong> seçeneğini seçin.</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex flex-col gap-1 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2.5">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--fg)]">
                      <Laptop size={14} className="text-[var(--fg-muted)] shrink-0" />
                      <span>Masaüstü (Chrome/Edge)</span>
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">Adres çubuğundaki (URL sağındaki) <strong>Yükle</strong> simgesine tıklayın.</p>
                  </div>

                  <div className="flex flex-col gap-1 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2.5">
                    <div className="flex items-center gap-1.5 font-semibold text-[var(--fg)]">
                      <Smartphone size={14} className="text-[var(--fg-muted)] shrink-0" />
                      <span>Android (Chrome)</span>
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)] leading-relaxed">Menüden (3 nokta) <strong>Uygulamayı Yükle</strong> seçeneğine tıklayın.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Direkt İndirme / Yükleme Bağlantısı */}
          <div className="flex flex-col gap-2 rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fg)]">
                <LinkIcon size={13} className="text-[var(--fg-muted)]" />
                <span>Direkt İndirme Bağlantısı</span>
              </div>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex items-center gap-1 text-[11px] font-medium text-[var(--fg)] hover:underline"
                >
                  <Share2 size={12} />
                  <span>Paylaş</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-[var(--fg-muted)]">
              Bu bağlantı açıldığında otomatik yükleme istemcisini doğrudan tetikler:
            </p>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appInstallUrl}
                className="flex-1 rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1.5 text-[11.5px] text-[var(--fg)] font-mono outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1 rounded-[6px] bg-[var(--fg)] px-3 py-1.5 text-xs font-semibold text-[var(--bg)] transition-all hover:opacity-90 active:scale-95 shrink-0"
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    <span>Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Kopyala</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
