'use client';

import { Pencil, Trash2 } from 'lucide-react';
import type { OrderDestinationRuleDto } from '../../lib/api/omnichannel-order-destinations';
import { ghostButtonClass } from './CustomerPanelParts';

interface Props {
  rule: OrderDestinationRuleDto;
  /** "Fransa · StoreB" gibi: kuralın hangi kapsama ait olduğu. */
  scopeLabel: string;
  /** Kanal/profil kuralları kendi ekranında düzenlenir; düzenle düğmesi yok. */
  editable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

// Bir hedef kuralı: kapsam, hedefin adı ve işlemler.
export function OrderDestinationRuleRow({ rule, scopeLabel, editable, onEdit, onDelete }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0 font-bold text-[var(--fg)]">
        {scopeLabel}
        <span className="font-normal text-[var(--fg-muted)]">{` → ${rule.targetLabel}`}</span>
      </span>
      <span className="flex items-center gap-1">
        {editable && (
          <button type="button" className={ghostButtonClass} onClick={onEdit}><Pencil size={12} aria-hidden /> Düzenle</button>
        )}
        <button type="button" className={ghostButtonClass} onClick={onDelete}><Trash2 size={12} aria-hidden /> Sil</button>
      </span>
    </div>
  );
}
