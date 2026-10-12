'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, PlusCircle, ShieldAlert, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  adsHubApi, ADS_ACTION_TYPE, ADS_ACTION_PROPOSAL_STATUS,
  type AdsActionType, type AdsActionProposalDto, type AdsActionProposalStatus,
} from '../../lib/api/adshub';
import { FilterSelect } from '../../components/ui/FilterSelect';

const ACTION_LABEL: Record<AdsActionType, string> = {
  [ADS_ACTION_TYPE.Pause]: 'Kampanyayı Durdur',
  [ADS_ACTION_TYPE.Resume]: 'Kampanyayı Başlat',
  [ADS_ACTION_TYPE.UpdateBudget]: 'Bütçe Değiştir',
};

const STATUS_CONFIG: Record<AdsActionProposalStatus, { label: string; badge: string }> = {
  [ADS_ACTION_PROPOSAL_STATUS.PendingApproval]: {
    label: 'Onay Bekliyor',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  },
  [ADS_ACTION_PROPOSAL_STATUS.Approved]: {
    label: 'Onaylandı',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
  },
  [ADS_ACTION_PROPOSAL_STATUS.Rejected]: {
    label: 'Reddedildi',
    badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
  },
  [ADS_ACTION_PROPOSAL_STATUS.Executed]: {
    label: 'Uygulandı',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
  },
  [ADS_ACTION_PROPOSAL_STATUS.Failed]: {
    label: 'Başarısız',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-500',
  },
};

function StatusBadge({ status }: { status: AdsActionProposalStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG[ADS_ACTION_PROPOSAL_STATUS.PendingApproval];
  return (
    <span className={`px-2.5 py-0.5 rounded-[3px] border text-[10.5px] font-bold ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

function CreateProposalForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [adAccountId, setAdAccountId] = useState('');
  const [adCampaignId, setAdCampaignId] = useState('');
  const [actionType, setActionType] = useState<AdsActionType>(ADS_ACTION_TYPE.Pause);
  const [proposedBudget, setProposedBudget] = useState('');
  const [reason, setReason] = useState('');
  const [simulationOnly, setSimulationOnly] = useState(true);

  const create = useMutation({
    mutationFn: () =>
      adsHubApi.createActionProposal({
        adAccountId: Number(adAccountId),
        adCampaignId: Number(adCampaignId),
        actionType,
        proposedBudget: actionType === ADS_ACTION_TYPE.UpdateBudget && proposedBudget ? Number(proposedBudget) : null,
        reason: reason.trim(),
        simulationOnly,
      }),
    onSuccess: () => {
      setOpen(false);
      setAdAccountId('');
      setAdCampaignId('');
      setProposedBudget('');
      setReason('');
      setActionType(ADS_ACTION_TYPE.Pause);
      setSimulationOnly(true);
      onCreated();
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer self-start"
      >
        <PlusCircle size={13} />
        <span>Yeni Aksiyon Önerisi Oluştur</span>
      </button>
    );
  }

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3.5 text-xs">
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-2.5">
        <ShieldAlert size={15} className="text-amber-500" />
        <span className="font-bold text-[var(--fg)]">Yeni Kampanya Aksiyon Önerisi</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            Hesap ID (AdAccountId) *
          </label>
          <input
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
            placeholder="Örn: 1"
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            Kampanya ID (AdCampaignId) *
          </label>
          <input
            value={adCampaignId}
            onChange={(e) => setAdCampaignId(e.target.value)}
            placeholder="Örn: 42"
            className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
            Aksiyon Türü *
          </label>
          <FilterSelect
            value={String(actionType)}
            onChange={(v) => setActionType(Number(v) as AdsActionType)}
            placeholder="Aksiyon Seçin"
            height="h-8.5"
            options={[
              { value: String(ADS_ACTION_TYPE.Pause), label: 'Durdur (Pause)' },
              { value: String(ADS_ACTION_TYPE.Resume), label: 'Başlat (Resume)' },
              { value: String(ADS_ACTION_TYPE.UpdateBudget), label: 'Bütçe Değiştir (Budget)' },
            ]}
          />
        </div>
        {actionType === ADS_ACTION_TYPE.UpdateBudget && (
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              Önerilen Günlük Bütçe (hesabın para biriminde)
            </label>
            {/* Tutar hesabın KENDİ para birimindedir (UK hesabı GBP) — "(TL)" etiketi yanlış
                yönlendiriyordu. type=number: "1.500" metni Number() ile 1,5'e dönüyordu. */}
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={proposedBudget}
              onChange={(e) => setProposedBudget(e.target.value)}
              placeholder="Örn: 1500"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
          Öneri Gerekçesi *
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Örn: CPA son 7 günde %40 arttı, harcama verimsizleşti"
          className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)] cursor-pointer">
        <input
          type="checkbox"
          checked={simulationOnly}
          onChange={(e) => setSimulationOnly(e.target.checked)}
          className="h-4 w-4 rounded-[3px]"
        />
        <span>Simülasyon Modu (Onaylansa bile reklam platformuna gerçek API çağrısı yapılmaz)</span>
      </label>

      {create.isError && (
        <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-500">
          {(create.error as Error).message}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-soft)]">
        <button
          type="button"
          onClick={() => create.mutate()}
          disabled={create.isPending || !adAccountId || !adCampaignId || !reason.trim()}
          className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
        >
          {create.isPending ? 'Oluşturuluyor...' : 'Öneriyi Kaydet'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}

function ProposalRow({ proposal, onChanged }: { proposal: AdsActionProposalDto; onChanged: () => void }) {
  const approve = useMutation({ mutationFn: () => adsHubApi.approveActionProposal(proposal.id), onSuccess: onChanged });
  const reject = useMutation({ mutationFn: () => adsHubApi.rejectActionProposal(proposal.id), onSuccess: onChanged });
  const rollback = useMutation({ mutationFn: () => adsHubApi.rollbackActionProposal(proposal.id), onSuccess: onChanged });

  const pending = proposal.status === ADS_ACTION_PROPOSAL_STATUS.PendingApproval;
  const executed = proposal.status === ADS_ACTION_PROPOSAL_STATUS.Executed;
  const busy = approve.isPending || reject.isPending || rollback.isPending;

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex items-start justify-between gap-4 text-xs">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-xs text-[var(--fg)]">{ACTION_LABEL[proposal.actionType]}</span>
          <StatusBadge status={proposal.status} />
          {proposal.simulationOnly && (
            <span className="px-2 py-0.5 rounded-[3px] bg-[var(--bg-subtle)] text-[10px] font-bold text-[var(--fg-muted)]">
              SİMÜLASYON
            </span>
          )}
          {proposal.rollbackOfProposalId !== null && (
            <span className="px-2 py-0.5 rounded-[3px] bg-blue-500/10 text-[10px] font-bold text-blue-500 border border-blue-500/30">
              GERİ ALMA #{proposal.rollbackOfProposalId}
            </span>
          )}
        </div>

        <div className="text-[11px] text-[var(--fg-muted)]">
          Hesap #{proposal.adAccountId} • Kampanya #{proposal.adCampaignId}
          {proposal.actionType === ADS_ACTION_TYPE.UpdateBudget && (
            <>
              {' '}
              • Bütçe (hesap para birimi): {proposal.currentBudget?.toLocaleString('tr-TR') ?? '?'} →{' '}
              <strong className="text-[var(--fg)]">{proposal.proposedBudget?.toLocaleString('tr-TR') ?? '?'}</strong>
            </>
          )}
        </div>

        <p className="text-xs text-[var(--fg)] leading-relaxed">{proposal.reason}</p>

        {proposal.executionError && (
          <p className="text-xs text-rose-500 font-semibold">Hata: {proposal.executionError}</p>
        )}

        <div className="text-[10.5px] text-[var(--fg-muted)] pt-1">
          {new Date(proposal.createdAt).toLocaleString('tr-TR')}
        </div>
      </div>

      {pending && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => approve.mutate()}
            disabled={busy}
            title="Onayla"
            className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-emerald-500 text-white hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => reject.mutate()}
            disabled={busy}
            title="Reddet"
            className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {executed && (
        <button
          type="button"
          onClick={() => rollback.mutate()}
          disabled={busy}
          title="Geri Al"
          className="inline-flex h-7.5 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RotateCcw size={12} />
          <span>Geri Al</span>
        </button>
      )}
    </div>
  );
}

export function ApprovalsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['adshub', 'action-proposals'],
    queryFn: () => adsHubApi.listActionProposals(),
    staleTime: 30_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adshub', 'action-proposals'] });

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="adshub-approvals-info">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[var(--fg-muted)]" />
          <h3 className="text-sm font-bold text-[var(--fg)]">Aksiyon & Reklam Onay Mekanizması</h3>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          AI ve ekip tarafından önerilen bütçe/durdurma aksiyonları insan onayından geçmeden reklam platformuna uygulanmaz.
        </p>
        {/* Hangi korumaların (guardrail) devrede olduğu yalnızca kodda yazıyordu; kullanıcı
            bir önerinin neden reddedildiğini ekrandan anlayamıyordu. */}
        <p className="text-[11px] text-[var(--fg-muted)] mt-1.5 leading-relaxed">
          Akış: <strong>Onay Bekliyor → Onaylandı/Reddedildi → Uygulandı</strong>. Otomatik üretilen
          öneriler (her sabah <strong>08:00</strong>, kritik harcama/CPA anomalilerinden) her zaman
          simülasyon modundadır. Devredeki korumalar: bütçe tek seferde <strong>%50</strong>&apos;den
          fazla değiştirilemez, baseline yoksa tavan <strong>5.000 TL karşılığı</strong> (bütçe hesabın para biriminden çevrilir), kampanya en az
          <strong> 3 gündür</strong> yayında olmalı ve bir hesapta günde en fazla
          <strong> 5</strong> aksiyon uygulanabilir.
        </p>
      </div>

      <div data-tour="adshub-approvals-create">
        <CreateProposalForm onCreated={refresh} />
      </div>

      {isLoading && <div className="text-xs text-[var(--fg-muted)] py-4">Öneriler yükleniyor…</div>}
      {error && (
        <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
          Öneriler yüklenemedi: {(error as Error).message}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="rounded-[4px] border border-dashed border-[var(--border)] py-12 text-center text-xs text-[var(--fg-muted)]">
          Henüz bekleyen bir aksiyon önerisi bulunmuyor.
        </div>
      )}

      {data && data.length > 0 && (
        <div data-tour="adshub-approvals-list" className="flex flex-col gap-2.5">
          {data.map((p) => (
            <ProposalRow key={p.id} proposal={p} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
