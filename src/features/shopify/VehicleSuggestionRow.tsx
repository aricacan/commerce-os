import type { ShopifyVehicleCollectionSuggestionDto } from '../../lib/api/shopify-ai-catalog';
import { StatusBadge } from './StatusBadge';
import { fieldClass } from './styles';
import { CheckboxField } from './FormControls';

interface Props {
  row: ShopifyVehicleCollectionSuggestionDto;
  title: string;
  checked: boolean;
  onToggle: () => void;
  onTitleChange: (title: string) => void;
}

// Tek öneri satırı: seç, adı düzenle. Model satırı markanın altında girintilidir (menü hiyerarşisini yansıtır).
export function VehicleSuggestionRow({ row, title, checked, onToggle, onTitleChange }: Props) {
  return (
    <li className={`flex flex-wrap items-center gap-2 rounded-md border border-border-soft p-2 ${row.model === null ? '' : 'ml-6'}`}>
      <CheckboxField checked={checked} onChange={() => onToggle()}><span className="sr-only">{`${row.title} seç`}</span></CheckboxField>
      <input
        value={title} onChange={(e) => onTitleChange(e.target.value)} aria-label={`${row.title} adı`}
        className={`${fieldClass} min-w-0 flex-1 basis-48`}
      />
      <span className="text-ui-2xs text-fg-muted">{row.productCount} ürün</span>
      {row.existingCollectionId !== null && <StatusBadge label="Mağazada var" tone="info" />}
      <span className="min-w-0 basis-full truncate text-ui-2xs text-fg-muted" title={row.sampleTitles.join(' · ')}>
        Örnek: {row.sampleTitles.join(' · ')}
      </span>
    </li>
  );
}
