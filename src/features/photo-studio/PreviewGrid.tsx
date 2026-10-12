'use client';

// Batch öncesi örnek sonuçlar — kullanıcı tüm klasörü işletmeden önce
// kırpma/çerçeve/arka plan sonucunu burada onaylar.

import { AlertTriangle } from 'lucide-react';
import { palette, sectionTitle, icon, softTint } from '../shared/design';
import { base64ImageUrl, type StudioPreviewResult } from '../../lib/api';

interface PreviewGridProps {
  result: StudioPreviewResult;
}

export function PreviewGrid({ result }: PreviewGridProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <h3 style={sectionTitle}>Örnek Sonuçlar</h3>
        <span style={{ fontSize: 12, color: palette.textMuted }}>
          {result.items.length} örnek · toplam {result.totalImages} görsel işlenecek
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {result.items.map((item) => (
          <figure key={item.path} style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- sunucudan dönen geçici base64 önizleme, next/image optimizasyonuna konu değil */}
            <img
              src={base64ImageUrl(item.imageBase64)}
              alt={item.path}
              style={{ width: '100%', borderRadius: 10, border: `1px solid ${palette.border}`, display: 'block' }}
            />
            <figcaption style={{ fontSize: 11, color: palette.textFaint, marginTop: 4, wordBreak: 'break-all' }}>
              {item.path}
            </figcaption>
            {item.warnings.map((w) => (
              <p key={w} style={{ fontSize: 11, color: palette.warningText, margin: '2px 0 0' }}>⚠ {w}</p>
            ))}
          </figure>
        ))}
      </div>

      {result.errors.length > 0 && (
        <div style={{ background: softTint(palette.warning, 14), borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: palette.warningText, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={icon.sm} strokeWidth={icon.stroke} />
            {result.errors.length} görsel işlenemedi (batch bunları atlayıp rapora yazar)
          </p>
          {result.errors.map((e) => (
            <p key={e.path} style={{ fontSize: 11.5, color: palette.warningText, margin: '4px 0 0' }}>
              {e.path}: {e.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
