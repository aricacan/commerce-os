'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { returnsApi, type ReturnDocument, type ReturnLineConditionName } from '../../lib/api/returns';
import { manualOrderApi, type ManualOrderProduct } from '../../lib/api/manual-orders';
import { describeError } from '../../lib/errors';

interface Props {
  returnId: number;
  /** Ürün araması mağaza içinde yapılır — aynı SKU başka mağazada başka üründür. */
  storeId: number;
  onAdded: (document: ReturnDocument) => void;
}

const SEARCH_DEBOUNCE_MS = 300;
const CONDITIONS: ReadonlyArray<{ id: ReturnLineConditionName; label: string }> = [
  { id: 'Arizali', label: 'Arızalı (karantina)' },
  { id: 'Saglam', label: 'Sağlam (rafa döner)' },
];

/**
 * Taslak iade belgesine satır ekleme.
 *
 * NEDEN GEREKLİ: talepten üretilen belge, SKU eşleşmediğinde ya da talep tutar taşımadığında
 * SATIRSIZ açılır (bilerek — uydurma satır, tutarı doğrudan cariye yazılan bir hata olurdu).
 * Bu form olmadan o belgeler onaylanamaz ve ölü kalırdı: backend satırsız iadeyi reddediyor.
 */
export function AddReturnLineForm({ returnId, storeId, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ManualOrderProduct[]>([]);
  const [selected, setSelected] = useState<ManualOrderProduct | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [condition, setCondition] = useState<ReturnLineConditionName>('Arizali');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await manualOrderApi.products(storeId, search.trim() || undefined);
        if (!cancelled) setProducts(rows);
      } catch (e) {
        if (!cancelled) setError(describeError(e));
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search, storeId]);

  function pick(product: ManualOrderProduct) {
    setSelected(product);
    // Satis fiyati BASLANGIC degeri, dayatma degil: iade tutari kampanyali fiyattan ya da
    // kismi iadeden farkli olabilir. Operator ustune yazabilir.
    setUnitPrice(product.price.toString());
  }

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      onAdded(await returnsApi.addLine(returnId, {
        productId: selected.id,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        condition,
      }));
      setOpen(false);
      setSelected(null);
      setSearch('');
      setQuantity('1');
      setUnitPrice('');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  const gecerli =
    selected !== null
    && Number.isInteger(Number(quantity)) && Number(quantity) > 0
    && Number.isFinite(Number(unitPrice)) && Number(unitPrice) >= 0;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit cursor-pointer items-center gap-1 rounded-[2px] border border-border-soft bg-bg-subtle/50 px-2 py-1 text-[11px] font-medium text-fg-muted hover:border-border hover:text-fg"
      >
        <Plus size={11} />
        Satır Ekle
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[2px] border border-border-soft bg-bg-subtle/40 p-2.5">
      <input
        type="search"
        value={search}
        autoFocus
        onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
        placeholder="Ürün adı, SKU veya barkod ara…"
        className="h-7 rounded-[2px] border border-border-soft bg-card px-2 text-[11px] text-fg"
      />

      {!selected && products.length > 0 && (
        <ul className="flex max-h-40 list-none flex-col gap-0.5 overflow-y-auto p-0">
          {products.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => pick(product)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[2px] px-2 py-1 text-left text-[11px] hover:bg-card"
              >
                <span className="min-w-0 flex-1 truncate text-fg">{product.name}</span>
                <span className="shrink-0 font-mono text-fg-muted">{product.sku}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="flex flex-wrap items-end gap-2">
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-fg" title={selected.name}>
            {selected.name}
          </span>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-fg-muted">Adet</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-7 w-16 rounded-[2px] border border-border-soft bg-card px-1.5 text-[11px] text-fg"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-fg-muted">Birim fiyat</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="h-7 w-24 rounded-[2px] border border-border-soft bg-card px-1.5 text-[11px] text-fg"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] text-fg-muted">Durum</span>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ReturnLineConditionName)}
              className="h-7 rounded-[2px] border border-border-soft bg-card px-1.5 text-[11px] text-fg"
            >
              {CONDITIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && <p className="m-0 text-[11px] text-danger">{error}</p>}

      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={() => { setOpen(false); setSelected(null); setError(null); }}
          className="h-7 cursor-pointer rounded-[2px] border border-border-soft px-2 text-[11px] text-fg-muted hover:text-fg"
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!gecerli || busy}
          className="h-7 cursor-pointer rounded-[2px] border border-border bg-card px-2.5 text-[11px] font-semibold text-fg hover:bg-card-hover disabled:opacity-40"
        >
          {busy ? 'Ekleniyor…' : 'Ekle'}
        </button>
      </div>
    </div>
  );
}
