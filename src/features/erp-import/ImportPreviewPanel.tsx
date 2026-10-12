import { useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import type { ErpImportOrderPreview } from '@/lib/api';
import { ACTION_META, cardStyle, btnPrimary, btnGhost, thStyle, tdStyle } from './shared';

const PREVIEW_LIMIT = 300;

// Onay adımı — dosya ayrıştırıldı ama HENÜZ HİÇBİR ŞEY KAYDEDİLMEDİ. Kullanıcı her
// siparişin ne olacağını (yeni / güncellenecek / atlanacak) burada görmeden yazma olmaz.
interface Props {
  preview: ErpImportOrderPreview;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreviewPanel({ preview, isSaving, onConfirm, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'create' | 'errors'>('all');

  const filteredOrders = preview.orders.filter((o) => {
    if (activeTab === 'create') return o.action === 'create';
    if (activeTab === 'errors') return o.action === 'skip' || o.errors.length > 0 || o.unknownSkus.length > 0;
    return true;
  });

  const visible = filteredOrders.slice(0, PREVIEW_LIMIT);

  const newCount = preview.orders.filter(o => o.action === 'create').length;
  const errorCount = preview.orders.filter(o => o.action === 'skip' || o.errors.length > 0 || o.unknownSkus.length > 0).length;

  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: 14, borderBottom: '1px solid var(--border, #e5e7eb)',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
            Önizleme — {preview.fileName}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2 }}>
            {preview.orders.length} sipariş · {preview.rows.length} satır · henüz kaydedilmedi
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Stat label="Yeni" value={preview.createCount} color="#059669" />
          <Stat label="Güncellenecek" value={preview.updateCount} color="#d97706" />
          <Stat label="Atlanacak" value={preview.skipCount} color="#dc2626" />
        </div>

        <button style={btnGhost} onClick={onCancel} disabled={isSaving}>
          <X size={13} />
          Vazgeç
        </button>
        <button
          style={btnPrimary}
          onClick={onConfirm}
          disabled={isSaving || preview.createCount + preview.updateCount === 0}
        >
          <Check size={13} />
          {isSaving ? 'Kaydediliyor…' : 'Onayla ve Kaydet'}
        </button>
      </div>

      <div style={{
        display: 'flex', gap: 8, padding: '10px 14px',
        background: 'var(--bg-subtle, #f9fafb)', borderBottom: '1px solid var(--border, #e5e7eb)'
      }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600,
            background: activeTab === 'all' ? 'var(--accent, #6366f1)' : 'transparent',
            color: activeTab === 'all' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Tümü ({preview.orders.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600,
            background: activeTab === 'create' ? '#059669' : 'transparent',
            color: activeTab === 'create' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Yeni Eklenecekler ({newCount})
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          style={{
            padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600,
            background: activeTab === 'errors' ? '#dc2626' : 'transparent',
            color: activeTab === 'errors' ? '#fff' : 'var(--fg-muted)', cursor: 'pointer',
            transition: 'all 0.15s'
          }}
        >
          Hata Verenler / Atlanacaklar ({errorCount})
        </button>
      </div>

      {(preview.warnings.length > 0 || preview.unmatchedHeaders.length > 0) && (
        <div style={{
          display: 'flex', gap: 9, padding: '12px 16px', background: '#fffbeb',
          borderBottom: '1px solid #fde68a', maxHeight: 160, overflowY: 'auto',
        }}>
          <AlertTriangle size={14} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
            {preview.unmatchedHeaders.length > 0 && (
              <li>
                Tanınmayan sütun: {preview.unmatchedHeaders.join(', ')} — yok sayıldı.
              </li>
            )}
          </ul>
        </div>
      )}

      <div style={{ overflowX: 'auto', maxHeight: '52vh', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--card, #ffffff)', zIndex: 1 }}>
            <tr>
              <th style={thStyle}>Durum</th>
              <th style={thStyle}>Sipariş No</th>
              <th style={thStyle}>Tarih</th>
              <th style={thStyle}>Mağaza</th>
              <th style={thStyle}>Platform</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Kalem</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Tutar</th>
              <th style={thStyle}>Notlar</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => {
              const meta = ACTION_META[order.action];
              return (
                <tr key={order.orderNumber}>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                      color: meta.color, background: meta.bg,
                    }}>
                      {meta.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{order.orderNumber}</td>
                  <td style={tdStyle}>{order.orderDate ?? '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{order.resolvedStoreName || '—'}</td>
                  <td style={tdStyle}>
                    {order.platformName ?? '—'}
                    {order.platformName && !order.platformResolved && (
                      <span style={{ color: 'var(--warning)', fontSize: 11, marginLeft: 6 }}>tanınmadı</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {order.validLineCount}
                    {order.validLineCount !== order.lineCount && (
                      <span style={{ color: '#dc2626' }}> / {order.lineCount}</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {order.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11.5, color: 'var(--fg-muted)' }}>
                    {order.errors.length > 0 && <div style={{ color: '#dc2626' }}>{order.errors.join(' · ')}</div>}
                    {order.unknownSkus.length > 0 && (
                      <div>Bulunamayan SKU: {order.unknownSkus.join(', ')}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredOrders.length > PREVIEW_LIMIT && (
          <div style={{
            padding: '10px 14px', fontSize: 11.5, textAlign: 'center',
            color: 'var(--fg-muted)', borderTop: '1px solid var(--border, #e5e7eb)',
          }}>
            İlk {PREVIEW_LIMIT} sipariş gösteriliyor ({filteredOrders.length} siparişten). Kaydetme tamamını kapsar.
          </div>
        )}

        {filteredOrders.length === 0 && (
          <div style={{ padding: '40px 14px', fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center' }}>
            Bu filtreye uygun sipariş bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 72 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}
