'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search, CornerDownLeft, Package, ShoppingCart,
  Sparkles, MessageSquare, FileUp, Tag, SlidersHorizontal, FileBarChart,
} from 'lucide-react';
import { NAV, isGroup, type NavItem } from '../../lib/nav-groups';
import { useI18n } from '../../lib/i18n';
import { formatOrderNumberWithHash } from '../../utils/orderNumber';
import { usePagePermissions } from '../../hooks/usePagePermissions';
import { searchApi } from '../../lib/api';
import { useCommandPalette } from '../../stores/command-palette';
import { useRecentPages } from '../../hooks/useRecentPages';
import { useAiPanel } from '../../stores/ai-panel';
import { useFeedbackPanel } from '../../stores/feedback-panel';
import { Clock } from 'lucide-react';

// Ctrl/Cmd+K ile açılan tek kutu: 53 sayfa arasında gezinmek için menüyü dolaşmaya gerek yok.
// Üç kaynak birleşir:
//   • Sayfalar → nav-groups.ts (tek doğruluk kaynağı, YETKİ FİLTRELİ)
//   • Kayıtlar → /api/search (SKU, barkod, ürün adı, sipariş no — mağaza bağlamına göre)
//   • Hızlı İşlemler → COMMANDS (sayfa başlığıyla eşleşmeyen niyet cümleleri: "sipariş ekle" ≠ "Siparişler")

const SEARCH_MIN_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 250;

interface Row {
  id: string;
  label: string;
  hint?: string;
  /** Sayfaya git. onSelect verilmişse href yalnızca gösterim amaçlı olabilir (kullanılmaz). */
  href?: string;
  /** Navigasyon yerine (veya ek olarak) çalıştırılacak eylem — ör. bir paneli global store üzerinden açmak. */
  onSelect?: () => void;
  Icon: NavItem['Icon'];
  /** Aramada eşleşsin diye label dışında ek anahtar kelimeler (yalnızca komutlarda kullanılır). */
  keywords?: string;
}

// Sayfa gezintisiyle birebir aynı olmayan, gerçek bir hedefi olan eylemler.
// Her komut ya (a) uygulamada zaten var olan global bir panel/store eylemini tetikler,
// ya da (b) o niyet için uygulamadaki EN YAKIN gerçek sayfaya götürür — sahte/uydurma
// bir "yeni sipariş" ya da "ürün ekle" hedefi YOK: bu app'te ürün/sipariş ERP'den senkronlanır,
// manuel oluşturma akışı bulunmuyor.
interface CommandDef {
  id: string;
  label: string;
  keywords: string;
  hint: string;
  href?: string;
  pageKey?: string; // verilmişse usePagePermissions ile filtrelenir
  onSelect?: () => void;
  Icon: NavItem['Icon'];
}

function buildCommands(openAiPanel: () => void, openFeedback: () => void): CommandDef[] {
  return [
    {
      id: 'cmd:ai-panel',
      label: 'AI Asistanına Sor',
      keywords: 'yapay zeka chatbot soru sor asistan ai panel',
      hint: 'Panel aç',
      onSelect: () => openAiPanel(),
      Icon: Sparkles,
    },
    {
      id: 'cmd:feedback',
      label: 'Sorun / Geri Bildirim Bildir',
      keywords: 'geri bildirim sorun bildir hata şikayet feedback',
      hint: 'Panel aç',
      onSelect: () => openFeedback(),
      Icon: MessageSquare,
    },
    {
      id: 'cmd:erp-import',
      label: 'Manuel Sipariş Ekle (Excel İçe Aktar)',
      keywords: 'yeni sipariş aç sipariş ekle excel içe aktar manuel sipariş import order',
      hint: 'Ayarlar > ERP İçe Aktarma',
      href: '/system/erp-import',
      pageKey: 'settings',
      Icon: FileUp,
    },
    {
      id: 'cmd:product-costs',
      label: 'Alış Fiyatı / Maliyet Yükle',
      keywords: 'ürün ekle ürün fiyatı maliyet excel yükle toplu fiyat güncelle add product cost',
      hint: 'Alış Fiyatları',
      href: '/product-costs',
      pageKey: 'product-costs',
      Icon: Tag,
    },
    {
      id: 'cmd:price-comparison',
      label: 'Satış Fiyatı Karşılaştır',
      keywords: 'fiyat karşılaştırma rakip fiyat güncelle price comparison',
      hint: 'Fiyat Karşılaştırma',
      href: '/price-comparison',
      pageKey: 'price-comparison',
      Icon: SlidersHorizontal,
    },
    {
      id: 'cmd:excel-report',
      label: 'Excel Raporu Oluştur',
      keywords: 'excel rapor oluşturucu dışa aktar export report builder',
      hint: 'Özelleştirme > Excel',
      href: '/customize/excel',
      pageKey: 'customize',
      Icon: FileBarChart,
    },
  ];
}

// Kapalıyken hiç render edilmez. Bu sayede her açılış TAZE durumla başlar —
// arama kutusunu ve imleci elle sıfırlayan effect'lere gerek kalmaz.
export function CommandPalette() {
  const open = useCommandPalette((s) => s.open);
  if (!open) return null;
  return <PaletteBody />;
}

function PaletteBody() {
  const close = useCommandPalette((s) => s.close);
  const router = useRouter();
  const { t } = useI18n();
  const { isAllowed } = usePagePermissions();
  const openAiPanel = useAiPanel((s) => s.openPanel);
  const openFeedbackPanel = useFeedbackPanel((s) => s.openPanel);

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Kayıt araması yalnızca yazı yazıldığında — palet açılır açılmaz istek atmıyoruz.
  const { data: records } = useQuery({
    queryKey: ['command-palette-search', debounced],
    queryFn: () => searchApi.query(debounced),
    enabled: debounced.length >= SEARCH_MIN_CHARS,
    staleTime: 30_000,
  });

  // Yetkisi olmayan sayfa palette HİÇ görünmez — panelde kilitliyken buradan
  // erişilebilir olsaydı yetkilendirme anlamsızlaşırdı.
  const pages = useMemo<Row[]>(() => {
    const items: NavItem[] = NAV.flatMap((e) => (isGroup(e) ? e.children : [e]));
    return items
      .filter((item) => isAllowed(item.pageKey))
      .map((item) => ({
        id: `page:${item.href}`,
        label: t(item.key),
        href: item.href,
        Icon: item.Icon,
      }));
  }, [t, isAllowed]);

  const filteredPages = useMemo(() => {
    const q = debounced.toLocaleLowerCase('tr');
    if (!q) return pages;
    return pages.filter((p) => p.label.toLocaleLowerCase('tr').includes(q));
  }, [pages, debounced]);

  const recordRows = useMemo<Row[]>(() => {
    if (!records) return [];
    return [
      ...records.products.map((p) => ({
        id: `product:${p.id}`,
        label: p.name,
        hint: p.supplierSKU,
        href: `/products?q=${encodeURIComponent(p.supplierSKU)}`,
        Icon: Package,
      })),
      ...records.orders.map((o) => ({
        id: `order:${o.id}`,
        label: `Sipariş ${formatOrderNumberWithHash(o.platformOrderNumber)}`,
        hint: o.storeName,
        href: `/orders/${o.id}`,
        Icon: ShoppingCart,
      })),
    ];
  }, [records]);

  const { recentPages } = useRecentPages();

  const recentRows = useMemo<Row[]>(() => {
    if (debounced) return [];
    return recentPages.map((rp) => ({
      id: `recent:${rp.path}`,
      label: rp.title,
      hint: rp.path,
      href: rp.path,
      Icon: Clock,
    }));
  }, [recentPages, debounced]);

  // Yetkisi olmayan hedefe giden komut hiç görünmez — sayfa listesiyle aynı kural.
  const commandRows = useMemo<Row[]>(() => {
    const defs = buildCommands(openAiPanel, openFeedbackPanel);
    const q = debounced.toLocaleLowerCase('tr');
    return defs
      .filter((c) => !c.pageKey || isAllowed(c.pageKey))
      .filter((c) => {
        if (!q) return true;
        const haystack = `${c.label} ${c.keywords}`.toLocaleLowerCase('tr');
        return haystack.includes(q);
      })
      .map((c) => ({
        id: c.id,
        label: c.label,
        hint: c.hint,
        href: c.href,
        onSelect: c.onSelect,
        Icon: c.Icon,
      }));
  }, [openAiPanel, openFeedbackPanel, isAllowed, debounced]);

  const rows = useMemo(
    () => [...recentRows, ...commandRows, ...filteredPages, ...recordRows],
    [recentRows, commandRows, filteredPages, recordRows],
  );

  // Arama daraldığında imleç listenin dışında kalabilir; render sırasında sınırlıyoruz.
  // (Effect ile "düzeltmek" fazladan bir render turu ve gözle görülür titreme demek.)
  const activeRow = Math.min(cursor, Math.max(0, rows.length - 1));

  function go(row: Row | undefined) {
    if (!row) return;
    close();
    if (row.onSelect) row.onSelect();
    else if (row.href) router.push(row.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(Math.min(activeRow + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(Math.max(activeRow - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(rows[activeRow]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  // Seçili satır her zaman görünür kalsın (klavyeyle aşağı inerken).
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeRow]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Komut paleti"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-xl)]"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--border-soft)] px-4">
          <Search size={16} className="shrink-0 text-[var(--fg-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={onKeyDown}
            placeholder="Sayfa, SKU, sipariş no veya işlem ara…"
            className="w-full border-none bg-transparent py-3.5 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)]"
          />
          <kbd className="shrink-0 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-ui-2xs text-[var(--fg-subtle)]">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-[var(--fg-muted)]">
              {debounced ? `"${debounced}" için sonuç yok.` : 'Aramak için yazmaya başla.'}
            </p>
          ) : (
            <>
              {recentRows.length > 0 && <SectionLabel>Son Gezilenler</SectionLabel>}
              {recentRows.map((row, i) => (
                <RowButton key={row.id} row={row} active={activeRow === i} onPick={() => go(row)} onHover={() => setCursor(i)} />
              ))}

              {commandRows.length > 0 && <SectionLabel>Hızlı İşlemler</SectionLabel>}
              {commandRows.map((row, i) => {
                const index = recentRows.length + i;
                return (
                  <RowButton key={row.id} row={row} active={activeRow === index} onPick={() => go(row)} onHover={() => setCursor(index)} />
                );
              })}

              {filteredPages.length > 0 && <SectionLabel>Sayfalar</SectionLabel>}
              {filteredPages.map((row, i) => {
                const index = recentRows.length + commandRows.length + i;
                return (
                  <RowButton key={row.id} row={row} active={activeRow === index} onPick={() => go(row)} onHover={() => setCursor(index)} />
                );
              })}

              {recordRows.length > 0 && <SectionLabel>Kayıtlar</SectionLabel>}
              {recordRows.map((row, i) => {
                const index = recentRows.length + commandRows.length + filteredPages.length + i;
                return (
                  <RowButton key={row.id} row={row} active={activeRow === index} onPick={() => go(row)} onHover={() => setCursor(index)} />
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2 pb-1 text-ui-2xs font-bold tracking-wide text-[var(--fg-subtle)] uppercase">
      {children}
    </p>
  );
}

function RowButton({
  row, active, onPick, onHover,
}: { row: Row; active: boolean; onPick: () => void; onHover: () => void }) {
  return (
    <button
      data-active={active}
      onClick={onPick}
      onMouseMove={onHover}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-transparent text-[var(--fg)]'
      }`}
    >
      <row.Icon size={15} className="shrink-0 opacity-70" />
      <span className="min-w-0 flex-1 truncate">{row.label}</span>
      {row.hint && <span className="shrink-0 text-ui-xs text-[var(--fg-muted)]">{row.hint}</span>}
      {active && <CornerDownLeft size={13} className="shrink-0 opacity-60" />}
    </button>
  );
}
