'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { palette } from '../shared/design';
import {
  sonarExcelSuppliers,
  type SupplierSuggestionDto,
} from '../../lib/api/sonar';

/**
 * Excel'de verisi olan ama sistemde sitesi olmayan tedarikçiler.
 *
 * Bunları sessizce atmak, kullanıcının elindeki karşılaştırma bilgisini çöpe
 * atmaktır. Site eklendiğinde o tedarikçiden CANLI fiyat da çekilebilir hale
 * gelir — Excel'deki veri yalnız bir anlık görüntüdür.
 */
export function SupplierSuggestions({ importBatchId, onAddSite }: {
  importBatchId: number;
  onAddSite: (supplier: string) => void;
}) {
  const [items, setItems] = useState<SupplierSuggestionDto[]>([]);

  const load = useCallback(async () => {
    try {
      setItems(await sonarExcelSuppliers.suggestions(importBatchId));
    } catch {
      // Öneri gösterilememesi alımı etkilemez; sessizce boş kalır.
      setItems([]);
    }
  }, [importBatchId]);

  useEffect(() => { void load(); }, [load]);

  if (items.length === 0) return null;

  return (
    <div
      className="mt-3 flex flex-col gap-2 rounded-lg p-3"
      style={{ background: palette.warningSoft, border: `1px solid ${palette.warning}33` }}
    >
      <span className="text-xs font-medium" style={{ color: palette.warningText }}>
        Bu dosyada tanımadığımız tedarikçi verisi var
      </span>
      <span className="text-xs" style={{ color: palette.textMuted }}>
        Site olarak eklerseniz bu tedarikçilerden canlı fiyat ve stok da
        çekebiliriz. Excel&apos;deki veri yalnız bir anlık görüntüdür.
      </span>

      <div className="mt-1 flex flex-col gap-1.5">
        {items.map((s) => (
          <div
            key={s.supplier}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
            style={{ background: palette.surface }}
          >
            <span className="font-medium" style={{ color: palette.textStrong }}>
              {s.supplier}
            </span>
            <span style={{ color: palette.textMuted }}>
              {s.rowsWithCode} satırda kod
              {s.rowsWithPrice > 0 && ` · ${s.rowsWithPrice} satırda fiyat`}
            </span>
            {s.sampleCodes.length > 0 && (
              <span className="font-mono" style={{ color: palette.textFaint }}>
                {s.sampleCodes.join(', ')}
              </span>
            )}

            <button
              type="button"
              onClick={() => onAddSite(s.supplier)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1"
              style={{ border: `1px solid ${palette.border}`, color: palette.text }}
            >
              <Plus size={12} /> Site olarak ekle
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
