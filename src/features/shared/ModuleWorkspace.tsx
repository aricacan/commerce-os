'use client';

// ── Modül kabuğu (ana şablon) ─────────────────────────────────────────────────
//
// Tüm tam-ekran modüller (Omnichannel, B2B Outreach, Base,
// Intelligent, Shipping) bu kabuğu kullanır. Daha önce her modül aynı düzeni
// kendi içinde kopyalıyordu; yedi kopya yedi ayrı yöne kaymıştı (kimi 240px
// kenar çubuğu, kimi 0'a kapanan, kimi farklı geri tuşu yeri).
//
// Kabuğun değişmez kuralları:
//   • Sol üst: SADECE panel aç/kapat, modül adının sağında.
//   • Sağ üst: SADECE modülden çıkış.
//   • Kenar çubuğu kapanınca kaybolmaz, 64px ikon rayına iner.
//   • Kenar çubuğunun zemini/ayırıcı çizgisi yoktur; ayrımı içerik panelinin
//     yuvarlatılmış köşesi yapar.
//
// Modüle özel olan tek şey: başlık, sekmeler ve içerik.

import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FeedbackProvider } from './Feedback';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';
import { MobileTabSheet } from './MobileTabSheet';
import { workspaceOverlay, workspaceContainer, roomsSidebar, sidebarHeader, iconBtnNavbar, chatMainArea } from './workspace.styles';
import { palette, navItem, icon, text } from './design';
import { parseWorkspacePath } from '../../lib/workspace-routes';
import { useTourStore } from '../tour/tour-store';
import { getPageHelp } from '../tour/help-registry';

export interface WorkspaceSection {
  key: string;
  label: string;
  Icon: LucideIcon;
}

export interface WorkspaceTab {
  key: string;
  label: string;
  Icon: LucideIcon;
  /**
   * Sekmenin ait olduğu grup başlığı. Aynı grubu paylaşan ardışık sekmeler tek bir
   * başlığın altında toplanır.
   *
   * Erpis'te kurulum ekranları (sözlük, şema, kolon eşlemesi) günlük veri
   * ekranlarıyla aynı düzlemde duruyordu ve on sekmelik düz bir liste "hangisi
   * neydi" sorusunu her açılışta yeniden sorduruyordu.
   */
  group?: string;
  /**
   * AÇILIR bölüm — ana uygulamanın sol panelindeki gibi (Siparişler ▸ …). Aynı bölümü
   * paylaşan ARDIŞIK sekmeler tek bir tıklanabilir başlığın altında toplanır, başlık
   * kapanınca alt sekmeler gizlenir. `group`'tan farkı: o yalnız statik bir başlık çizer,
   * liste yine uzun kalır.
   */
  section?: WorkspaceSection;
  /** Sekmenin yanında sayaç rozeti (ör. bekleyen iş); 0 ya da boşsa çizilmez. */
  badge?: number;
}

// Kabuğun çizdiği blok: tek sekme ya da bir bölüm ve altındaki sekmeler.
type NavBlock =
  | { kind: 'tab'; tab: WorkspaceTab; index: number }
  | { kind: 'section'; section: WorkspaceSection; tabs: WorkspaceTab[] };

function toBlocks(tabs: readonly WorkspaceTab[]): NavBlock[] {
  const blocks: NavBlock[] = [];
  tabs.forEach((tab, index) => {
    const last = blocks[blocks.length - 1];
    if (tab.section && last?.kind === 'section' && last.section.key === tab.section.key) {
      last.tabs.push(tab);
    } else if (tab.section) {
      blocks.push({ kind: 'section', section: tab.section, tabs: [tab] });
    } else {
      blocks.push({ kind: 'tab', tab, index });
    }
  });
  return blocks;
}

interface Props {
  /** Kenar çubuğunun tepesinde görünen modül adı. */
  title: string;
  tabs: readonly WorkspaceTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  onClose: () => void;
  /** Sekmenin içeriği — çağıran taraf aktif sekmeye göre seçer. */
  children: ReactNode;
  /**
   * Kendi içinde kaydırılan sekmeler (sohbet/gelen kutusu düzenleri) dıştaki
   * kaydırmayı kapatır, yoksa iki kaydırma çubuğu üst üste biner.
   */
  scroll?: boolean;
  /**
   * Kenar çubuğunun EN ALTINA, sekme listesinden ayrı sabitlenen opsiyonel
   * içerik (ör. "Yardım" düğmesi). Sekme değil — `onTabChange` akışına
   * girmez, kendi tıklama davranışını kendi taşır. Modüle özgü olduğu için
   * bu kabuk hiçbir varsayım yapmaz, sadece yer açar.
   *
   * Fonksiyon: kenar çubuğu daralmışken (rail moda, 64px) ikon-only
   * gösterilebilsin diye `sidebarOpen` durumunu çağırana veriyoruz — bu bilgi
   * kabuğun kendi state'inde, dışarıdan bilinmiyor.
   */
  sidebarFooter?: (sidebarOpen: boolean) => ReactNode;
  /**
   * Yalnız telefonda: içerik kendi başlığını çiziyorsa (ör. açık sohbetin geri oku)
   * kabuğun başlık satırı gizlenir — iki "geri" üst üste binmesin, ekran mesaja kalsın.
   */
  hideMobileHeader?: boolean;
  /** Masaüstü kenar çubuğunda modül adının hemen yanında küçük ek (ör. Omnichannel bot sürümü rozeti). */
  titleAddon?: ReactNode;
}

// Kenar çubuğundaki tek bir sekme düğmesi. `nested`: açılır bölümün altındaki sekme —
// ikonsuz ve alçak çizilir (ana uygulamanın alt menüsüyle aynı); bölüm başlığının ikonu
// zaten grubu temsil ediyor, her alt satırda tekrar etmek listeyi kalabalıklaştırıyordu.
function NavTabButton({ tab, active, sidebarOpen, nested = false, onClick }: {
  tab: WorkspaceTab;
  active: boolean;
  sidebarOpen: boolean;
  nested?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="mw-nav-item"
      onClick={onClick}
      title={tab.label}
      aria-current={active ? 'page' : undefined}
      style={{
        ...navItem(active, sidebarOpen),
        width: '100%', border: 'none', fontFamily: 'inherit',
        ...(nested ? { padding: '5px 10px', minHeight: 30 } : null),
      }}
    >
      {/* Aktif sekmeyi renk tek başına taşımasın — sol şerit renk körü kullanıcı için
          ikinci bir işaret. */}
      {sidebarOpen && (
        <span style={{
          width: 3, height: nested ? 14 : 16, borderRadius: 2, flexShrink: 0,
          background: active ? palette.accent : 'transparent',
        }} />
      )}
      {!nested && (
        <tab.Icon size={icon.lg} strokeWidth={icon.stroke} color={active ? palette.accent : palette.textMuted} />
      )}
      {sidebarOpen && (
        <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left' }}>{tab.label}</span>
      )}
      {tab.badge !== undefined && tab.badge > 0 && (
        <span
          aria-label={`${tab.badge} bekleyen`}
          className={sidebarOpen
            ? 'shrink-0 rounded-full bg-danger px-1.5 text-ui-2xs font-bold leading-4 tabular-nums text-white'
            : 'size-2 shrink-0 rounded-full bg-danger'}
        >
          {sidebarOpen ? tab.badge : null}
        </span>
      )}
    </button>
  );
}

// Grup başlığı: aynı grubun İLK sekmesinin (ya da bölümünün) önünde çizilir; daralmış rayda ince çizgi.
function GroupHeading({ label, sidebarOpen }: { label: string; sidebarOpen: boolean }) {
  return sidebarOpen ? (
    <span style={{
      padding: '10px 8px 4px',
      fontSize: text['2xs'], fontWeight: 800, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: palette.textMuted,
    }}>
      {label}
    </span>
  ) : (
    <span style={{ height: 1, margin: '6px 4px', background: palette.borderFaint }} />
  );
}

const SIDEBAR_OPEN_WIDTH = 226;
const SIDEBAR_RAIL_WIDTH = 64;

const headerIconBtn = {
  width: 28, height: 28, flexShrink: 0, borderRadius: 7,
  border: `1px solid ${palette.borderSoft}`, background: 'transparent',
  color: palette.textMuted, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
} as const;

const helpButton = {
  flexShrink: 0, height: 36, padding: '0 12px 0 10px',
  borderRadius: 9, border: `1px solid ${palette.borderSoft}`, background: 'transparent',
  color: palette.textStrong, cursor: 'pointer', fontSize: text.sm, fontWeight: 650,
  display: 'flex', alignItems: 'center', gap: 6,
  transition: 'background 0.12s, border-color 0.12s',
} as const;

// headerIconBtn'in büyütülmüş, metinli hâli — modülden çıkışın TEK yolu, göze
// çarpması gerekiyor.
const backButton = {
  flexShrink: 0, height: 36, padding: '0 14px 0 12px',
  borderRadius: 9, border: `1px solid ${palette.borderSoft}`, background: 'transparent',
  color: palette.textStrong, cursor: 'pointer', fontSize: text.md, fontWeight: 700,
  display: 'flex', alignItems: 'center', gap: 7,
  transition: 'background 0.12s, border-color 0.12s',
} as const;

export function ModuleWorkspace({
  title, tabs, activeTab, onTabChange, onClose, children, scroll = true, sidebarFooter,
  hideMobileHeader = false, titleAddon,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileTabSheetOpen, setMobileTabSheetOpen] = useState(false);
  const isMobile = useMobile();

  // ── Sekme <-> URL bağı ──────────────────────────────────────────────────
  //
  // Modüller bir rota üzerinden açıldığında (/adshub) aktif sekme adrese yazılır
  // (/adshub/campaigns): link paylaşılabilir, yenilenince aynı sekme açılır, tarayıcı
  // geri tuşu çalışır. Bu mantık kabuğun kendisinde duruyor — 14 modülün her birine
  // ayrı ayrı eklenseydi kaçınılmaz olarak birbirinden ayrışırdı.
  //
  // Modül bir panel olarak (Topbar'dan, rota olmadan) açıldıysa parseWorkspacePath null
  // döner ve buradaki hiçbir şey devreye girmez — eski davranış aynen korunur.
  const pathname = usePathname();
  const route = parseWorkspacePath(pathname);
  const urlSection = route?.section ?? null;
  const appliedUrlSection = useRef<string | null>(null);

  // URL'deki sekme (ilk yükleme + tarayıcı geri/ileri) modüle uygulanır. Bilinmeyen bir
  // segment yok sayılır: modülün kendi varsayılan sekmesi açık kalır, 404 gibi bir durum
  // oluşmaz. Sekme listesi sonradan genişlerse (yetkisi sunucudan sorulan sekme) efekt
  // yeniden denenir — yoksa o sekmeye doğrudan link varsayılana düşerdi.
  const tabKeys = tabs.map((tab) => tab.key).join('|');
  useEffect(() => {
    if (!route || !urlSection) return;
    if (appliedUrlSection.current === urlSection) return;
    if (!tabs.some((tab) => tab.key === urlSection)) return;

    appliedUrlSection.current = urlSection;
    if (urlSection !== activeTab) onTabChange(urlSection);
    // activeTab/onTabChange bilerek dışarıda: bu efekt yalnızca URL (ya da sekme listesi)
    // değiştiğinde çalışmalı, kullanıcının sekme tıklamalarına geri besleme yapmamalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSection, tabKeys]);

  // Sekme değişiminde adres güncellenir. router.replace YERİNE history.replaceState:
  // Next yönlendirmesi rota bileşenini yeniden mount eder ve modülün tüm iç durumu
  // (filtreler, seçili kayıt) sıfırlanırdı.
  //
  // Query string KORUNUR: filtresini URL'de tutan modüllerde (bkz. Erpis) sekme değişimi
  // kullanıcının kurduğu filtreyi silmemeli — iki sekme aynı filtre çubuğunu paylaşıyor.
  function writeTabToUrl(base: string, key: string) {
    const path = `${base}/${key}`;
    if (window.location.pathname === path) return;
    appliedUrlSection.current = key;
    window.history.replaceState(null, '', `${path}${window.location.search}`);
  }

  function applyTab(key: string) {
    if (route) writeTabToUrl(route.base, key);
    onTabChange(key);
  }

  // Sekme KODDAN değişince de (Hesap sağlığı "Düzelt", "müşteriye git" gibi) adres izlenir.
  // İlk çizim atlanır: açılışta adres zaten doğru ya da modülün kendi varsayılanı geçerli;
  // URL→sekme efekti sonradan activeTab'i günceller, yol o zaman eşleştiği için yazılmaz.
  const previousTab = useRef(activeTab);
  useEffect(() => {
    if (previousTab.current === activeTab) return;
    previousTab.current = activeTab;
    if (route) writeTabToUrl(route.base, activeTab);
    // route/writeTabToUrl bilerek dışarıda: yalnız activeTab değişince çalışmalı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const activeTabLabel = tabs.find((t) => t.key === activeTab)?.label ?? '';
  const openHelpModal = useTourStore((s) => s.openHelpModal);
  const helpItem =
    getPageHelp(route ? `${route.base}/${activeTab}` : `/${title.toLowerCase()}/${activeTab}`) ??
    getPageHelp(route?.base ?? `/${title.toLowerCase()}`) ??
    getPageHelp(`${title.toLowerCase()}-${activeTab}`) ??
    getPageHelp(title.toLowerCase());

  // ── Açılır bölümler ─────────────────────────────────────────────────────
  //
  // Ana uygulamanın sol paneliyle AYNI davranış: birden fazla bölüm açık kalabilir,
  // tercih tarayıcıda saklanır, daraltılmış rayda bölüme tıklamak paneli açıp o bölümü
  // genişletir. Aktif sekmenin bölümü her zaman açılır — kullanıcı nerede olduğunu
  // görmek için başlık aramasın.
  const blocks = toBlocks(tabs);
  const sectionsStorageKey = `module-workspace-sections:${title}`;
  const activeSectionKey = tabs.find((t) => t.key === activeTab)?.section?.key ?? null;
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(activeSectionKey ? [activeSectionKey] : []));

  // localStorage SSR'da yok — ilk çizimden SONRA okunur, yoksa hidrasyon uyuşmazlığı olurdu.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(sectionsStorageKey) ?? '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        setOpenSections((current) => new Set([...current, ...saved.map(String)]));
      }
    } catch {
      /* bozuk kayıt: varsayılanla devam */
    }
  }, [sectionsStorageKey]);

  // URL'den ya da dışarıdan sekme değişince o sekmenin bölümü açılır.
  useEffect(() => {
    if (!activeSectionKey) return;
    setOpenSections((current) => (current.has(activeSectionKey) ? current : new Set([...current, activeSectionKey])));
  }, [activeSectionKey]);

  function persistSections(next: Set<string>) {
    try {
      localStorage.setItem(sectionsStorageKey, JSON.stringify([...next]));
    } catch {
      /* tarayıcı depolamayı engelliyor: tercih yalnız bu oturumda geçerli */
    }
  }

  function toggleSection(key: string) {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      // Tıklanan bölüm açılır; bulunulan sekmenin bölümü de AÇIK KALIR — kullanıcı paneli
      // açınca nerede olduğunu kaybetmesin.
      const next = new Set(activeSectionKey ? [key, activeSectionKey] : [key]);
      setOpenSections(next);
      persistSections(next);
      return;
    }

    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persistSections(next);
      return next;
    });
  }

  return (
    <div style={workspaceOverlay}>
      <style>{`
        .mw-nav-item { transition: all 0.15s ease-in-out !important; }
        .mw-nav-item:hover { background: ${palette.accentSoft} !important; }
      `}</style>

      <div style={{
        ...workspaceContainer,
        flexDirection: isMobile ? 'column' : 'row',
        background: palette.bg,
        color: palette.text,
        fontSize: text.md,
      }}>
        {!isMobile && (
          <div
            data-tour={`${title.toLowerCase()}-sidebar`}
            style={{
            ...roomsSidebar,
            width: sidebarOpen ? SIDEBAR_OPEN_WIDTH : SIDEBAR_RAIL_WIDTH,
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ ...sidebarHeader, padding: '20px 12px 14px', gap: 6 }}>
              {sidebarOpen && (
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span style={{
                    fontSize: text.lg, fontWeight: 800, letterSpacing: '-0.01em',
                    color: palette.textStrong, overflow: 'hidden', whiteSpace: 'nowrap',
                  }}>
                    {title}
                  </span>
                  {titleAddon}
                </span>
              )}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                title={sidebarOpen ? 'Menüyü daralt' : 'Menüyü genişlet'}
                aria-label={sidebarOpen ? 'Menüyü daralt' : 'Menüyü genişlet'}
                style={headerIconBtn}
              >
                {sidebarOpen
                  ? <PanelLeftClose size={icon.md} strokeWidth={icon.stroke} />
                  : <PanelLeftOpen size={icon.md} strokeWidth={icon.stroke} />}
              </button>
            </div>

            {/* Sekme listesi kendi içinde kayar. Kabuk overflow:hidden olduğundan bölümler açıkken
                kısa ekranda alttaki sekmeler kesiliyor ve hiçbir yoldan kaydırılamıyordu. */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
              padding: sidebarOpen ? '4px 10px' : '10px 6px',
            }}>
              {blocks.map((block) => {
                if (block.kind === 'section') {
                  const { section } = block;
                  const expanded = openSections.has(section.key);
                  const hasActiveChild = block.tabs.some((t) => t.key === activeTab);
                  const group = block.tabs[0].group;
                  const groupStart = group && group !== tabs[tabs.indexOf(block.tabs[0]) - 1]?.group;

                  return (
                    <div key={`s-${section.key}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {groupStart && <GroupHeading label={group} sidebarOpen={sidebarOpen} />}
                      <button
                        type="button"
                        className="mw-nav-item"
                        onClick={() => toggleSection(section.key)}
                        title={section.label}
                        aria-expanded={expanded}
                        style={{
                          ...navItem(false, sidebarOpen),
                          width: '100%', border: 'none', fontFamily: 'inherit',
                          fontWeight: hasActiveChild ? 700 : 500,
                          color: hasActiveChild ? palette.textStrong : palette.textMuted,
                        }}
                      >
                        {sidebarOpen && <span style={{ width: 3, flexShrink: 0 }} />}
                        <section.Icon
                          size={icon.lg}
                          strokeWidth={icon.stroke}
                          color={hasActiveChild ? palette.accent : palette.textMuted}
                        />
                        {sidebarOpen && (
                          <>
                            <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'left' }}>
                              {section.label}
                            </span>
                            <ChevronDown
                              size={12}
                              style={{
                                flexShrink: 0, opacity: 0.55,
                                transition: 'transform 0.18s',
                                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                              }}
                            />
                          </>
                        )}
                      </button>

                      {expanded && sidebarOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 22 }}>
                          {block.tabs.map((t) => (
                            <NavTabButton
                              key={t.key}
                              tab={t}
                              active={t.key === activeTab}
                              sidebarOpen={sidebarOpen}
                              nested
                              onClick={() => applyTab(t.key)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const { tab: t, index } = block;
                // Grup başlığı yalnız grubun İLK sekmesinde çizilir.
                const groupStart = t.group && t.group !== tabs[index - 1]?.group;

                return (
                  <Fragment key={`g-${t.key}`}>
                    {groupStart && <GroupHeading label={t.group!} sidebarOpen={sidebarOpen} />}
                    <NavTabButton
                      tab={t}
                      active={t.key === activeTab}
                      sidebarOpen={sidebarOpen}
                      onClick={() => applyTab(t.key)}
                    />
                  </Fragment>
                );
              })}
            </div>

            {sidebarFooter && (
              <div style={{
                marginTop: 'auto', padding: sidebarOpen ? '10px' : '10px 6px',
                borderTop: `1px solid ${palette.borderFaint}`,
                position: 'relative',
                zIndex: 40,
              }}>
                {sidebarFooter(sidebarOpen)}
              </div>
            )}
          </div>
        )}

        <div style={{
          ...chatMainArea, display: 'flex', flexDirection: 'column',
          minWidth: 0, background: palette.card,
          borderRadius: isMobile ? 0 : '14px 0 0 0',
          // Kısayol (`border`) ve tekil (`borderBottom`) KARIŞTIRILMAZ: React ikisini
          // aynı anda yazarken uyarı veriyor ve sıralamaya göre biri diğerini eziyor.
          // Üç kenar tek tek yazılıyor, alt ve sağ kenar hiç tanımlanmıyor.
          borderTop: isMobile ? 'none' : `1px solid ${palette.borderFaint}`,
          borderLeft: isMobile ? 'none' : `1px solid ${palette.borderFaint}`,
          overflow: 'hidden',
        }}>
          {!(isMobile && hideMobileHeader) && <div
            data-tour="module-header"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px',
              borderBottom: `1px solid ${palette.borderFaint}`, flexShrink: 0,
            }}
          >
            {isMobile && (
              <button
                onClick={() => setMobileTabSheetOpen(true)}
                style={{ ...iconBtnNavbar, color: palette.textMuted }}
                aria-label="Menü"
              >
                <Menu size={icon.lg} strokeWidth={icon.stroke} />
              </button>
            )}
            <span style={{ fontSize: text.md, fontWeight: 700, color: palette.textStrong }}>
              {activeTabLabel}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {helpItem && (
                <button
                  type="button"
                  onClick={() => openHelpModal(helpItem)}
                  title={`${helpItem.title} Rehberi`}
                  aria-label={`${helpItem.title} Rehberi`}
                  style={helpButton}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = palette.accentSoft; (e.currentTarget as HTMLElement).style.borderColor = palette.border; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = palette.borderSoft; }}
                >
                  <HelpCircle size={15} strokeWidth={icon.stroke} color={palette.textMuted} />
                  <span>Rehber</span>
                </button>
              )}
              {/* Büyütüldü + metin eklendi: eskiden 28x28 ikon-only bir daireydi,
                  sağ üstteki tek çıkış yolu için fark edilmesi gereken en önemli
                  düğme yeterince göze çarpmıyordu. */}
              <button
                onClick={onClose}
                title="Panele dön"
                aria-label="Panele dön"
                style={backButton}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = palette.accentSoft; (e.currentTarget as HTMLElement).style.borderColor = palette.border; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = palette.borderSoft; }}
              >
                <ArrowLeft size={16} strokeWidth={icon.stroke} />
                <span>Geri dön</span>
              </button>
            </div>
          </div>}

          {/* Flex kolon: içerik panelleri hem `flex: 1` hem `height: 100%` ile
              yükseklik alabilsin. Düz blok olsaydı `flex: 1` sessizce hiçbir şey
              yapmaz, panel yüksekliği içeriğe çökerdi. */}
          <div style={{
            flex: 1, minHeight: 0, overflow: scroll ? 'auto' : 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <FeedbackProvider>{children}</FeedbackProvider>
          </div>
        </div>
      </div>

      {isMobile && mobileTabSheetOpen && (
        <MobileTabSheet
          title={title}
          tabs={tabs.map((t) => ({ key: t.key, label: t.label, Icon: t.Icon }))}
          activeKey={activeTab}
          onSelect={(k) => { applyTab(k); setMobileTabSheetOpen(false); }}
          onClose={() => setMobileTabSheetOpen(false)}
          accent={palette.accent}
          footer={sidebarFooter ? sidebarFooter(true) : undefined}
        />
      )}
    </div>
  );
}
