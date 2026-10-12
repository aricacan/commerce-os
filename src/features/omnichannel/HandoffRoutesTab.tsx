'use client';

import { formatDateTime } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Route, Send, Trash2 } from 'lucide-react';
import { HANDOFF_REASON_LABELS } from '../../lib/api/handoff';
import {
  handoffRoutesApi, HANDOFF_ROUTE_EVENT, HANDOFF_ROUTE_EVENT_LABELS, HANDOFF_ROUTE_EVENT_SAMPLE, HANDOFF_ROUTE_HOURS_LABELS,
  type HandoffRouteDto, type HandoffRouteSaveBody, type HandoffRouteUserDto,
} from '../../lib/api/omnichannel-handoff-routes';
import { omnichannelApi, type BrandDto } from '../../lib/api/omnichannel';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { HandoffRouteEditor } from './HandoffRouteEditor';
import { PAYMENT_METHOD_LABELS } from './paymentOptionDraft';
import { rulesInScope, rulesRootClass, type ChannelRuleScope } from './ruleScope';
import { useOmnichannelCountries } from './useOmnichannelCountries';

type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; route: HandoffRouteDto };

// Eski backend olay göndermez → devir kuralı.
const eventOf = (route: HandoffRouteDto) => route.eventType ?? HANDOFF_ROUTE_EVENT.Handoff;
const isOrderRoute = (route: HandoffRouteDto) => eventOf(route) === HANDOFF_ROUTE_EVENT.Order;

// Boş koşul listesi = koşul yok (hepsi).
const listOrAll = (items: string[]) => (items.length === 0 ? 'Tümü' : items.join(', '));

// Devir kuralları: bot devrettiğinde ya da sohbetten sipariş onaylandığında ülkeye (ve isteğe bağlı nedene /
// ödeme yöntemine / markaya / mesaiye) göre EK hedeflere haber gider. Kanal ekibi bildirimi ve varsayılan Slack
// kanalı sürer. `scope` verilirse (Kanal Merkezi) yalnız o kanala uyan kurallar listelenir ve yeni kural kanalın
// ülkesiyle başlar; aynı bileşen Hesap geneli'nde tüm kuralları gösterir.
export function HandoffRoutesTab({ scope }: { scope?: ChannelRuleScope }) {
  const { countries } = useOmnichannelCountries();
  const [allRoutes, setAllRoutes] = useState<HandoffRouteDto[]>([]);
  const routes = rulesInScope(allRoutes, scope);
  const [users, setUsers] = useState<HandoffRouteUserDto[]>([]);
  const [brands, setBrands] = useState<BrandDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const { notify, confirm } = useFeedback();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAllRoutes(await handoffRoutesApi.getAll());
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadAll = async () => { await Promise.all([reload(), scope?.onChanged()]); };

  useEffect(() => {
    void reload();
    handoffRoutesApi.getUsers().then(setUsers).catch(() => setUsers([]));
    omnichannelApi.getBrands().then(setBrands).catch(() => setBrands([]));
  }, [reload]);

  const handleSave = async (body: HandoffRouteSaveBody) => {
    setSaving(true);
    try {
      if (editor.mode === 'edit') await handoffRoutesApi.update(editor.route.id, body);
      else await handoffRoutesApi.create(body);
      notify.success(`${body.name} kaydedildi.`);
      setEditor({ mode: 'closed' });
      await reloadAll();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  // Kuralın olayına göre gerçek şablonla örnek devir / örnek sipariş bildirimi gider.
  const handleTest = async (route: HandoffRouteDto) => {
    setTestingId(route.id);
    try {
      const result = await handoffRoutesApi.test(route.id);
      const sample = HANDOFF_ROUTE_EVENT_SAMPLE[eventOf(route)];
      if (result.ok) notify.success(`Örnek ${sample} bildirimi bütün hedeflere gönderildi.`);
      else notify.error(result.error ?? 'Deneme gönderilemedi.');
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (route: HandoffRouteDto) => {
    const ok = await confirm({ title: `"${route.name}" silinsin mi?`, body: 'Kural silinir; bildirimler bu hedeflere artık gitmez.', confirmLabel: 'Sil', danger: true });
    if (!ok) return;
    try {
      await handoffRoutesApi.remove(route.id);
      notify.success(`${route.name} silindi.`);
      await reloadAll();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const toggleActive = async (route: HandoffRouteDto) => {
    try {
      const { id: _id, lastDeliveryAt: _at, lastError: _err, ...body } = route;
      await handoffRoutesApi.update(route.id, { ...body, isActive: !route.isActive });
      await reloadAll();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const userName = (id: number) => users.find((u) => u.userId === id)?.displayName ?? `#${id}`;
  const brandName = (id: number) => brands.find((b) => b.id === id)?.name ?? `#${id}`;

  return (
    <div className={rulesRootClass(scope)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Route size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Devir kuralları</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
            Bot bir konuşmayı devrettiğinde ya da sohbetten sipariş onaylandığında kime haber gideceği (e-posta, Slack, panel). Kanal ekibinin bildirimi ve genel Slack devir kanalı yine çalışır; kurallar yalnız ek hedef ekler. Aynı konuşma 30 dk içinde tekrar devredilirse tek bildirimde birleşir.
          </p>
        </div>
        {editor.mode === 'closed' && (
          <button type="button" onClick={() => setEditor({ mode: 'new' })}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90">
            <Plus size={13} /> Yeni Kural
          </button>
        )}
      </div>

      {error && <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>}

      {editor.mode !== 'closed' && (
        <HandoffRouteEditor
          key={editor.mode === 'edit' ? editor.route.id : 'new'}
          initial={editor.mode === 'edit' ? editor.route : null}
          defaultCountry={scope?.country ?? null}
          countries={countries}
          users={users}
          brands={brands}
          saving={saving}
          onSave={(body) => void handleSave(body)}
          onCancel={() => setEditor({ mode: 'closed' })}
        />
      )}

      {loading && <div className="py-4 text-center text-[var(--fg-muted)]">Kurallar yükleniyor…</div>}

      {!loading && !error && routes.length === 0 && editor.mode === 'closed' && (
        <div className="rounded-[4px] border border-dashed border-[var(--border)] p-8 text-center text-[var(--fg-muted)]">
          {scope ? 'Bu kanala uyan kural yok. Yeni kural bu kanalın ülkesiyle başlar.' : <>Henüz kural yok. Örn. &quot;Kosova devirleri #kosova-destek kanalına gitsin&quot; ya da &quot;Kosova siparişleri depo@firma.com adresine gitsin&quot;.</>}
        </div>
      )}

      {!loading && routes.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {routes.map((route) => (
            <div key={route.id} className={`flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs ${route.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 font-bold text-[var(--fg)]">
                  <CountryFlag code={route.country} size={18} />
                  <span className="truncate">{route.name}</span>
                  <span className="shrink-0 rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--fg-muted)]">
                    {HANDOFF_ROUTE_EVENT_LABELS[eventOf(route)]}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => void toggleActive(route)}
                    className={`rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-semibold ${route.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'}`}>
                    {route.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                  <IconButton title={`Örnek ${HANDOFF_ROUTE_EVENT_SAMPLE[eventOf(route)]} bildirimi gönder`}
                    onClick={() => void handleTest(route)} disabled={testingId === route.id}><Send size={12} /></IconButton>
                  <IconButton title="Düzenle" onClick={() => setEditor({ mode: 'edit', route })}><Pencil size={12} /></IconButton>
                  <IconButton title="Sil" onClick={() => void handleDelete(route)} danger><Trash2 size={12} /></IconButton>
                </div>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                {isOrderRoute(route) ? (
                  <>
                    <dt className="text-[var(--fg-muted)]">Ödeme</dt>
                    <dd className="text-[var(--fg)]">{listOrAll((route.paymentMethods ?? []).map((m) => PAYMENT_METHOD_LABELS[m]))}</dd>
                  </>
                ) : eventOf(route) === HANDOFF_ROUTE_EVENT.Handoff && (
                  <>
                    <dt className="text-[var(--fg-muted)]">Neden</dt>
                    <dd className="text-[var(--fg)]">{listOrAll(route.reasons.map((r) => HANDOFF_REASON_LABELS[r]))}</dd>
                  </>
                )}
                <dt className="text-[var(--fg-muted)]">Marka</dt>
                <dd className="text-[var(--fg)]">{listOrAll((route.brandIds ?? []).map(brandName))}</dd>
                <dt className="text-[var(--fg-muted)]">Ne zaman</dt>
                <dd className="text-[var(--fg)]">{HANDOFF_ROUTE_HOURS_LABELS[route.hours]}</dd>
                <dt className="text-[var(--fg-muted)]">Slack</dt>
                <dd className="font-mono text-[var(--fg)]">{route.slackChannelIds.join(', ') || '—'}</dd>
                <dt className="text-[var(--fg-muted)]">Kişiler</dt>
                <dd className="text-[var(--fg)]">{route.userIds.map(userName).join(', ') || '—'}</dd>
                <dt className="text-[var(--fg-muted)]">E-posta</dt>
                <dd className="text-[var(--fg)]">{route.emails.join(', ') || '—'}</dd>
              </dl>

              <div className="border-t border-[var(--border-soft)] pt-2 text-[11px] text-[var(--fg-muted)]">
                Son gönderim: {route.lastDeliveryAt ? formatDateTime(route.lastDeliveryAt, 'tr', { dateStyle: 'short', timeStyle: 'short' }) : 'henüz yok'}
                {route.lastError && <div className="mt-0.5 text-rose-500">{route.lastError}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

function IconButton({ title, onClick, disabled, danger, children }: {
  title: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className={`flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] disabled:opacity-40 ${
        danger ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]'
      }`}>
      {children}
    </button>
  );
}
