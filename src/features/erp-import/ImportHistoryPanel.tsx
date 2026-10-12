'use client';

import { Undo2 } from 'lucide-react';
import type { ErpImportBatch } from '@/lib/api';
import { cardStyle, btnGhost, thStyle, tdStyle } from './shared';

// Yükleme geçmişi. Geri alma canlı veriye dokunduğu için tek tıkla değil, onay isteyerek
// çalışır ve bir kez geri alınan yükleme tekrar geri alınamaz (anlık görüntü tüketilir).
interface Props {
  batches: ErpImportBatch[];
  isLoading: boolean;
  undoingId: number | null;
  onUndo: (batch: ErpImportBatch) => void;
}

export function ImportHistoryPanel({ batches, isLoading, undoingId, onUndo }: Props) {
  return (
    <div style={{ ...cardStyle, overflow: 'hidden' }}>
      <div style={{ padding: 14, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--fg)' }}>
          Yükleme Geçmişi
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', marginTop: 2 }}>
          Geri alma, eklenen siparişleri siler ve güncellenenleri eski hâline döndürür.
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Dosya</th>
              <th style={thStyle}>Hedef</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Yeni</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Güncellenen</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Atlanan</th>
              <th style={thStyle}>Tarih</th>
              <th style={thStyle}>Durum</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{batch.fileName}</td>
                <td style={tdStyle}>{batch.sourceName ?? batch.storeName}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--success)' }}>{batch.createdCount}</td>
                <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--warning)' }}>{batch.updatedCount}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{batch.skippedCount}</td>
                <td style={tdStyle}>
                  {new Date(batch.uploadedAt).toLocaleString('tr-TR')}
                  {batch.uploadedBy && (
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{batch.uploadedBy}</div>
                  )}
                </td>
                <td style={tdStyle}>
                  {batch.undoneAt ? (
                    <span style={{ fontSize: 11.5, color: 'var(--fg-muted)' }}>
                      {new Date(batch.undoneAt).toLocaleString('tr-TR')} geri alındı
                    </span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 600 }}>Aktif</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {!batch.undoneAt && (
                    <button
                      style={{ ...btnGhost, color: '#dc2626', padding: '6px 10px' }}
                      onClick={() => onUndo(batch)}
                      disabled={undoingId === batch.id}
                    >
                      <Undo2 size={13} />
                      {undoingId === batch.id ? 'Geri alınıyor…' : 'Geri Al'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {batches.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
            {isLoading ? 'Yükleniyor…' : 'Henüz yükleme yapılmadı.'}
          </div>
        )}
      </div>
    </div>
  );
}
