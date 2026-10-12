import type { ShopifyCopyApplyRowDto, ShopifyCopyItemDto } from '../../lib/api/shopify-ai-catalog';
import { StatusBadge } from './StatusBadge';
import { COPY_OUTCOME_LABELS } from './storeCopyRules';

interface Props {
  rows: ShopifyCopyApplyRowDto[];
  items: ShopifyCopyItemDto[];
}

// Uygulama sonucu: satır başına durum, hata ve notlar (ör. bir görsel eklenemedi). Başarısızlık sessiz kalmaz.
export function StoreCopyResultList({ rows, items }: Props) {
  const titleOf = (id: number) => items.find((item) => item.sourceProductId === id)?.sourceTitle ?? `#${id}`;

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Kopyalama sonucu">
      {rows.map((row) => (
        <li key={row.sourceProductId} className="flex flex-col gap-0.5 text-ui-xs text-fg">
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge label={COPY_OUTCOME_LABELS[row.outcome]} tone={row.outcome === 'Failed' ? 'danger' : row.outcome === 'Skipped' ? 'neutral' : 'success'} />
            {titleOf(row.sourceProductId)}
          </span>
          {row.errors.map((error) => <span key={error} role="alert" className="text-ui-2xs text-danger">{error}</span>)}
          {row.notes.map((note) => <span key={note} className="text-ui-2xs text-warning">{note}</span>)}
        </li>
      ))}
    </ul>
  );
}
