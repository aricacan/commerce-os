'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, SectionCard, formatDateTime } from './shared';
import {
  useCreateErpisDataset, useDeleteErpisMapping, useErpisDatasets, useErpisMappings,
} from '@/hooks/erpis/useErpis';
import {
  ERPIS_DATASET_KIND_LABELS, ERPIS_FIELD_LABELS, type ErpisDatasetKind, type ErpisFieldKey,
} from '@/lib/api';

// Raporun nasıl işleneceği. Tip yükleme anında değil TANIM anında seçiliyor çünkü aynı
// rapor her ay aynı şekilde işlenmeli.
const KIND_OPTIONS = (Object.keys(ERPIS_DATASET_KIND_LABELS) as ErpisDatasetKind[])
  .map((value) => ({ value, label: ERPIS_DATASET_KIND_LABELS[value] }));

// Erpis'in bilinen boş-değer yer tutucuları. İki farklı yazım da gerçek dosyalarda geçiyor.
const DEFAULT_SENTINELS = ['X', 'YOK', 'HgerpisHg', 'HgErpisHg'];

// Rapor tipleri ve kayıtlı kolon eşleme şablonları.
//
// Şablon buradan OLUŞTURULMAZ: eşleme, gerçek bir dosyanın başlıklarına bağlıdır ve
// yükleme sihirbazında kaydedilir. Burada yalnızca ne kaydedildiği görülür ve silinir.
export function MappingsTab() {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ErpisDatasetKind>('Generic');
  // Erpis boş hücre yerine yer tutucu yazıyor; temizlenmezse bunlar veri sanılır.
  // Bilinen değerler hazır geliyor, kullanıcı kendi kurulumuna göre düzeltebiliyor.
  const [sentinels, setSentinels] = useState(DEFAULT_SENTINELS.join(', '));
  const [error, setError] = useState<string | null>(null);

  const datasets = useErpisDatasets();
  const mappings = useErpisMappings();
  const createDataset = useCreateErpisDataset();
  const deleteMapping = useDeleteErpisMapping();

  async function handleCreateDataset() {
    if (!key.trim() || !name.trim()) return;
    setError(null);
    try {
      await createDataset.mutateAsync({
        key: key.trim(),
        name: name.trim(),
        kind,
        nullSentinels: sentinels.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setKey('');
      setName('');
      setKind('Generic');
      setSentinels(DEFAULT_SENTINELS.join(', '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rapor tipi eklenemedi.');
    }
  }

  if (datasets.error || mappings.error) {
    const err = datasets.error ?? mappings.error;
    return <div className="p-4"><ErrorState text={err instanceof Error ? err.message : undefined} /></div>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {error && <ErrorState text={error} />}

      <div data-tour="erpis-mappings-create">
        <SectionCard title="Yeni Rapor Tipi">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">Ad</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Satış Faturaları"
                className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[12px] text-[var(--fg)] outline-none"
              />
            </label>
            <label className="flex w-48 flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">Anahtar</span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sales-invoices"
                className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[12px] text-[var(--fg)] outline-none"
              />
            </label>
            <label className="flex w-40 flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">Davranış</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ErpisDatasetKind)}
                className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[12px] text-[var(--fg)] outline-none"
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
                Boş sayılacak değerler
              </span>
              <input
                value={sentinels}
                onChange={(e) => setSentinels(e.target.value)}
                placeholder="X, YOK"
                className="rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 text-[12px] text-[var(--fg)] outline-none"
              />
            </label>
            <button
              type="button"
              onClick={handleCreateDataset}
              disabled={!key.trim() || !name.trim() || createDataset.isPending}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={1.8} />
              Ekle
            </button>
          </div>
        </SectionCard>
      </div>

      <div data-tour="erpis-mappings-types">
        <SectionCard title="Rapor Tipleri">
          {(datasets.data?.length ?? 0) === 0 ? (
            <EmptyState title="Rapor tipi tanımlı değil" hint="Yükleme yapabilmek için en az bir tip gerekir." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(datasets.data ?? []).map((dataset) => (
                <span
                  key={dataset.id}
                  className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--fg)]"
                >
                  {dataset.name}
                  <span className="ml-1.5 font-normal text-[var(--fg-muted)]">{dataset.key}</span>
                </span>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div data-tour="erpis-mappings-templates">
        <SectionCard title="Kayıtlı Eşleme Şablonları">
          {(mappings.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="Şablon yok"
              hint="Yükleme sırasında «Şablon olarak kaydet» derseniz burada görünür."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {(mappings.data ?? []).map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-bold text-[var(--fg)]">{mapping.name}</span>
                      <span className="text-[10.5px] text-[var(--fg-muted)]">
                        {mapping.datasetName} • {formatDateTime(mapping.createdAt)} • {mapping.sourceHeaders.length} kolon
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Şablonu sil"
                      onClick={() => deleteMapping.mutate(mapping.id)}
                      className="rounded-[4px] border border-[var(--border-soft)] p-1 text-[var(--fg-muted)]"
                    >
                      <Trash2 size={12} strokeWidth={1.8} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {Object.entries(mapping.mapping.fields).map(([field, value]) => (
                      <span
                        key={field}
                        className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10.5px] text-[var(--fg-muted)]"
                      >
                        {ERPIS_FIELD_LABELS[field as ErpisFieldKey] ?? field} ← {value?.column}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
