'use client';

import type { ComponentType, ReactNode } from 'react';
import { BadgeCheck, Car, MapPin, Phone, ShoppingBag, Users } from 'lucide-react';
import type { CustomerSegment, CustomerSummaryDto } from '../../lib/api/customers';
import type { ChannelType, CountryDto } from '../../lib/api/omnichannel';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { focusRing, motionFast, surfaceCard } from '../shared/design';
import { HorizontalScroller } from './HorizontalScroller';
import { channelTypeMeta } from './shared';
import { SEGMENT_META, segmentCount, sharePercent } from './customerSegments';

const KPI_CARDS: { segment: CustomerSegment; Icon: ComponentType<{ size?: number; className?: string }> }[] = [
  { segment: 'all',        Icon: Users },
  { segment: 'complete',   Icon: BadgeCheck },
  { segment: 'hasVehicle', Icon: Car },
  { segment: 'hasAddress', Icon: MapPin },
  { segment: 'hasPhone',   Icon: Phone },
  { segment: 'hasOrder',   Icon: ShoppingBag },
];

const KPI_ICON_SIZE = 14;
const CHIP_ICON_SIZE = 12;

interface Props {
  summary: CustomerSummaryDto;
  segment: CustomerSegment;
  channelType: ChannelType | null;
  countryCode: string;
  countries: CountryDto[];
  onSegment: (segment: CustomerSegment) => void;
  onChannel: (channelType: ChannelType | null) => void;
  onCountry: (countryCode: string) => void;
}

// Müşteriler ekranının üstündeki KPI şeridi: kart tıklanınca o segment, kanal/ülke çipi
// tıklanınca o filtre seçilir (tekrar tıklayınca kalkar).
export function CustomerSummaryStrip(props: Props) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {KPI_CARDS.map(({ segment, Icon }) => (
          <KpiCard key={segment} segment={segment} Icon={Icon} summary={props.summary}
            active={props.segment === segment} onSelect={() => props.onSegment(segment)} />
        ))}
      </div>
      <SourceBreakdown {...props} />
    </div>
  );
}

function KpiCard({ segment, Icon, summary, active, onSelect }: {
  segment: CustomerSegment;
  Icon: ComponentType<{ size?: number; className?: string }>;
  summary: CustomerSummaryDto;
  active: boolean;
  onSelect: () => void;
}) {
  const count = segmentCount(summary, segment) ?? 0;
  const meta = SEGMENT_META[segment];
  return (
    <button type="button" title={meta.hint} aria-pressed={active} onClick={onSelect}
      className={`${surfaceCard} ${motionFast} ${focusRing} flex min-w-0 flex-col gap-1 p-3 text-left hover:bg-[var(--card-hover)] ${
        active ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : ''
      }`}>
      <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[var(--fg-muted)]">
        <Icon size={KPI_ICON_SIZE} className="shrink-0" />
        <span className="truncate">{segment === 'all' ? 'Toplam müşteri' : meta.label}</span>
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums text-[var(--fg)]">{count.toLocaleString('tr-TR')}</span>
        {segment !== 'all' && (
          <span className="text-[11px] tabular-nums text-[var(--fg-muted)]">%{sharePercent(count, summary.total)}</span>
        )}
      </span>
    </button>
  );
}

// Müşteriler nereden geliyor: kanal ve ülke dağılımı (çip = hızlı filtre).
function SourceBreakdown({ summary, channelType, countryCode, countries, onChannel, onCountry }: Props) {
  const byChannel = summary.byChannel ?? [];
  const byCountry = summary.byCountry ?? [];
  if (byChannel.length === 0 && byCountry.length === 0) return null;

  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

  return (
    <HorizontalScroller ariaLabel="Kanal ve ülke dağılımı" fadeFromClass="from-[var(--bg)]">
      {byChannel.map(({ channelType: type, count }) => {
        const meta = channelTypeMeta(type);
        return (
          <BreakdownChip key={`ch-${type}`} active={channelType === type} count={count}
            onClick={() => onChannel(channelType === type ? null : type)}>
            <meta.Icon size={CHIP_ICON_SIZE} color={meta.color} />
            {meta.label}
          </BreakdownChip>
        );
      })}
      {byChannel.length > 0 && byCountry.length > 0 && (
        <span aria-hidden className="h-4 w-px shrink-0 bg-[var(--border)]" />
      )}
      {byCountry.map(({ countryCode: code, count }) => code === null
        ? (
          <span key="country-unknown" className="shrink-0 whitespace-nowrap px-1 text-[11px] text-[var(--fg-muted)]">
            Ülkesi bilinmeyen {count.toLocaleString('tr-TR')}
          </span>
        )
        : (
          <BreakdownChip key={`co-${code}`} active={countryCode === code} count={count}
            onClick={() => onCountry(countryCode === code ? '' : code)}>
            <CountryFlag code={code} size={CHIP_ICON_SIZE} />
            {countryName(code)}
          </BreakdownChip>
        ))}
    </HorizontalScroller>
  );
}

function BreakdownChip({ active, count, onClick, children }: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-semibold ${motionFast} ${focusRing} ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)]'
          : 'border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
      }`}>
      {children}
      <span className="tabular-nums text-[var(--fg)]">{count.toLocaleString('tr-TR')}</span>
    </button>
  );
}
