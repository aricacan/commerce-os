'use client';

import {
  ASSIGNMENT_POLICY, FIXED_AGENT_FALLBACK, type AssignmentPolicy, type FixedAgentFallback,
} from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import type { ChannelDraft, ChannelDraftPatch } from './channelDraft';
import { formInputClass, labelClass } from './formClasses';
import { ASSIGNMENT_POLICY_META } from './shared';
import { useFixedAgentCandidates } from './useFixedAgentCandidates';

interface Props {
  draft: ChannelDraft;
  patch: ChannelDraftPatch;
  // Kayıtlı kanal (Kanal Merkezi): "Sabit kişi" ekipten sorumlu seçilerek açılır. Yeni kanalda ekip yoktur.
  channelId?: number;
}

const BASE_POLICIES: AssignmentPolicy[] = [
  ASSIGNMENT_POLICY.None, ASSIGNMENT_POLICY.Manual, ASSIGNMENT_POLICY.RoundRobin, ASSIGNMENT_POLICY.LeastLoaded,
];

const FALLBACK_OPTIONS: { value: FixedAgentFallback; label: string; sublabel: string }[] = [
  { value: FIXED_AGENT_FALLBACK.DistributeToTeam, label: 'Ekibe dağıt', sublabel: 'Ekibin geri kalanına sırayla verilir.' },
  { value: FIXED_AGENT_FALLBACK.Wait, label: 'Bekle', sublabel: 'Kuyrukta kalır; sorumlu dönünce ona atanır.' },
];

const SLA_MAX_MINUTES = 10080;

// Temsilci dağıtım politikası ("Sabit kişi" için sorumlu ve yedek davranış) ve ilk cevap süresi (SLA).
export function ChannelAssignmentFields({ draft, patch, channelId }: Props) {
  const policies = channelId === undefined ? BASE_POLICIES : [...BASE_POLICIES, ASSIGNMENT_POLICY.FixedAgent];
  const isFixed = draft.assignmentPolicy === ASSIGNMENT_POLICY.FixedAgent;
  const candidates = useFixedAgentCandidates(isFixed ? channelId : undefined);

  return (
    <>
      <div>
        <label className={labelClass}>Temsilci dağıtım politikası</label>
        <FilterSelect
          value={String(draft.assignmentPolicy)}
          onChange={(v) => patch({ assignmentPolicy: Number(v) as AssignmentPolicy })}
          placeholder="Politika seçin"
          height="h-8.5"
          options={policies.map((p) => ({
            value: String(p),
            label: ASSIGNMENT_POLICY_META[p].label,
            sublabel: ASSIGNMENT_POLICY_META[p].hint,
          }))}
        />
      </div>

      {isFixed && (
        <>
          <div>
            <label className={labelClass}>Sabit sorumlu</label>
            <FilterSelect
              value={draft.fixedAgentUserId === null ? '' : String(draft.fixedAgentUserId)}
              onChange={(v) => patch({ fixedAgentUserId: v === '' ? null : Number(v) })}
              placeholder={candidates.length === 0 ? 'Önce kanal ekibine üye ekleyin' : 'Ekipten seçin'}
              height="h-8.5"
              options={candidates.map((member) => ({ value: String(member.userId), label: member.displayName }))}
            />
          </div>
          <div>
            <label className={labelClass}>Sorumlu yoksa (nöbette değil / kapasitesi dolu)</label>
            <FilterSelect
              value={String(draft.fixedAgentFallback)}
              onChange={(v) => patch({ fixedAgentFallback: Number(v) as FixedAgentFallback })}
              placeholder="Davranış seçin"
              height="h-8.5"
              options={FALLBACK_OPTIONS.map((o) => ({ value: String(o.value), label: o.label, sublabel: o.sublabel }))}
            />
          </div>
        </>
      )}

      <div>
        <label className={labelClass}>İlk Cevap Süresi (SLA, dakika)</label>
        <input
          type="number"
          min={1}
          max={SLA_MAX_MINUTES}
          value={draft.slaMinutes}
          onChange={(e) => patch({ slaMinutes: e.target.value })}
          placeholder="Boş = takip yok (örn: 15)"
          className={formInputClass}
        />
        <div className="mt-0.5 text-[10px] text-[var(--fg-muted)]">
          İnsan bekleyen konuşmaya bu sürede cevap verilmezse kanal sahiplerine bildirim gider.
        </div>
      </div>
    </>
  );
}
