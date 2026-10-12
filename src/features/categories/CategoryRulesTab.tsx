'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Search, Power, Sparkles, RefreshCw } from 'lucide-react';
import { categoryRuleApi, categoryApi, aiSettingsApi, toCategoryAiProvider, type CategoryAiProvider } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import type { CategoryRule } from '../../types/api';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { applyOptimistic, rollbackOptimistic } from '../../lib/optimistic';

const RULES_KEY = ['category-rules'] as const;
const CATEGORY_AI_PROVIDERS: readonly CategoryAiProvider[] = ['Ollama', 'DeepSeek'];

interface FormState {
  id: number | null;
  ruleName: string;
  targetCategoryId: number | null;
  groups: string[][];
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  id: null,
  ruleName: '',
  targetCategoryId: null,
  groups: [['']],
  sortOrder: 100,
  isActive: true,
};

export function CategoryRulesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRule | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [keywordDrafts, setKeywordDrafts] = useState<Record<number, string>>({});

  // Kuralları mevcut ürünlere yeniden uygular. Önce kuru çalıştırma (dryRun) yapılıp kaç ürünün
  // değişeceği gösterilir; kullanıcı onaylarsa gerçek yazım yapılır — kategori değiştirmek geri
  // alınması zor bir toplu işlem olduğu için körlemesine çalıştırılmaz.
  const reapplyMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (dryRun: boolean) => categoryRuleApi.reapply(dryRun),
    onSuccess: (result) => {
      if (result.dryRun) {
        if (result.changed === 0) {
          toast.success(`${result.scanned} ürün tarandı — kurallara göre değişmesi gereken ürün yok.`);
          return;
        }
        const confirmed = window.confirm(
          `${result.scanned} ürün tarandı. ${result.changed} ürünün kategorisi kurallara göre DEĞİŞECEK.

` +
          `Örnek: ${result.sample.slice(0, 3).map((c) => c.name).join(' | ')}

Uygulansın mı?`
        );
        if (confirmed) reapplyMutation.mutate(false);
        return;
      }
      toast.success(`${result.changed} ürünün kategorisi kurallara göre düzeltildi.`);
      queryClient.invalidateQueries({ queryKey: ['categories-admin'] });
      queryClient.invalidateQueries({ queryKey: ['category-products'] });
    },
    onError: (error) => toast.error(describeError(error)),
  });

  const { data: rules, isLoading, isError } = useQuery({
    queryKey: RULES_KEY,
    queryFn: categoryRuleApi.list,
    staleTime: 30_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories-master'],
    queryFn: categoryApi.master,
    staleTime: 60_000,
  });

  const { data: aiProvider } = useQuery({
    queryKey: queryKeys.system.categoryAiProvider,
    queryFn: aiSettingsApi.getCategoryAiProvider,
    staleTime: 30_000,
  });
  const activeProvider = toCategoryAiProvider(aiProvider?.provider);

  const providerMutation = useMutation({
    meta: { successMessage: 'AI sağlayıcı güncellendi' } as const,
    mutationFn: (provider: CategoryAiProvider) => aiSettingsApi.setCategoryAiProvider(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.system.categoryAiProvider }),
  });

  const saveMutation = useMutation({
    meta: { silentError: true, successMessage: 'Kural kaydedildi' } as const,
    mutationFn: (f: FormState) => {
      const body = {
        ruleName: f.ruleName.trim(),
        targetCategoryId: f.targetCategoryId!,
        keywordGroups: f.groups.map(g => g.map(kw => kw.trim()).filter(Boolean)).filter(g => g.length > 0),
        sortOrder: f.sortOrder,
        isActive: f.isActive,
      };
      return f.id ? categoryRuleApi.update(f.id, body) : categoryRuleApi.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-rules'] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: unknown) => {
      setFormError(err instanceof Error ? err.message : 'Kural kaydedilemedi.');
    },
  });

  const toggleMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: ({ id }: { id: number; isUndo?: boolean }) => categoryRuleApi.toggle(id),
    onMutate: ({ id }) =>
      applyOptimistic<CategoryRule[]>(queryClient, RULES_KEY, (old) =>
        old.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)),
      ),
    onError: (error, _vars, context) => {
      rollbackOptimistic(queryClient, context);
      toast.error(describeError(error));
    },
    onSuccess: (_data, { id, isUndo }) => {
      if (isUndo) return;
      const rule = queryClient.getQueryData<CategoryRule[]>(RULES_KEY)?.find((r) => r.id === id);
      const state = rule?.isActive ? 'aktif edildi' : 'pasife alındı';
      toast.undo(`"${rule?.ruleName ?? 'Kural'}" ${state}`, () =>
        toggleMutation.mutate({ id, isUndo: true }),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: RULES_KEY }),
  });

  const deleteMutation = useMutation({
    meta: { silentError: true, successMessage: 'Kural silindi' } as const,
    mutationFn: (id: number) => categoryRuleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-rules'] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      setDeleteError(err instanceof Error ? err.message : 'Kural silinemedi.');
    },
  });

  const filtered = (rules ?? []).filter(r =>
    !search.trim() ||
    r.ruleName.toLowerCase().includes(search.trim().toLowerCase()) ||
    r.targetCategoryName.toLowerCase().includes(search.trim().toLowerCase())
  );

  function openCreate() {
    setForm(EMPTY_FORM);
    setKeywordDrafts({});
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(r: CategoryRule) {
    setForm({
      id: r.id,
      ruleName: r.ruleName,
      targetCategoryId: r.targetCategoryId,
      groups: r.keywordGroups.length > 0 ? r.keywordGroups.map(g => [...g]) : [['']],
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    });
    setKeywordDrafts({});
    setFormError(null);
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.ruleName.trim()) {
      setFormError('Kural adı zorunludur.');
      return;
    }
    if (!form.targetCategoryId) {
      setFormError('Hedef kategori seçilmelidir.');
      return;
    }
    const hasAnyKeyword = form.groups.some(g => g.some(kw => kw.trim().length > 0));
    if (!hasAnyKeyword) {
      setFormError('En az bir anahtar kelime grubu gereklidir.');
      return;
    }
    saveMutation.mutate(form);
  }

  function addGroup() {
    setForm(f => ({ ...f, groups: [...f.groups, ['']] }));
  }

  function removeGroup(groupIndex: number) {
    setForm(f => ({ ...f, groups: f.groups.filter((_, i) => i !== groupIndex) }));
  }

  function addKeyword(groupIndex: number) {
    const draft = (keywordDrafts[groupIndex] ?? '').trim();
    if (!draft) return;
    setForm(f => ({
      ...f,
      groups: f.groups.map((g, i) => (i === groupIndex ? [...g.filter(kw => kw.trim().length > 0), draft] : g)),
    }));
    setKeywordDrafts(d => ({ ...d, [groupIndex]: '' }));
  }

  function removeKeyword(groupIndex: number, keywordIndex: number) {
    setForm(f => ({
      ...f,
      groups: f.groups.map((g, i) => (i === groupIndex ? g.filter((_, ki) => ki !== keywordIndex) : g)),
    }));
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Top Toolbar & AI Provider Config */}
      <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kural adı veya kategori ara..."
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] hover:border-[var(--fg-muted)] transition cursor-pointer shrink-0"
          >
            <Plus size={13} />
            <span>Yeni Kural</span>
          </button>

          <button
            type="button"
            onClick={() => reapplyMutation.mutate(true)}
            disabled={reapplyMutation.isPending}
            title="Kuralları mevcut ürünlere yeniden uygular — yanlış kategoriye düşmüş ürünleri düzeltir."
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs hover:bg-[var(--bg-subtle)] hover:border-[var(--fg-muted)] transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={13} className={reapplyMutation.isPending ? 'animate-spin' : undefined} />
            <span>{reapplyMutation.isPending ? 'Uygulanıyor...' : 'Kuralları Yeniden Uygula'}</span>
          </button>
        </div>

        {/* AI Fallback Provider Switcher */}
        <div className="flex items-center gap-2 text-xs border-l border-[var(--border-soft)] pl-3">
          <Sparkles size={14} className="text-amber-500 shrink-0" />
          <span className="text-[var(--fg-muted)] text-ui-xs font-semibold">Kural Dışı Eşleştirme Motoru:</span>
          <div className="flex items-center gap-1 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-0.5">
            {CATEGORY_AI_PROVIDERS.map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => providerMutation.mutate(prov)}
                disabled={providerMutation.isPending}
                className={`h-6.5 px-2.5 rounded-[3px] text-ui-xs font-semibold transition cursor-pointer ${
                  activeProvider === prov
                    ? 'bg-[var(--card)] text-[var(--fg)] font-bold shadow-xs border border-[var(--border)]'
                    : 'text-[var(--fg-muted)] hover:text-[var(--fg)] border border-transparent'
                }`}
              >
                {prov}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Kategori kuralları yükleniyor...</div>
      )}

      {isError && (
        <div className="p-8 text-center text-xs text-rose-500">Kurallar yüklenemedi.</div>
      )}

      {!isLoading && !isError && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-ui-xs font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                  <th className="p-3">Kural Adı</th>
                  <th className="p-3">Hedef Kategori</th>
                  <th className="p-3">Anahtar Kelime Grupları</th>
                  <th className="p-3 text-center">Öncelik</th>
                  <th className="p-3 text-center">Durum</th>
                  <th className="p-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-[var(--fg-muted)]">
                      Kayıtlı kategori kuralı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-subtle)]/30 transition text-xs">
                      <td className="p-3 font-semibold text-[var(--fg)]">{r.ruleName}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-soft)] text-ui-xs font-semibold text-[var(--fg)]">
                          {r.targetCategoryName}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.keywordGroups.map((g, gi) => (
                            <div key={gi} className="flex items-center gap-1">
                              {gi > 0 && <span className="text-ui-2xs text-[var(--fg-muted)] font-bold">VE</span>}
                              <span className="px-2 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] text-ui-xs text-[var(--fg)] border border-[var(--border-soft)]">
                                {g.join(' VEYA ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono tabular-nums text-[var(--fg-muted)]">{r.sortOrder}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleMutation.mutate({ id: r.id })}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-ui-xs font-bold cursor-pointer transition ${
                            r.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)]'
                          }`}
                        >
                          <Power size={11} />
                          <span>{r.isActive ? 'Aktif' : 'Pasif'}</span>
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="h-7 w-7 rounded-[3px] border border-[var(--border-soft)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--fg)] cursor-pointer transition"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeleteTarget(r); setDeleteError(null); }}
                            className="h-7 w-7 rounded-[3px] border border-rose-500/30 hover:bg-rose-500/10 flex items-center justify-center text-rose-500 cursor-pointer transition"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Rule Editor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[var(--fg)]">{form.id ? 'Kural Düzenle' : 'Yeni Kategori Kuralı'}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer">
                <X size={14} />
              </button>
            </div>

            {formError && <div className="p-2 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">{formError}</div>}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-ui-xs text-[var(--fg-muted)] font-semibold uppercase block mb-1">Kural Adı</label>
                <input
                  value={form.ruleName}
                  onChange={(e) => setForm((f) => ({ ...f, ruleName: e.target.value }))}
                  placeholder="Örn: Yan Basamak Kuralı"
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>

              <div>
                <label className="text-ui-xs text-[var(--fg-muted)] font-semibold uppercase block mb-1">Hedef Kategori</label>
                <select
                  value={form.targetCategoryId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, targetCategoryId: e.target.value ? Number(e.target.value) : null }))}
                  className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                >
                  <option value="">Hedef kategori seçin...</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Keyword Groups */}
              <div className="space-y-2 pt-1 border-t border-[var(--border-soft)]">
                <div className="flex items-center justify-between">
                  <label className="text-ui-xs text-[var(--fg-muted)] font-semibold uppercase">Anahtar Kelime Grupları (VE Mantığı)</label>
                  <button
                    type="button"
                    onClick={addGroup}
                    className="text-ui-xs text-[var(--fg)] font-bold hover:underline cursor-pointer"
                  >
                    + Grup Ekle
                  </button>
                </div>

                {form.groups.map((group, gi) => (
                  <div key={gi} className="p-2.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 space-y-2">
                    <div className="flex items-center justify-between text-ui-xs">
                      <span className="font-semibold text-[var(--fg)]">Grup #{gi + 1} (Kelimeler VEYA mantığı ile eşleşir)</span>
                      {form.groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGroup(gi)}
                          className="text-rose-500 hover:underline cursor-pointer"
                        >
                          Grubu Sil
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {group.map((kw, ki) => (
                        <span key={ki} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[var(--card)] border border-[var(--border-soft)] text-xs text-[var(--fg)]">
                          <span>{kw}</span>
                          <button type="button" onClick={() => removeKeyword(gi, ki)} className="text-[var(--fg-muted)] hover:text-rose-500 cursor-pointer">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        value={keywordDrafts[gi] ?? ''}
                        onChange={(e) => setKeywordDrafts((d) => ({ ...d, [gi]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(gi); } }}
                        placeholder="Kelime yazıp ekle..."
                        className="h-7 flex-1 rounded-[3px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => addKeyword(gi)}
                        className="h-7 px-2.5 rounded-[3px] bg-[var(--fg)] text-xs font-semibold text-[var(--bg)] cursor-pointer"
                      >
                        Ekle
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-soft)]">
                <div>
                  <label className="text-ui-xs text-[var(--fg-muted)] font-semibold uppercase block mb-1">Öncelik Sırası</label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                    className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded-[2px]"
                    />
                    <span>Kural Aktif</span>
                  </label>
                </div>
              </div>
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

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-[4px] border border-rose-500/30 bg-[var(--card)] p-4 shadow-lg space-y-3">
            <h3 className="font-bold text-xs text-[var(--fg)]">Kural Silinsin mi?</h3>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">
              <strong>{deleteTarget.ruleName}</strong> kuralı silinecek.
            </p>
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
                disabled={deleteMutation.isPending}
                className="h-8 px-3.5 rounded-[4px] bg-rose-500 text-xs font-bold text-white shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-40"
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
