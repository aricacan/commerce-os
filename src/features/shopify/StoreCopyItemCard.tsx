import type { ShopifyCopyItemDto } from '../../lib/api/shopify-ai-catalog';
import { FormSelect } from '../../components/ui/FormSelect';
import { surfaceCard } from '../shared/design';
import { StatusBadge } from './StatusBadge';
import { modeOptions, type CopyDraft } from './storeCopyRules';
import { fieldClass } from './styles';

interface Props {
  item: ShopifyCopyItemDto;
  draft: CopyDraft;
  onChange: (draft: CopyDraft) => void;
}

const textAreaClass = `${fieldClass} h-auto min-h-16 py-1.5`;

// Önizleme satırı: kaynak ürün, çevrilmiş alanlar (düzenlenebilir), hedefte aynı SKU durumu ve işlem seçimi.
export function StoreCopyItemCard({ item, draft, onChange }: Props) {
  const set = (patch: Partial<CopyDraft>) => onChange({ ...draft, ...patch });

  return (
    <li className={`${surfaceCard} flex flex-col gap-2 p-3`}>
      <header className="flex flex-wrap items-center gap-2">
        <h4 className="m-0 min-w-0 flex-1 basis-48 break-words text-ui-sm font-bold text-fg">{item.sourceTitle}</h4>
        <StatusBadge label={item.translated ? 'Çevrildi' : 'Çevrilmedi'} tone={item.translated ? 'success' : 'warning'} />
        {item.existingTargetProductId !== null && <StatusBadge label={`Hedefte var: ${item.existingTargetTitle ?? ''}`} tone="info" />}
      </header>
      <p className="m-0 text-ui-2xs text-fg-muted">
        SKU: {item.variants.map((v) => v.sku ?? '—').join(', ')} · {item.imageUrls.length} görsel · {item.variants.length} varyant
        {item.productType && ` · ${item.productType}`}
      </p>
      {item.warnings.map((warning) => <p key={warning} role="status" className="m-0 text-ui-2xs text-warning">{warning}</p>)}

      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Başlık
        <input value={draft.title} onChange={(e) => set({ title: e.target.value })} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Açıklama (HTML)
        <textarea value={draft.descriptionHtml} onChange={(e) => set({ descriptionHtml: e.target.value })} className={textAreaClass} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          SEO başlığı
          <input value={draft.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          SEO açıklaması
          <input value={draft.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} className={fieldClass} />
        </label>
      </div>

      <div className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        İşlem
        <FormSelect value={draft.mode} options={modeOptions(item)} onChange={(mode) => set({ mode })} className="max-w-72" />
      </div>
    </li>
  );
}
