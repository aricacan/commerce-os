'use client';

import type { FeatureFlagInfoDto, FeatureFlagOverrideDto } from '../../lib/api/omnichannel-flags';
import { FeatureFlagCell } from './FeatureFlagCell';
import {
  effectiveValue, FLAG_TEXTS, findOverride, modeOf, scopeKey, scopeLabel, valueText,
  type CellMode, type FlagScope,
} from './featureFlagMatrix';

interface Props {
  info: FeatureFlagInfoDto;
  columns: FlagScope[];
  overrides: FeatureFlagOverrideDto[];
  busyKey: string | null;
  onGlobalChange: (enabled: boolean) => void;
  onScopeChange: (scope: FlagScope, mode: CellMode) => void;
}

export const globalBusyKey = (info: FeatureFlagInfoDto) => `${info.flag}|global`;
export const scopeBusyKey = (info: FeatureFlagInfoDto, scope: FlagScope) => `${info.flag}|${scopeKey(scope)}`;

// Tek özellik: ad + açıklama + Genel anahtar; altında marka × ülke geçersiz kılmaları.
export function FeatureFlagCard({ info, columns, overrides, busyKey, onGlobalChange, onScopeChange }: Props) {
  const text = FLAG_TEXTS[info.flag];
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-xs font-bold text-[var(--fg)]">{text.label}</h3>
          <p className="m-0 mt-0.5 break-words text-[11px] text-[var(--fg-muted)]">{text.hint}</p>
        </div>
        <GlobalSwitch
          label={text.label}
          checked={info.globalValue}
          busy={busyKey === globalBusyKey(info)}
          onChange={onGlobalChange}
        />
      </div>

      {!info.overridable && (
        <p className="m-0 border-t border-[var(--border-soft)] pt-2.5 text-[10.5px] text-[var(--fg-muted)]">
          Tüm hesap için çalışır; marka/ülke bazında değiştirilemez.
        </p>
      )}

      {info.overridable && columns.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-2 border-t border-[var(--border-soft)] p-0 pt-3 sm:grid-cols-2 xl:grid-cols-3">
          {columns.map((scope) => (
            <li key={scopeKey(scope)} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-subtle)]/40 px-3 py-2">
              <span className="min-w-0 break-words text-[11px] font-semibold text-[var(--fg)]">{scopeLabel(scope)}</span>
              <FeatureFlagCell
                mode={modeOf(findOverride(overrides, info.flag, scope))}
                effective={effectiveValue(info, scope, overrides)}
                busy={busyKey === scopeBusyKey(info, scope)}
                onChange={(mode) => onScopeChange(scope, mode)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GlobalSwitch({ label, checked, busy, onChange }: {
  label: string; checked: boolean; busy: boolean; onChange: (enabled: boolean) => void;
}) {
  return (
    <label className={`flex shrink-0 items-center gap-2 text-[11px] font-semibold text-[var(--fg)] ${busy ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}>
      <span>Genel: {valueText(checked)}</span>
      <input
        type="checkbox"
        role="switch"
        aria-label={`${label} — Genel`}
        checked={checked}
        disabled={busy}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-5 w-9 shrink-0 rounded-full bg-[var(--border)] transition-colors peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--fg)]/40 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}
