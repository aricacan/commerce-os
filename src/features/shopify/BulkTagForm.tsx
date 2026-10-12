'use client';

import { useState } from 'react';
import { parseTags } from './bulkRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  remove: boolean;
  count: number;
  busy: boolean;
  onSubmit: (tags: string[]) => Promise<boolean>;
  onClose: () => void;
}

// Toplu etiket ekle/çıkar: virgülle ayrılmış etiketler; mevcut etiketler korunur (yalnız verilenler eklenir/çıkarılır).
export function BulkTagForm({ remove, count, busy, onSubmit, onClose }: Props) {
  const [text, setText] = useState('');
  const tags = parseTags(text);

  const submit = async () => {
    if (await onSubmit(tags)) onClose();
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        {remove ? 'Çıkarılacak etiketler' : 'Eklenecek etiketler'} (virgülle ayırın)
        <input value={text} onChange={(e) => setText(e.target.value)} className={fieldClass} placeholder="acil, vip" />
      </label>
      <button type="button" className={primaryButtonClass} disabled={busy || tags.length === 0} onClick={() => void submit()}>
        {count} kayda uygula
      </button>
      <button type="button" className={ghostButtonClass} onClick={onClose}>Vazgeç</button>
    </div>
  );
}
