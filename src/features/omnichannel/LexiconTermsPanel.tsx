'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { type LexiconKind, type LexiconScope, type LexiconSource } from '../../lib/api/omnichannel-lexicon';
import { describeError } from '../../lib/errors';
import { useAuthStore } from '../../stores/auth';
import { useFeedback } from '../shared/Feedback';
import { formInputClass, secondaryButtonClass } from './formClasses';
import { EMPTY_DRAFT, KIND_OPTIONS, SCOPE_OPTIONS, SOURCE_OPTIONS, toFields } from './lexiconRules';
import { LexiconTermForm } from './LexiconTermForm';
import { LexiconTermRow } from './LexiconTermRow';
import { QualityPager } from './QualityPager';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useLexiconTerms } from './useLexiconTerms';

const SUPER_ADMIN_ROLE = 'SuperAdmin';

// Sözlük › Sözlük: ortak + hesabın terimleri. Ara, tür/kaynak/kapsam süzgeci, düzenle, pasifleştir, yeni terim.
// Asıl yetki denetimi sunucuda (ortak satır = yalnız SuperAdmin); sunucu reddederse mesaj görünür.
export function LexiconTermsPanel() {
  const state = useLexiconTerms();
  const { notify } = useFeedback();
  const isSuperAdmin = useAuthStore((s) => s.user?.roles?.includes(SUPER_ADMIN_ROLE) ?? false);
  const [searchDraft, setSearchDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const data = state.page.data;

  const toggleActive = async (id: number, isActive: boolean) => {
    try {
      await state.setActive(id, isActive);
      notify.success(isActive ? 'Terim etkinleştirildi.' : 'Terim pasifleştirildi.');
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-busy={state.page.loading}>
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-48 flex-1 items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); state.filter({ search: searchDraft }); }}
        >
          <input
            type="search" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Terim ya da anlamda ara" aria-label="Sözlükte ara" className={formInputClass}
          />
          <button type="submit" className={secondaryButtonClass} aria-label="Ara"><Search size={13} aria-hidden /></button>
        </form>
        <select
          aria-label="Tür" value={state.query.kind ?? ''} className={`${formInputClass} w-auto`}
          onChange={(e) => state.filter({ kind: e.target.value === '' ? null : (Number(e.target.value) as LexiconKind) })}
        >
          <option value="">Tüm türler</option>
          {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select
          aria-label="Kaynak" value={state.query.source ?? ''} className={`${formInputClass} w-auto`}
          onChange={(e) => state.filter({ source: e.target.value === '' ? null : (Number(e.target.value) as LexiconSource) })}
        >
          <option value="">Tüm kaynaklar</option>
          {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select
          aria-label="Kapsam" value={state.query.scope} className={`${formInputClass} w-auto`}
          onChange={(e) => state.filter({ scope: Number(e.target.value) as LexiconScope })}
        >
          {SCOPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {!adding && (
          <button type="button" className={secondaryButtonClass} onClick={() => setAdding(true)}>
            <Plus size={13} aria-hidden /> Yeni terim
          </button>
        )}
      </div>

      {adding && (
        <LexiconTermForm
          label="Yeni sözlük terimi" initial={EMPTY_DRAFT} submitLabel="Terimi ekle" termEditable offerGlobal={isSuperAdmin}
          onCancel={() => setAdding(false)}
          onSubmit={async (draft, isGlobal) => {
            await state.create({ ...toFields(draft), term: draft.term.trim(), isGlobal });
            notify.success('Terim eklendi.');
            setAdding(false);
          }}
        />
      )}

      {state.page.updatePending && <UpdatePendingNotice />}
      {state.page.error && <p role="alert" className="m-0 text-ui-xs text-danger">{state.page.error}</p>}
      {state.page.loading && !data && <p className="m-0 text-ui-xs text-fg-muted">Sözlük yükleniyor…</p>}
      {data && data.items.length === 0 && (
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
          Bu süzgeçle terim yok. “Yeni terim” ile ekleyebilir ya da adaylardan onaylayabilirsiniz.
        </p>
      )}
      {data && data.items.length > 0 && (
        <ul className={`m-0 flex list-none flex-col gap-2 p-0 ${state.page.loading ? 'opacity-60' : ''}`}>
          {data.items.map((term) => (
            <LexiconTermRow
              key={term.id} term={term} isSuperAdmin={isSuperAdmin}
              onSave={async (fields) => { await state.update(term.id, fields); notify.success('Terim güncellendi.'); }}
              onToggleActive={() => void toggleActive(term.id, !term.isActive)}
            />
          ))}
        </ul>
      )}
      {data && (
        <QualityPager page={state.query.page} total={data.total} loading={state.page.loading} label="Sözlük sayfaları" onChange={state.goToPage} />
      )}
    </section>
  );
}
