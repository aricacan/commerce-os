'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { SHOPIFY_CATALOG_AUTHORITY } from '../../lib/api/shopify';
import { surfaceCard } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { explorerErrorText } from './explorerRules';
import { ImportMappingStep } from './ImportMappingStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import { ImportResultStep } from './ImportResultStep';
import { readImportFile } from './importFile';
import {
  buildImportRows, EMPTY_MAPPING, guessMapping, validateMapping, withoutCatalogFields,
  type ColumnMapping, type ParsedSheet,
} from './importRules';
import { primaryButtonClass } from './styles';
import { useBulkImport } from './useBulkImport';
import { useShopifyStores } from './useShopifyStores';

interface Props {
  storeId: number;
}

// Toplu içe aktarma: .xlsx/.csv yükle → sütun eşle → önizle (mevcut → yeni) → onayla → sonuç raporu.
// Yalnız SKU ile eşlenen MEVCUT varyantlar güncellenir; ürün oluşturulmaz.
export function ImportTab({ storeId }: Props) {
  const { notify } = useFeedback();
  const stores = useShopifyStores();
  const catalogLocked = stores.data?.find((s) => s.id === storeId)?.catalogAuthority === SHOPIFY_CATALOG_AUTHORITY.Erp;
  const fileInput = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [reading, setReading] = useState(false);
  const bulk = useBulkImport(storeId);

  const startOver = () => {
    setSheet(null);
    setMapping(EMPTY_MAPPING);
    bulk.reset();
  };

  const loadFile = async (file: File) => {
    setReading(true);
    try {
      const parsed = await readImportFile(file);
      const guessed = guessMapping(parsed.headers);
      setSheet(parsed);
      setMapping(catalogLocked ? withoutCatalogFields(guessed) : guessed);
    } catch (e) {
      notify.error(explorerErrorText(e));
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const preview = async () => {
    if (!sheet) return;
    const rows = buildImportRows(sheet, mapping);
    const problem = validateMapping(mapping, catalogLocked, rows.length);
    if (problem) return notify.error(problem);
    await bulk.runPreview(rows);
  };

  return (
    <section className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label="Toplu içe aktarma">
      <header className="flex flex-col gap-1">
        <h3 className="m-0 text-ui-sm font-bold text-fg">Excel / CSV ile toplu güncelleme</h3>
        <p className="m-0 text-ui-2xs text-fg-muted">
          SKU ile eşleşen mevcut ürünlerin fiyat, stok, başlık, açıklama ve durumunu günceller; yeni ürün oluşturmaz. Önce önizlenir, onayınızla yazılır.
        </p>
      </header>

      {catalogLocked && (
        <p role="note" className="m-0 text-ui-xs text-warning">
          Bu mağazanın katalog yetkisi ERP: fiyat ve stok sütunları içe aktarılamaz; başlık, açıklama ve durum güncellenebilir.
        </p>
      )}

      {bulk.result && <ImportResultStep result={bulk.result} onDone={startOver} />}
      {!bulk.result && bulk.progress && <p className="m-0 text-ui-xs text-fg-muted" role="status">Uygulanıyor… {bulk.progress.done}/{bulk.progress.total} grup</p>}
      {!bulk.result && !bulk.progress && bulk.preview && (
        <ImportPreviewStep preview={bulk.preview} busy={bulk.busy} onApply={(confirmed) => void bulk.apply(confirmed)} onBack={bulk.reset} />
      )}
      {!bulk.result && !bulk.progress && !bulk.preview && sheet && (
        <ImportMappingStep
          sheet={sheet} mapping={mapping} catalogLocked={catalogLocked} busy={bulk.busy}
          onChange={setMapping} onPreview={() => void preview()} onCancel={startOver}
        />
      )}
      {!bulk.result && !bulk.preview && !sheet && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput} type="file" accept=".xlsx,.csv" className="sr-only" aria-label="İçe aktarma dosyası"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) void loadFile(file); }}
          />
          <button type="button" className={primaryButtonClass} disabled={reading} onClick={() => fileInput.current?.click()}>
            <Upload size={14} aria-hidden /> {reading ? 'Okunuyor…' : 'Dosya seç (.xlsx / .csv)'}
          </button>
        </div>
      )}
    </section>
  );
}
