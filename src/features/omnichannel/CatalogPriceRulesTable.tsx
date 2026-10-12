'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { CatalogPriceRuleDto, CatalogPriceRuleSaveBody } from '../../lib/api/omnichannel-catalog';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { CatalogPriceRuleForm } from './CatalogPriceRuleForm';
import { useCatalogPriceRules } from './useCatalogPriceRules';

// Hangi satır düzenleniyor: yok, yeni satır ya da mevcut kural.
type Editing = { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; ruleId: number };

const iconButtonClass =
  'flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]';

export function CatalogPriceRulesTable({ profileId }: { profileId: number }) {
  const { rules, loading, error, save, remove } = useCatalogPriceRules(profileId);
  const [editing, setEditing] = useState<Editing>({ kind: 'none' });
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  const handleSave = async (ruleId: number | null, body: CatalogPriceRuleSaveBody) => {
    setSaving(true);
    try {
      await save(ruleId, body);
      setEditing({ kind: 'none' });
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: CatalogPriceRuleDto) => {
    const ok = await confirm({ title: `"${rule.keywords}" kuralı silinsin mi?`, confirmLabel: 'Sil', danger: true });
    if (!ok) return;
    try {
      await remove(rule.id);
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const nextSortOrder = rules.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;

  return (
    <div className="flex flex-col gap-2">
      {error && <div className="text-[11px] text-rose-500">{error}</div>}
      {loading && <div className="text-[11px] text-[var(--fg-muted)]">Fiyat listesi yükleniyor…</div>}

      {!loading && (
        <div className="overflow-x-auto rounded-[4px] border border-[var(--border-soft)]">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[var(--bg-subtle)] text-[10.5px] uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="px-2.5 py-1.5 font-semibold">Anahtar kelimeler</th>
                <th className="px-2.5 py-1.5 font-semibold">Fiyat</th>
                <th className="px-2.5 py-1.5 font-semibold">Sıra</th>
                <th className="px-2.5 py-1.5 font-semibold">Aktif</th>
                <th className="px-2.5 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => editing.kind === 'edit' && editing.ruleId === rule.id ? (
                <CatalogPriceRuleForm key={rule.id} initial={rule} saving={saving}
                  onSave={(body) => void handleSave(rule.id, body)} onCancel={() => setEditing({ kind: 'none' })} />
              ) : (
                <tr key={rule.id} className="border-t border-[var(--border-soft)]">
                  <td className="px-2.5 py-1.5 text-[var(--fg)]">{rule.keywords}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[var(--fg)]">{rule.price.toFixed(2)}</td>
                  <td className="px-2.5 py-1.5 font-mono text-[var(--fg-muted)]">{rule.sortOrder}</td>
                  <td className="px-2.5 py-1.5 text-[var(--fg-muted)]">{rule.isActive ? 'Evet' : 'Hayır'}</td>
                  <td className="px-2.5 py-1.5">
                    <div className="flex justify-end gap-1">
                      <button type="button" title="Düzenle" className={iconButtonClass}
                        onClick={() => setEditing({ kind: 'edit', ruleId: rule.id })}>
                        <Pencil size={12} />
                      </button>
                      <button type="button" title="Sil" className={iconButtonClass} onClick={() => void handleDelete(rule)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {editing.kind === 'new' && (
                <CatalogPriceRuleForm initial={null} defaultSortOrder={nextSortOrder} saving={saving}
                  onSave={(body) => void handleSave(null, body)} onCancel={() => setEditing({ kind: 'none' })} />
              )}
              {rules.length === 0 && editing.kind !== 'new' && (
                <tr>
                  <td colSpan={5} className="px-2.5 py-3 text-center text-[var(--fg-muted)]">
                    Liste boş — bot kaynağın fiyatını söyler.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing.kind === 'none' && (
        <button type="button" onClick={() => setEditing({ kind: 'new' })}
          className="inline-flex h-7 w-fit items-center gap-1.5 rounded-[3px] border border-[var(--border)] px-2.5 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)]">
          <Plus size={12} /> Kural ekle
        </button>
      )}
    </div>
  );
}
