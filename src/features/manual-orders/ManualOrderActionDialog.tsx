'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../lib/i18n';
import { fieldClass, labelClass } from './manual-order-ui';

export type ManualOrderAction = 'approve' | 'reject' | 'dispatch' | 'cancel' | 'reopen';

interface Props {
  action: ManualOrderAction | null;
  orderNumber: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  entityLabel?: string;
  entityAccusative?: string;
}

export function ManualOrderActionDialog({ action, orderNumber, busy, onClose, onConfirm, entityLabel = 'sipariş', entityAccusative = 'siparişi' }: Props) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const [reason, setReason] = useState('');

  useEffect(() => setReason(''), [action]);

  useEffect(() => {
    if (!action) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [action, busy, onClose]);

  if (!action || typeof document === 'undefined') return null;

  const label = isTr ? entityLabel : 'order';
  const acc = isTr ? entityAccusative : 'order';

  const contentMap: Record<ManualOrderAction, { title: string; description: string; confirm: string; reasonLabel?: string; danger?: boolean }> = {
    approve: {
      title: isTr ? `${acc[0].toUpperCase() + acc.slice(1)} onayla` : 'Approve order',
      description: isTr ? `DEMO ERP hedefi seçiliyse gerçek ${label} kaydı oluşur ve finansal hesaplara dahil edilir.` : 'If DEMO ERP target is selected, real record is created and included in financial accounts.',
      confirm: isTr ? 'Onayla' : 'Approve',
    },
    reject: {
      title: isTr ? `${acc[0].toUpperCase() + acc.slice(1)} reddet` : 'Reject order',
      description: isTr ? `${label[0].toUpperCase() + label.slice(1)} reddedilenlere taşınır. Düzeltilip yeniden onaya gönderilebilir.` : 'Record will be moved to rejected. It can be edited and resubmitted for approval.',
      confirm: isTr ? 'Reddet' : 'Reject',
      reasonLabel: isTr ? 'Red sebebi' : 'Rejection reason',
      danger: true,
    },
    dispatch: {
      title: isTr ? 'ERP kuyruğuna al' : 'Queue to ERP',
      description: isTr ? `Bu ikinci gönderim onayıdır. ${label[0].toUpperCase() + label.slice(1)} seçili dış ERP hedefleri için kuyruğa alınır.` : 'This is dispatch approval. Record will be queued for selected external ERP targets.',
      confirm: isTr ? 'Kuyruğa al' : 'Queue',
    },
    cancel: {
      title: isTr ? `${acc[0].toUpperCase() + acc.slice(1)} sil` : 'Delete order',
      description: isTr ? `Bağlı yerel ${label} silinir ve kâr/ciro hesaplarından çıkarılır. İşlem denetim kaydında korunur.` : 'Connected local record will be deleted and removed from profit/revenue calculations.',
      confirm: isTr ? `${acc[0].toUpperCase() + acc.slice(1)} sil` : 'Delete',
      reasonLabel: isTr ? 'Silme nedeni' : 'Deletion reason',
      danger: true,
    },
    reopen: {
      title: isTr ? 'Düzenlemeye aç' : 'Reopen for edit',
      description: isTr ? `Mevcut yerel ${label} finansal kayıtlardan çıkarılır ve taslağa döner. Değişikliklerden sonra yeniden onay gerekir.` : 'Record will be reverted to draft status. After changes, re-approval will be required.',
      confirm: isTr ? 'Taslağa döndür' : 'Revert to draft',
    },
  };

  const config = contentMap[action];
  const reasonRequired = Boolean(config.reasonLabel);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: 16,
      }}
      onMouseDown={() => { if (!busy) onClose(); }}
    >
      <div
        role="dialog" aria-modal="true"
        style={{
          background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 6,
          width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-soft)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>{config.title}</h2>
            <p className="font-mono" style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--fg-muted)' }}>{orderNumber}</p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, padding: '8px 12px', borderRadius: 4, background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)', fontSize: 11.5, lineHeight: 1.5, color: 'var(--fg-muted)' }}>
            {config.description}
          </p>
          {reasonRequired && (
            <div>
              <label className={labelClass}>{config.reasonLabel} *</label>
              <textarea
                autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder={isTr ? 'Açıklama girin…' : 'Enter explanation…'} className={fieldClass}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--border-soft)' }}>
          <button
            type="button" disabled={busy} onClick={onClose}
            style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={busy || (reasonRequired && !reason.trim())}
            onClick={() => onConfirm(reason.trim())}
            style={{
              padding: '6px 16px', borderRadius: 4, border: 'none',
              background: config.danger ? '#f43f5e' : 'var(--fg)',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: busy || (reasonRequired && !reason.trim()) ? 'not-allowed' : 'pointer',
              opacity: busy || (reasonRequired && !reason.trim()) ? 0.5 : 1,
            }}
          >
            {busy ? (isTr ? 'İşleniyor…' : 'Processing…') : config.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
