'use client';

import { useState, type FormEvent } from 'react';
import { Plug } from 'lucide-react';
import { PartnerHubDialog } from './PartnerHubDialog';

interface CreateClientDialogProps {
  isPending: boolean;
  onSubmit: (displayName: string) => void;
  onClose: () => void;
}

export function CreateClientDialog({ isPending, onSubmit, onClose }: CreateClientDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const trimmed = displayName.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <PartnerHubDialog
      title="Yeni Partner Ekle"
      onClose={onClose}
      icon={(
        <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-bg-subtle text-fg">
          <Plug size={13} />
        </span>
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="partnerhub-display-name" className="mb-1 block text-[10.5px] font-bold uppercase text-fg-muted">
            Görünen Ad *
          </label>
          <input
            id="partnerhub-display-name"
            type="text"
            required
            autoFocus
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Örn: BMW Group Entegrasyonu"
            className="h-9 w-full rounded-[3px] border border-border bg-bg-subtle px-3 text-xs text-fg focus:border-accent focus:outline-none"
          />
        </div>

        {/* Kiracı sorulmaz: backend personelin oturumundaki kiracıyı kullanır. */}
        <p className="text-[10.5px] leading-relaxed text-fg-muted">
          Client, oturum açtığınız kiracı altında oluşturulur ve yalnızca o kiracının verisini görebilir.
        </p>

        <div className="flex justify-end gap-2 border-t border-border-soft pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 cursor-pointer rounded-[3px] border border-border bg-bg-subtle px-3.5 text-xs font-semibold text-fg-muted transition-colors hover:bg-card-hover"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isPending || !trimmed}
            className="h-8 cursor-pointer rounded-[3px] border border-accent bg-accent px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent-h disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Oluşturuluyor…' : 'Client Oluştur'}
          </button>
        </div>
      </form>
    </PartnerHubDialog>
  );
}
