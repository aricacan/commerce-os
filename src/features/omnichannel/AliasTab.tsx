'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Sparkles, ArrowRight, TrendingUp, Lightbulb } from 'lucide-react';
import {
  omnichannelApi, ALIAS_SOURCE,
  type AliasDto, type AliasSuggestionDto,
} from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';

export function AliasTab() {
  const [aliases, setAliases] = useState<AliasDto[]>([]);
  const [suggestions, setSuggestions] = useState<AliasSuggestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wrongTerm, setWrongTerm] = useState('');
  const [correctTerm, setCorrectTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, s] = await Promise.all([
        omnichannelApi.getAliases(),
        omnichannelApi.getAliasSuggestions(),
      ]);
      setAliases(a);
      setSuggestions(s);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const teach = async (wrong: string, correct: string, fromSuggestion: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await omnichannelApi.createAlias({
        wrongTerm: wrong,
        correctTerm: correct,
        source: fromSuggestion ? ALIAS_SOURCE.LearnedFromFailure : ALIAS_SOURCE.Manual,
      });
      setWrongTerm('');
      setCorrectTerm('');
      notify.success(`"${wrong}" → "${correct}" öğretildi.`);
      await load();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (alias: AliasDto) => {
    const ok = await confirm({
      title: 'Eşleme silinsin mi?',
      body: `"${alias.wrongTerm}" → "${alias.correctTerm}". Bot bu yazımı bir daha tanımayacak.`,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    try {
      await omnichannelApi.deleteAlias(alias.id);
      notify.success('Eşleme silindi.');
      await load();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Ürün ve Yazım Sözlüğü</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Müşterilerin yanlış yazdığı marka/model/ürün kelimelerini doğru katalog terimlerine eşleyin.
        </p>
      </div>

      {error && (
        <div className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs text-rose-500">
          {error}
        </div>
      )}

      {loading && <div className="text-xs text-[var(--fg-muted)] py-4 text-center">Sözlük yükleniyor…</div>}

      {/* Öneriler (Botun Anlayamadığı Terimler) */}
      {suggestions.length > 0 && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-[var(--fg-muted)]" />
            <h3 className="font-bold text-xs text-[var(--fg)]">Botun Anlayamadığı Terimler ve Öneriler</h3>
          </div>
          <p className="text-[10.5px] text-[var(--fg-muted)]">
            Müşterilerin mesajlarında geçen ancak katalogda doğrudan eşleşmeyen kelimeler. Tek tıkla öğretin.
          </p>

          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <div
                key={s.term}
                className="flex items-center justify-between gap-3 p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 flex-wrap"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[var(--fg)] font-mono">{s.term}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--fg-muted)] bg-[var(--card)] border border-[var(--border-soft)] px-1.5 py-0.5 rounded-[3px]">
                    <TrendingUp size={10} /> {s.occurrences} kez
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight size={12} className="text-[var(--fg-muted)]" />
                  {s.suggestedCorrections.length > 0 ? (
                    <div className="flex gap-1.5 flex-wrap">
                      {s.suggestedCorrections.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => teach(s.term, c, true)}
                          disabled={saving}
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                        >
                          <span>{c}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10.5px] text-[var(--fg-muted)]">Benzer ürün bulunamadı</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Elle Yeni Eşleme Ekle */}
      <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-3">
        <h3 className="font-bold text-xs text-[var(--fg)]">Yeni terim eşlemesi öğret</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
              Müşterinin yazdığı yanlış terim
            </label>
            <input
              value={wrongTerm}
              onChange={(e) => setWrongTerm(e.target.value)}
              placeholder="Örn: kornekt, passsat"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <ArrowRight size={16} className="text-[var(--fg-muted)] mb-2.5 hidden sm:block" />

          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
              Katalogdaki doğru terim
            </label>
            <input
              value={correctTerm}
              onChange={(e) => setCorrectTerm(e.target.value)}
              placeholder="Örn: connect, passat"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <button
            type="button"
            onClick={() => teach(wrongTerm, correctTerm, false)}
            disabled={saving || wrongTerm.trim().length < 2 || correctTerm.trim().length < 2}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
          >
            <Plus size={13} />
            <span>Öğret ve kaydet</span>
          </button>
        </div>
      </div>

      {/* Öğrenilmiş Eşlemeler Tablosu */}
      {aliases.length > 0 && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col">
          <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-4 py-2.5 font-bold text-xs text-[var(--fg)] flex items-center justify-between">
            <span>Öğrenilmiş Eşlemeler ({aliases.length})</span>
          </div>

          <div className="divide-y divide-[var(--border-soft)] max-h-96 overflow-y-auto">
            {aliases.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--bg-subtle)]/20 transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-[var(--fg)]">{a.wrongTerm}</span>
                  <ArrowRight size={12} className="text-[var(--fg-muted)]" />
                  <span className="font-mono font-bold text-[var(--fg)]">{a.correctTerm}</span>

                  {a.source !== ALIAS_SOURCE.Manual && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-[var(--bg-subtle)] text-[10px] font-mono text-[var(--fg-muted)] border border-[var(--border-soft)]">
                      <Sparkles size={10} /> {a.source === ALIAS_SOURCE.AutoLearned ? 'Bot kendisi öğrendi' : 'Öneriden eklendi'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10.5px] text-[var(--fg-muted)] font-mono">{a.timesUsed} kez kullanıldı</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
                    className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
