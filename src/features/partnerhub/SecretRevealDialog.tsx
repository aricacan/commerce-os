'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound } from 'lucide-react';
import type { PartnerHubClientSecret } from '../../lib/api/partnerhub';
import { toast } from '../../lib/toast';
import { PartnerHubDialog } from './PartnerHubDialog';

// Düz metin client secret'in TEK gösterimi — hem yeni client hem secret yenileme sonrası.
// Sunucu yalnız hash'ini saklar; pencere kapanınca secret bir daha hiçbir yerden okunamaz.
// Bu yüzden Escape/arka plan tıklaması kapatmaz: kullanıcı "Kaydettim" demeli.

const COPIED_FEEDBACK_MS = 2000;

interface SecretRevealDialogProps {
  title: string;
  secret: PartnerHubClientSecret;
  onClose: () => void;
}

export function SecretRevealDialog({ title, secret, onClose }: SecretRevealDialogProps) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret.clientSecret);
      setCopied(true);
      toast.success('Kopyalandı.');
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      toast.error('Kopyalanamadı — metni elle seçip kopyalayın.');
    }
  }

  return (
    <PartnerHubDialog
      title={title}
      onClose={onClose}
      tone="warning"
      dismissible={false}
      icon={(
        <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-warning-soft text-warning">
          <KeyRound size={13} />
        </span>
      )}
    >
      <div className="flex items-start gap-1.5 rounded-[3px] border border-warning bg-warning-soft px-3 py-2 text-[11px] text-warning">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <span>
          Bu client secret yalnızca bir kez gösterilir. Şimdi güvenli bir yere kaydedin — kapattıktan
          sonra bir daha görüntülenemez.
        </span>
      </div>

      <dl className="flex flex-col gap-2.5">
        {secret.displayName && (
          <div>
            <dt className="mb-1 text-[10.5px] font-bold uppercase text-fg-muted">Görünen Ad</dt>
            <dd className="text-xs text-fg">{secret.displayName}</dd>
          </div>
        )}
        <div>
          <dt className="mb-1 text-[10.5px] font-bold uppercase text-fg-muted">Client ID</dt>
          <dd className="break-all rounded-[3px] border border-border-soft bg-bg-subtle px-2 py-1.5 font-mono text-[11px] text-fg">
            {secret.clientId}
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-[10.5px] font-bold uppercase text-fg-muted">Client Secret</dt>
          <dd className="flex items-center gap-1.5">
            <code className="min-w-0 flex-1 break-all rounded-[3px] border border-border-soft bg-bg-subtle px-2 py-1.5 text-[11px] text-fg">
              {secret.clientSecret}
            </code>
            <button
              type="button"
              onClick={copySecret}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[3px] border border-border bg-bg-subtle text-fg-muted transition-colors hover:bg-card-hover hover:text-fg"
              aria-label="Secret'ı kopyala"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </dd>
        </div>
      </dl>

      <div className="flex justify-end border-t border-border-soft pt-2">
        <button
          type="button"
          onClick={onClose}
          className="h-8 cursor-pointer rounded-[3px] border border-accent bg-accent px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent-h"
        >
          Kaydettim, Kapat
        </button>
      </div>
    </PartnerHubDialog>
  );
}
