'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, PhoneOff } from 'lucide-react';
import { omnichannelApi, type IgnoredContactDto } from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';

export function IgnoredContactsTab() {
  const [entries, setEntries] = useState<IgnoredContactDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await omnichannelApi.getIgnoredContacts());
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      await omnichannelApi.createIgnoredContact({ phoneNumber: phone, label });
      setPhone('');
      setLabel('');
      notify.success('Numara eklendi.');
      await load();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: IgnoredContactDto) => {
    const ok = await confirm({
      title: `"${entry.label}" (${entry.phoneNumber}) listeden çıkarılsın mı?`,
      body: 'Bu numaradan sonraki mesajlara bot tekrar otomatik cevap vermeye başlar.',
      confirmLabel: 'Çıkar',
      danger: true,
    });
    if (!ok) return;

    try {
      await omnichannelApi.deleteIgnoredContact(entry.id);
      notify.success('Numara listeden çıkarıldı.');
      await load();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div>
        <div className="flex items-center gap-2">
          <PhoneOff size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Yoksayılan Numaralar (Bot Hariç)</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Bu numaralardan gelen mesajlar Gelen Kutusu&apos;na düşer fakat AI bot asla otomatik cevap vermez (ekip, patron vb.).
        </p>
      </div>

      {error && (
        <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
          {error}
        </div>
      )}

      {/* Numara Ekleme Kartı */}
      <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
        <h3 className="font-bold text-xs text-[var(--fg)]">Yeni yoksayılan numara ekle</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
              Telefon numarası (ülke kodlu) *
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Örn: 905321234567"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
              Açıklama / etiket *
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Örn: Enes Bey (Yönetici), Test Hattı"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !phone.trim() || !label.trim()}
            className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
          >
            <Plus size={13} />
            <span>Listeye ekle</span>
          </button>
        </div>
      </div>

      {loading && <div className="text-xs text-[var(--fg-muted)] py-4 text-center">Numaralar yükleniyor…</div>}

      {/* Liste Tablosu */}
      {!loading && entries.length === 0 && (
        <div className="rounded-[4px] border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--fg-muted)]">
          Henüz yoksayılan bir telefon numarası eklenmedi.
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col">
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 px-4 py-2.5 font-bold text-xs text-[var(--fg)]">
            Kayıtlı Numaralar ({entries.length})
          </div>

          <div className="divide-y divide-[var(--border-soft)]">
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--bg-subtle)]/30 transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[var(--fg)]">{e.phoneNumber}</span>
                  <span className="text-[11px] text-[var(--fg-muted)]">• {e.label}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(e)}
                  className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                  title="Listeden çıkar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
