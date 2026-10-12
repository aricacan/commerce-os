'use client';

import { AlertTriangle, X } from 'lucide-react';
import type { BaseTrackReportUploadPreview } from '@/lib/api';
import { ReportGrid } from './ReportGrid';
import {
  palette, softTint, btnPrimary, btnGhost, icon, sectionTitle,
} from '../shared/design';

const PREVIEW_LIMIT = 100;

// Yükleme onay adımı — dosya ayrıştırıldı ama HENÜZ KAYDEDİLMEDİ. Kullanıcı burada
// görmeden hiçbir satır veritabanına yazılmaz.
interface Props {
  preview: BaseTrackReportUploadPreview;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UploadPreviewDialog({ preview, isSaving, onConfirm, onCancel }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'oklch(21% 0.006 260 / 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: palette.card, borderRadius: 14, width: '100%', maxWidth: 900,
          maxHeight: '86vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: `1px solid ${palette.border}`,
          boxShadow: '0 20px 50px oklch(21% 0.006 260 / 0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: 16,
          borderBottom: `1px solid ${palette.border}`,
        }}>
          <div style={{ flex: 1 }}>
            <div style={sectionTitle}>Yükleme Önizlemesi</div>
            <div style={{ fontSize: 11.5, color: palette.textMuted, marginTop: 2 }}>
              {preview.fileName} · {preview.rowCount} satır · henüz kaydedilmedi
            </div>
          </div>
          <button onClick={onCancel} style={{ ...btnGhost, padding: 8 }} title="Kapat" aria-label="Kapat">
            <X size={icon.md} strokeWidth={icon.stroke} />
          </button>
        </div>

        {preview.warnings.length > 0 && (
          <div style={{
            display: 'flex', gap: 9, padding: '12px 16px',
            background: softTint(palette.warning),
            borderBottom: `1px solid ${palette.border}`, maxHeight: 130, overflowY: 'auto',
          }}>
            <AlertTriangle
              size={icon.md}
              strokeWidth={icon.stroke}
              color={palette.warningText}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: palette.warningText, lineHeight: 1.6 }}>
              {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <ReportGrid
            columns={preview.columns}
            rows={preview.rows}
            previewLimit={PREVIEW_LIMIT}
            emptyText="Dosyada satır bulunamadı."
          />
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 14,
          borderTop: `1px solid ${palette.border}`,
        }}>
          <button style={btnGhost} onClick={onCancel} disabled={isSaving}>Vazgeç</button>
          <button
            style={btnPrimary}
            onClick={onConfirm}
            disabled={isSaving || preview.rowCount === 0}
          >
            {isSaving ? 'Kaydediliyor…' : 'Onayla ve Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
