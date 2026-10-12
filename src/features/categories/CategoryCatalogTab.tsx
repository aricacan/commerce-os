'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { categoryApi, productApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { CategoryAdmin, ProductGridItem } from '../../types/api';
import { useMobile } from '../../hooks/useMobile';
import { ExportMenu, type ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { describeError } from '../../lib/errors';
import { CustomCheckbox } from '../../components/ui/CustomCheckbox';

const CATEGORY_PRODUCTS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'Ürün',  header: 'Ürün',  type: 'text' },
  { key: 'SKU',   header: 'SKU',   type: 'text' },
  { key: 'Fiyat', header: 'Fiyat', type: 'money', currency: 'TRY' },
  { key: 'Stok',  header: 'Stok',  type: 'int' },
];

interface FormState {
  id: number | null;
  name: string;
  nameEn: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { id: null, name: '', nameEn: '', isActive: true };
const PRODUCTS_PAGE_SIZE = 20;

export function CategoryCatalogTab() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryAdmin | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: categories, isLoading, isError } = useQuery({
    queryKey: ['categories-admin'],
    queryFn: categoryApi.list,
    staleTime: 30_000,
  });

  const filtered = (categories ?? []).filter((c) =>
    !search.trim() ||
    c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
    (c.nameEn ?? '').toLowerCase().includes(search.trim().toLowerCase())
  );

  const selected: CategoryAdmin | null =
    (selectedId != null && filtered.find((c) => c.id === selectedId)) || filtered[0] || null;

  const { data: productsResult, isLoading: productsLoading } = useQuery({
    queryKey: ['category-products', selected?.id, productSearch, productPage],
    queryFn: () => productApi.list({
      categoryId: selected!.id,
      search: productSearch || undefined,
      page: productPage,
      pageSize: PRODUCTS_PAGE_SIZE,
    }),
    enabled: selected != null,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (f: FormState) => {
      const body = { name: f.name.trim(), nameEn: f.nameEn.trim() || undefined, isActive: f.isActive };
      return f.id ? categoryApi.update(f.id, body) : categoryApi.create(body);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['categories-admin'] });
      queryClient.invalidateQueries({ queryKey: ['categories-master'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (!form.id && result && typeof result === 'object' && 'id' in result) {
        setSelectedId((result as { id: number }).id);
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      toast.success('Kategori kaydedildi.');
    },
    onError: (err: unknown) => setFormError(describeError(err)),
  });

  // Silme diyaloğu açılınca BEDELİ getir. Kategoriye bağlı dört tablo FK'de Cascade —
  // ERP kategori eşlemesi, fiyat hedefi, araç uyumluluk haritası ve öneriler silme ile
  // birlikte yok oluyordu ve kullanıcı bunu göremiyordu (10 Eyl 2026 denetimi).
  const { data: deleteUsage, isLoading: usageLoading } = useQuery({
    queryKey: ['category-usage', deleteTarget?.id],
    queryFn: () => categoryApi.usage(deleteTarget!.id),
    enabled: deleteTarget !== null,
  });

  const deleteMutation = useMutation({
    meta: { silentError: true } as const,
    // force yalnızca kullanıcı zincirleme kaybı GÖRDÜKTEN sonra gönderilir; döküm
    // yüklenmediyse force gitmez ve sunucu 409 ile durdurur (fail-closed).
    mutationFn: (id: number) => categoryApi.delete(id, deleteUsage?.hasCascadingDependents === true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-admin'] });
      queryClient.invalidateQueries({ queryKey: ['categories-master'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (deleteTarget && selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      setDeleteError(null);
      toast.success('Kategori silindi.');
    },
    onError: (err: unknown) => setDeleteError(describeError(err)),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(c: CategoryAdmin) {
    setForm({ id: c.id, name: c.name, nameEn: c.nameEn ?? '', isActive: c.isActive });
    setFormError(null);
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormError('Kategori adı zorunludur.');
      return;
    }
    saveMutation.mutate(form);
  }

  function selectCategory(id: number) {
    setSelectedId(id);
    setProductSearch('');
    setProductPage(1);
  }

  const products: ProductGridItem[] = productsResult?.items ?? [];
  const totalProducts = productsResult?.totalCount ?? 0;
  const totalProductPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PAGE_SIZE));

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Kategoriler yükleniyor...</div>;
  }

  if (isError) {
    return <div className="p-8 text-center text-xs text-rose-500">Kategoriler yüklenemedi.</div>;
  }

  return (
    <div className={`flex min-h-0 flex-1 ${isMobile ? 'flex-col' : 'flex-row'} gap-3.5`}>
      {/* Sol Panel: Kategori Listesi */}
      <aside className={`flex ${isMobile ? 'w-full' : 'w-[280px] shrink-0'} min-h-0 flex-col rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs`}>
        <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--border-soft)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-[var(--fg)]">Kategoriler</h2>
              <p className="text-ui-2xs text-[var(--fg-muted)]">{filtered.length} kategori</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-ui-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] hover:border-[var(--fg-muted)] transition cursor-pointer"
            >
              <Plus size={12} />
              <span>Yeni</span>
            </button>
          </div>

          <div className="relative w-full">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kategori ara…"
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-7 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Kategori bulunamadı.</div>
          ) : (
            filtered.map((c) => {
              const isSelected = c.id === selected?.id;
              return (
                <div
                  key={c.id}
                  onClick={() => selectCategory(c.id)}
                  className={`group flex items-center justify-between rounded-[4px] px-2.5 py-2 text-xs transition cursor-pointer border ${
                    isSelected
                      ? 'bg-[var(--card-hover)] border-[var(--border)] text-[var(--fg)] font-bold shadow-xs'
                      : 'text-[var(--fg)] hover:bg-[var(--bg-subtle)] border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">{c.name}</div>
                    {c.nameEn && (
                      <div className="truncate text-ui-xs text-[var(--fg-muted)] font-normal">
                        {c.nameEn}
                      </div>
                    )}
                  </div>

                  <div className="ml-2 flex items-center gap-1 shrink-0">
                    <span
                      title={isTr
                        ? `${c.differentProductCount ?? 0} farklı SKU (${c.productCount ?? 0} ERP satırı)`
                        : `${c.differentProductCount ?? 0} distinct SKUs (${c.productCount ?? 0} ERP rows)`}
                      className={`text-ui-2xs px-1.5 py-0.2 rounded-[3px] font-mono border ${
                      isSelected
                        ? 'bg-[var(--card)] text-[var(--fg)] border-[var(--border-soft)]'
                        : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] border-transparent'
                    }`}>
                      {c.differentProductCount ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                      className="h-6 w-6 rounded-[3px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-subtle)] transition text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); setDeleteError(null); }}
                      className="h-6 w-6 rounded-[3px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-rose-500 transition"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Sağ Panel: Kategoriye Ait Ürünler */}
      <section className="flex min-h-0 flex-1 flex-col rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
        {selected ? (
          <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-3">
              <div>
                <h3 className="text-xs font-bold text-[var(--fg)]">{selected.name}</h3>
                <p className="text-ui-xs text-[var(--fg-muted)]">{totalProducts} bağlı ürün</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-60">
                  <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                  <input
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
                    placeholder="Bu kategoride ara…"
                    className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-7 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                  />
                </div>

                <ExportMenu
                  filename={`${selected.name}-urunler`}
                  columns={CATEGORY_PRODUCTS_EXPORT_COLUMNS}
                  getData={() => products.map((p): ExportRow => ({
                    'Ürün': p.productName,
                    'SKU': p.supplierSKU ?? '',
                    'Fiyat': p.price ?? 0,
                    'Stok': p.stockQuantity ?? 0,
                  }))}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {productsLoading ? (
                <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Ürünler yükleniyor...</div>
              ) : products.length === 0 ? (
                <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Bu kategoriye bağlı ürün bulunmuyor.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-ui-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                      <th className="p-3">Ürün Adı</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-right">Fiyat</th>
                      <th className="p-3 text-right">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {products.map((p) => (
                      <tr key={p.productId} className="hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                        <td className="p-3 font-semibold text-[var(--fg)]">{p.productName}</td>
                        <td className="p-3 font-mono text-[var(--fg-muted)]">{p.supplierSKU ?? '—'}</td>
                        <td className="p-3 text-right font-mono tabular-nums font-semibold text-[var(--fg)]">
                          {p.price != null ? `₺${p.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-[var(--fg)] font-bold">{p.stockQuantity ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {totalProductPages > 1 && (
              <div className="p-2.5 px-4 border-t border-[var(--border-soft)] flex items-center justify-between text-xs text-[var(--fg-muted)]">
                <span>Sayfa {productPage} / {totalProductPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    disabled={productPage <= 1}
                    className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] disabled:opacity-30 cursor-pointer"
                  >
                    Önceki
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                    disabled={productPage >= totalProductPages}
                    className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] disabled:opacity-30 cursor-pointer"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Görüntülemek için soldan bir kategori seçin.</div>
        )}
      </section>

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[var(--fg)]">{form.id ? 'Kategori Düzenle' : 'Yeni Kategori'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
                <X size={14} />
              </button>
            </div>

            {formError && <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">{formError}</div>}

            <div className="space-y-2">
              <div>
                <label className="text-ui-xs text-[var(--fg-muted)] font-semibold uppercase block mb-1">Kategori Adı (TR)</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Örn: Yan Basamak"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="text-ui-xs text-[var(--fg-muted)] font-semibold uppercase block mb-1">Kategori Adı (EN)</label>
                <input
                  value={form.nameEn}
                  onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                  placeholder="Örn: Side Steps"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer font-semibold pt-1">
                <CustomCheckbox
                  checked={form.isActive}
                  onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <span>Aktif Kategori</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-soft)]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 px-3 rounded-[4px] border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="h-8 px-3.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer disabled:opacity-40"
              >
                {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-[4px] border border-rose-500/30 bg-[var(--card)] p-4 shadow-lg space-y-3">
            <h3 className="font-bold text-xs text-[var(--fg)]">Kategori Silinsin mi?</h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              <strong>{deleteTarget.name}</strong> kategorisi silinecek.
            </p>

            {usageLoading && (
              <p className="text-xs text-[var(--fg-muted)]">Bağlı kayıtlar kontrol ediliyor…</p>
            )}

            {deleteUsage?.hasBlockingDependents && (
              <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs leading-relaxed">
                Bu kategori silinemez:{' '}
                {[
                  deleteUsage.platformMappingCount > 0 && `${deleteUsage.platformMappingCount} platform eşleştirmesi`,
                  deleteUsage.childCategoryCount > 0 && `${deleteUsage.childCategoryCount} alt kategori`,
                ].filter(Boolean).join(' ve ')}{' '}
                bağlı. Önce onları kaldırın.
              </div>
            )}

            {deleteUsage?.hasCascadingDependents && !deleteUsage.hasBlockingDependents && (
              <div className="p-2 rounded-[3px] bg-amber-500/10 text-amber-600 text-xs leading-relaxed space-y-1">
                <p className="font-bold">Bu kayıtlar da SİLİNECEK:</p>
                <ul className="list-disc pl-4">
                  {deleteUsage.sourceCategoryLinkCount > 0 && (
                    <li>{deleteUsage.sourceCategoryLinkCount} ERP kategori eşlemesi</li>
                  )}
                  {deleteUsage.priceTargetCount > 0 && (
                    <li>{deleteUsage.priceTargetCount} kategori fiyat hedefi</li>
                  )}
                  {deleteUsage.fitmentMapCount > 0 && (
                    <li>{deleteUsage.fitmentMapCount} araç uyumluluk eşlemesi</li>
                  )}
                  {deleteUsage.suggestionCount > 0 && <li>{deleteUsage.suggestionCount} kategori önerisi</li>}
                </ul>
              </div>
            )}

            {deleteUsage && deleteUsage.productCount > 0 && (
              <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
                {deleteUsage.productCount} ürün kategorisiz kalacak (ürünler silinmez).
              </p>
            )}

            {deleteError && <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">{deleteError}</div>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-8 px-3 rounded-[4px] border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending || usageLoading || deleteUsage?.hasBlockingDependents === true}
                className="h-8 px-3.5 rounded-[4px] bg-rose-500 text-xs font-bold text-white shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-40"
              >
                {deleteMutation.isPending
                  ? 'Siliniyor...'
                  : deleteUsage?.hasCascadingDependents
                    ? 'Yine de sil'
                    : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
