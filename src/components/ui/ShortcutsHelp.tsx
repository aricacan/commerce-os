'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { GO_TO_SHORTCUTS } from '../../lib/shortcuts';
import { usePageShortcutsStore } from '../../stores/page-shortcuts';
import { useHelpModal } from '../../stores/help-modal';
import { useCommandPalette } from '../../stores/command-palette';
import { useAiPanel } from '../../stores/ai-panel';
import { useFeedbackPanel } from '../../stores/feedback-panel';

interface ShortcutsHelpProps {
  open?: boolean;
  onClose?: () => void;
}

export function ShortcutsHelp({ open: propOpen, onClose: propOnClose }: ShortcutsHelpProps) {
  const router = useRouter();
  const { t } = useI18n();
  const storeOpen = useHelpModal((s) => s.open);
  const storeClose = useHelpModal((s) => s.close);
  const activeTab = useHelpModal((s) => s.tab);
  const setActiveTab = useHelpModal((s) => s.setTab);

  const currentShortcuts = usePageShortcutsStore((s) => s.shortcuts);

  const isOpen = propOpen !== undefined ? propOpen : storeOpen;
  const handleClose = () => {
    if (propOnClose) propOnClose();
    storeClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
      role="presentation"
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px] animate-fade-in"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Yardım & Klavye Kısayolları"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#15161a]">
          <div>
            <h2 className="text-ui-md font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Yardım & Klavye Kısayolları
            </h2>
            <p className="text-ui-xs text-zinc-500 dark:text-zinc-400">
              Sistem içi hızlı gezinme, operasyon ipuçları ve araçlar
            </p>
          </div>

          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block font-mono text-ui-2xs font-medium px-1.5 py-0.5 rounded-[3px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
              ESC
            </kbd>
            <button
              onClick={handleClose}
              aria-label="Kapat"
              className="p-1 rounded-[3px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-5 pt-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e]">
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-[3px] border-b-2 transition-colors cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Klavye Kısayolları
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-[3px] border-b-2 transition-colors cursor-pointer ${
              activeTab === 'help'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Hızlı Rehber & Destek
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'shortcuts' ? (
            <>
              {/* Highlight Action Card: Ctrl + K */}
              <div className="flex items-center justify-between p-3 rounded-[4px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <kbd className="font-mono text-ui-xs font-bold px-2 py-1 rounded-[3px] bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-xs">
                      Ctrl
                    </kbd>
                    <span className="text-xs text-zinc-400">+</span>
                    <kbd className="font-mono text-ui-xs font-bold px-2 py-1 rounded-[3px] bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-xs">
                      K
                    </kbd>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Hızlı Komut Paleti & Arama
                    </span>
                    <span className="text-ui-xs text-zinc-500 dark:text-zinc-400">
                      53 sayfa, siparişler, SKU ve barkodlar arasında anında arayın
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleClose();
                    useCommandPalette.getState().setOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-[3px] bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 transition-colors cursor-pointer"
                >
                  Paleti Aç →
                </button>
              </div>

              {/* Page Specific Shortcuts if any */}
              {currentShortcuts.length > 0 && (
                <ShortcutSection title="Bulunulan Sayfaya Özel Kısayollar">
                  {currentShortcuts.map((s, idx) => (
                    <ShortcutRow key={idx} keys={s.keys} label={s.label} />
                  ))}
                </ShortcutSection>
              )}

              {/* General Shortcuts */}
              <ShortcutSection title="Genel Sistem Kısayolları">
                <ShortcutRow keys={['Ctrl', 'K']} label="Komut paletini ve arama kutusunu aç" />
                <ShortcutRow keys={['/']} label="Arama alanına hızlı odaklan" />
                <ShortcutRow keys={['?']} label="Bu yardım ve kısayollar penceresini aç/kapat" />
                <ShortcutRow keys={['F1']} label="Alternatif yardım tuşu" />
                <ShortcutRow keys={['Esc']} label="Açık olan pencereyi, modalı veya menüyü kapat" />
              </ShortcutSection>

              {/* Sequence Go To Shortcuts */}
              <ShortcutSection title="Sayfalar Arası Hızlı Geçiş (Önce 'G' tuşuna basın)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  {GO_TO_SHORTCUTS.map((s) => (
                    <ShortcutRow
                      key={s.href}
                      keys={['G', s.key.toUpperCase()]}
                      label={t(s.labelKey)}
                      onClick={() => {
                        handleClose();
                        router.push(s.href);
                      }}
                    />
                  ))}
                </div>
              </ShortcutSection>
            </>
          ) : (
            <>
              {/* Quick Action Tools */}
              <div>
                <p className="text-ui-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                  Hızlı Eylemler & Modüller
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => {
                      handleClose();
                      useAiPanel.getState().togglePanel();
                    }}
                    className="p-3 text-left rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Aivar AI Asistanı
                    </span>
                    <span className="text-ui-xs text-zinc-500 dark:text-zinc-400 block mt-1 leading-snug">
                      Satış, kargo ve iade analizleri için yapay zeka
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      handleClose();
                      useCommandPalette.getState().setOpen(true);
                    }}
                    className="p-3 text-left rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Komut Paleti
                    </span>
                    <span className="text-ui-xs text-zinc-500 dark:text-zinc-400 block mt-1 leading-snug">
                      Sipariş, ürün ve sayfa arama motoru
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      handleClose();
                      useFeedbackPanel.getState().openPanel();
                    }}
                    className="p-3 text-left rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                      Geri Bildirim Bildir
                    </span>
                    <span className="text-ui-xs text-zinc-500 dark:text-zinc-400 block mt-1 leading-snug">
                      Hata raporu veya özellik talebi oluşturun
                    </span>
                  </button>
                </div>
              </div>

              {/* Operational Tips for Intern / Staff */}
              <div>
                <p className="text-ui-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                  Operasyon & E-Ticaret İpuçları
                </p>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-[4px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Eksik Alış Maliyeti & Kutu Kodu
                    </span>
                    <p className="text-ui-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Sipariş listesinde turuncu ile vurgulanan satırlar, ERP üzerinde alış maliyeti girilmemiş kalemleri gösterir. Karlılık (P&L) hesaplamalarının doğruluğu için bu ürünlerin maliyetleri girilmelidir.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-[4px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Kargo & Desi Hesabı
                    </span>
                    <p className="text-ui-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Koli kodu atanmış ürünlerde kargo ücreti, belirlenen standart kutu desi bilgisine göre otomatik hesaplanır. Kutu atanmamış siparişlerde varsayılan desi baz alınır.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-[4px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                      Veri Senkronizasyonu
                    </span>
                    <p className="text-ui-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Tüm pazaryeri ve ERP siparişleri arka planda Hangfire iş parçacıkları ile otomatik güncellenir. Acil durumlarda Topbar sağ üstteki yenileme butonuyla anlık çekim yapabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-ui-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1">
        {title}
      </p>
      <div className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden bg-white dark:bg-[#16171b]">
        {children}
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label, onClick }: { keys: string[]; label: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2 text-xs transition-colors ${
        onClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40' : ''
      }`}
    >
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <kbd className="font-mono text-ui-xs font-semibold px-1.5 py-0.5 rounded-[3px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 shadow-2xs">
              {k}
            </kbd>
            {idx < keys.length - 1 && <span className="text-ui-2xs text-zinc-400">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}