'use client';

import { useState } from 'react';
import type { ShopifyMenuChangeKind, ShopifyMenuDiffDto } from '../../lib/api/shopify-store-content';
import { CheckboxField } from './FormControls';
import { StatusBadge } from './StatusBadge';
import { surfaceCard, type BadgeTone } from '../shared/design';
import { CHANGE_KIND_LABELS } from './menuTree';
import { ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  diff: ShopifyMenuDiffDto;
  confirmLabel: string;
  busy: boolean;
  // overwriteLive: canlı menü arada değiştiyse kullanıcı "canlıyı ez" dedi.
  onConfirm: (overwriteLive: boolean) => void;
  onCancel: () => void;
}

const KIND_TONES: Record<ShopifyMenuChangeKind, BadgeTone> = {
  Added: 'success', Removed: 'danger', Renamed: 'info', Moved: 'warning', Retargeted: 'warning',
};

// Fark önizlemesi: canlı menü ile ekrandaki taslak arasındaki değişiklikler. Doğrulama hatası varsa yayın kapalı;
// canlı menü düzenleme sırasında değiştiyse açık onay (checkbox) olmadan yayın yapılmaz.
export function MenuDiffPanel({ diff, confirmLabel, busy, onConfirm, onCancel }: Props) {
  const [overwrite, setOverwrite] = useState(false);
  const blocked = diff.errors.length > 0 || (diff.liveChanged && !overwrite);

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Menü farkı">
      <h3 className="m-0 text-ui-sm font-bold text-fg">Değişiklik önizlemesi</h3>
      {diff.liveChanged && (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-border bg-bg-subtle p-2 text-ui-xs text-fg">
          <span>Bu menü Shopify&apos;da siz düzenlerken değişmiş. Yayınlarsanız o değişiklikler ezilir (yedeği alınır).</span>
          <CheckboxField checked={overwrite} onChange={setOverwrite}>Canlı menüyü ez</CheckboxField>
        </div>
      )}
      {diff.errors.length > 0 && (
        <ul role="alert" className="m-0 list-disc pl-5 text-ui-xs text-danger">
          {diff.errors.map((error) => <li key={error}>{error}</li>)}
        </ul>
      )}
      {diff.changes.length === 0
        ? <p className="m-0 text-ui-xs text-fg-muted">Canlı menüyle fark yok.</p>
        : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {diff.changes.map((change, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2 text-ui-xs text-fg">
                <StatusBadge label={CHANGE_KIND_LABELS[change.kind]} tone={KIND_TONES[change.kind]} />
                <span className="min-w-0 break-words font-semibold">{change.path}</span>
                {change.detail && <span className="min-w-0 break-words text-fg-muted">{change.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      <div className="flex gap-2">
        <button type="button" className={primaryButtonClass} disabled={busy || blocked || diff.changes.length === 0} onClick={() => onConfirm(overwrite)}>
          {busy ? 'Uygulanıyor…' : confirmLabel}
        </button>
        <button type="button" className={ghostButtonClass} onClick={onCancel}>Vazgeç</button>
      </div>
    </section>
  );
}
