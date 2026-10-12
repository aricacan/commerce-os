'use client';

import type { ChannelDto } from '../../lib/api/omnichannel';
import type { DatasetConversationFilters } from '../../lib/api/omnichannel-quality';
import { formInputClass } from './formClasses';
import { channelCountries } from './qualityCenterRules';
import { QualityField } from './QualityField';

interface Props {
  value: DatasetConversationFilters;
  channels: readonly ChannelDto[];
  onChange: (patch: Partial<DatasetConversationFilters>) => void;
}

type TriState = 'all' | 'yes' | 'no';

const toTri = (value: boolean | null): TriState => {
  if (value === null) return 'all';
  return value ? 'yes' : 'no';
};
const fromTri = (value: string): boolean | null => (value === 'all' ? null : value === 'yes');

// Veri seti kurma süzgeçleri: tarih aralığı (son mesaj günü), kanal, ülke, devirli ve "Yanlış" işaretli.
export function QualityDatasetFilters({ value, channels, onChange }: Props) {
  const changeChannel = (raw: string) => onChange({ channelId: raw ? Number(raw) : null });

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-6">
      <QualityField label="Başlangıç">
        <input type="date" value={value.from} onChange={(e) => onChange({ from: e.target.value })} className={formInputClass} />
      </QualityField>
      <QualityField label="Bitiş">
        <input type="date" value={value.to} onChange={(e) => onChange({ to: e.target.value })} className={formInputClass} />
      </QualityField>
      <QualityField label="Kanal">
        <select value={value.channelId ?? ''} onChange={(e) => changeChannel(e.target.value)} className={formInputClass}>
          <option value="">Tümü</option>
          {channels.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
        </select>
      </QualityField>
      <QualityField label="Ülke">
        <select value={value.country} onChange={(e) => onChange({ country: e.target.value })} className={formInputClass}>
          <option value="">Tümü</option>
          {channelCountries(channels).map((country) => <option key={country} value={country}>{country}</option>)}
        </select>
      </QualityField>
      <QualityField label="Devir">
        <TriSelect value={toTri(value.hasHandoff)} yes="Devirli" no="Devirsiz" onChange={(v) => onChange({ hasHandoff: fromTri(v) })} />
      </QualityField>
      <QualityField label='"Yanlış" işareti'>
        <TriSelect value={toTri(value.flagged)} yes="İşaretli" no="İşaretsiz" onChange={(v) => onChange({ flagged: fromTri(v) })} />
      </QualityField>
    </div>
  );
}

function TriSelect({ value, yes, no, onChange }: { value: TriState; yes: string; no: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={formInputClass}>
      <option value="all">Tümü</option>
      <option value="yes">{yes}</option>
      <option value="no">{no}</option>
    </select>
  );
}
