'use client';

import { useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import {
  omnichannelCatalogApi, type CatalogProfileDto, type CatalogProfileSaveBody,
} from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { CatalogProfileEditor } from './CatalogProfileEditor';
import { ProfileCard } from './CatalogProfileCard';
import { useOmnichannelNav } from './OmnichannelNavContext';
import { useCatalogProfiles } from './useCatalogProfiles';
import { useOmnichannelCountries } from './useOmnichannelCountries';

type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; profile: CatalogProfileDto };

// Kanallar ve Profiller › Profiller: "bu kanalda bot ürünü nereden, fiyatı nereden, stoğu ve linki
// nereden söylesin" seçimleri. Kanal, formunda bir profil seçer; seçmezse ülke varsayılanı.
export function CatalogProfilesTab() {
  const { profiles, sources, siteSources, loading, error, reload } = useCatalogProfiles();
  const { countries } = useOmnichannelCountries();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();
  const { go } = useOmnichannelNav();

  const handleSave = async (body: CatalogProfileSaveBody) => {
    setSaving(true);
    try {
      if (editor.mode === 'edit') await omnichannelCatalogApi.updateProfile(editor.profile.id, body);
      else await omnichannelCatalogApi.createProfile(body);
      notify.success(`${body.name} kaydedildi.`);
      setEditor({ mode: 'closed' });
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profile: CatalogProfileDto) => {
    const ok = await confirm({
      title: `"${profile.name}" profili silinsin mi?`,
      body: 'Profili kullanan kanal varsa silinmez; önce kanallarda başka profil seçin.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    try {
      await omnichannelCatalogApi.deleteProfile(profile.id);
      notify.success(`${profile.name} silindi.`);
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Kaynak Profilleri</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Bot bir kanalda ürünü, fiyatı, stoğu ve linki hangi kaynaktan söyleyecek? Profili burada tanımlayın, kanal ayarlarından seçin.
          </p>
        </div>
        {editor.mode === 'closed' && (
          <button type="button" onClick={() => setEditor({ mode: 'new' })}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90">
            <Plus size={13} /> Yeni Profil
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>
      )}

      {editor.mode !== 'closed' && (
        <CatalogProfileEditor
          key={editor.mode === 'edit' ? editor.profile.id : 'new'}
          initial={editor.mode === 'edit' ? editor.profile : null}
          countries={countries}
          sources={sources}
          siteSources={siteSources}
          saving={saving}
          onSave={(body) => void handleSave(body)}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}

      {loading && <div className="py-4 text-center text-[var(--fg-muted)]">Profiller yükleniyor…</div>}

      {!loading && !error && profiles.length === 0 && editor.mode === 'closed' && (
        <div className="rounded-[4px] border border-dashed border-[var(--border)] p-8 text-center text-[var(--fg-muted)]">
          Henüz profil yok. Profil seçilmeyen kanallarda bot ülkenin varsayılan kaynaklarını kullanır.
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              sources={sources}
              siteSources={siteSources}
              onOpen={() => go({ tab: 'channels', sub: 'profiles', profileId: p.id })}
              onEdit={() => setEditor({ mode: 'edit', profile: p })}
              onDelete={() => void handleDelete(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
