'use client';

import type { ChannelDraft, ChannelDraftPatch } from './channelDraft';
import { labelClass, textareaClass } from './formClasses';

const WELCOME_ROWS = 2;

interface WelcomeField {
  key: 'welcomeTr' | 'welcomeEn' | 'welcomeSq';
  label: string;
  placeholder: string;
}

const WELCOME_FIELDS: readonly WelcomeField[] = [
  {
    key: 'welcomeTr', label: 'Karşılama Mesajı (Türkçe)',
    placeholder: "Örn: Merhaba! Demo Oto'e hoş geldiniz. Size nasıl yardımcı olabiliriz?",
  },
  {
    key: 'welcomeEn', label: 'Welcome Message (English)',
    placeholder: 'Hello! Welcome to DEMO Automotive. How can we help you?',
  },
  {
    key: 'welcomeSq', label: 'Mesazhi i mirëseardhjes (Arnavutça — Kosova)',
    placeholder: "Përshëndetje! Mirë se vini në DEMO Automotive. Si mund t'ju ndihmojmë?",
  },
];

// Kanala özel otomatik karşılama mesajları (dil başına). Boş bırakılırsa bot metinlerindeki karşılama kullanılır.
export function ChannelWelcomeFields({ draft, patch }: { draft: ChannelDraft; patch: ChannelDraftPatch }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-bold text-[var(--fg)]">Otomatik karşılama mesajları</div>
      {WELCOME_FIELDS.map((field) => (
        <div key={field.key}>
          <label className={labelClass}>{field.label}</label>
          <textarea
            value={draft[field.key]}
            onChange={(e) => patch({ [field.key]: e.target.value })}
            placeholder={field.placeholder}
            rows={WELCOME_ROWS}
            className={textareaClass}
          />
        </div>
      ))}
    </div>
  );
}
