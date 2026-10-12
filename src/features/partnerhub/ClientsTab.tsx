'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plug, Plus, RotateCcw } from 'lucide-react';
import { partnerHubApi, type PartnerHubClient, type PartnerHubClientSecret } from '../../lib/api/partnerhub';
import { queryKeys } from '../../lib/query-keys';
import { describeError } from '../../lib/errors';
import { toast } from '../../lib/toast';
import { ClientList, type ClientRowAction } from './ClientList';
import { CreateClientDialog } from './CreateClientDialog';
import { ConfirmClientActionDialog, type ConfirmableClientAction } from './ConfirmClientActionDialog';
import { SecretRevealDialog } from './SecretRevealDialog';

// "Client'lar" sekmesi — partner OAuth client'larını listeler, oluşturur, kapatır/açar,
// secret'ını yeniler ve siler. "Yetkisiz" durumu üst kabukta (PartnerHubWorkspace).

interface PendingConfirm {
  action: ConfirmableClientAction;
  client: PartnerHubClient;
}

interface RevealedSecret {
  title: string;
  secret: PartnerHubClientSecret;
}

interface ClientActionInput {
  action: ClientRowAction;
  client: PartnerHubClient;
}

const SUCCESS_MESSAGES: Record<ClientRowAction, string> = {
  disable: 'Client devre dışı bırakıldı; açık token\'ları iptal edildi.',
  enable: 'Client yeniden etkinleştirildi.',
  rotate: 'Yeni secret üretildi; eskisi artık geçersiz.',
  delete: 'Client silindi.',
};

export function ClientsTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<RevealedSecret | null>(null);

  const clientsQuery = useQuery({
    queryKey: queryKeys.system.partnerHubClients,
    queryFn: ({ signal }) => partnerHubApi.list(signal),
    staleTime: 0,
  });
  const clients = clientsQuery.data ?? [];

  const invalidateClients = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.system.partnerHubClients });

  const createMutation = useMutation({
    mutationFn: (displayName: string) => partnerHubApi.create({ displayName }),
    onSuccess: (created) => {
      invalidateClients();
      setShowCreate(false);
      setRevealedSecret({ title: 'Client Oluşturuldu', secret: created });
    },
    onError: (error) => toast.error(describeError(error)),
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, client }: ClientActionInput) => runClientAction(action, client.clientId),
    onSuccess: (result, { action }) => {
      invalidateClients();
      setPendingConfirm(null);
      if (result) setRevealedSecret({ title: 'Secret Yenilendi', secret: result });
      toast.success(SUCCESS_MESSAGES[action]);
    },
    onError: (error) => toast.error(describeError(error)),
  });

  function handleRowAction(action: ClientRowAction, client: PartnerHubClient) {
    // Yeniden etkinleştirme zararsız ve geri alınabilir: onay sorulmaz.
    if (action === 'enable') {
      actionMutation.mutate({ action, client });
      return;
    }
    setPendingConfirm({ action, client });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-transparent">
      <div className="shrink-0 border-b border-border-soft bg-card px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="px-1 text-[11.5px] font-medium text-fg-muted">{clients.length} partner client</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => clientsQuery.refetch()}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[4px] border border-border-soft bg-bg-subtle text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
              title="Yenile"
              aria-label="Listeyi yenile"
            >
              <RotateCcw size={13} className={clientsQuery.isFetching ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[4px] border border-border bg-bg-subtle px-3 text-xs font-semibold text-fg shadow-xs transition-colors hover:bg-card-hover"
            >
              <Plus size={13} />
              <span>Yeni Partner Ekle</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {clientsQuery.isLoading ? (
          <StatusPanel>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-fg-subtle border-t-transparent" />
            <span className="text-xs text-fg-subtle">Yükleniyor…</span>
          </StatusPanel>
        ) : clientsQuery.isError ? (
          // Hata sessizce "kayıt yok"a düşmemeli: boş liste "hiç partner yok" gibi okunurdu.
          <StatusPanel>
            <AlertTriangle className="h-7 w-7 text-warning" />
            <p className="text-xs font-semibold text-fg">Partner listesi alınamadı</p>
            <p className="max-w-sm text-[11px] text-fg-muted">{describeError(clientsQuery.error)}</p>
            <button
              type="button"
              onClick={() => clientsQuery.refetch()}
              className="mt-1 cursor-pointer rounded-[3px] border border-border bg-bg-subtle px-3 py-1.5 text-[11px] font-semibold text-fg transition-colors hover:bg-card-hover"
            >
              Tekrar dene
            </button>
          </StatusPanel>
        ) : clients.length === 0 ? (
          <StatusPanel>
            <Plug className="h-8 w-8 text-fg-subtle opacity-60" />
            <p className="text-xs font-semibold text-fg">Henüz partner client yok</p>
            <p className="text-[11px] text-fg-subtle">&quot;Yeni Partner Ekle&quot; ile ilk OAuth client&apos;ını oluşturun.</p>
          </StatusPanel>
        ) : (
          <ClientList clients={clients} onAction={handleRowAction} busy={actionMutation.isPending} />
        )}
      </div>

      {showCreate && (
        <CreateClientDialog
          isPending={createMutation.isPending}
          onSubmit={(displayName) => createMutation.mutate(displayName)}
          onClose={() => setShowCreate(false)}
        />
      )}

      {pendingConfirm && (
        <ConfirmClientActionDialog
          action={pendingConfirm.action}
          client={pendingConfirm.client}
          isPending={actionMutation.isPending}
          onConfirm={() => actionMutation.mutate(pendingConfirm)}
          onClose={() => setPendingConfirm(null)}
        />
      )}

      {revealedSecret && (
        <SecretRevealDialog
          title={revealedSecret.title}
          secret={revealedSecret.secret}
          onClose={() => setRevealedSecret(null)}
        />
      )}
    </div>
  );
}

// Yalnız secret yenileme yeni bir secret döndürür; diğerleri için sonuç gösterilmez.
async function runClientAction(action: ClientRowAction, clientId: string): Promise<PartnerHubClientSecret | null> {
  switch (action) {
    case 'disable':
      await partnerHubApi.disable(clientId);
      return null;
    case 'enable':
      await partnerHubApi.enable(clientId);
      return null;
    case 'rotate':
      return partnerHubApi.rotateSecret(clientId);
    case 'delete':
      await partnerHubApi.remove(clientId);
      return null;
  }
}

function StatusPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-[4px] border border-border-soft bg-card p-6 text-center shadow-xs">
      {children}
    </div>
  );
}
