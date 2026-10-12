'use client';

import type { BaseTrackReportColumn, BaseTrackReportRow, BaseTrackReportRowSource } from '@/lib/api';
import { thStyle, tdStyle } from './shared';
import { palette, softTint, mutedText } from '../shared/design';

// Rapor tablosu — hesaplanan, yüklenen ve birleşik görünümlerin ortak gövdesi.
// Sütunlar şablondan geldiği için hiçbir rapora özel kod içermez.
interface Props {
  columns: BaseTrackReportColumn[];
  rows: BaseTrackReportRow[];
  // Birleşik görünümde satır kaynağını rozet olarak gösterir.
  showSource?: boolean;
  previewLimit: number;
  emptyText: string;
}

// Kaynak rozetleri dört ayrı anlam taşıyor, bu yüzden her biri ayrı token: sistemin
// ürettiği veri accent, dışarıdan gelen Excel nötr (kendi başına iyi/kötü değil),
// eşleşme success, çakışma danger. Zeminler softTint ile aynı token'dan türetilir —
// hex'e alfa eklemek oklch'de sessizce şeffaflığa düşerdi.
const SOURCE_META: Record<BaseTrackReportRowSource, { label: string; color: string }> = {
  calculated: { label: 'Hesaplanan', color: palette.accent },
  uploaded: { label: 'Yüklenen', color: palette.neutral },
  match: { label: 'Aynı', color: palette.success },
  conflict: { label: 'Çakışma', color: palette.danger },
};

export function ReportGrid({ columns, rows, showSource = false, previewLimit, emptyText }: Props) {
  const visible = rows.slice(0, previewLimit);

  return (
    <div style={{ overflowX: 'auto', maxHeight: '62vh', overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, background: palette.card, zIndex: 1 }}>
          <tr>
            {showSource && <th style={thStyle}>Kaynak</th>}
            {columns.map((c) => (
              <th key={c.key} style={{ ...thStyle, textAlign: alignFor(c) }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => {
            const source = row.__source as BaseTrackReportRowSource | undefined;
            const conflicts = (row.__conflictColumns as unknown as string[] | undefined) ?? [];
            return (
              <tr key={i}>
                {showSource && (
                  <td style={tdStyle}>
                    {source && <SourceBadge source={source} />}
                  </td>
                )}
                {columns.map((c) => {
                  const isConflict = conflicts.includes(c.key);
                  return (
                    <td
                      key={c.key}
                      style={{
                        ...tdStyle,
                        textAlign: alignFor(c),
                        ...(isConflict
                          ? { background: softTint(palette.danger), color: palette.danger, fontWeight: 600 }
                          : null),
                      }}
                      title={isConflict ? 'Hesaplanan değerden farklı' : undefined}
                    >
                      {formatCell(row, c)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div style={{ ...mutedText, padding: 40, textAlign: 'center' }}>
          {emptyText}
        </div>
      )}

      {rows.length > previewLimit && (
        <div style={{
          padding: '10px 14px', fontSize: 11.5, textAlign: 'center',
          color: palette.textFaint, borderTop: `1px solid ${palette.border}`,
        }}>
          İlk {previewLimit} satır gösteriliyor ({rows.length} satırdan). Tamamı için Excel&apos;e aktarın.
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: BaseTrackReportRowSource }) {
  const meta = SOURCE_META[source];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      color: meta.color, background: softTint(meta.color),
    }}>
      {meta.label}
    </span>
  );
}

function alignFor(column: BaseTrackReportColumn): 'left' | 'right' {
  return column.type === 'number' ? 'right' : 'left';
}

function formatCell(row: BaseTrackReportRow, column: BaseTrackReportColumn): string {
  const value = row[column.key];
  if (value === null || value === undefined || value === '') return '—';
  return column.type === 'number' ? Number(value).toLocaleString('tr-TR') : String(value);
}
