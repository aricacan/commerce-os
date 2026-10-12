'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderTree, RefreshCw } from 'lucide-react';
import {
  categoryTaxonomyApi, type CategoryTaxonomyDto, type NewCategoryBody, type TaxonomyLanguage, type UnmappedCategoryDto,
} from '../../lib/api/category-taxonomy';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { CanonicalCategoryList } from './CanonicalCategoryList';
import { NewCategoryForm } from './NewCategoryForm';
import { UnmappedCategoryList } from './UnmappedCategoryList';
import { canonicalOptions, linkBody } from './categoryTaxonomyRules';
import { secondaryButtonClass } from './formClasses';

const SECTION_TITLE = 'text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]';

// Hesap geneli › Kategori taksonomisi (FAZ 5.5): kanonik kategoriler, TR/SQ/EN adları ve bu hesabın ERP/site
// kategorilerinin eşlemesi. Bot, eşlenen kategoriyi müşterinin her dildeki adıyla tanır ("tapet" → Paspas).
// Eşanlam ekleme/silme tüm hesaplara ortak sözlüğü değiştirir — sunucu yalnız SuperAdmin'e izin verir.
export function CategoryTaxonomyTab() {
  const [data, setData] = useState<CategoryTaxonomyDto | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await categoryTaxonomyApi.get();
      setData(result);
      setUnavailable(result === null);
    } catch (e) {
      setError(describeError(e));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const options = useMemo(() => canonicalOptions(data?.categories ?? []), [data]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      notify.success(success);
      await load();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const link = (source: UnmappedCategoryDto, canonicalId: number) =>
    run(() => categoryTaxonomyApi.link(linkBody(source, canonicalId)), `${source.label} eşlendi.`);
  const unlink = (id: number) => run(() => categoryTaxonomyApi.unlink(id), 'Eşleme kaldırıldı.');
  const addTerm = (categoryId: number, language: TaxonomyLanguage, term: string) =>
    run(() => categoryTaxonomyApi.addTerm(categoryId, language, term), `"${term}" eklendi.`);
  const createCategory = (body: NewCategoryBody) =>
    run(() => categoryTaxonomyApi.createCategory(body), `"${body.en}" kategorisi eklendi.`);
  const deleteTerm = (id: number) => run(() => categoryTaxonomyApi.deleteTerm(id), 'Eşanlam silindi.');

  return (
    <section className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex items-center gap-2">
            <FolderTree size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Kategori taksonomisi</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Aynı ürün türünün Türkçe, Arnavutça ve İngilizce adları tek kategoride. ERP ve site kategorilerini buraya
            eşleyince bot, müşterinin hangi dilde yazdığına bakmadan doğru kategoriyi bulur (değişiklik en geç 10 dakikada
            bota yansır).
          </p>
        </div>
        <button type="button" disabled={busy} onClick={() => void load()} className={secondaryButtonClass}>
          <RefreshCw size={13} /> Yenile
        </button>
      </div>

      {unavailable && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 text-[var(--fg-muted)]">
          Kategori taksonomisi sunucu güncellemesiyle açılacak.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>
      )}
      {!data && !unavailable && !error && (
        <div aria-busy="true" className="h-24 animate-pulse rounded-[4px] bg-[var(--bg-subtle)]" />
      )}

      {data && (
        <>
          <div className="flex flex-col gap-2">
            <h3 className={SECTION_TITLE}>Eşlenmemiş kategoriler ({data.unmapped.length})</h3>
            <UnmappedCategoryList unmapped={data.unmapped} options={options} busy={busy} onLink={link} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className={SECTION_TITLE}>Kanonik kategoriler ({data.categories.length})</h3>
            <NewCategoryForm existing={data.categories} busy={busy} onCreate={createCategory} />
            <CanonicalCategoryList categories={data.categories} busy={busy}
              onAddTerm={addTerm} onDeleteTerm={deleteTerm} onUnlink={unlink} />
          </div>
        </>
      )}
    </section>
  );
}
