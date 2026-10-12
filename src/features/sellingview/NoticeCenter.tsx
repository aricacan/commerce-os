'use client';

import { useEffect, useRef, useState } from 'react';
import { TriangleAlert, Check } from 'lucide-react';

export interface TerminalNotice {
  /** Aynı uyarı iki kez listelenmesin diye sabit anahtar. */
  key: string;
  tone: 'warn' | 'bad';
  text: string;
}

/**
 * Uyarı merkezi — araç çubuğunun sağ ucundaki zil.
 *
 * NEDEN ŞERİT DEĞİL: uyarılar grafiğin ÜSTÜNDE tam genişlik şeritler hâlinde
 * duruyordu. Tek bir "30 gün gerekiyor" cümlesi ekranın en değerli 40 pikselini
 * kalıcı olarak yiyor, grafiği aşağı itiyordu — üstelik kullanıcı onu ilk
 * okuyuştan sonra bir daha okumuyor. Zil, aynı bilgiyi bir tık uzağa taşır ve
 * sayı rozetiyle "okunmamış bir şey var" der.
 */
export function NoticeCenter({ notices }: { notices: TerminalNotice[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasBad = notices.some((n) => n.tone === 'bad');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={notices.length === 0 ? 'Uyarı yok' : `${notices.length} uyarı`}
        aria-label={notices.length === 0 ? 'Uyarı yok' : `${notices.length} uyarı`}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-[5px] border px-2 py-1.5 text-ui-xs font-semibold transition-colors cursor-pointer ${
          notices.length === 0
            ? 'border-border-soft text-fg-subtle hover:bg-bg-subtle'
            : 'border-border-soft text-fg hover:bg-bg-subtle'
        }`}
      >
        <TriangleAlert size={12} className={notices.length === 0 ? '' : hasBad ? 'text-danger' : 'text-warning'} />
        {notices.length > 0 && <span className="tabular-nums">{notices.length}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[6px] border border-border-soft bg-card shadow-xl">
          <div className="border-b border-border-soft px-3 py-2 text-ui-2xs font-bold uppercase tracking-wider text-fg-subtle">
            Uyarılar
          </div>

          {notices.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-4 text-ui-xs text-fg-muted">
              <Check size={13} className="text-success shrink-0" />
              Şu anda bir uyarı yok.
            </div>
          ) : (
            <ul className="m-0 max-h-[320px] list-none overflow-y-auto p-0">
              {notices.map((n) => (
                <li
                  key={n.key}
                  className="flex items-start gap-2 border-b border-border-soft px-3 py-2.5 text-ui-xs leading-relaxed text-fg-muted last:border-0"
                >
                  {/* Renk tek bir noktada: metin nötr kalır, ton yalnızca
                      noktanın rengiyle söylenir. */}
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.tone === 'bad' ? 'bg-danger' : 'bg-warning'}`}
                  />
                  <span>{n.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
