'use client';

// Çıktı ve arka plan ayarları — bilinçli olarak az seçenek: pazaryeri standardı
// varsayılanlarla tek tıkta çalışsın, gerekirse ince ayar yapılsın.

import { palette, input as inputStyle, select as selectStyle, label as labelStyle, toggleTrack, toggleKnob } from '../shared/design';
import type { StudioBgMode } from '../../lib/api';

export interface StudioSettings {
  outputWidth: number;
  outputHeight: number;
  outputFormat: 'png' | 'jpeg';
  featherPx: number;
  bgMode: StudioBgMode;
  whiteThreshold: number;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  outputWidth: 1600,
  outputHeight: 1600,
  outputFormat: 'jpeg',
  featherPx: 1.5,
  bgMode: 'none',
  whiteThreshold: 240,
};

interface StudioControlsProps {
  settings: StudioSettings;
  onChange: (settings: StudioSettings) => void;
}

const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };

export function StudioControls({ settings, onChange }: StudioControlsProps) {
  const set = (patch: Partial<StudioSettings>) => onChange({ ...settings, ...patch });
  const bgEnabled = settings.bgMode !== 'none';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={row}>
        <div>
          <div style={labelStyle}>Genişlik (px)</div>
          <input
            type="number" min={64} max={6000} value={settings.outputWidth} style={inputStyle}
            onChange={(e) => set({ outputWidth: Number(e.target.value) || 1600 })}
          />
        </div>
        <div>
          <div style={labelStyle}>Yükseklik (px)</div>
          <input
            type="number" min={64} max={6000} value={settings.outputHeight} style={inputStyle}
            onChange={(e) => set({ outputHeight: Number(e.target.value) || 1600 })}
          />
        </div>
      </div>

      <div style={row}>
        <div>
          <div style={labelStyle}>Çıktı formatı</div>
          <select
            value={settings.outputFormat} style={selectStyle}
            onChange={(e) => set({ outputFormat: e.target.value as 'png' | 'jpeg' })}
          >
            <option value="jpeg">JPEG (pazaryeri standardı)</option>
            <option value="png">PNG (şeffaflık korunur)</option>
          </select>
        </div>
        <div>
          <div style={labelStyle}>Kenar yumuşatma (px)</div>
          <input
            type="number" min={0} max={20} step={0.5} value={settings.featherPx} style={inputStyle}
            onChange={(e) => set({ featherPx: Number(e.target.value) })}
          />
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${palette.divider}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          onClick={() => set({ bgMode: bgEnabled ? 'none' : 'ai' })}
        >
          <span style={toggleTrack(bgEnabled)}><span style={toggleKnob(bgEnabled)} /></span>
          <span>
            <span style={{ fontSize: 13, fontWeight: 600, color: palette.textStrong, display: 'block' }}>Arka plan kaldırma</span>
            <span style={{ fontSize: 11.5, color: palette.textMuted }}>
              Ürünün arkası beyaz değilse (gri vb.) aç — maske içindeki fon temizlenir.
            </span>
          </span>
        </button>

        {bgEnabled && (
          <div style={row}>
            <div>
              <div style={labelStyle}>Yöntem</div>
              <select
                value={settings.bgMode} style={selectStyle}
                onChange={(e) => set({ bgMode: e.target.value as StudioBgMode })}
              >
                <option value="ai">Yapay zekâ (her fon)</option>
                <option value="white">Beyaz eşik (hızlı)</option>
              </select>
            </div>
            {settings.bgMode === 'white' && (
              <div>
                <div style={labelStyle}>Beyaz eşiği ({settings.whiteThreshold})</div>
                <input
                  type="range" min={150} max={255} value={settings.whiteThreshold}
                  style={{ width: '100%', marginTop: 10 }}
                  onChange={(e) => set({ whiteThreshold: Number(e.target.value) })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
