'use client';

import { useState } from 'react';
import { MoonStar } from 'lucide-react';
import type { SyntheticQuietHoursDto, SyntheticSettingsDto } from '../../../lib/api';
import { useUpdateSyntheticSettings } from '../../../hooks/monitoring/useSyntheticChecks';
import { formatHour, HOURS_OF_DAY, quietHoursError } from '../synthetic';
import { Panel } from '../ui';
import { SyntheticToggle } from './SyntheticToggle';

// Mesai saati ayarı: bu aralıkta hiçbir katman zamanlanmış olarak çalışmaz (GitHub'daki tarayıcı
// turu da başlamadan sunucuya sorar). Elle "Şimdi çalıştır" serbest — ekran uyarır.
export function SyntheticQuietHours({ settings }: { settings: SyntheticSettingsDto }) {
  const update = useUpdateSyntheticSettings();
  const quiet = settings.quietHours;
  // Taslak: iki saat seçimi birlikte kaydedilir; geçersiz ara durum (başlangıç = bitiş) sunucuya gitmez.
  const [draft, setDraft] = useState<SyntheticQuietHoursDto | null>(null);
  if (!quiet) return null;

  const current = draft ?? quiet;
  const error = quietHoursError(current);
  const dirty = draft !== null && (draft.startHour !== quiet.startHour || draft.endHour !== quiet.endHour);

  const save = (next: SyntheticQuietHoursDto) => {
    update.mutate({ ...settings, quietHours: next });
    setDraft(null);
  };

  return (
    <Panel title="Mesai saati">
      <div className="flex min-w-0 flex-col gap-3 p-4">
        <p className="flex items-start gap-2 text-xs text-[var(--fg-muted)]">
          <MoonStar size={14} className="mt-px shrink-0" />
          <span className="min-w-0 break-words">
            Bu aralıkta (Türkiye saati) sayfa, iş akışı, modül ve tarayıcı kontrollerinin hiçbiri zamanlanmış
            olarak çalışmaz. Elle çalıştırma yine mümkündür.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SyntheticToggle
            label="Mesai saatinde çalışmasın"
            checked={quiet.enabled}
            onChange={(enabled) => save({ ...quiet, enabled })}
          />
          <HourSelect
            label="Başlangıç"
            value={current.startHour}
            disabled={!quiet.enabled}
            onChange={(startHour) => setDraft({ ...current, startHour })}
          />
          <span className="text-xs text-[var(--fg-muted)]">–</span>
          <HourSelect
            label="Bitiş"
            value={current.endHour}
            disabled={!quiet.enabled}
            onChange={(endHour) => setDraft({ ...current, endHour })}
          />
          {dirty ? (
            <button
              type="button"
              disabled={error !== null || update.isPending}
              onClick={() => save(current)}
              className="rounded-[4px] border border-[var(--border)] bg-[var(--fg)] px-2.5 py-1 text-ui-2xs font-semibold text-[var(--bg)] disabled:opacity-50"
            >
              Kaydet
            </button>
          ) : null}
        </div>
        {error ? <p className="text-ui-2xs text-[var(--danger)]">{error}</p> : null}
      </div>
    </Panel>
  );
}

function HourSelect({ label, value, disabled, onChange }: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (hour: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-ui-2xs font-semibold text-[var(--fg-muted)]">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-7 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-1.5 text-xs text-[var(--fg)] disabled:opacity-50"
      >
        {HOURS_OF_DAY.map((hour) => (
          <option key={hour} value={hour}>{formatHour(hour)}</option>
        ))}
      </select>
    </label>
  );
}
