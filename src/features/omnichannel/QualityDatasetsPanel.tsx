'use client';

import { useState } from 'react';
import { Database, Plus } from 'lucide-react';
import { qualityApi } from '../../lib/api/omnichannel-quality';
import { secondaryButtonClass } from './formClasses';
import { QualityDatasetBuilder } from './QualityDatasetBuilder';
import { QualityDatasetRow } from './QualityDatasetRow';
import { QualityDatasetUpload } from './QualityDatasetUpload';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useBotPipelines } from './useBotPipelines';
import { useServerResource } from './useServerResource';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

const loadDatasets = () => qualityApi.getDatasets();

// Değerlendirme veri setleri: canlı konuşmalardan seçerek kur ya da JSON yükle; aynı adla kayıt yeni sürüm olur. Set
// kişisel veri taşır — yalnız veritabanında durur, yalnız yönetici indirir.
export function QualityDatasetsPanel({ onOpenConversation }: Props) {
  const datasets = useServerResource(loadDatasets, 'datasets');
  const pipelines = useBotPipelines();
  const [building, setBuilding] = useState(false);
  const items = datasets.data ?? [];

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-busy={datasets.loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-fg-muted" aria-hidden />
          <h3 className="m-0 text-ui-sm font-bold text-fg">Veri setleri</h3>
        </div>
        <button type="button" className={secondaryButtonClass} onClick={() => setBuilding((open) => !open)} aria-expanded={building}>
          <Plus size={13} aria-hidden /> {building ? 'Kurmayı kapat' : 'Canlı konuşmalardan kur'}
        </button>
      </div>

      {datasets.updatePending ? <UpdatePendingNotice /> : (
        <>
          {building && (
            <QualityDatasetBuilder
              onOpenConversation={onOpenConversation}
              onBuilt={() => { setBuilding(false); datasets.reload(); }}
            />
          )}
          <QualityDatasetUpload onUploaded={datasets.reload} />
          {datasets.error && <p role="alert" className="m-0 text-ui-xs text-danger">{datasets.error}</p>}
          {!datasets.loading && !datasets.error && items.length === 0 && (
            <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
              Henüz veri seti yok. Canlı konuşmalardan kurun ya da bir JSON dosyası yükleyin.
            </p>
          )}
          {items.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {items.map((dataset) => (
                <QualityDatasetRow key={dataset.id} dataset={dataset} pipelines={pipelines.data} onChanged={datasets.reload} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
