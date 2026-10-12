import { useState } from 'react';
import { localDateStr } from '../../utils/date';

// AdsHub'ın tarih aralığı seçimi: takvim-hizalı hızlı presetler (Bugün/Dün/
// Bu hafta/Bu ay/Geçen ay/Son N gün) + özel aralık. Uygulamanın genel
// DateRangePicker'ı (utils/date.ts) burada BİLEREK kullanılmıyor — o bileşen
// sipariş/ürün ekranlarının daha geniş ihtiyaçlarına göre tasarlandı, AdsHub
// daha küçük ve modüle özel bir sürüm yeterli.

export interface DateRangeState {
  from: string;
  to: string;
  // Hangi preset aktif — hiçbiri seçili değilse (özel aralık girildiyse) null.
  activePreset: PresetKey | null;
  setPreset: (key: PresetKey) => void;
  setCustom: (from: string, to: string) => void;
}

export type PresetKey =
  | 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 7 | 30 | 90;

// `date.toISOString().slice(0, 10)` görünüşte aynı ama DEĞİL — önce UTC'ye
// çeviriyor, bu yüzden Türkiye saatiyle 00:00-02:59 arasında (UTC+3) sessizce
// BİR GÜN ÖNCEKİ tarihi döndürüyor. utils/date.ts'nin localDateStr'ı bu tuzağı
// önlemek için zaten var — burada AYNI hatayı ikinci kez yazmak yerine onu
// kullanıyoruz (bkz. o dosyanın kendi yorumu, aynı sorunu tarif ediyor).
const toIso = localDateStr;

function startOfWeek(date: Date): Date {
  // Pazartesi başlangıç (TR haftası) — getDay() Pazar=0 döndürdüğü için
  // Pazar günü 6 gün geriye gidiyor, diğer günler kendi indeksinden 1 çıkarılıyor.
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function resolvePreset(key: PresetKey): { from: Date; to: Date } {
  const today = new Date();

  if (key === 'today') return { from: today, to: today };

  if (key === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: y, to: y };
  }

  if (key === 'thisWeek') return { from: startOfWeek(today), to: today };

  if (key === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: start, to: today };
  }

  if (key === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: start, to: end };
  }

  // 7 / 30 / 90 — "son N gün", bugün dahil.
  const from = new Date(today);
  from.setDate(from.getDate() - (key - 1));
  return { from, to: today };
}

export const PRESET_OPTIONS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'yesterday', label: 'Dün' },
  { key: 'thisWeek', label: 'Bu hafta' },
  { key: 7, label: 'Son 7 gün' },
  { key: 'thisMonth', label: 'Bu ay' },
  { key: 'lastMonth', label: 'Geçen ay' },
  { key: 30, label: 'Son 30 gün' },
  { key: 90, label: 'Son 90 gün' },
];

const DEFAULT_PRESET: PresetKey = 30;

export function useDateRange(initialPreset: PresetKey = DEFAULT_PRESET): DateRangeState {
  const [preset, setPresetState] = useState<PresetKey | null>(initialPreset);
  const [custom, setCustomState] = useState<{ from: string; to: string } | null>(null);

  const setPreset = (key: PresetKey) => {
    setCustomState(null);
    setPresetState(key);
  };

  const setCustom = (from: string, to: string) => {
    setPresetState(null);
    setCustomState({ from, to });
  };

  if (custom) {
    return { from: custom.from, to: custom.to, activePreset: null, setPreset, setCustom };
  }

  const { from, to } = resolvePreset(preset ?? DEFAULT_PRESET);
  return { from: toIso(from), to: toIso(to), activePreset: preset, setPreset, setCustom };
}
