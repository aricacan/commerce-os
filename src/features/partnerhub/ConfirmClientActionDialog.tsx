'use client';

import { AlertTriangle } from 'lucide-react';
import type { PartnerHubClient } from '../../lib/api/partnerhub';
import { PartnerHubDialog } from './PartnerHubDialog';

// Geri alınması zor client işlemlerinin onayı. Metinler tek yerde: her işlemin partner
// tarafında TAM OLARAK ne olacağını söylemeli (ör. "elindeki token hemen geçersiz olur").

export type ConfirmableClientAction = 'disable' | 'rotate' | 'delete';

interface ActionCopy {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
}

const ACTION_COPY: Record<ConfirmableClientAction, ActionCopy> = {
  disable: {
    title: "Client'ı Devre Dışı Bırak",
    description:
      'Partner yeni token alamaz ve elindeki token hemen geçersiz olur. Kayıt silinmez; istediğiniz an yeniden etkinleştirebilirsiniz.',
    confirmLabel: 'Devre Dışı Bırak',
    pendingLabel: 'Devre dışı bırakılıyor…',
  },
  rotate: {
    title: "Secret'ı Yenile",
    description:
      'Yeni bir client secret üretilir ve yalnızca bir kez gösterilir. Eski secret ve onunla alınmış token\'lar hemen geçersiz olur — partner yeni secret\'ı girene kadar bağlanamaz.',
    confirmLabel: "Secret'ı Yenile",
    pendingLabel: 'Yenileniyor…',
  },
  delete: {
    title: "Client'ı Sil",
    description:
      'Client kaydı ve tüm token\'ları kalıcı olarak silinir, geri alınamaz. Geçmiş çağrılar Aktivite ekranında client kimliğiyle görünmeye devam eder. Yalnızca erişimi durdurmak istiyorsanız "Devre dışı bırak" yeterli.',
    confirmLabel: 'Kalıcı Olarak Sil',
    pendingLabel: 'Siliniyor…',
  },
};

interface ConfirmClientActionDialogProps {
  action: ConfirmableClientAction;
  client: PartnerHubClient;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmClientActionDialog({
  action, client, isPending, onConfirm, onClose,
}: ConfirmClientActionDialogProps) {
  const copy = ACTION_COPY[action];

  return (
    <PartnerHubDialog
      title={copy.title}
      onClose={onClose}
      tone="danger"
      icon={(
        <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-danger-soft text-danger">
          <AlertTriangle size={13} />
        </span>
      )}
    >
      <div className="flex flex-col gap-2 text-xs leading-relaxed text-fg-muted">
        <p className="break-all">
          <strong className="text-fg">{client.displayName || client.clientId}</strong>
        </p>
        <p>{copy.description}</p>
      </div>

      <div className="flex justify-end gap-2 border-t border-border-soft pt-2">
        <button
          type="button"
          onClick={onClose}
          className="h-8 cursor-pointer rounded-[3px] border border-border bg-bg-subtle px-3 text-xs font-semibold text-fg-muted transition-colors hover:bg-card-hover"
        >
          Vazgeç
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onConfirm}
          className="h-8 cursor-pointer rounded-[3px] border border-danger bg-danger-soft px-3.5 text-xs font-semibold text-danger transition-colors hover:bg-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? copy.pendingLabel : copy.confirmLabel}
        </button>
      </div>
    </PartnerHubDialog>
  );
}
