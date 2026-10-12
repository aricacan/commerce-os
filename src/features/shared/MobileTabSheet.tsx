'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { text } from './design';

export interface MobileTab {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

interface Props {
  title: string;
  accent: string;
  tabs: readonly MobileTab[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  footer?: React.ReactNode;
}

// Mobilde workspace'lerin (Radar/Intelligent) sol rail'i yer kaplayacağı için sekme
// seçimi bunun yerine alttan açılan bir sheet ile yapılır — GroupSheet.tsx'in (ana app
// navigasyonu için kullanılan) aynı bottom-sheet deseninin workspace-içi sekmeler için
// sadeleştirilmiş hali.
export function MobileTabSheet({ title, accent, tabs, activeKey, onSelect, onClose, footer }: Props) {
  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 20600, animation: 'mobileTabSheetFadeIn .15s ease' }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--card, #ffffff)', borderRadius: '20px 20px 0 0',
        border: '1px solid var(--border, #e2e8f0)', borderBottom: 'none',
        zIndex: 20601, padding: '0 0 max(8px, env(safe-area-inset-bottom))',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        animation: 'mobileTabSheetSlideUp .2s ease',
      }}>
        <style>{`
          @keyframes mobileTabSheetFadeIn { from { opacity:0 } to { opacity:1 } }
          @keyframes mobileTabSheetSlideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border, #e2e8f0)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px', flexShrink: 0 }}>
          <span style={{ fontSize: text.md, fontWeight: 700, color: 'var(--fg, #0f172a)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted, #64748b)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minHeight: 0, overflowY: 'auto' }} className="radar-scroll">
          {tabs.map(({ key, label, Icon }) => {
            const isActive = key === activeKey;
            return (
              <button
                key={key}
                onClick={() => { onSelect(key); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 10, border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: isActive ? `${accent}14` : 'transparent',
                }}
              >
                <Icon size={16} color={isActive ? accent : '#64748b'} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: text.md, fontWeight: isActive ? 700 : 500, color: isActive ? accent : 'var(--fg, #334155)' }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {footer && (
          <div style={{
            padding: '10px 14px 6px',
            borderTop: '1px solid var(--border-soft, #e2e8f0)',
            marginTop: 'auto',
            position: 'relative',
            zIndex: 50,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
