'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Save, AlertTriangle, HelpCircle } from 'lucide-react';
import { omnichannelApi, type BotMenuOptionDto, type BotTextEntryDto } from '../../lib/api/omnichannel';
import { useFeedback } from '../shared/Feedback';
import { describeError } from '../../lib/errors';
import { MenuTreeEditor } from './MenuTreeEditor';
import { BotTextsEditor } from './BotTextsEditor';
import { MenuPreview } from './MenuPreview';
import { CannedRepliesEditor } from './CannedRepliesEditor';
import { toTextOverride } from './botTextRules';
import { withIds } from './menuTree';

// Faz 8 — menü/şablon tasarımcısı: bot metinleri + menü ağacı + kanal önizlemesi.
export function MenuTab() {
  const [options, setOptions] = useState<BotMenuOptionDto[]>([]);
  const [texts, setTexts] = useState<BotTextEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Metin ucu yoksa (ön yüz sunucudan önce yayına çıktı) menü yine düzenlenebilir.
      const [menu, botTexts] = await Promise.all([
        omnichannelApi.getBotMenu(),
        omnichannelApi.getBotTexts().catch(() => null),
      ]);
      setOptions(withIds(menu));
      setTexts(botTexts ?? []);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateText = (key: BotTextEntryDto['key'], patch: Partial<BotTextEntryDto>) =>
    setTexts((current) => current.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const reportError = (message: string) => {
    setError(message);
    notify.error(message);
  };

  const saveMenu = async (): Promise<boolean> => {
    try {
      setOptions(withIds(await omnichannelApi.updateBotMenu(options)));
      return true;
    } catch (e) {
      reportError(`Menü kaydedilemedi (metinler de kaydedilmedi): ${describeError(e)}`);
      return false;
    }
  };

  const saveTexts = async (): Promise<boolean> => {
    try {
      setTexts(await omnichannelApi.updateBotTexts(texts.map(toTextOverride)));
      return true;
    } catch (e) {
      reportError(`Menü kaydedildi, ancak bot metinleri kaydedilemedi: ${describeError(e)}`);
      return false;
    }
  };

  // Menü ve metinler iki ayrı uç: biri kaydedilip diğeri kaydedilemezse bu açıkça söylenir.
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!(await saveMenu())) return;
      if (texts.length === 0) {
        notify.success('Bot menüsü kaydedildi.');
        return;
      }
      if (await saveTexts()) notify.success('Bot menüsü ve metinleri kaydedildi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Menü ve Şablon Tasarımcısı</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Karşılama, devir ve mesai metinleri, menü seçenekleri ve alt menüler. Sağda her kanalda nasıl göründüğü.
          </p>
        </div>
        <button
          type="button" onClick={save} disabled={saving || loading}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
        >
          <Save size={13} />
          <span>{saving ? 'Kaydediliyor…' : 'Tümünü kaydet'}</span>
        </button>
      </div>

      <div className="flex items-start gap-2.5 p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[var(--fg-muted)] text-xs">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          İade, hasarlı ürün ve açık şikâyetler menüden bağımsız olarak doğrudan temsilciye aktarılır.
          Bot metinleri varsayılanla dolu gelir; değiştirdiğiniz metin “Değiştirildi” olarak işaretlenir.
          Burası tüm kanalların varsayılanıdır: Kanal Merkezi › Bot’ta kendi menüsünü ya da metnini “Bu kanala özel”
          yapmış kanallar bu değişiklikten etkilenmez.
        </div>
      </div>

      {error && (
        <div className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs text-rose-500">{error}</div>
      )}
      {loading && <div className="text-xs text-[var(--fg-muted)] py-4 text-center">Yükleniyor…</div>}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
          <div className="flex flex-col gap-5 min-w-0">
            <Section title="Menü seçenekleri">
              <MenuTreeEditor options={options} setOptions={setOptions} />
            </Section>
            <Section title="Hazır cevaplar (temsilciler için)">
              <CannedRepliesEditor />
            </Section>
            {texts.length > 0 && (
              <Section title="Bot metinleri">
                <BotTextsEditor entries={texts} onChange={updateText} />
              </Section>
            )}
          </div>
          <div className="xl:sticky xl:top-4">
            <MenuPreview options={options} texts={texts} />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--fg-muted)]">{title}</h3>
      {children}
    </section>
  );
}
