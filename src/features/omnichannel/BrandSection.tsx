import type { ReactNode } from 'react';
import { Pencil, Tags, Trash2 } from 'lucide-react';
import type { BrandDto } from '../../lib/api/omnichannel';

const UNBRANDED_NAME = 'Markasız';
const NO_COUNTRY_LABEL = 'Ülke yok';

interface Props {
  // null = markasız kanallar bölümü (düzenlenemez).
  brand: BrandDto | null;
  channelCount: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}

const iconButtonClass =
  'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[var(--fg-muted)] outline-none transition-colors hover:bg-[var(--bg-subtle)] focus-visible:ring-2 focus-visible:ring-[var(--fg)]';

// Bir markanın kanal kartlarını saran bölüm: başlıkta ad, ülke, kanal sayısı ve marka eylemleri.
export function BrandSection({ brand, channelCount, canEdit, onEdit, onDelete, children }: Props) {
  const name = brand?.name ?? UNBRANDED_NAME;
  const subtitle = [brand ? brand.defaultCountry ?? NO_COUNTRY_LABEL : null, `${channelCount} kanal`]
    .filter(Boolean)
    .join(' · ');

  return (
    <section aria-label={name} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Tags size={16} className="shrink-0 text-[var(--fg-muted)]" />
          <h3 className="truncate text-ui-md font-bold text-[var(--fg)]">{name}</h3>
          <span className="shrink-0 text-ui-xs text-[var(--fg-muted)]">{subtitle}</span>
          {brand && !brand.isActive && (
            <span className="shrink-0 rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-ui-2xs font-semibold text-[var(--fg-muted)]">
              Pasif
            </span>
          )}
        </div>
        {brand && canEdit && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button type="button" title="Markayı düzenle" aria-label={`${name} markasını düzenle`} onClick={onEdit} className={`${iconButtonClass} hover:text-[var(--fg)]`}>
              <Pencil size={14} />
            </button>
            <button type="button" title="Markayı sil" aria-label={`${name} markasını sil`} onClick={onDelete} className={`${iconButtonClass} hover:text-[var(--danger)]`}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      {children}
    </section>
  );
}
