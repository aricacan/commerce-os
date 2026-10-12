import type { CSSProperties } from 'react';
import type { ErpImportAction } from '@/lib/api';

export const ACCENT = '#4f46e5';

export const ACTION_META: Record<ErpImportAction, { label: string; color: string; bg: string }> = {
  create: { label: 'Yeni', color: '#059669', bg: '#ecfdf5' },
  update: { label: 'Güncellenecek', color: '#d97706', bg: '#fffbeb' },
  skip: { label: 'Atlanacak', color: '#dc2626', bg: '#fef2f2' },
};

export const cardStyle: CSSProperties = {
  background: 'var(--card, #ffffff)', border: '1px solid var(--border, #e5e7eb)',
  borderRadius: 12,
};

export const btnPrimary: CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: ACCENT, color: '#ffffff', fontSize: 13, fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: 6,
};

export const btnGhost: CSSProperties = {
  padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: 'transparent', border: '1px solid var(--border, #e5e7eb)',
  color: 'var(--fg, #111827)', display: 'flex', alignItems: 'center', gap: 6,
};

export const selectStyle: CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #e5e7eb)',
  fontSize: 13, background: 'var(--card, #ffffff)', color: 'var(--fg, #111827)',
  outline: 'none', minWidth: 220,
};

export const thStyle: CSSProperties = {
  textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600,
  color: 'var(--fg-muted, #6b7280)', borderBottom: '1px solid var(--border, #e5e7eb)',
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: '10px 12px', fontSize: 13, color: 'var(--fg, #111827)',
  borderBottom: '1px solid var(--border, #f3f4f6)', verticalAlign: 'top',
};
