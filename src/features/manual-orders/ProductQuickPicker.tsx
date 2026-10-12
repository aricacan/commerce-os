'use client';

import { PackagePlus, Search } from 'lucide-react';
import type { ManualOrderProduct } from '../../lib/api/manual-orders';
import { useI18n } from '../../lib/i18n';
import { fieldClass, money } from './manual-order-ui';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  products: ManualOrderProduct[];
  loading: boolean;
  disabled: boolean;
  onAdd: (product: ManualOrderProduct) => void;
}

export function ProductQuickPicker({ search, onSearchChange, products, loading, disabled, onAdd }: Props) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';

  return (
    <section style={{ borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', overflow: 'hidden' }}>
      <div style={{ padding: 10, borderBottom: '1px solid var(--border-soft)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>
          {isTr ? 'Hızlı Ürün Ekle' : 'Quick Add Product'}
        </h3>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isTr ? 'SKU, barkod veya ürün adı…' : 'SKU, barcode or product name…'}
            className={fieldClass}
            style={{ paddingLeft: 32, height: 32, fontSize: 11.5 }}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
      </div>
      <div style={{ maxHeight: 180, overflowY: 'auto', padding: 4 }}>
        {loading ? (
          <p style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
            {isTr ? 'Ürünler aranıyor…' : 'Searching products…'}
          </p>
        ) : products.length === 0 ? (
          search.trim() ? (
            <p style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'var(--fg-muted)', margin: 0 }}>
              {isTr ? 'Ürün bulunamadı.' : 'No products found.'}
            </p>
          ) : null
        ) : (
          products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onAdd(product)}
              disabled={disabled}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 8px',
                borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', flexShrink: 0 }}>
                <PackagePlus size={13} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {product.name}
                </p>
                <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--fg-muted)' }}>
                  {product.sku} · {isTr ? 'Stok' : 'Stock'} {product.stockQuantity} · {isTr ? 'Kutu' : 'Box'} {product.boxCode ?? '—'} · {product.desi.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} desi
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{money(product.price, 'TRY', lang)}</p>
                <p style={{ margin: 0, fontSize: 9.5, color: 'var(--fg-muted)' }}>
                  {isTr ? 'Başabaş' : 'Break-even'} {product.breakEvenPrice != null ? money(product.breakEvenPrice, 'TRY', lang) : '—'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
