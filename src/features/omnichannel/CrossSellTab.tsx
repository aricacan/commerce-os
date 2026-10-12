'use client';

import { useState } from 'react';
import { Pencil, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import { omnichannelApi, type CrossSellRuleDto, type CrossSellRuleSaveDto } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { crossSellDraftFrom, toCrossSellSaveDto } from './crossSellRuleDraft';
import { CrossSellRuleForm } from './CrossSellRuleForm';
import { secondaryButtonClass } from './formClasses';
import { rulesInScope, rulesRootClass, type ChannelRuleScope } from './ruleScope';
import { useBrands } from './useBrands';
import { useCrossSellData } from './useCrossSellData';

// Editör durumu: kapalı, yeni kayıt ya da mevcut bir kuralın düzenlenmesi.
type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; rule: CrossSellRuleDto };

const iconButtonClass =
  'flex h-6 w-6 cursor-pointer items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]';

// Çapraz satış kuralları (P38): sepetteki kategoriye göre aynı araç için tamamlayıcı ürün önerisi.
// Öneri yalnız kanalın "Çapraz satış önerisi" bayrağı açıkken çalışır. `scope` verilirse (Kanal Merkezi) yalnız o
// kanala uyan kurallar listelenir ve yeni kural kanalın markasıyla başlar; aynı bileşen Hesap geneli'nde tüm kuralları gösterir.
export function CrossSellTab({ scope }: { scope?: ChannelRuleScope }) {
  const { rules: allRules, categories, loading, error, reload: reloadRules } = useCrossSellData();
  const rules = rulesInScope(allRules, scope);
  const reload = async () => { await Promise.all([reloadRules(), scope?.onChanged()]); };
  const { brands } = useBrands();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? `Kategori #${id}`;
  const brandName = (id: number | null) =>
    id === null ? 'Tüm markalar' : (brands.find((b) => b.id === id)?.name ?? `Marka #${id}`);

  const handleSave = async (body: CrossSellRuleSaveDto) => {
    setSaving(true);
    try {
      if (editor.mode === 'edit') await omnichannelApi.updateCrossSellRule(editor.rule.id, body);
      else await omnichannelApi.createCrossSellRule(body);
      notify.success('Kural kaydedildi.');
      setEditor({ mode: 'closed' });
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: CrossSellRuleDto) => {
    try {
      await omnichannelApi.updateCrossSellRule(rule.id, toCrossSellSaveDto({ ...crossSellDraftFrom(rule), isActive: !rule.isActive }));
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const handleDelete = async (rule: CrossSellRuleDto) => {
    const ok = await confirm({
      title: 'Kural silinsin mi?',
      body: `${categoryName(rule.fromCategoryId)} → ${categoryName(rule.toCategoryId)}`,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    try {
      await omnichannelApi.deleteCrossSellRule(rule.id);
      notify.success('Kural silindi.');
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  return (
    <div className={rulesRootClass(scope)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBasket size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Çapraz Satış</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Sepette &quot;sepetteki kategori&quot;den ürün varsa, bot sipariş özetinden önce müşterinin aracına uyan stoktaki
            &quot;önerilecek kategori&quot; ürününü bir kez önerir. Müşteri hayır derse tekrar sormaz; şikayet ve iade
            konuşmalarında hiç önermez. Öneri, kanalın Bot sekmesindeki &quot;Çapraz satış önerisi&quot; açıkken çalışır.
          </p>
        </div>
        {editor.mode === 'closed' && (
          <button type="button" onClick={() => setEditor({ mode: 'new' })} className={secondaryButtonClass}>
            <Plus size={13} /> Kural Ekle
          </button>
        )}
      </div>

      {editor.mode !== 'closed' && (
        <CrossSellRuleForm
          key={editor.mode === 'edit' ? editor.rule.id : 'new'}
          initial={editor.mode === 'edit' ? editor.rule : null}
          defaultBrandId={scope?.brandId ?? null}
          brands={brands}
          categories={categories}
          saving={saving}
          onSave={(body) => void handleSave(body)}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}

      {error && <div className="text-[11px] text-rose-500">{error}</div>}
      {loading && <div className="py-2 text-[var(--fg-muted)]">Kurallar yükleniyor…</div>}
      {!loading && !error && rules.length === 0 && (
        <div className="py-2 text-[var(--fg-muted)]">{scope ? 'Bu kanala uyan çapraz satış kuralı yok.' : 'Henüz çapraz satış kuralı tanımlı değil.'}</div>
      )}

      {rules.length > 0 && (
        <section className="divide-y divide-[var(--border-soft)] rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3.5 shadow-xs">
          {rules.map((rule) => (
            <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-bold text-[var(--fg)]">
                {categoryName(rule.fromCategoryId)} → {categoryName(rule.toCategoryId)}
                <span className="font-normal text-[var(--fg-muted)]">{` · ${brandName(rule.brandId)} · öncelik ${rule.sortOrder}`}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => void handleToggle(rule)} title={rule.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  className={`cursor-pointer rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    rule.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
                  }`}>
                  {rule.isActive ? 'Aktif' : 'Pasif'}
                </button>
                <button type="button" title="Düzenle" onClick={() => setEditor({ mode: 'edit', rule })}
                  className={`${iconButtonClass} hover:text-[var(--fg)]`}>
                  <Pencil size={12} />
                </button>
                <button type="button" title="Sil" onClick={() => void handleDelete(rule)}
                  className={`${iconButtonClass} hover:text-rose-500`}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
