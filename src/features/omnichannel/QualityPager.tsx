import { ChevronLeft, ChevronRight } from 'lucide-react';
import { secondaryButtonClass } from './formClasses';
import { pageCountOf } from './qualityCenterRules';

interface Props {
  page: number;
  total: number;
  loading: boolean;
  label: string;
  onChange: (page: number) => void;
}

// Kalite Merkezi listelerinin sayfa çubuğu (0'dan başlayan sayfa). Tek sayfada görünmez.
export function QualityPager({ page, total, loading, label, onChange }: Props) {
  const pages = pageCountOf(total);
  if (pages <= 1) return null;

  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2">
      <button type="button" className={secondaryButtonClass} disabled={page === 0 || loading} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={13} aria-hidden /> Önceki
      </button>
      <span aria-live="polite" className="text-ui-xs font-semibold tabular-nums text-fg-muted">Sayfa {page + 1} / {pages}</span>
      <button
        type="button" className={secondaryButtonClass} disabled={page + 1 >= pages || loading} onClick={() => onChange(page + 1)}
      >
        Sonraki <ChevronRight size={13} aria-hidden />
      </button>
    </nav>
  );
}
