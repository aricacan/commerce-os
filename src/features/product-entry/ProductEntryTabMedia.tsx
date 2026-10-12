'use client';

import { Plus, Trash2 } from 'lucide-react';
import { fieldClass, labelClass } from './product-entry-ui';

interface Props {
  editable: boolean;
  imageUrls: string[];
  onChange: (next: string[]) => void;
}

export function ProductEntryTabMedia({ editable, imageUrls, onChange }: Props) {
  function updateUrl(index: number, value: string) {
    onChange(imageUrls.map((url, i) => (i === index ? value : url)));
  }

  function removeUrl(index: number) {
    onChange(imageUrls.filter((_, i) => i !== index));
  }

  function addUrl() {
    onChange([...imageUrls, '']);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label className={labelClass}>Görsel URL&apos;leri</label>
      {imageUrls.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-muted)' }}>Henüz görsel eklenmedi.</p>
      )}
      {imageUrls.map((url, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              style={{
                width: 36, height: 36, flexShrink: 0, borderRadius: 4,
                border: '1px solid var(--border-soft)', objectFit: 'cover',
              }}
            />
          )}
          <input
            disabled={!editable}
            value={url}
            onChange={(e) => updateUrl(index, e.target.value)}
            placeholder="https://…"
            className={fieldClass}
          />
          {index === 0 && (
            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--fg-muted)', padding: '0 4px' }}>
              Kapak
            </span>
          )}
          {editable && (
            <button
              type="button"
              onClick={() => removeUrl(index)}
              aria-label="Görseli kaldır"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, flexShrink: 0, borderRadius: 4,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--fg-muted)', cursor: 'pointer',
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}
      {editable && (
        <div>
          <button
            type="button"
            onClick={addUrl}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 32, padding: '0 12px', borderRadius: 4,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--fg)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Görsel Ekle
          </button>
        </div>
      )}
    </div>
  );
}
