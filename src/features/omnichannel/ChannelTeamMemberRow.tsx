'use client';

import { Pin } from 'lucide-react';
import type { ChannelTeamMemberSummaryDto } from '../../lib/api/assignments';
import { badgeBase, badgeTone, focusRing, motionFast } from '../shared/design';
import { AgentAvatar } from './AgentAvatar';
import { MAX_OPEN_LIMIT, ROLE_LABEL, memberIsFull, parseMaxOpen } from './channelTeamRules';

interface Props {
  member: ChannelTeamMemberSummaryDto;
  isFixedAgent: boolean;
  // Bugünkü ilk cevap ortalaması ("4 dk"); veri yoksa null.
  avgFirstResponse: string | null;
  editable: boolean;
  busy: boolean;
  onChange: (member: ChannelTeamMemberSummaryDto) => void;
}

// Sütun genişlikleri ChannelTeamCard başlığıyla aynı (masaüstünde tablo gibi hizalanır, telefonda alt satıra iner).
export const MEMBER_GRID_COLUMNS = 'grid-cols-2 items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_88px_104px_112px_88px]';

// Kanal ekibinin bir üyesi: avatar, ad, rol, nöbet anahtarı, açık konuşma / sınır (satır içi), bugünkü ilk cevap.
export function ChannelTeamMemberRow({ member, isFixedAgent, avgFirstResponse, editable, busy, onChange }: Props) {
  const full = memberIsFull(member);

  const commitMax = (raw: string) => {
    const parsed = parseMaxOpen(raw);
    if (parsed.valid && parsed.value !== member.maxOpenConversations) onChange({ ...member, maxOpenConversations: parsed.value });
  };

  return (
    <li className={`grid ${MEMBER_GRID_COLUMNS} border-t border-border-soft px-4 py-3 first:border-t-0`}>
      <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
        <AgentAvatar name={member.name} size="sm" />
        <span className="min-w-0 truncate text-ui-md font-semibold text-fg">{member.name}</span>
        {isFixedAgent && (
          <span className={`${badgeBase} ${badgeTone.info}`} title="Kanalın sabit sorumlusu: her devir ona gider">
            <Pin size={10} aria-hidden /> Sabit
          </span>
        )}
      </div>

      <span className="text-ui-sm text-fg-muted">{ROLE_LABEL[member.role] ?? ''}</span>

      <label className={`inline-flex items-center gap-2 text-ui-sm ${editable ? 'cursor-pointer' : 'cursor-default'}`}>
        <input type="checkbox" role="switch" checked={member.isOnDuty} disabled={!editable || busy}
          aria-label={`${member.name} nöbette`}
          onChange={(e) => onChange({ ...member, isOnDuty: e.target.checked })}
          className="peer sr-only" />
        <span aria-hidden className={`relative h-5 w-9 shrink-0 rounded-full bg-border ${motionFast} peer-checked:bg-success peer-disabled:opacity-50 peer-focus-visible:ring-2 peer-focus-visible:ring-fg/30 after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-card after:shadow-[var(--shadow-xs)] after:transition-transform peer-checked:after:translate-x-4`} />
        <span className={member.isOnDuty ? 'font-semibold text-success' : 'text-fg-muted'}>{member.isOnDuty ? 'Nöbette' : 'Dışarıda'}</span>
      </label>

      <div className="flex items-center gap-1.5 text-ui-sm tabular-nums" title="Açık konuşma / en fazla">
        <span className={`font-semibold ${full ? 'text-danger' : 'text-fg'}`}>{member.openCount}</span>
        <span aria-hidden className="text-fg-subtle">/</span>
        <input key={member.maxOpenConversations ?? 'none'} type="number" min={1} max={MAX_OPEN_LIMIT} inputMode="numeric"
          aria-label={`${member.name} en fazla açık konuşma`} disabled={!editable || busy}
          defaultValue={member.maxOpenConversations ?? ''} placeholder="∞"
          onBlur={(e) => commitMax(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className={`h-8 w-16 rounded-lg border border-border bg-card px-2 text-ui-sm tabular-nums text-fg disabled:border-transparent disabled:bg-transparent ${focusRing}`} />
      </div>

      <span className="text-ui-sm tabular-nums text-fg-muted" title="Bugün ilk cevap ortalaması">
        {avgFirstResponse ? `⌀ ${avgFirstResponse}` : '—'}
      </span>
    </li>
  );
}
