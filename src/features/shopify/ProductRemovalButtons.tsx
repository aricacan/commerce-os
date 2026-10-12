'use client';

import { Archive, Trash2 } from 'lucide-react';
import { ghostButtonClass } from './styles';

interface Props {
  title: string;
  isArchived: boolean;
  busy: boolean;
  onArchive: () => void;
  onDelete: () => void;
}

// "Arşivle" (güvenli) ve "Sil" (kalıcı) düğmeleri; ürün satırında ve düzenleme görünümünde ortak.
export function ProductRemovalButtons({ title, isArchived, busy, onArchive, onDelete }: Props) {
  return (
    <span className="flex gap-1">
      <button type="button" className={ghostButtonClass} aria-label={`${title} arşivle`} disabled={busy || isArchived} onClick={onArchive}>
        <Archive size={14} aria-hidden /> Arşivle
      </button>
      <button type="button" className={ghostButtonClass} aria-label={`${title} sil`} disabled={busy} onClick={onDelete}>
        <Trash2 size={14} aria-hidden /> Sil
      </button>
    </span>
  );
}
