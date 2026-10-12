'use client';

import { CHANNEL_TYPE, type ChannelType } from '../../lib/api/omnichannel';
import {
  HANDOFF_STATUS, HANDOFF_STATUS_LABELS, type HandoffLevel, type HandoffQueueFilter, type HandoffStatus,
} from '../../lib/api/handoff';
import { focusRing, motionFast } from '../shared/design';
import { channelTypeMeta } from './shared';

interface Props {
  filter: HandoffQueueFilter;
  onChange: (filter: HandoffQueueFilter) => void;
  // Ülke seçenekleri (görülen kayıtlardan + bilinen).
  countries: string[];
  // Atananlar panosu: hızlı haplar ve "Çözüldü" durumu yok (pano yalnız açık işleri gösterir).
  boardMode?: boolean;
}

const SELECT_CLASS =
  `h-8 rounded-lg border border-border bg-card px-2 text-ui-xs text-fg ${motionFast} ${focusRing}`;
const CHIP_CLASS = (active: boolean) =>
  `inline-flex h-8 cursor-pointer items-center rounded-full border px-3 text-ui-xs font-semibold ${motionFast} ${focusRing} ${
    active ? 'border-fg bg-fg text-bg' : 'border-border bg-card text-fg-muted hover:bg-bg-subtle'}`;

const STATUS_OPTIONS: HandoffStatus[] = [
  HANDOFF_STATUS.Open, HANDOFF_STATUS.Assigned, HANDOFF_STATUS.InProgress, HANDOFF_STATUS.WaitingCustomer,
  HANDOFF_STATUS.Resolved,
];
const LEVELS: HandoffLevel[] = ['P1', 'P2', 'P3'];
const PLATFORMS = Object.values(CHANNEL_TYPE) as ChannelType[];

// Devirler süzgeçleri: hızlı haplar (bana / atanmamış / gecikmiş) + durum, platform, öncelik, ülke.
export function HandoffQueueFilters({ filter, onChange, countries, boardMode = false }: Props) {
  const toggle = (key: 'mineOnly' | 'unassignedOnly' | 'overdueOnly') => onChange({ ...filter, [key]: !filter[key] });
  const numberOrUndefined = (value: string) => (value === '' ? undefined : Number(value));

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {!boardMode && (
        <>
          <button type="button" className={CHIP_CLASS(filter.mineOnly === true)} onClick={() => toggle('mineOnly')}>Bana atanan</button>
          <button type="button" className={CHIP_CLASS(filter.unassignedOnly === true)} onClick={() => toggle('unassignedOnly')}>Atanmamış</button>
          <button type="button" className={CHIP_CLASS(filter.overdueOnly === true)} onClick={() => toggle('overdueOnly')}>Süresi aşan</button>
        </>
      )}

      <select aria-label="Durum" className={SELECT_CLASS} value={filter.status ?? ''}
        onChange={(e) => onChange({ ...filter, status: numberOrUndefined(e.target.value) as HandoffStatus | undefined })}>
        <option value="">Açık olanlar</option>
        {STATUS_OPTIONS.filter((status) => !boardMode || status !== HANDOFF_STATUS.Resolved).map((status) => <option key={status} value={status}>{HANDOFF_STATUS_LABELS[status]}</option>)}
      </select>

      <select aria-label="Platform" className={SELECT_CLASS} value={filter.platform ?? ''}
        onChange={(e) => onChange({ ...filter, platform: numberOrUndefined(e.target.value) as ChannelType | undefined })}>
        <option value="">Tüm kanallar</option>
        {PLATFORMS.map((type) => <option key={type} value={type}>{channelTypeMeta(type).label}</option>)}
      </select>

      <select aria-label="Öncelik" className={SELECT_CLASS} value={filter.level ?? ''}
        onChange={(e) => onChange({ ...filter, level: (e.target.value || undefined) as HandoffLevel | undefined })}>
        <option value="">Tüm öncelikler</option>
        {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
      </select>

      {countries.length > 0 && (
        <select aria-label="Ülke" className={SELECT_CLASS} value={filter.country ?? ''}
          onChange={(e) => onChange({ ...filter, country: e.target.value || undefined })}>
          <option value="">Tüm ülkeler</option>
          {countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </select>
      )}
    </div>
  );
}
