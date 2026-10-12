'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, List } from 'lucide-react';
import {
  BOT_MENU_ACTION, BOT_TEXT_KEY, CUSTOMER_LANGUAGES,
  type BotMenuOptionDto, type BotTextEntryDto, type BotTextKey, type CustomerLanguageCode,
} from '../../lib/api/omnichannel';
import { activeLevel, labelFor } from './menuTree';
import { CHANNEL_LIMITS, menuWarnings, optionLayout, visibleTitle, type PreviewChannel } from './menuChannelLimits';

// Sunucudaki BotResponseComposer ile aynı numara işaretleri.
const OPTION_NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

// Sunucu ana menünün altına "temsilciye nasıl ulaşılır + mesai" alt bilgisini ekler
// (BotTemplates.MenuFooter). Önizlemede metni yok; uzunluk denetimine yaklaşık payı eklenir.
const FOOTER_LENGTH_ESTIMATE = 160;

// BotTemplates.SubmenuHint ile aynı metin.
const SUBMENU_HINT: Record<CustomerLanguageCode, string> = {
  tr: 'Bir numara seçin ya da sorunuzu yazın. Ana menü için "menü" yazabilirsiniz.',
  en: 'Pick a number or type your question. Reply "menu" for the main menu.',
  sq: 'Zgjidhni një numër ose shkruani pyetjen tuaj. Shkruani "menu" për menunë kryesore.',
};

const CHANNELS: PreviewChannel[] = ['whatsapp', 'instagram', 'messenger'];
// Önizleme sekmelerinde kısa kod yeter (TR/EN/SQ).
const LANGUAGES = CUSTOMER_LANGUAGES.map((key) => ({ key, label: key.toUpperCase() }));

const MAIN_SCREEN = 'main';

// Aynı menünün WhatsApp / Instagram / Messenger'da nasıl görüneceği + sınır uyarıları.
export function MenuPreview({ options, texts }: { options: BotMenuOptionDto[]; texts: BotTextEntryDto[] }) {
  const [channel, setChannel] = useState<PreviewChannel>('whatsapp');
  const [language, setLanguage] = useState<CustomerLanguageCode>('tr');
  const [screen, setScreen] = useState<string>(MAIN_SCREEN);

  const submenus = activeLevel(options, null).filter((o) => o.action === BOT_MENU_ACTION.Submenu);
  const parent = submenus.find((o) => o.id === screen);
  const items = activeLevel(options, parent?.id ?? null);
  const labels = items.map((o) => labelFor(o, language));

  const header = parent
    ? `*${labelFor(parent, language)}*\n${SUBMENU_HINT[language]}`
    : `${textFor(texts, BOT_TEXT_KEY.FirstGreeting, language)}\n\n${textFor(texts, BOT_TEXT_KEY.MenuHint, language)}`;
  const body = `${header}\n\n${labels.map((l, i) => `${OPTION_NUMBERS[i] ?? `${i + 1}.`} ${l}`).join('\n')}`;
  const warnings = menuWarnings(channel, labels, parent ? body : `${body}${' '.repeat(FOOTER_LENGTH_ESTIMATE)}`);

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-[var(--fg)]">Önizleme</span>
        <Segmented
          items={LANGUAGES.map((l) => ({ key: l.key, label: l.label }))}
          value={language} onChange={(v) => setLanguage(v as CustomerLanguageCode)}
        />
      </div>
      <Segmented
        items={CHANNELS.map((c) => ({ key: c, label: CHANNEL_LIMITS[c].name }))}
        value={channel} onChange={(v) => setChannel(v as PreviewChannel)}
      />
      {submenus.length > 0 && (
        <select
          value={parent ? screen : MAIN_SCREEN} onChange={(e) => setScreen(e.target.value)}
          className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)]"
        >
          <option value={MAIN_SCREEN}>Ana menü</option>
          {submenus.map((s) => <option key={s.id} value={s.id ?? ''}>Alt menü: {labelFor(s, language)}</option>)}
        </select>
      )}

      <div className="rounded-[12px] bg-[var(--bg-subtle)] p-3 flex flex-col gap-2">
        <div className="self-start max-w-[92%] whitespace-pre-wrap rounded-[12px] rounded-bl-[4px] bg-[var(--bg)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--fg)] shadow-xs">
          {body}
          {!parent && <div className="mt-2 text-[11px] italic text-[var(--fg-muted)]">+ temsilci ve mesai bilgisi (otomatik)</div>}
        </div>
        <Interactive channel={channel} labels={labels} />
      </div>

      {warnings.length === 0 ? (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
          <CheckCircle2 size={13} /> {CHANNEL_LIMITS[channel].name} sınırları içinde.
        </div>
      ) : (
        <ul className="flex flex-col gap-1 text-[11px] text-amber-600">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Interactive({ channel, labels }: { channel: PreviewChannel; labels: string[] }) {
  const limits = CHANNEL_LIMITS[channel];
  const shown = labels.slice(0, limits.maxRows);
  if (shown.length === 0) return null;

  // WhatsApp 3'ten fazla seçenekte liste düğmesi gösterir; seçenekler açılan listededir.
  if (channel === 'whatsapp' && optionLayout(channel, labels.length) === 'list') {
    return (
      <div className="flex flex-col gap-1">
        <div className="self-start inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-[11.5px] font-semibold text-sky-600">
          <List size={12} /> Seçenekler
        </div>
        <div className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--bg)] text-[11.5px]">
          {shown.map((label) => (
            <div key={label} className="border-b border-[var(--border-soft)] px-3 py-1.5 last:border-b-0">
              {visibleTitle(channel, labels.length, label)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((label) => (
        <span key={label} className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-[11.5px] font-semibold text-sky-600">
          {visibleTitle(channel, labels.length, label)}
        </span>
      ))}
    </div>
  );
}

function Segmented({ items, value, onChange }: {
  items: { key: string; label: string }[]; value: string; onChange: (key: string) => void;
}) {
  return (
    <div className="inline-flex self-start rounded-[6px] border border-[var(--border)] p-0.5">
      {items.map((item) => (
        <button
          key={item.key} type="button" onClick={() => onChange(item.key)}
          className={`h-7 rounded-[4px] px-2.5 text-[11px] font-semibold cursor-pointer transition ${
            value === item.key ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function textFor(texts: BotTextEntryDto[], key: BotTextKey, language: CustomerLanguageCode): string {
  const entry = texts.find((t) => t.key === key);
  if (!entry) return '';
  if (language === 'tr') return entry.tr || entry.defaultTr;
  if (language === 'sq') return entry.sq || entry.defaultSq;
  return entry.en || entry.defaultEn;
}
