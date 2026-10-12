'use client';

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useWmsAlert, type WmsToast } from '../../stores/wms-alert';

const TOAST_STYLE: Record<WmsToast['type'], { bg: string; fg: string; Icon: typeof AlertTriangle }> = {
  error:   { bg: '#fef2f2', fg: '#dc2626', Icon: AlertTriangle },
  success: { bg: '#f0fdf4', fg: '#16a34a', Icon: CheckCircle2 },
  info:    { bg: '#eff6ff', fg: '#2563eb', Icon: Info },
};

export function WmsAlertHost() {
  const { toasts, dismiss, confirmRequest, resolveConfirm } = useWmsAlert();

  return (
    <>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
        {toasts.map((t) => {
          const tone = TOAST_STYLE[t.type];
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
                borderRadius: 10, background: tone.bg, border: `1px solid ${tone.fg}33`,
                boxShadow: 'var(--shadow-lg)', animation: 'wms-toast-in 0.15s ease-out',
              }}
            >
              <tone.Icon size={16} style={{ color: tone.fg, flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: tone.fg, flex: 1, lineHeight: 1.4 }}>{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: tone.fg, opacity: 0.6, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {confirmRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, width: 320, boxShadow: 'var(--shadow-lg)' }}>
            <p style={{ fontSize: 13.5, color: 'var(--fg)', marginBottom: 18, lineHeight: 1.5 }}>{confirmRequest.message}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => resolveConfirm(false)}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--fg-muted)', fontSize: 12.5, cursor: 'pointer' }}
              >
                İptal
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes wms-toast-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
