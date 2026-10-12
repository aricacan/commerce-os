'use client';

import { useEffect, useState } from 'react';
import { Globe2, Pencil, Plus } from 'lucide-react';
import { omnichannelApi, type CountryDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { CountryEditor } from './CountryEditor';
import { countryLabel, useOmnichannelCountries } from './useOmnichannelCountries';

// Editör durumu: kapalı, yeni ülke ya da mevcut bir ülkenin düzenlenmesi.
type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; country: CountryDto };

export function CountriesTab() {
  const { countries, loading, error, reload } = useOmnichannelCountries();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [saving, setSaving] = useState(false);
  const { notify } = useFeedback();
  // Ülke tablosu tüm kiracılarda ortak — yazma yalnız kurulumun sahibi şirketin SuperAdmin'i.
  // Karar backend'de; ekran yalnız düğmeleri gösterip gizler.
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    omnichannelApi.getCountryAccess().then((a) => setCanEdit(a.canEdit)).catch(() => setCanEdit(false));
  }, []);

  const handleSave = async (country: CountryDto) => {
    setSaving(true);
    try {
      if (editor.mode === 'new') {
        await omnichannelApi.createCountry(country);
      } else {
        const { code, ...body } = country;
        await omnichannelApi.updateCountry(code, body);
      }
      notify.success(`${country.name} kaydedildi.`);
      setEditor({ mode: 'closed' });
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Ülkeler</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Botun dili, saat dilimi, telefon öneki ve katalog durumu ülkeden gelir. Yeni ülke eklemek kod değişikliği gerektirmez.
          </p>
        </div>
        {canEdit && editor.mode === 'closed' && (
          <button type="button" onClick={() => setEditor({ mode: 'new' })}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90">
            <Plus size={13} /> Ülke Ekle
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>
      )}

      {editor.mode !== 'closed' && (
        <CountryEditor
          key={editor.mode === 'edit' ? editor.country.code : 'new'}
          initial={editor.mode === 'edit' ? editor.country : null}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}

      {loading && <div className="py-4 text-center text-[var(--fg-muted)]">Ülkeler yükleniyor…</div>}

      {!loading && countries.length > 0 && (
        <div className="divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
          {countries.map((c) => (
            <div key={c.code} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 font-bold text-[var(--fg)]">
                  <CountryFlag code={c.code} size={20} />
                  {countryLabel(c)}
                </span>
                <span className="text-[11px] text-[var(--fg-muted)]">
                  {c.defaultLanguage} · {c.currencyCode} · {c.timeZone} · +{c.phonePrefixes.join(', +') || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!c.isActive && (
                  <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10.5px] text-[var(--fg-muted)]">Pasif</span>
                )}
                <span className={`rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-semibold ${
                  c.catalogStatus === 'Live' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  {c.catalogStatus === 'Live' ? 'Katalog bağlı' : 'Katalog bağlı değil'}
                </span>
                {canEdit && (
                  <button type="button" title="Düzenle" onClick={() => setEditor({ mode: 'edit', country: c })}
                    className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]">
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
