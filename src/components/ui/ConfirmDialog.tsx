'use client';

import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../lib/i18n';
import { layers, text } from '../../features/shared/design';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();

  if (!open || typeof document === 'undefined') return null;

  const accentColor = destructive ? '#e52521' : 'var(--accent)';

  // Portal: bazı çağıranlar bu diyaloğu <tbody><tr> içinden açar (ör. BaseTrack tabloları).
  // Inline render edilirse fixed-overlay <div> geçersiz şekilde <tbody> altına düşer
  // (hydration hatası). body'ye taşımak her çağıran için güvenli ve doğru davranış.
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: layers.modal,
        background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
          width: '100%', maxWidth: 380, padding: 24, boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column', gap: 16,
          animation: 'confirmDialogFadeIn 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={18} color={accentColor} />
          </div>
          <div>
            <h2 style={{ fontSize: text.lg, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{title}</h2>
            <p style={{ fontSize: text.md, color: 'var(--fg-muted)', marginTop: 4, lineHeight: 1.5 }}>{description}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
              background: 'var(--bg-subtle)', color: 'var(--fg)', fontSize: text.md, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {cancelLabel ?? t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: accentColor, color: '#fff', fontSize: text.md, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confirmDialogFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
