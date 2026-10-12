'use client';

// Referans şeridi: maskenin ÜZERİNE çizileceği fotoğrafı seçtirir. ZIP'ten gelen
// örnekler (her SKU klasöründen birer tane) ve kullanıcının elle yüklediği tek
// fotoğraf aynı şeritte yan yana durur — çerçeve tedarikçiden tedarikçiye
// değişebildiği için doğru fotoğrafı seçebilmek gerekiyor.

import { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { palette, icon } from '../shared/design';
import { base64ImageUrl, type StudioPreviewImage } from '../../lib/api';

export interface ReferenceChoice {
  /** Kaynak etiketi — ZIP yolu ya da dosya adı. */
  label: string;
  url: string;
  width: number;
  height: number;
}

interface ReferenceStripProps {
  previews: StudioPreviewImage[];
  /** Kullanıcının yüklediği tek fotoğraf (varsa şeridin başında görünür). */
  uploaded: ReferenceChoice | null;
  activeLabel: string | null;
  onSelect: (choice: ReferenceChoice) => void;
  onUpload: (file: File) => void;
}

const THUMB = 54;

export function ReferenceStrip({ previews, uploaded, activeLabel, onSelect, onUpload }: ReferenceStripProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const items: ReferenceChoice[] = [
    ...(uploaded ? [uploaded] : []),
    ...previews.map((p) => ({
      label: p.path,
      url: base64ImageUrl(p.base64),
      width: p.width,
      height: p.height,
    })),
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Kendi örnek fotoğrafını yükle"
        aria-label="Kendi örnek fotoğrafını yükle"
        style={{
          width: THUMB, height: THUMB, flexShrink: 0, borderRadius: 9, cursor: 'pointer',
          border: `1px dashed ${palette.borderSoft}`, background: palette.inputBg,
          color: palette.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ImagePlus size={icon.lg} strokeWidth={icon.stroke} />
      </button>
      <input
        ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = '';
        }}
      />

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, minWidth: 0 }}>
        {items.map((item) => {
          const active = item.label === activeLabel;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item)}
              title={`${item.label} (${item.width}×${item.height})`}
              style={{
                width: THUMB, height: THUMB, flexShrink: 0, borderRadius: 9, padding: 0,
                cursor: 'pointer', overflow: 'hidden', background: palette.card,
                border: active ? `2px solid ${palette.accent}` : `1px solid ${palette.border}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- geçici data/object URL önizlemesi */}
              <img
                src={item.url} alt={item.label}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
