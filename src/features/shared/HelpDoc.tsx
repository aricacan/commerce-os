'use client';

// ── Modül Yardım Dokümanı (ortak kabuk + tipografi) ──────────────────────────
//
// AdsHub'ın "API Bağlantı Rehberi" bu düzeni ilk kuran yerdi; PartnerHub da aynı
// şeye ihtiyaç duyunca kabuk (portal + odak tuzağı + Esc + bölüm gezinmesi) ve
// tipografi primitive'leri buraya taşındı. İki kopya kaçınılmaz olarak ayrışırdı:
// biri Esc'i desteklerken diğeri desteklemez, biri 760px sütun kullanırken diğeri
// başka bir genişliğe kayardı.
//
// MODAL DEĞİL, SAYFA: yardım içeriği küçük bir popover'a sığmayacak kadar uzun.
// Kendi geri düğmesi, kendi kaydırması ve kendi iç navigasyonu var.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X, ExternalLink, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-react';
import { palette, icon, text } from './design';

export interface HelpSection {
  id: string;
  label: string;
}

export function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 76, marginBottom: 40 }}>
      <h2 style={{
        fontSize: text.xl, fontWeight: 800, color: palette.textStrong,
        letterSpacing: '-0.01em', marginBottom: 16,
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </section>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontSize: text.lg, fontWeight: 700, color: palette.textStrong, marginTop: 6 }}>
      {children}
    </h3>
  );
}

export function Paragraph({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: text.md, color: palette.textMuted, lineHeight: 1.6, margin: 0 }}>
      {children}
    </p>
  );
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingLeft: 22, margin: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: text.md, color: palette.text, lineHeight: 1.55 }}>{item}</li>
      ))}
    </ol>
  );
}

export function Callout({ tone, children }: { tone: 'warning' | 'info' | 'success'; children: ReactNode }) {
  const { bg, color, Icon } = {
    warning: { bg: palette.warningSoft, color: palette.warningText, Icon: AlertTriangle },
    info: { bg: palette.accentSoft, color: palette.accent, Icon: AlertTriangle },
    success: { bg: 'oklch(48% 0.09 155 / 0.1)', color: palette.success, Icon: ShieldCheck },
  }[tone];

  return (
    <div style={{
      display: 'flex', gap: 10, padding: '11px 14px', borderRadius: 10,
      background: bg, color, fontSize: text.sm, lineHeight: 1.55, fontWeight: 600,
    }}>
      <Icon size={icon.md} strokeWidth={icon.stroke} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ fontWeight: 500 }}>{children}</div>
    </div>
  );
}

export function CodeLine({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
      borderRadius: 8, background: palette.chipBg, border: `1px solid ${palette.borderSoft}`,
    }}>
      <code
        className="font-mono"
        style={{ flex: 1, fontSize: text.sm, color: palette.text, overflowX: 'auto', whiteSpace: 'nowrap' }}
      >
        {children}
      </code>
      <button
        onClick={copy}
        aria-label="Kopyala"
        style={{
          border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0,
          color: copied ? palette.success : palette.textFaint, display: 'flex',
        }}
      >
        {copied ? <Check size={icon.sm} strokeWidth={icon.stroke} /> : <Copy size={icon.sm} strokeWidth={icon.stroke} />}
      </button>
    </div>
  );
}

export function ExtLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href} target="_blank" rel="noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, color: palette.accent,
        fontWeight: 600, textDecoration: 'none', fontSize: text.md,
      }}
    >
      {children}
      <ExternalLink size={12} strokeWidth={icon.stroke} />
    </a>
  );
}

/** İki sütunlu başvuru tablosu: soldaki teknik ad, sağdaki açıklaması. */
export function FieldTable({ rows }: { rows: readonly { field: string; desc: string }[] }) {
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${palette.borderSoft}`, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <div
          key={r.field}
          style={{
            display: 'flex', gap: 14, padding: '9px 14px', fontSize: text.sm,
            background: i % 2 === 0 ? palette.card : palette.bg,
            borderTop: i === 0 ? 'none' : `1px solid ${palette.borderFaint}`,
          }}
        >
          <code
            className="font-mono"
            style={{ width: 160, flexShrink: 0, color: palette.accent, fontWeight: 700 }}
          >
            {r.field}
          </code>
          <span style={{ color: palette.textMuted, lineHeight: 1.5 }}>{r.desc}</span>
        </div>
      ))}
    </div>
  );
}

interface ShellProps {
  /** Üst şeritte görünen başlık, ör. "AdsHub — API Bağlantı Rehberi". */
  title: string;
  /** Üst şeritteki bölüm kısayolları — id'ler DocSection'larla eşleşmeli. */
  sections: readonly HelpSection[];
  onClose: () => void;
  children: ReactNode;
}

export function HelpDocOverlay({ title, sections, onClose, children }: ShellProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = `help-doc-title-${title.replace(/\W+/g, '-').toLowerCase()}`;

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlayRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab' || !overlayRef.current) return;
    const focusable = Array.from(
      overlayRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])'),
    ).filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed', inset: 0, zIndex: 40000, background: palette.bg,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Üst şerit — sabit, kapatma + bölüm gezinmesi */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px',
        borderBottom: `1px solid ${palette.borderFaint}`, background: palette.card,
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span id={titleId} style={{ fontSize: text.lg, fontWeight: 800, color: palette.textStrong, flexShrink: 0 }}>
          {title}
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{
                border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: text.sm,
                fontWeight: 600, cursor: 'pointer', background: palette.chipBg, color: palette.textMuted,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Kapat"
          style={{
            marginLeft: 'auto', width: 44, height: 44, borderRadius: 8, flexShrink: 0,
            border: `1px solid ${palette.borderSoft}`, background: 'transparent',
            color: palette.textMuted, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={icon.lg} strokeWidth={icon.stroke} />
        </button>
      </div>

      {/* İçerik — ortalanmış, okunabilir genişlikte, kaydırılabilir */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 24px 80px' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
