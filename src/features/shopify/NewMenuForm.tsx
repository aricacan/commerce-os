'use client';

import { useState, type SyntheticEvent } from 'react';
import { surfaceCard } from '../shared/design';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  busy: boolean;
  onSubmit: (title: string, handle: string) => void;
  onCancel: () => void;
}

const HANDLE_PATTERN = /^[a-z0-9-]+$/;

// Yeni (boş) menü: başlık + adres (handle). Öğeler oluştuktan sonra ağaç düzenleyiciyle eklenir.
export function NewMenuForm({ busy, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [handle, setHandle] = useState('');
  const handleValid = HANDLE_PATTERN.test(handle.trim());

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (title.trim() !== '' && handleValid) onSubmit(title.trim(), handle.trim());
  };

  return (
    <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Yeni menü">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Yeni menü</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Başlık
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Adres (handle: küçük harf, rakam, tire)
          <input value={handle} onChange={(e) => setHandle(e.target.value)} className={fieldClass} />
        </label>
      </div>
      {handle !== '' && !handleValid && <p role="alert" className="m-0 text-ui-xs text-danger">Adres yalnız küçük harf, rakam ve tire içerebilir.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || title.trim() === '' || !handleValid} className={primaryButtonClass}>{busy ? 'Oluşturuluyor…' : 'Oluştur'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
