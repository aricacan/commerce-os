'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2, UserPlus, Users } from 'lucide-react';
import {
  omnichannelApi, CHANNEL_MEMBER_ROLE,
  type ChannelMemberDto, type ChannelMemberRole, type ChannelMemberUpdateBody, type TeamCandidateDto,
} from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { describeError } from '../../lib/errors';

interface Props {
  channelId: number;
}

const ROLE_OPTIONS: { value: ChannelMemberRole; label: string; sublabel: string }[] = [
  { value: CHANNEL_MEMBER_ROLE.Owner, label: 'Sahip', sublabel: 'Yazar, konuşma alır, SLA ihlalleri ona gider' },
  { value: CHANNEL_MEMBER_ROLE.Agent, label: 'Temsilci', sublabel: 'Yazar, konuşma alır, bildirim alır' },
  { value: CHANNEL_MEMBER_ROLE.Observer, label: 'Gözlemci', sublabel: 'Yalnız izler; yazamaz, atanmaz' },
];

const INPUT_CLASS =
  'h-7 w-16 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-1.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]';

const toBody = (m: ChannelMemberDto): ChannelMemberUpdateBody => ({
  role: m.role, notify: m.notify, isOnDuty: m.isOnDuty, maxOpenConversations: m.maxOpenConversations,
});

// Kanal ekibi — değişiklikler anında kaydedilir (kanal formunun "Kaydet"inden bağımsız).
// Ekip boşsa kanal herkese yazılabilir; ekip kurulunca yalnız Sahip/Temsilci yazar.
export function ChannelTeamSection({ channelId }: Props) {
  const [members, setMembers] = useState<ChannelMemberDto[]>([]);
  const [candidates, setCandidates] = useState<TeamCandidateDto[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [m, c] = await Promise.all([
        omnichannelApi.getChannelMembers(channelId),
        omnichannelApi.getMemberCandidates(channelId),
      ]);
      setMembers(m);
      setCandidates(c);
    } catch (e) {
      setError(describeError(e));
    }
  }, [channelId]);

  useEffect(() => { void load(); }, [load]);

  const available = useMemo(
    () => candidates.filter((c) => !members.some((m) => m.userId === c.userId)),
    [candidates, members],
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const update = (member: ChannelMemberDto, patch: Partial<ChannelMemberUpdateBody>) =>
    run(() => omnichannelApi.upsertChannelMember(channelId, member.userId, { ...toBody(member), ...patch }));

  const add = () => run(async () => {
    await omnichannelApi.upsertChannelMember(channelId, Number(newUserId), {
      role: CHANNEL_MEMBER_ROLE.Agent, notify: true, isOnDuty: true, maxOpenConversations: null,
    });
    setNewUserId('');
  });

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--fg)]">
        <Users size={13} /> Kanal Ekibi
      </div>
      <p className="text-[10px] text-[var(--fg-muted)]">
        Gelen kutusunu herkes görür. Ekip boşsa herkes yazabilir; ekip kurulunca yalnız Sahip ve Temsilciler yazar,
        yeni mesaj ve devir bildirimleri ekibe gider.
      </p>

      {members.map((m) => (
        <div key={m.userId} className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--border-soft)] p-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-[var(--fg)]">{m.displayName}</span>
            <span className="text-[10px] text-[var(--fg-muted)]">
              {m.openConversationCount} açık konuşma{m.maxOpenConversations ? ` / ${m.maxOpenConversations}` : ''}
            </span>
          </div>
          <div className="w-28 shrink-0">
            <FilterSelect
              value={String(m.role)}
              minWidth="100%"
              height="h-7"
              placeholder="Rol"
              onChange={(v) => void update(m, { role: Number(v) as ChannelMemberRole })}
              options={ROLE_OPTIONS.map((r) => ({ value: String(r.value), label: r.label, sublabel: r.sublabel }))}
            />
          </div>
          <label className="flex items-center gap-1 text-[10.5px]" title="Nöbette değilse otomatik atama ve rutin bildirim almaz">
            <input type="checkbox" checked={m.isOnDuty} disabled={busy}
              onChange={(e) => void update(m, { isOnDuty: e.target.checked })} />
            Nöbette
          </label>
          <label className="flex items-center gap-1 text-[10.5px]">
            <input type="checkbox" checked={m.notify} disabled={busy}
              onChange={(e) => void update(m, { notify: e.target.checked })} />
            Bildirim
          </label>
          <input
            type="number" min={1} max={500} title="Kapasite (boş = sınırsız)" placeholder="∞"
            defaultValue={m.maxOpenConversations ?? ''} disabled={busy} className={INPUT_CLASS}
            onBlur={(e) => {
              const value = e.target.value.trim() === '' ? null : Number(e.target.value);
              if (value !== m.maxOpenConversations) void update(m, { maxOpenConversations: value });
            }}
          />
          <button type="button" title="Ekipten çıkar" disabled={busy}
            onClick={() => void run(() => omnichannelApi.removeChannelMember(channelId, m.userId))}
            className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:bg-rose-500/10 hover:text-rose-500">
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <FilterSelect
            value={newUserId}
            height="h-8"
            placeholder="Ekibe kullanıcı ekle"
            searchable
            onChange={setNewUserId}
            options={available.map((c) => ({ value: String(c.userId), label: c.displayName, sublabel: c.email }))}
          />
        </div>
        <button type="button" onClick={() => void add()} disabled={busy || newUserId === ''}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90 disabled:opacity-40">
          <UserPlus size={13} /> Ekle
        </button>
      </div>

      {error && <div className="rounded-[3px] bg-rose-500/10 p-2 text-rose-500">{error}</div>}
    </div>
  );
}
