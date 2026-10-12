import type { CompareFilters, EvalDiffFacetsDto } from '../../lib/api/omnichannel-quality';
import { tracePathLabel } from './botTraceRules';
import { EVAL_SCORE_DIMENSIONS } from './evalRules';
import { formInputClass } from './formClasses';

interface Props {
  facets: EvalDiffFacetsDto;
  value: CompareFilters;
  onChange: (next: CompareFilters) => void;
}

interface Option { value: string; label: string }

const DIMENSIONS: Option[] = EVAL_SCORE_DIMENSIONS
  .filter((dimension) => dimension.key !== 'turnSuccess')
  .map((dimension) => ({ value: dimension.key, label: `${dimension.short} · ${dimension.label} kaldı` }));

const asOptions = (values: readonly string[], label: (value: string) => string = (v) => v): Option[] =>
  values.map((value) => ({ value, label: label(value) }));

// Karşılaştırma süzgeçleri: seçenekler yalnız farklı turlarda geçen değerlerdir (sunucunun facet listesi).
export function EvalCompareFilters({ facets, value, onChange }: Props) {
  const set = (key: keyof CompareFilters) => (next: string) => onChange({ ...value, [key]: next });

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <FilterSelect label="Ülke" value={value.country} options={asOptions(facets.countries)} onChange={set('country')} />
      <FilterSelect label="Kanal" value={value.channel} options={asOptions(facets.channels)} onChange={set('channel')} />
      <FilterSelect label="Boyut" value={value.dimension} options={DIMENSIONS} onChange={set('dimension')} />
      <FilterSelect label="Hata etiketi" value={value.issue} options={asOptions(facets.issues)} onChange={set('issue')} />
      <FilterSelect label="Karar yolu" value={value.path} options={asOptions(facets.paths, tracePathLabel)} onChange={set('path')} />
      <FilterSelect label="Sonuç" value={value.outcome} options={asOptions(facets.outcomes)} onChange={set('outcome')} />
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string; options: readonly Option[]; onChange: (value: string) => void;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${formInputClass} min-w-0`}>
      <option value="">{label}: tümü</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}
