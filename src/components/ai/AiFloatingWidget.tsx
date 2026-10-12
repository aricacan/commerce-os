'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Search, ChevronRight, Sparkles, Plus, Trash2, MousePointerClick, X, Maximize2, Minimize2, Download } from 'lucide-react';
import { aiApi, type AiChatTurn, type AiAgentInfo, type AiPendingAction, type AiDataCard } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import { useAiPanel } from '../../stores/ai-panel';
import type { WorkspaceKey } from '../../stores/workspace-panel';
import { parseWorkspacePath } from '../../lib/workspace-routes';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { useMobile } from '../../hooks/useMobile';
import { MODULE_BOTS, MODULE_BOT_ORDER, type ModuleBot } from './moduleBots';
import { InstantElementSelector, type SelectedContext } from '../../features/shared/InstantElementSelector';
import {
  AGENTS,
  CURRENT_PERIOD_LABEL,
  type AgentDef,
  type AgentQuestion,
  type AgentResult,
} from './agents';

// ── Yüzen Aivar widget'ı ───────────────────────────────────────────────────
//
// Figma Make tasarımından (Premium AI Assistant Widget, dosya
// 67gcEiEJmRd1Dxnm88dlG9) BİREBİR aktarıldı — mor/lila tema KASITLI OLARAK
// korunuyor (kullanıcı isteği): sistemin geri kalanı nötr olsa da bu widget
// kendi kimliğini taşıyor.
//
// TEK KABUK, HER SAYFA: Aivar'ın TEK arayüzü budur. Eski ayrı dock paneli (AiChatPanel)
// aynı sohbetin ikinci bir kopyasıydı, kaldırıldı. Masaüstünde sağ-altta yüzen kart; "Genişlet"
// ile yüksek/geniş moda geçer. Mobilde daraltılmış kart yok — kullanıcı menüsündeki "Aivar"
// satırı ya da kısayol (useAiPanel.togglePanel) tam ekran sayfa olarak açar.
//
// KİMLİK — Aivar'dan TÜREYEN AJANLAR: bir modülün (AdsHub, Omnichannel) İÇİNDEYKEN widget
// otomatik olarak o modülün ajanına (ad.ai / oc.ai) geçer — backend'de aynı motor, daraltılmış
// kapsam ve modülün kendi araçları. Hangi modülde olduğumuz STATE DEĞİL, ADRESİN KENDİSİDİR
// (bkz. parseWorkspacePath): /adshub, /adshub/campaigns gibi bir modül rotasıysa oradan okunur,
// modülün mount olmasını beklemez. "+" menüsünden herhangi bir sayfadan elle de seçilebilir
// (bkz. components/ai/moduleBots.ts).
//
// İKİ YOL, KARIŞMAZ: serbest metin HER ZAMAN sohbet ucuna gider (seçili modül botu ya
// da Aivar — backend'de araç-çağırma ile gerçek veriye erişir, önceki turları görür).
// Hazır ajanlar (Satış / Ürün / Finans / Lojistik — bkz. agents.ts) YALNIZCA sağ üstteki
// ✦ çekmecesinden çip'e dokunarak başlar. Eskiden serbest metin anahtar kelimeyle ajan
// sihirbazına kaçıyordu; bkz. agents.ts başındaki not. Docked panel (AiChatPanel) aynı
// ajan motorunu kullanır — iki kopya değil.
//
// İKİ DURUM, ÜÇÜNCÜSÜ YOK: widget HER ZAMAN en azından daraltılmış kart olarak
// görünür kalır (aç/kapa yalnızca daraltılmış ↔ genişletilmiş arasında).
//
// SOHBET KULLANICIYA ÖZGÜ: mesajlar tarayıcıda o kullanıcının id'siyle
// anahtarlanmış olarak saklanır (bkz. storageKeyFor) — aynı cihazda başka bir
// hesapla giriş yapıldığında ÖNCEKİ kullanıcının sohbeti asla görünmez, çünkü
// anahtarın kendisi farklıdır. "Temizle" düğmesi yalnızca o anahtarı siler.
//
// Mobilde kalıcı bir kart/FAB bilinçli olarak YOK (bkz. mobile-responsive-redesign —
// BottomNav + kısıtlı alan); açıldığında tam ekran kaplar, kapatınca tamamen kaybolur.

type Role = 'assistant' | 'user';
// interactionId/feedback: yalnizca Aivar cevaplarinda dolu — kullanicinin 👍/👎 karari
// hangi sorularin kotu cevaplandigini TAHMIN etmek yerine olcmemizi saglar.
type PlainMsg = {
  kind: 'plain'; id: number; role: Role; text: string; ts: string;
  interactionId?: number;
  feedback?: 'up' | 'down';
};
type QuestionMsg = {
  kind: 'question';
  id: number;
  agent: AgentDef;
  question: AgentQuestion;
  questionIndex: number;
  totalQuestions: number;
  from: string;
  to: string;
  days: number;
  dateLabel: string;
  answers: Record<string, string>;
  ts: string;
};
type ResultMsg = { kind: 'result'; id: number; result: AgentResult; dateLabel: string; ts: string };
// Onay bekleyen yazma önerisi. status, kullanıcının kararını ve sonucunu taşır — onaylandıktan
// sonra kart yerinde kalır ama artık düğme göstermez (ne yapıldığı sohbette görünür kalsın).
type ActionMsg = {
  kind: 'action';
  id: number;
  action: AiPendingAction;
  status: 'pending' | 'running' | 'done' | 'rejected' | 'failed';
  resultText?: string;
  ts: string;
};
// Araç sonucundan sunucuda üretilen veri tablosu. Hücreler biçimlenmiş metindir; arayüz
// yalnızca çizer (bkz. AivarCardBuilder).
type CardMsg = { kind: 'card'; id: number; card: AiDataCard; ts: string };
type Msg = PlainMsg | QuestionMsg | ResultMsg | ActionMsg | CardMsg;

/** Sürüm kaçıncı depolama şemasındayız — şema değişirse eskiyi sessizce atıp sıfırdan başlar. */
const STORAGE_PREFIX = 'aivar-widget-chat-v1';
function storageKeyFor(userId: number | undefined): string | null {
  return userId ? `${STORAGE_PREFIX}-${userId}` : null;
}

const GREETING: Msg = { kind: 'plain', id: 1, role: 'assistant', text: 'Merhaba! Bugün size nasıl yardımcı olabilirim?', ts: '' };

/** Sohbeti tarayıcıya yazarken 'question' mesajları BİLEREK atlanır: içlerindeki
 * `agent.getQuestions`/`execute` fonksiyonları JSON'a hiç girmez, sayfa
 * yenilendiğinde o soruya cevap vermeye çalışmak sessizce bozulurdu. Yarım
 * kalan bir soru akışı, kalıcı hafızada tutmaya değmeyecek kadar geçici bir
 * durum — kaybolması kabul edilebilir, YANLIŞ çalışması değil. */
// 'question' gibi 'action' mesajları da KAYDEDİLMEZ: bir öneri sunucuda 15 dakika yaşar,
// sayfa yenilendiğinde onaylanamaz. Yarım kalan bir onayı diriltmek yerine kullanıcı yeniden
// sorar — eski bir veriye dayanan değişikliği uygulamaktansa bu doğrudur.
function persistable(messages: Msg[]): (PlainMsg | ResultMsg | CardMsg)[] {
  return messages.filter((m): m is PlainMsg | ResultMsg | CardMsg => m.kind !== 'question' && m.kind !== 'action');
}

/** Sunucuya giden sohbet geçmişi: son N düz metin turu. Karşılama mesajı ve ajan kartları
 * (soru sihirbazı / sonuç kartı) gönderilmez — model için bağlam değil, gürültüdür. */
const HISTORY_TURNS_SENT = 10;
function historyFor(messages: Msg[]): AiChatTurn[] {
  return messages
    .filter((m): m is PlainMsg => m.kind === 'plain' && m.id !== GREETING.id)
    .slice(-HISTORY_TURNS_SENT)
    .map((m) => ({ role: m.role, content: m.text }));
}

// Kiminle konuşuluyor:
//   'auto'          → o an açık modülün ajanı, modül yoksa genel Aivar
//   'panel:<key>'   → katalogdaki uzman ajan (general | finance | sales | product)
//   <WorkspaceKey>  → modül ajanı (ad.ai, oc.ai)
type BotChoice = 'auto' | `panel:${string}` | WorkspaceKey;

const PANEL_AGENT_PREFIX = 'panel:';
function panelAgentKey(choice: BotChoice): string | null {
  return choice.startsWith(PANEL_AGENT_PREFIX) ? choice.slice(PANEL_AGENT_PREFIX.length) : null;
}

// Her uzman ajanın boş sohbette gösterdiği örnek sorular — kullanıcı ajanın NE
// yapabildiğini okuyarak değil, dokunarak öğrenir. Ajan anahtarları backend
// katalogundakiyle aynı (AivarAgentCatalog).
// Her soru, o ajanın elindeki BİR araca doğrudan karşılık gelir ve araç zorunlu parametresi
// olmadan da cevap verebilir. Belirsiz sorular ("bu ay nasıl gidiyor?") modeli tahmine
// zorluyor ve boş/yanlış cevap üretiyordu — çipler artık her zaman veriyle döner.
const PANEL_AGENT_SUGGESTIONS: Record<string, string[]> = {
  // get_store_revenue(1) · get_platform_breakdown(7) · get_low_stock_products()
  general: [
    'Bugün ciro ve sipariş sayısı ne?',
    'Son 7 günde hangi pazaryeri önde?',
    'Stoğu kritik seviyedeki ürünleri listele',
  ],
  // get_monthly_profit_summary() · get_product_profit(order=loss) · get_loss_making_orders(30)
  finance: [
    'Bu ayın kâr özetini çıkar',
    'Son 30 günde en çok zarar ettiren 10 ürün',
    'Son 30 günde zarar eden siparişler',
  ],
  // get_platform_breakdown(30) · get_cancellation_rate(30) · get_store_revenue(7)
  sales: [
    'Son 30 günde pazaryeri kırılımını göster',
    'Son 30 günde iptal oranımız nedir?',
    'Son 7 günün mağaza bazında cirosu',
  ],
  // get_low_stock_products() · get_price_change_proposals() · search_product_by_name_or_sku
  product: [
    'Stoğu kritik seviyedeki ürünleri listele',
    'Bekleyen fiyat değişikliği önerileri',
    'Cam rüzgarlığı ürünlerini ve stoklarını göster',
  ],
};

const QUICK_GROUPS = ['Satış', 'Ürün', 'Finans', 'Lojistik'] as const;

const TOKENS = {
  light: {
    panelBg: 'rgba(255,255,255,0.97)',
    panelBorder: 'rgba(196,181,253,0.22)',
    panelShadow: '0 0 0 0.5px rgba(196,181,253,0.28), 0 4px 16px -4px rgba(0,0,0,0.06), 0 24px 56px -12px rgba(139,92,246,0.13)',
    panelGlow: '0 0 0 0.5px rgba(196,181,253,0.28), 0 4px 24px -4px rgba(0,0,0,0.07), 0 32px 72px -16px rgba(139,92,246,0.18)',
    headerBg: 'linear-gradient(to bottom,rgba(246,244,255,0.9) 0%,rgba(255,255,255,0) 100%)',
    headerBorder: 'rgba(196,181,253,0.12)',
    heading: '#18161a',
    sub: '#9e9ba4',
    assistBg: 'rgba(247,246,245,1)',
    assistBorder: 'rgba(0,0,0,0.055)',
    assistText: '#27242a',
    userBg: 'linear-gradient(135deg,#ede9fe 0%,#ddd6fe 100%)',
    userBorder: 'rgba(167,139,250,0.18)',
    userText: '#4c1d95',
    suggBg: 'rgba(245,243,255,1)',
    suggBorder: 'rgba(196,181,253,0.38)',
    suggText: '#6d28d9',
    suggHover: 'rgba(237,233,254,1)',
    inputBg: 'rgba(249,248,247,1)',
    inputBorder: 'rgba(196,181,253,0.22)',
    inputFocus: 'rgba(167,139,250,0.4)',
    inputText: '#18161a',
    iconCol: '#c4b5fd',
    iconHover: '#a78bfa',
    btnHover: 'rgba(196,181,253,0.11)',
    ts: '#c4bec9',
    cardBg: 'rgba(250,249,255,0.9)',
    cardBorder: 'rgba(196,181,253,0.28)',
    chipBg: 'rgba(255,255,255,0.7)',
    badgeBg: 'rgba(237,233,254,0.9)',
  },
  dark: {
    panelBg: 'rgba(22,18,32,0.97)',
    panelBorder: 'rgba(109,40,217,0.22)',
    panelShadow: '0 0 0 0.5px rgba(109,40,217,0.25), 0 4px 16px -4px rgba(0,0,0,0.35), 0 24px 56px -12px rgba(109,40,217,0.18)',
    panelGlow: '0 0 0 0.5px rgba(109,40,217,0.28), 0 4px 24px -4px rgba(0,0,0,0.4), 0 32px 72px -16px rgba(109,40,217,0.24)',
    headerBg: 'linear-gradient(to bottom,rgba(30,22,50,0.9) 0%,rgba(22,18,32,0) 100%)',
    headerBorder: 'rgba(109,40,217,0.14)',
    heading: '#f0ecff',
    sub: '#6b6475',
    assistBg: 'rgba(32,26,46,1)',
    assistBorder: 'rgba(255,255,255,0.06)',
    assistText: '#d4cfe0',
    userBg: 'linear-gradient(135deg,#2d1f5e 0%,#3b2170 100%)',
    userBorder: 'rgba(139,92,246,0.22)',
    userText: '#c4b5fd',
    suggBg: 'rgba(38,28,60,1)',
    suggBorder: 'rgba(109,40,217,0.32)',
    suggText: '#a78bfa',
    suggHover: 'rgba(50,36,80,1)',
    inputBg: 'rgba(28,22,42,1)',
    inputBorder: 'rgba(109,40,217,0.22)',
    inputFocus: 'rgba(139,92,246,0.38)',
    inputText: '#ede9fe',
    iconCol: '#4c3880',
    iconHover: '#7c5dd6',
    btnHover: 'rgba(109,40,217,0.14)',
    ts: '#3d3350',
    cardBg: 'rgba(28,22,42,0.85)',
    cardBorder: 'rgba(109,40,217,0.32)',
    chipBg: 'rgba(38,28,60,0.7)',
    badgeBg: 'rgba(50,36,80,0.9)',
  },
} as const;

type Tk = { [K in keyof typeof TOKENS.light]: string };

const COLLAPSED_W = 304;
const COLLAPSED_H = 80;
// "Simge" hali: kullanıcı daraltılmış karttaki çarpıya bastığında widget sadece bu
// yuvarlak düğmeye iner (kart sayfanın sağ altını kaplıyordu). Tercih tarayıcıda
// saklanır, sayfa yenilendiğinde simge olarak kalır.
const ICON_SIZE = 56;
const MINIMIZED_KEY = 'aivar-widget-minimized';
const EXPANDED_W = 448;
const EXPANDED_H = 648;
// "Genişlet" modu: uzun cevaplar ve ajan kartları için daha geniş/yüksek pencere.
const WIDE_W = 720;
const WIDE_H = 'calc(100vh - 108px)';
const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const DUR = '0.42s';
// Yüzen widget konumu: tablolardaki sayfalama / ileri-geri tuşlarını (TablePager)
// kapatmasın diye tabandan yukarıda (84px) konumlandırılır.
const BOTTOM = 84;
const RIGHT = 24;

const PAGE_HINTS: Record<string, string> = {
  '/dashboard': 'Kontrol Paneli',
  '/orders': 'Siparişler',
  '/products': 'Ürünler',
  '/finance': 'Finans',
  '/products/logistics': 'Lojistik Haritası',
};

function timestamp() {
  return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function Orb({ size = 40 }: { size?: number }) {
  const r = size / 2;
  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(167,139,250,0.35),transparent 70%)', animation: 'aw-orb-ring 2.8s ease-out infinite' }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(circle at 34% 32%,#f0ebff,#c4b5fd 52%,#8b5cf6)', boxShadow: '0 2px 12px rgba(139,92,246,0.28)' }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: r * 0.55, height: r * 0.55,
          background: 'radial-gradient(circle at 30% 30%,rgba(255,255,255,0.92),rgba(196,181,253,0.5))',
          animation: 'aw-orb-inner 2.8s ease-in-out infinite',
        }}
      />
    </div>
  );
}

function TypingBubble({ tk }: { tk: Tk }) {
  return (
    <div className="px-4 py-3.5 flex gap-1.5 items-center" style={{ borderRadius: '6px 18px 18px 18px', background: tk.assistBg, border: `1px solid ${tk.assistBorder}` }}>
      {[0, 1, 2].map((i) => <span key={i} className="aw-tdot block w-1.5 h-1.5 rounded-full" style={{ background: '#a78bfa' }} />)}
    </div>
  );
}

function IconBtn({ onClick, title, tk, active, children }: { onClick: () => void; title: string; tk: Tk; active?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-150 cursor-pointer"
      style={{ color: active ? '#a78bfa' : tk.sub, background: active ? tk.btnHover : 'transparent' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = tk.btnHover; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? tk.btnHover : 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── Ajan kartları — Topbar ✦'in tam panelindeki QuestionCard/ResultCard'ın
// AYNI veri sözleşmesi (AgentQuestion/AgentResult), bu widget'ın cam/mor
// diline yeniden çizildi. ────────────────────────────────────────────────

function QuestionCard({ tk, msg, onAnswer }: { tk: Tk; msg: QuestionMsg; onAnswer: (value: string, label: string) => void }) {
  const [query, setQuery] = useState('');
  const [freeText, setFreeText] = useState('');

  const filteredOptions = useMemo(() => {
    if (!msg.question.searchable || !query.trim()) return msg.question.options;
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return msg.question.options.filter((o) => o.label.toLocaleLowerCase('tr-TR').includes(needle));
  }, [msg.question.options, msg.question.searchable, query]);

  const submitFreeText = () => {
    const value = freeText.trim();
    if (value) onAnswer(value, value);
  };

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
      <div className="flex items-start justify-between gap-2 px-3.5 py-2.5" style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
        <div>
          <div className="text-[12px] font-bold" style={{ color: tk.heading }}>{msg.agent.name}</div>
          <div className="mt-0.5 text-[10px]" style={{ color: tk.sub }}>{msg.dateLabel} · {msg.agent.description}</div>
        </div>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: tk.badgeBg, color: '#7c3aed' }}>
          {msg.questionIndex + 1}/{msg.totalQuestions}
        </span>
      </div>

      <div className="px-3.5 pb-2 pt-2.5 text-[12.5px] font-semibold" style={{ color: tk.heading }}>{msg.question.prompt}</div>

      {msg.question.searchable && msg.question.options.length > 8 && (
        <div className="mx-3.5 mb-2 flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5" style={{ background: tk.chipBg, border: `1px solid ${tk.cardBorder}` }}>
          <Search size={12} style={{ color: tk.sub }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Seçenek ara..."
            className="w-full bg-transparent text-[11.5px] outline-none"
            style={{ color: tk.inputText }}
          />
        </div>
      )}

      {filteredOptions.length > 0 && (
        <div className="flex max-h-[150px] flex-wrap gap-1.5 overflow-y-auto px-3.5 pb-3">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onAnswer(option.value, option.label)}
              className="cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={{ background: tk.chipBg, border: `1px solid ${tk.cardBorder}`, color: tk.heading }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = tk.suggHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = tk.chipBg; }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {msg.question.allowFreeText && (
        <div className="mx-3.5 mb-3 flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5" style={{ background: tk.chipBg, border: `1px solid ${tk.cardBorder}` }}>
          <input
            autoFocus={msg.question.options.length === 0}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitFreeText(); } }}
            placeholder="Değer yazın..."
            className="w-full bg-transparent text-[11.5px] outline-none"
            style={{ color: tk.inputText }}
          />
          <button
            type="button"
            onClick={submitFreeText}
            disabled={!freeText.trim()}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg disabled:opacity-40"
            style={{ background: freeText.trim() ? 'linear-gradient(140deg,#a78bfa,#7c3aed)' : tk.chipBg, color: freeText.trim() ? '#fff' : tk.sub }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// Veri tablosu — araç sonucundan sunucuda üretilir (bkz. AivarCardBuilder). Hücreler zaten
// biçimlenmiş metin olduğu için burada hiçbir yeniden yorumlama yapılmaz; dar pencerede
// yatay kaydırılır.
function DataCard({ tk, card }: { tk: Tk; card: AiDataCard }) {
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
      <div className="flex items-start justify-between gap-2 px-3.5 py-2.5" style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
        <div>
          <div className="text-[12px] font-bold" style={{ color: tk.heading }}>{card.title}</div>
          {card.subtitle && <div className="mt-0.5 text-[10px]" style={{ color: tk.sub }}>{card.subtitle}</div>}
        </div>
        <button
          type="button"
          title="PDF indir"
          aria-label="PDF indir"
          onClick={() => {
            import('../../lib/export-pdf').then((m) => m.downloadAiCardPdf(card)).catch(() => {});
          }}
          className="mt-0.5 shrink-0 cursor-pointer rounded p-1 opacity-45 transition-opacity hover:opacity-100"
          style={{ color: tk.sub }}
        >
          <Download size={13} />
        </button>
      </div>
      <div className="overflow-x-auto p-1.5">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {card.columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-2 py-1.5 text-left text-[9.5px] font-bold uppercase"
                  style={{ borderBottom: `1px solid ${tk.cardBorder}`, color: tk.sub }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="whitespace-nowrap px-2 py-1.5"
                    style={{ borderBottom: `1px solid ${tk.cardBorder}`, color: tk.heading }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Onay kartı — Aivar bir yazma önerdiğinde çıkar. Veri, kullanıcı "Uygula" diyene kadar
// DEĞİŞMEZ; karar verildikten sonra kart sonucu gösterip düğmeleri gizler, böylece sohbette
// ne yapıldığı kayıtlı kalır.
function ActionCard({ tk, msg, onDecide }: { tk: Tk; msg: ActionMsg; onDecide: (approve: boolean) => void }) {
  const { action, status } = msg;
  const decided = status !== 'pending' && status !== 'running';

  const statusLabel: Record<ActionMsg['status'], string> = {
    pending: 'Onayınız bekleniyor',
    running: 'Uygulanıyor...',
    done: 'Uygulandı',
    rejected: 'Vazgeçildi',
    failed: 'Uygulanamadı',
  };

  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
      <div className="flex items-start justify-between gap-2 px-3.5 py-2.5" style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
        <div className="min-w-0">
          <div className="text-[12px] font-bold" style={{ color: tk.heading }}>{action.title}</div>
          <div className="mt-0.5 text-[10px]" style={{ color: tk.sub }}>{statusLabel[status]}</div>
        </div>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: tk.badgeBg, color: '#7c3aed' }}>
          Onay
        </span>
      </div>

      <div className="px-3.5 py-2.5 text-[12px] leading-relaxed" style={{ color: tk.heading }}>
        {action.summary}
      </div>

      {(action.before || action.after) && (
        <div className="flex items-center gap-2 px-3.5 pb-2.5 text-[12px]">
          {action.before && (
            <span className="rounded px-1.5 py-0.5" style={{ background: tk.chipBg, color: tk.sub, textDecoration: 'line-through' }}>
              {action.before}
            </span>
          )}
          {action.after && (
            <>
              <span style={{ color: tk.sub }}>→</span>
              <span className="rounded px-1.5 py-0.5 font-bold" style={{ background: tk.badgeBg, color: '#7c3aed' }}>
                {action.after}
              </span>
            </>
          )}
        </div>
      )}

      {msg.resultText && (
        <div className="px-3.5 pb-2.5 text-[11.5px] leading-relaxed" style={{ color: status === 'failed' ? '#dc2626' : tk.sub }}>
          {msg.resultText}
        </div>
      )}

      {!decided && (
        <div className="flex gap-1.5 border-t px-2.5 py-2" style={{ borderColor: tk.cardBorder }}>
          <button
            type="button"
            disabled={status === 'running'}
            onClick={() => onDecide(true)}
            className="cursor-pointer rounded-[9px] px-3 py-1.5 text-[11.5px] font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(140deg,#a78bfa,#7c3aed)' }}
          >
            {status === 'running' ? 'Uygulanıyor...' : 'Uygula'}
          </button>
          <button
            type="button"
            disabled={status === 'running'}
            onClick={() => onDecide(false)}
            className="cursor-pointer rounded-[9px] px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-60"
            style={{ background: tk.chipBg, border: `1px solid ${tk.cardBorder}`, color: tk.heading }}
          >
            Vazgeç
          </button>
        </div>
      )}
    </div>
  );
}

function ResultCard({ tk, msg }: { tk: Tk; msg: ResultMsg }) {
  const { result, dateLabel } = msg;
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
      <div className="flex items-start justify-between gap-2 px-3.5 py-2.5" style={{ borderBottom: `1px solid ${tk.cardBorder}` }}>
        <div>
          <div className="text-[12px] font-bold" style={{ color: tk.heading }}>{result.agentName}</div>
          <div className="mt-0.5 text-[10px]" style={{ color: tk.sub }}>{dateLabel} · {result.paramSummary}</div>
        </div>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: tk.badgeBg, color: '#7c3aed' }}>Tamamlandı</span>
      </div>

      {result.rows.length > 0 && (
        <div className="py-1">
          {result.rows.map((row, i) => (
            <div
              key={`${row.label}-${i}`}
              className="flex items-center gap-2 px-3.5 py-2"
              style={{ borderBottom: i === result.rows.length - 1 ? 'none' : `1px solid ${tk.cardBorder}` }}
            >
              {row.rank !== undefined && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold" style={{ background: tk.badgeBg, color: '#7c3aed' }}>
                  {row.rank}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-bold" style={{ color: tk.heading }}>{row.label}</div>
                {row.sub && <div className="truncate text-[10px]" style={{ color: tk.sub }}>{row.sub}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-[12px] font-bold" style={{ color: tk.heading }}>
                {row.badge && (
                  <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: tk.chipBg, border: `1px solid ${tk.cardBorder}`, color: tk.sub }}>
                    {row.badge}
                  </span>
                )}
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {result.tableColumns && result.tableData && result.tableData.length > 0 && (
        <div className="overflow-x-auto p-1.5">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                {result.tableColumns.map((c) => (
                  <th key={c.key} className="px-2 py-1.5 text-left text-[9.5px] font-bold uppercase" style={{ borderBottom: `1px solid ${tk.cardBorder}`, color: tk.sub }}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.tableData.map((row, i) => (
                <tr key={i}>
                  {result.tableColumns!.map((c) => (
                    <td key={c.key} className="px-2 py-1.5" style={{ borderBottom: `1px solid ${tk.cardBorder}`, color: tk.heading }}>
                      {String(row[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.summary && (
        <div className="px-3.5 py-2.5 text-[11.5px] leading-relaxed" style={{ borderTop: `1px solid ${tk.cardBorder}`, color: tk.heading }}>
          {result.summary}
        </div>
      )}
    </div>
  );
}

export function AiFloatingWidget() {
  const isMobile = useMobile();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  // Topbar kullanıcı menüsü, komut paleti ve kısayol useAiPanel üzerinden "Aivar'ı aç" der;
  // widget bu isteği kendi açık durumuna çevirir ve isteği tüketir (mobilde tek giriş yolu).
  const dockRequested = useAiPanel((s) => s.open);
  const consumeDockRequest = useAiPanel((s) => s.closePanel);
  // Hangi modüldeyiz: state değil, ADRESİN KENDİSİ (bkz. yukarıdaki not) — modülün panel
  // durumu (activeWorkspace/open/close) kaldırıldı, her modülün artık gerçek bir rotası var.
  const activeWorkspace = parseWorkspacePath(pathname)?.key ?? null;
  const { getDateParams } = useDashboardFilters();
  const tk: Tk = resolvedTheme === 'dark' ? TOKENS.dark : TOKENS.light;

  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  // Daraltılmış kart mı yoksa yalnızca simge mi görünsün — kullanıcı tercihi, tarayıcıda saklanır.
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    try {
      setMinimized(localStorage.getItem(MINIMIZED_KEY) === '1');
    } catch { /* özel sekme/depolama kapalı — varsayılan kart hali */ }
  }, []);

  const changeMinimized = useCallback((value: boolean) => {
    setMinimized(value);
    try {
      localStorage.setItem(MINIMIZED_KEY, value ? '1' : '0');
    } catch { /* yoksay */ }
  }, []);

  useEffect(() => {
    if (!dockRequested) return;
    setOpen(true);
    consumeDockRequest();
  }, [dockRequested, consumeDockRequest]);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectingElement, setSelectingElement] = useState(false);
  const [attachedContext, setAttachedContext] = useState<SelectedContext | null>(null);
  const [botChoice, setBotChoice] = useState<BotChoice>('auto');
  // Uzman ajan kadrosu backend katalogundan gelir (tek kaynak) — arayüzde kopya liste yok.
  // Yüklenene kadar seçicide yalnızca "Otomatik" ve modül ajanları görünür.
  const [panelAgents, setPanelAgents] = useState<AiAgentInfo[]>([]);
  const [activeGroup, setActiveGroup] = useState<(typeof QUICK_GROUPS)[number]>('Satış');
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Kullanıcıya özgü sohbet ─────────────────────────────────────────────
  // Kullanıcı değiştiğinde (giriş/çıkış) o kullanıcının kayıtlı sohbetini
  // yükler; kayıt yoksa karşılama mesajına döner. Aynı tarayıcıda B kullanıcısı
  // A'nın anahtarını hiç OKUMAZ — sızıntı anahtar ayrımıyla yapısal olarak
  // imkânsız, ayrıca bir "temizleme" gerekmez.
  useEffect(() => {
    const key = storageKeyFor(user?.id);
    if (!key) { setMessages([GREETING]); return; }
    try {
      const raw = localStorage.getItem(key);
      const saved = raw ? (JSON.parse(raw) as Msg[]) : null;
      setMessages(saved && saved.length > 0 ? saved : [{ ...GREETING, ts: timestamp() }]);
    } catch {
      setMessages([{ ...GREETING, ts: timestamp() }]);
    }
  }, [user?.id]);

  useEffect(() => {
    const key = storageKeyFor(user?.id);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(persistable(messages)));
    } catch {
      // Depolama dolu/erişilemez olabilir — sohbet o oturumda çalışmaya devam eder,
      // yalnızca kalıcılık sessizce atlanır.
    }
  }, [messages, user?.id]);

  function clearChat() {
    const key = storageKeyFor(user?.id);
    if (key) { try { localStorage.removeItem(key); } catch { /* yoksay */ } }
    setMessages([{ ...GREETING, ts: timestamp() }]);
  }

  const groupedAgents = useMemo(() => {
    const values = Object.values(AGENTS);
    return QUICK_GROUPS.reduce<Record<string, AgentDef[]>>((acc, g) => {
      acc[g] = values.filter((a) => a.group === g);
      return acc;
    }, {} as Record<string, AgentDef[]>);
  }, []);

  // Kadro yalnızca widget ilk kez açıldığında çekilir — her sayfa yüklemesinde değil.
  useEffect(() => {
    if (!open || panelAgents.length > 0) return;
    let cancelled = false;
    aiApi.agents()
      .then((list) => { if (!cancelled) setPanelAgents(list); })
      .catch(() => { /* kadro çekilemezse seçici modül ajanlarıyla çalışmaya devam eder */ });
    return () => { cancelled = true; };
  }, [open, panelAgents.length]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 320); }, [open]);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing, open]);

  function addMsg(msg: Msg) {
    setMessages((m) => [...m, msg]);
  }

  // Ajan yalnızca "✦" çekmecesinden çip ile başlar (bkz. handleAgentTap); tarih aralığı
  // panelin o anki filtresidir. Docked panel (AiChatPanel) ile AYNI motor.
  async function startAgentFlow(agent: AgentDef, from: string, to: string, days: number, dateLabel: string) {
    const questions = await agent.getQuestions();
    if (questions.length === 0) {
      const result = await agent.execute({}, from, to, days);
      addMsg({ kind: 'result', id: Date.now(), result, dateLabel, ts: timestamp() });
      return;
    }
    addMsg({
      kind: 'question', id: Date.now(), agent, question: questions[0], questionIndex: 0,
      totalQuestions: questions.length, from, to, days, dateLabel, answers: {}, ts: timestamp(),
    });
  }

  async function handleQuestionAnswer(msg: QuestionMsg, value: string, label: string) {
    const nextAnswers = { ...msg.answers, [msg.question.key]: value, [`${msg.question.key}Label`]: label };
    setMessages((cur) => cur.map((m) => (m === msg ? { kind: 'plain', id: m.id, role: 'user', text: label, ts: m.ts } : m)));

    const questions = await msg.agent.getQuestions();
    const nextIndex = msg.questionIndex + 1;
    if (nextIndex < questions.length) {
      addMsg({ ...msg, id: Date.now(), question: questions[nextIndex], questionIndex: nextIndex, answers: nextAnswers, ts: timestamp() });
      return;
    }

    setTyping(true);
    try {
      const result = await msg.agent.execute(nextAnswers, msg.from, msg.to, msg.days);
      addMsg({ kind: 'result', id: Date.now(), result, dateLabel: msg.dateLabel, ts: timestamp() });
    } catch {
      addMsg({ kind: 'plain', id: Date.now(), role: 'assistant', text: 'Analiz çalıştırılırken bir hata oluştu.', ts: timestamp() });
    } finally {
      setTyping(false);
    }
  }

  // Etkin modül ajanı: 'auto' ise o an açık modülünki, doğrudan seçildiyse o. Bir panel
  // ajanı (panel:finance gibi) seçiliyken modül ajanı DEVREDE DEĞİLDİR — kullanıcı bilerek
  // bir uzmana geçmiştir, modülün içindeyken bile o uzmanla konuşur.
  const effectiveBot: ModuleBot | null =
    panelAgentKey(botChoice) !== null ? null
    : botChoice === 'auto' ? (activeWorkspace ? MODULE_BOTS[activeWorkspace] ?? null : null)
    : MODULE_BOTS[botChoice as WorkspaceKey] ?? null;

  // Modül ajanı yoksa hangi panel ajanı çalışacak (varsayılan: genel Aivar).
  const activePanelAgentKey = panelAgentKey(botChoice) ?? 'general';
  const activePanelAgent = panelAgents.find((a) => a.key === activePanelAgentKey) ?? null;

  async function send(text: string) {
    const value = text.trim();
    if (!value || typing) return;

    // Geçmiş, yeni mesaj eklenmeden ÖNCE alınır: sunucu yeni mesajı ayrıca alıyor.
    const history = historyFor(messages);
    addMsg({ kind: 'plain', id: Date.now(), role: 'user', text: value, ts: timestamp() });
    setInput('');
    setAgentsOpen(false);
    setToolsOpen(false);

    // Bir modül ajanı seçiliyse ONUN ucuna (ad.ai / oc.ai), değilse panel ajanına. Hepsi
    // aynı motoru kullanır ve sohbet geçmişini alır; yalnızca panel ajanları açık sayfayı bilir.
    setTyping(true);
    try {
      if (effectiveBot) {
        const { text, cards } = await effectiveBot.onQuery(value, history);
        addMsg({
          kind: 'plain', id: Date.now() + 1, role: 'assistant',
          text: text || 'Şu an bu soruya yanıt veremedim.', ts: timestamp(),
        });
        // Modül ajanları da tablo çizer — genel Aivar ile aynı deneyim.
        let botSeq = Date.now() + 2;
        cards.forEach((card) => addMsg({ kind: 'card', id: botSeq++, card, ts: timestamp() }));
      } else {
        const response = await aiApi.chat(value, pathname, history, activePanelAgentKey);
        addMsg({
          kind: 'plain', id: Date.now() + 1, role: 'assistant',
          text: response.reply || 'Şu an bu soruya yanıt veremedim.', ts: timestamp(),
          interactionId: response.interactionId,
        });
        // Veri tabloları ve yazma önerileri metinden SONRA, ayrı kartlar olarak gelir.
        let seq = Date.now() + 2;
        response.cards?.forEach((card) => {
          addMsg({ kind: 'card', id: seq++, card, ts: timestamp() });
        });
        response.actions?.forEach((action) => {
          addMsg({ kind: 'action', id: seq++, action, status: 'pending', ts: timestamp() });
        });
      }
    } catch {
      addMsg({ kind: 'plain', id: Date.now() + 1, role: 'assistant', text: 'Bağlantı sırasında bir hata oluştu — az sonra tekrar deneyin.', ts: timestamp() });
    } finally {
      setTyping(false);
    }
  }

  // Girdi kutusundan gönderim, seçili "Alan/Kart" bağlamını metne katar ve
  // bağlamı tüketir. Öneri çipleri / ajan dokunuşları bu sarmalayıcıyı
  // KULLANMAZ — onların zaten kendi net metinleri var.
  function sendFromInput() {
    const base = input.trim();
    if (!base && !attachedContext) return;
    const contextInfo = attachedContext ? ` [Seçili Alan Verisi: ${attachedContext.dataSnippet}]` : '';
    setAttachedContext(null);
    void send((base || `"${attachedContext?.title}" bileşenini analiz et`) + contextInfo);
  }

  // Cevap kalitesi oyu. Sunucuya yazılamazsa sessizce geçilir — kullanıcı için bu bir
  // kolaylık, hata göstermeye değmez; işaret arayüzde yine görünür kalır.
  async function rateAnswer(msg: PlainMsg, vote: 'up' | 'down') {
    if (msg.feedback || !msg.interactionId) return;

    setMessages((cur) => cur.map((m) => (m.kind === 'plain' && m.id === msg.id ? { ...m, feedback: vote } : m)));
    try {
      await aiApi.sendFeedback(msg.interactionId, vote === 'up');
    } catch {
      /* ölçüm kaydı kullanıcının işini bloke etmez */
    }
  }

  // Onay kartındaki karar. Veri YALNIZCA burada, kullanıcı "Uygula" dedikten sonra değişir.
  async function decideAction(msg: ActionMsg, approve: boolean) {
    if (msg.status !== 'pending') return;

    const patch = (next: Partial<ActionMsg>) =>
      setMessages((cur) => cur.map((m) => (m.kind === 'action' && m.id === msg.id ? { ...m, ...next } : m)));

    if (!approve) {
      patch({ status: 'rejected' });
      return;
    }

    patch({ status: 'running' });
    try {
      const { result } = await aiApi.confirmAction(msg.action.proposalId);
      patch({ status: 'done', resultText: result });
    } catch (e) {
      patch({
        status: 'failed',
        resultText: e instanceof Error ? e.message : 'İşlem uygulanamadı.',
      });
    }
  }

  async function handleAgentTap(agent: AgentDef) {
    if (typing) return;
    setAgentsOpen(false);
    addMsg({ kind: 'plain', id: Date.now(), role: 'user', text: agent.name, ts: timestamp() });
    const current = getDateParams();
    setTyping(true);
    try {
      await startAgentFlow(agent, current.from, current.to, current.days, CURRENT_PERIOD_LABEL);
    } catch {
      addMsg({ kind: 'plain', id: Date.now() + 1, role: 'assistant', text: 'Analiz başlatılamadı — az sonra tekrar deneyin.', ts: timestamp() });
    } finally {
      setTyping(false);
    }
  }

  function handleSuggestion(s: string) {
    if (s === 'Bu sayfayı yorumla') {
      const label = PAGE_HINTS[pathname] ?? pathname;
      void send(`Şu an "${label}" sayfasındayım. Bu sayfa hakkında kısaca bilgi ver.`);
      return;
    }
    void send(s);
  }

  // Başlık ve öneriler daima O AN KONUŞULAN ajanı yansıtır — kullanıcı kiminle konuştuğunu
  // pencerenin üstünden görür, "+" menüsünü açmasına gerek kalmaz.
  const name = effectiveBot
    ? `Aivar · ${effectiveBot.aiName}`
    : activePanelAgent && activePanelAgent.key !== 'general'
      ? `Aivar · ${activePanelAgent.name}`
      : 'Aivar';
  const subtitle = effectiveBot
    ? effectiveBot.moduleLabel
    : activePanelAgent?.description ?? 'Çevrimiçi · Yapay zeka asistanı';
  const suggestions = effectiveBot?.suggestions
    ?? PANEL_AGENT_SUGGESTIONS[activePanelAgentKey]
    ?? PANEL_AGENT_SUGGESTIONS.general;
  const inputPlaceholder = effectiveBot?.placeholder
    ?? (activePanelAgent && activePanelAgent.key !== 'general'
      ? `${activePanelAgent.name} — ${activePanelAgent.description.toLocaleLowerCase('tr-TR')} sor...`
      : "Aivar'a sorun...");

  // Modül çalışma alanları (SellingView, AdsHub, …) z-index 20000 ile tüm ekranı
  // kaplardı — widget bilerek ÜSTÜNDE (20100): bir modülün İÇİNDEYKEN de
  // erişilebilir olması gerekiyor. Kendi modal/detay pencereleri (40000+) yine
  // önde kalır. Mobilde yalnızca açıkken render edilir (bkz. dosya başındaki not).
  if (isMobile && !open) return null;

  return (
    <>
      <style>{`
        @keyframes aw-orb-ring { 0% { transform: scale(1); opacity: 0.5; } 70% { transform: scale(1.7); opacity: 0; } 100% { transform: scale(1.7); opacity: 0; } }
        @keyframes aw-orb-inner { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.88); opacity: 0.75; } }
        @keyframes aw-msg-left { from { opacity: 0; transform: translateX(-8px) translateY(4px); } to { opacity: 1; transform: none; } }
        @keyframes aw-msg-right { from { opacity: 0; transform: translateX(8px) translateY(4px); } to { opacity: 1; transform: none; } }
        .aw-msg-left { animation: aw-msg-left 0.28s ${SPRING} both; }
        .aw-msg-right { animation: aw-msg-right 0.28s ${SPRING} both; }
        @keyframes aw-bounce-dot { 0%, 80%, 100% { transform: translateY(0); opacity: 0.35; } 40% { transform: translateY(-4px); opacity: 1; } }
        .aw-tdot { animation: aw-bounce-dot 1.3s ease-in-out infinite; }
        .aw-tdot:nth-child(2) { animation-delay: 0.18s; }
        .aw-tdot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes aw-drawer-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .aw-drawer { animation: aw-drawer-in 0.18s ${SPRING} both; }
        .aw-msg-scroll::-webkit-scrollbar { width: 3px; }
        .aw-msg-scroll::-webkit-scrollbar-track { background: transparent; }
        .aw-msg-scroll::-webkit-scrollbar-thumb { background: rgba(196, 181, 253, 0.3); border-radius: 9999px; }
      `}</style>

      <FloatingPanel
        tk={tk}
        open={open}
        setOpen={setOpen}
        minimized={minimized}
        setMinimized={changeMinimized}
        wide={wide}
        onToggleWide={() => setWide((w) => !w)}
        isMobile={isMobile}
        onClearChat={clearChat}
        name={name}
        subtitle={subtitle}
        messages={messages}
        typing={typing}
        input={input}
        setInput={setInput}
        inputPlaceholder={inputPlaceholder}
        inputFocused={inputFocused}
        setInputFocused={setInputFocused}
        sendFromInput={sendFromInput}
        suggestions={suggestions}
        handleSuggestion={handleSuggestion}
        onAnswer={handleQuestionAnswer}
        onDecideAction={decideAction}
        onRateAnswer={rateAnswer}
        endRef={endRef}
        inputRef={inputRef}
        userInitial={(user?.email?.[0] ?? 'S').toUpperCase()}
        agentsOpen={agentsOpen}
        setAgentsOpen={setAgentsOpen}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        groupedAgents={groupedAgents}
        onAgentTap={(agent) => { void handleAgentTap(agent); }}
        toolsOpen={toolsOpen}
        setToolsOpen={setToolsOpen}
        botChoice={botChoice}
        setBotChoice={setBotChoice}
        panelAgents={panelAgents}
        onPickElement={() => { setToolsOpen(false); setSelectingElement(true); }}
        attachedContext={attachedContext}
        onRemoveAttachedContext={() => setAttachedContext(null)}
      />

      {selectingElement && (
        <InstantElementSelector
          onSelect={(ctx) => { setAttachedContext(ctx); setSelectingElement(false); setOpen(true); }}
          onCancel={() => setSelectingElement(false)}
        />
      )}
    </>
  );
}

function FloatingPanel({
  tk, open, setOpen, minimized, setMinimized, wide, onToggleWide, isMobile, onClearChat, name, subtitle, messages, typing, input, setInput,
  inputPlaceholder, inputFocused, setInputFocused, sendFromInput, suggestions, handleSuggestion, onAnswer, onDecideAction, onRateAnswer,
  endRef, inputRef, userInitial, agentsOpen, setAgentsOpen, activeGroup, setActiveGroup,
  groupedAgents, onAgentTap, toolsOpen, setToolsOpen, botChoice, setBotChoice, panelAgents, onPickElement,
  attachedContext, onRemoveAttachedContext,
}: {
  tk: Tk;
  open: boolean;
  setOpen: (v: boolean) => void;
  minimized: boolean;
  setMinimized: (v: boolean) => void;
  wide: boolean;
  onToggleWide: () => void;
  isMobile: boolean;
  onClearChat: () => void;
  name: string;
  subtitle: string;
  messages: Msg[];
  typing: boolean;
  input: string;
  setInput: (v: string) => void;
  inputPlaceholder: string;
  inputFocused: boolean;
  setInputFocused: (v: boolean) => void;
  sendFromInput: () => void;
  suggestions: string[];
  handleSuggestion: (s: string) => void;
  onAnswer: (msg: QuestionMsg, value: string, label: string) => void;
  onDecideAction: (msg: ActionMsg, approve: boolean) => void;
  onRateAnswer: (msg: PlainMsg, vote: 'up' | 'down') => void;
  endRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  userInitial: string;
  agentsOpen: boolean;
  setAgentsOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  activeGroup: (typeof QUICK_GROUPS)[number];
  setActiveGroup: (g: (typeof QUICK_GROUPS)[number]) => void;
  groupedAgents: Record<string, AgentDef[]>;
  onAgentTap: (agent: AgentDef) => void;
  toolsOpen: boolean;
  setToolsOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  botChoice: BotChoice;
  setBotChoice: (c: BotChoice) => void;
  panelAgents: AiAgentInfo[];
  onPickElement: () => void;
  attachedContext: SelectedContext | null;
  onRemoveAttachedContext: () => void;
}) {
  // Dört boyut: simge → daraltılmış kart → standart pencere → geniş pencere.
  // Mobilde açık = tam ekran. Simge hali kullanıcının çarpıya basmasıyla seçilir.
  const iconOnly = minimized && !open;
  const desktopWidth = open ? (wide ? WIDE_W : EXPANDED_W) : (iconOnly ? ICON_SIZE : COLLAPSED_W);
  const desktopHeight = open ? (wide ? WIDE_H : EXPANDED_H) : (iconOnly ? ICON_SIZE : COLLAPSED_H);
  const containerStyle: CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 20100, background: tk.panelBg, overflow: 'hidden' }
    : {
        position: 'fixed', bottom: BOTTOM, right: RIGHT, zIndex: 20100,
        width: desktopWidth,
        height: desktopHeight,
        maxWidth: 'calc(100vw - 48px)',
        maxHeight: 'calc(100vh - 108px)',
        borderRadius: open ? 24 : (iconOnly ? ICON_SIZE / 2 : 20),
        background: tk.panelBg,
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: `1px solid ${tk.panelBorder}`,
        boxShadow: open ? tk.panelGlow : tk.panelShadow,
        overflow: 'hidden',
        transition: [`width ${DUR} ${SPRING}`, `height ${DUR} ${SPRING}`, 'border-radius 0.28s ease', 'box-shadow 0.35s ease'].join(', '),
      };

  const collapsedVisible = !open && !iconOnly;
  const expandedVisible = open;
  const onlyGreeting = messages.length === 1 && !typing;
  const canClear = messages.length > 1;

  return (
    <div data-ambient-ai-ui="true" style={containerStyle}>
      {/* ── DARALTILMIŞ: her zaman görünen kart — WIDGET ASLA TAMAMEN
          KAYBOLMAZ, yalnızca bu kart ↔ genişletilmiş panel arasında geçer. ── */}
      <button
        onClick={() => setOpen(true)}
        className="absolute inset-0 flex w-full cursor-pointer items-center gap-3 px-4"
        style={{
          opacity: collapsedVisible ? 1 : 0,
          transition: `opacity 0.18s ease ${collapsedVisible ? '0.18s' : '0s'}`,
          pointerEvents: collapsedVisible ? 'auto' : 'none',
        }}
      >
        <Orb size={44} />
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[13.5px] font-semibold leading-tight" style={{ color: tk.heading }}>Yardım ister misiniz?</p>
          <p className="mt-0.5 text-[11.5px] font-normal" style={{ color: tk.sub }}>Aivar&apos;a sorun</p>
        </div>
        <div className="flex items-center gap-1.5 pr-5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#86efac' }} />
          <span className="text-[11px] font-medium" style={{ color: tk.sub }}>Çevrimiçi</span>
        </div>
      </button>

      {/* Kartın sağ üst köşesindeki çarpı — kartı simgeye indirir (sayfayı kaplamasın).
          Kart düğmesinin İÇİNDE değil KARDEŞİ: iç içe <button> geçersiz HTML olurdu. */}
      {collapsedVisible && !isMobile && (
        <button
          type="button"
          onClick={() => setMinimized(true)}
          title="Simge durumuna küçült"
          aria-label="Simge durumuna küçült"
          className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full transition hover:opacity-100"
          style={{ color: tk.sub, opacity: 0.55, background: 'transparent' }}
        >
          <X size={13} />
        </button>
      )}

      {/* ── SİMGE: yalnızca yuvarlak orb — tıklanınca sohbet açılır. ── */}
      <button
        type="button"
        onClick={() => { setMinimized(false); setOpen(true); }}
        title="Aivar'a sorun"
        aria-label="Aivar'a sorun"
        className="absolute inset-0 flex cursor-pointer items-center justify-center"
        style={{
          opacity: iconOnly ? 1 : 0,
          transition: `opacity 0.18s ease ${iconOnly ? '0.18s' : '0s'}`,
          pointerEvents: iconOnly ? 'auto' : 'none',
        }}
      >
        <Orb size={38} />
      </button>

      {/* ── GENİŞLETİLMİŞ: sohbet paneli ─────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          opacity: expandedVisible ? 1 : 0,
          transition: `opacity 0.22s ease ${expandedVisible ? '0.18s' : '0s'}`,
          pointerEvents: expandedVisible ? 'auto' : 'none',
        }}
      >
        <div className="flex shrink-0 items-center gap-3 px-5 py-3.5" style={{ background: tk.headerBg, borderBottom: `1px solid ${tk.headerBorder}` }}>
          <Orb size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight" style={{ color: tk.heading }}>{name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#86efac' }} />
              <span className="truncate text-[11px]" style={{ color: tk.sub }}>{subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {canClear && (
              <IconBtn onClick={onClearChat} title="Sohbeti temizle" tk={tk}>
                <Trash2 size={14} />
              </IconBtn>
            )}
            <IconBtn onClick={() => setAgentsOpen((v) => !v)} title="Hazır ajanlar" tk={tk} active={agentsOpen}>
              <Sparkles size={14} />
            </IconBtn>
            {!isMobile && (
              <IconBtn onClick={onToggleWide} title={wide ? 'Daralt' : 'Genişlet'} tk={tk} active={wide}>
                {wide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </IconBtn>
            )}
            <IconBtn onClick={() => setOpen(false)} title={isMobile ? 'Kapat' : 'Küçült'} tk={tk}>
              {isMobile
                ? <X size={15} />
                : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
            </IconBtn>
          </div>
        </div>

        <div className="aw-msg-scroll flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarGutter: 'stable' }}>
          <div className="space-y-5">
            {messages.map((msg, i) => {
              if (msg.kind === 'question') {
                return (
                  <div key={msg.id} className="aw-msg-left">
                    <QuestionCard tk={tk} msg={msg} onAnswer={(v, l) => onAnswer(msg, v, l)} />
                  </div>
                );
              }
              if (msg.kind === 'result') {
                return (
                  <div key={msg.id} className="aw-msg-left">
                    <ResultCard tk={tk} msg={msg} />
                  </div>
                );
              }
              if (msg.kind === 'action') {
                return (
                  <div key={msg.id} className="aw-msg-left">
                    <ActionCard tk={tk} msg={msg} onDecide={(approve) => onDecideAction(msg, approve)} />
                  </div>
                );
              }
              if (msg.kind === 'card') {
                return (
                  <div key={msg.id} className="aw-msg-left">
                    <DataCard tk={tk} card={msg.card} />
                  </div>
                );
              }
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end aw-msg-right' : 'justify-start aw-msg-left'}`}
                  style={{ animationDelay: i < 2 ? '0s' : '0.04s' }}
                >
                  {msg.role === 'assistant' && (
                    <div className="mt-0.5 shrink-0">
                      <div className="h-6 w-6 rounded-full" style={{ background: 'radial-gradient(circle at 34% 32%,#f0ebff,#a78bfa)' }} />
                    </div>
                  )}
                  <div className="max-w-[78%]">
                    <div
                      className="px-4 py-3 text-[13.5px] leading-relaxed"
                      style={{
                        borderRadius: msg.role === 'user' ? '18px 18px 5px 18px' : '5px 18px 18px 18px',
                        background: msg.role === 'user' ? tk.userBg : tk.assistBg,
                        color: msg.role === 'user' ? tk.userText : tk.assistText,
                        border: `1px solid ${msg.role === 'user' ? tk.userBorder : tk.assistBorder}`,
                      }}
                    >
                      {msg.text}
                    </div>
                    <div className={`mt-1 flex items-center gap-1.5 px-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      <span className="text-[10px]" style={{ color: tk.ts }}>{msg.ts}</span>
                      {/* PDF indirme her Aivar cevabında var — ölçüm kaydı gerekmez, salt istemci-taraflı üretim. */}
                      {msg.role === 'assistant' && msg.id !== GREETING.id && (
                        <button
                          type="button"
                          title="PDF indir"
                          aria-label="PDF indir"
                          onClick={() => {
                            import('../../lib/export-pdf').then((m) => m.downloadAiTextPdf('Aivar', msg.text)).catch(() => {});
                          }}
                          className="cursor-pointer rounded p-0.5 opacity-45 transition-opacity hover:opacity-100"
                          style={{ color: tk.sub }}
                        >
                          <Download size={11} />
                        </button>
                      )}
                      {/* Oy yalnızca Aivar cevaplarında ve ölçüm kaydı varsa görünür. */}
                      {msg.role === 'assistant' && !!msg.interactionId && (
                        <span className="flex items-center gap-0.5">
                          <FeedbackButton
                            label="Faydalı"
                            symbol="👍"
                            active={msg.feedback === 'up'}
                            dimmed={msg.feedback === 'down'}
                            onClick={() => onRateAnswer(msg, 'up')}
                          />
                          <FeedbackButton
                            label="Faydasız"
                            symbol="👎"
                            active={msg.feedback === 'down'}
                            dimmed={msg.feedback === 'up'}
                            onClick={() => onRateAnswer(msg, 'down')}
                          />
                        </span>
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{ background: tk.userBg, color: tk.userText, border: `1px solid ${tk.userBorder}` }}
                    >
                      {userInitial}
                    </div>
                  )}
                </div>
              );
            })}

            {typing && (
              <div className="flex gap-2.5 justify-start aw-msg-left">
                <div className="mt-0.5 shrink-0"><div className="h-6 w-6 rounded-full" style={{ background: 'radial-gradient(circle at 34% 32%,#f0ebff,#a78bfa)' }} /></div>
                <TypingBubble tk={tk} />
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {onlyGreeting && !agentsOpen && !toolsOpen && (
          <div className="flex flex-wrap gap-2 px-5 pb-3">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150"
                style={{ background: tk.suggBg, color: tk.suggText, border: `1px solid ${tk.suggBorder}` }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = tk.suggHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = tk.suggBg; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Hazır ajanlar çekmecesi — sağdaki ✦ ile açılır; ajan YALNIZCA
            buradan çip'e dokunarak başlar (serbest metin sohbete gider). ── */}
        {agentsOpen && (
          <div className="aw-drawer mx-3 mb-3 overflow-hidden rounded-[14px]" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
            <div className="flex gap-1 overflow-x-auto px-2.5 pt-2.5">
              {QUICK_GROUPS.map((g) => {
                const active = activeGroup === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGroup(g)}
                    className="shrink-0 cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-colors"
                    style={{
                      background: active ? 'linear-gradient(140deg,#a78bfa,#7c3aed)' : 'transparent',
                      color: active ? '#fff' : tk.sub,
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <div className="flex max-h-[104px] flex-wrap gap-1.5 overflow-y-auto p-2.5">
              {(groupedAgents[activeGroup] ?? []).map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onAgentTap(agent)}
                  title={agent.description}
                  className="cursor-pointer rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors"
                  style={{ background: tk.chipBg, border: `1px solid ${tk.cardBorder}`, color: tk.heading }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = tk.suggHover; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = tk.chipBg; }}
                >
                  {agent.name}
                </button>
              ))}
              {(groupedAgents[activeGroup] ?? []).length === 0 && (
                <span className="px-1 py-1 text-[11px]" style={{ color: tk.sub }}>Bu grupta henüz ajan yok.</span>
              )}
            </div>
          </div>
        )}

        {/* ── "+" çekmecesi — model/kimlik seçimi + alan/kart seçme. Eskiden
            ModuleAmbientAi'nin girdi kutusundaki "+" araçlar menüsüydü; bu widget
            tek olduğu için "hangi modülün botuyla konuşuyorum" seçimi de buraya
            taşındı — herhangi bir sayfadan, o modülü hiç açmadan. ── */}
        {toolsOpen && (
          <div className="aw-drawer mx-3 mb-3 overflow-hidden rounded-[14px]" style={{ background: tk.cardBg, border: `1px solid ${tk.cardBorder}` }}>
            <div className="px-3 pt-2.5 text-[9.5px] font-bold uppercase tracking-wider" style={{ color: tk.sub }}>
              Kiminle konuşuyorsunuz?
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 pt-1.5">
              <BotChip
                label="Otomatik"
                title="Bir modüldeyken o modülün ajanı, diğer sayfalarda genel Aivar"
                active={botChoice === 'auto'}
                tk={tk}
                onClick={() => setBotChoice('auto')}
              />
              {panelAgents.map((agent) => (
                <BotChip
                  key={agent.key}
                  label={agent.key === 'general' ? 'Aivar (Genel)' : `${agent.name} · ${agent.description}`}
                  title={agent.scope}
                  active={botChoice === `${PANEL_AGENT_PREFIX}${agent.key}`}
                  tk={tk}
                  onClick={() => setBotChoice(`${PANEL_AGENT_PREFIX}${agent.key}`)}
                />
              ))}
              {MODULE_BOT_ORDER.map((key) => {
                const bot = MODULE_BOTS[key];
                if (!bot) return null;
                return (
                  <BotChip
                    key={key}
                    label={`${bot.aiName} · ${bot.moduleLabel}`}
                    title={`${bot.moduleLabel} modülünün uzman ajanı`}
                    active={botChoice === key}
                    tk={tk}
                    onClick={() => setBotChoice(key)}
                  />
                );
              })}
            </div>
            <div className="border-t px-2.5 py-2" style={{ borderColor: tk.cardBorder }}>
              <button
                type="button"
                onClick={onPickElement}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[9px] px-2 py-1.5 text-[11.5px] font-semibold transition-colors"
                style={{ color: tk.heading }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = tk.chipBg; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <MousePointerClick size={14} style={{ color: tk.sub }} />
                Alan / Kart Seç — ekrandan bir bileşen işaretle
              </button>
            </div>
          </div>
        )}

        {attachedContext && (
          <div className="mx-5 mb-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px]" style={{ background: tk.chipBg, border: `1px solid ${tk.cardBorder}`, color: tk.heading }}>
            <MousePointerClick size={12} style={{ color: tk.sub }} />
            <span className="min-w-0 flex-1 truncate font-mono">{attachedContext.title}</span>
            <button type="button" onClick={onRemoveAttachedContext} className="cursor-pointer" style={{ color: tk.sub }} title="Kaldır">
              <X size={12} />
            </button>
          </div>
        )}

        <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: `1px solid ${tk.headerBorder}` }}>
          <div
            className="flex items-center gap-1.5 px-2.5 py-2.5 transition-all duration-200"
            style={{
              borderRadius: 15, background: tk.inputBg,
              border: `1px solid ${inputFocused ? tk.inputFocus : tk.inputBorder}`,
              boxShadow: inputFocused ? `0 0 0 3px ${tk.inputFocus}22` : '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              title="Model seç / Alan seç"
              aria-label="Model seç / Alan seç"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors"
              style={{ color: toolsOpen ? '#a78bfa' : tk.iconCol, background: toolsOpen ? tk.btnHover : 'transparent' }}
            >
              <Plus size={16} className={toolsOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendFromInput()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={inputPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              style={{ color: tk.inputText }}
            />
            <button
              onClick={sendFromInput}
              disabled={!input.trim() && !attachedContext}
              title="Gönder"
              aria-label="Gönder"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
              style={{
                background: (input.trim() || attachedContext) ? 'linear-gradient(140deg,#a78bfa,#7c3aed)' : tk.suggBg,
                color: (input.trim() || attachedContext) ? '#fff' : tk.iconCol,
                boxShadow: (input.trim() || attachedContext) ? '0 2px 10px rgba(124,58,237,0.32)' : 'none',
                transform: (input.trim() || attachedContext) ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 11.5V1.5M1.5 6.5l5-5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] font-medium" style={{ color: tk.ts }}>
            Göndermek için <kbd className="font-sans">↵</kbd> tuşuna basın
          </p>
        </div>
      </div>
    </div>
  );
}

// Cevap kalitesi oyu — küçük ve sessiz: kullanıcıyı zorlamaz, ama bir tık verdiğinde
// hangi soruların kötü cevaplandığını ölçmemizi sağlar.
function FeedbackButton({
  label, symbol, active, dimmed, onClick,
}: { label: string; symbol: string; active: boolean; dimmed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={active || dimmed}
      className="cursor-pointer rounded px-1 text-[11px] leading-none transition-opacity disabled:cursor-default"
      style={{ opacity: active ? 1 : dimmed ? 0.25 : 0.45 }}
    >
      {symbol}
    </button>
  );
}

function BotChip({ label, title, active, tk, onClick }: { label: string; title?: string; active: boolean; tk: Tk; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition-colors"
      style={{
        background: active ? 'linear-gradient(140deg,#a78bfa,#7c3aed)' : tk.chipBg,
        color: active ? '#fff' : tk.heading,
        border: active ? 'none' : `1px solid ${tk.cardBorder}`,
      }}
    >
      {label}
    </button>
  );
}
