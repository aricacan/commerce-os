'use client';

import { useCallback, useState } from 'react';
import { BookCheck, Search } from 'lucide-react';
import { qualityApi } from '../../lib/api/omnichannel-quality';
import { ApprovedAnswerRow } from './ApprovedAnswerRow';
import { formInputClass, secondaryButtonClass } from './formClasses';
import { QualityPager } from './QualityPager';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useServerResource } from './useServerResource';

// Kalite Merkezi › Onaylı cevaplar: onaylanan adaylardan doğan "soru → doğru cevap" kütüphanesi. Düzenlenir ya da
// kapatılır; bot (FAZ 4) benzer soruda etkin cevabı kullanır.
export function ApprovedAnswersSection() {
  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState({ search: '', includeInactive: false, page: 0 });
  const load = useCallback(() => qualityApi.getApprovedAnswers(query.search, query.includeInactive, query.page), [query]);
  const answers = useServerResource(load, JSON.stringify(query));
  const data = answers.data;

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-busy={answers.loading}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BookCheck size={14} className="text-fg-muted" aria-hidden />
          <h3 className="m-0 text-ui-sm font-bold text-fg">Onaylı cevaplar</h3>
        </div>
        <p className="m-0 text-ui-xs text-fg-muted">
          Adaylar bölümünde &quot;kütüphaneye de ekle&quot; ile onaylanan cevaplar. Kapatılan cevap bot aramasına girmez.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-48 flex-1 items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); setQuery((q) => ({ ...q, search: searchDraft, page: 0 })); }}
        >
          <input
            type="search" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Soru ya da cevapta ara" aria-label="Onaylı cevaplarda ara" className={formInputClass}
          />
          <button type="submit" className={secondaryButtonClass} aria-label="Ara"><Search size={13} aria-hidden /></button>
        </form>
        <label className="flex cursor-pointer items-center gap-1.5 text-ui-xs text-fg-muted">
          <input
            type="checkbox" checked={query.includeInactive}
            onChange={(e) => setQuery((q) => ({ ...q, includeInactive: e.target.checked, page: 0 }))}
          />
          Kapalıları da göster
        </label>
      </div>

      {answers.updatePending && <UpdatePendingNotice />}
      {answers.error && <p role="alert" className="m-0 text-ui-xs text-danger">{answers.error}</p>}
      {answers.loading && !data && <p className="m-0 text-ui-xs text-fg-muted">Cevaplar yükleniyor…</p>}
      {data && data.items.length === 0 && (
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
          Kütüphanede cevap yok.
        </p>
      )}
      {data && data.items.length > 0 && (
        <ul className={`m-0 flex list-none flex-col gap-2 p-0 ${answers.loading ? 'opacity-60' : ''}`}>
          {data.items.map((answer) => <ApprovedAnswerRow key={answer.id} answer={answer} onChanged={answers.reload} />)}
        </ul>
      )}
      {data && (
        <QualityPager
          page={query.page} total={data.total} loading={answers.loading} label="Onaylı cevap sayfaları"
          onChange={(page) => setQuery((q) => ({ ...q, page }))}
        />
      )}
    </section>
  );
}
