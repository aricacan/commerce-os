import { CircleCheck } from 'lucide-react';
import type { CustomerMergeCandidateDto } from '../../lib/api/customer-crm';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { channelTypeMeta } from './shared';
import { formatPanelDate } from './CustomerPanelParts';

interface Props {
  candidate: CustomerMergeCandidateDto;
  // Onayda kalacak profil bu mu?
  keep: boolean;
  isCurrent: boolean;
  disabled: boolean;
  onKeep: () => void;
  onOpenProfile?: (profileId: number) => void;
}

// Karşılaştırmanın bir yanı: ad, ülke, telefon, kanallar, son görülme. Kart seçilince "kalacak" profil olur.
export function MergeCandidateCard({ candidate, keep, isCurrent, disabled, onKeep, onOpenProfile }: Props) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-[6px] border p-2 text-xs transition-colors ${
      keep ? 'border-[var(--fg)] bg-[var(--bg-subtle)]' : 'border-[var(--border-soft)]'}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        {candidate.countryCode && <CountryFlag code={candidate.countryCode} size={14} />}
        {onOpenProfile ? (
          <button type="button" onClick={() => onOpenProfile(candidate.profileId)}
            className="min-w-0 flex-1 truncate text-left font-semibold text-[var(--fg)] hover:underline">
            {candidate.displayName ?? 'İsimsiz müşteri'}
          </button>
        ) : (
          <span className="min-w-0 flex-1 truncate font-semibold text-[var(--fg)]">{candidate.displayName ?? 'İsimsiz müşteri'}</span>
        )}
      </div>
      <span className="truncate font-mono text-[10.5px] text-[var(--fg-muted)]">
        {candidate.primaryPhone ? `+${candidate.primaryPhone}` : 'Telefon yok'}
      </span>
      <span className="flex min-h-3 items-center gap-1">
        {candidate.channelTypes.map((type) => {
          const meta = channelTypeMeta(type);
          return <span key={type} title={meta.label}><meta.Icon size={12} color={meta.color} /></span>;
        })}
      </span>
      <span className="text-[10.5px] text-[var(--fg-muted)]">
        {isCurrent ? 'Bu profil · ' : `#${candidate.profileId} · `}son {formatPanelDate(candidate.lastSeenAt)}
      </span>
      <button type="button" disabled={disabled} onClick={onKeep} aria-pressed={keep}
        className={`inline-flex h-6 items-center justify-center gap-1 rounded-[4px] text-[10.5px] font-semibold ${
          keep ? 'bg-[var(--fg)] text-[var(--bg)]' : 'border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}>
        {keep && <CircleCheck size={11} />} {keep ? 'Kalacak' : 'Bunu tut'}
      </button>
    </div>
  );
}
