'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';

interface Props {
  // Gönderilemeyen mesajın metnini yazma alanına geri koyar; yoksa düğme çizilmez.
  onRetry?: () => void;
  // Mesajı siler; yoksa düğme çizilmez. Onay bu bileşende, satır içinde alınır.
  onDelete?: () => Promise<void>;
}

const LINK_CLASS = `inline-flex min-h-7 cursor-pointer items-center gap-1 rounded text-ui-xs font-semibold ${motionFast} ${focusRing}`;

// Gönderilemeyen temsilci balonunun altındaki eylemler: "Tekrar dene" · "Sil". Silme geri alınamaz,
// bu yüzden tek tıkla olmaz: "Silinsin mi? Evet / Vazgeç" satır içinde sorulur.
export function FailedMessageActions({ onRetry, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (!onRetry && !onDelete) return null;

  if (confirming) {
    return (
      <span role="group" aria-label="Silme onayı" className="flex items-center gap-3 text-ui-xs">
        <span className="text-fg-muted">Silinsin mi?</span>
        <button
          type="button"
          onClick={() => void confirmDelete()}
          disabled={deleting}
          className={`${LINK_CLASS} text-danger disabled:opacity-50`}
        >
          {deleting ? 'Siliniyor…' : 'Evet'}
        </button>
        <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className={`${LINK_CLASS} text-fg-muted hover:text-fg`}>
          Vazgeç
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${LINK_CLASS} text-danger underline`}>
          Tekrar dene
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={() => setConfirming(true)} className={`${LINK_CLASS} text-fg-muted hover:text-danger`}>
          <Trash2 size={12} aria-hidden /> Sil
        </button>
      )}
    </span>
  );
}
