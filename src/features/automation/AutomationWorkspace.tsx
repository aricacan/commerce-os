'use client';

import { useCallback, useEffect, useState } from 'react';
import { Zap, Plus, Trash2, Play, RefreshCw, AlertCircle } from 'lucide-react';
import {
  automationApi,
  type AutomationCatalog,
  type AutomationActionSpec,
  type AutomationCondition,
  type AutomationRule,
  type AutomationRun,
} from '@/lib/api/automation';

// ─── Saf yardımcılar (vitest bunları test eder) ───────────────────────────────

/** Backend `AutomationOperators.NeedsValue` ile aynı kural. */
export function operatorNeedsValue(op: string): boolean {
  return op !== 'isEmpty' && op !== 'isNotEmpty';
}

const OPERATOR_LABELS: Record<string, string> = {
  eq: 'eşittir',
  ne: 'eşit değildir',
  contains: 'içerir',
  gt: 'büyüktür',
  gte: 'büyük veya eşittir',
  lt: 'küçüktür',
  lte: 'küçük veya eşittir',
  isEmpty: 'boştur',
  isNotEmpty: 'doludur',
};

/** Koşulu insan diline çevirir — kullanıcı JSON okumak zorunda kalmasın. */
export function describeCondition(condition: AutomationCondition): string {
  const op = OPERATOR_LABELS[condition.op] ?? condition.op;
  return operatorNeedsValue(condition.op)
    ? `${condition.field} ${op} "${condition.value ?? ''}"`
    : `${condition.field} ${op}`;
}

/**
 * Backend `AutomationRuleValidator` ile AYNI kurallar.
 *
 * Ekranda tekrar edilmesinin sebebi kullanıcıya anında geri bildirim; OTORİTE BACKEND'dir
 * (kural oradan da geçer). Ayrışırlarsa ekran kabul eder, sunucu reddeder — bu yüzden
 * ikisi de test altında.
 */
export function validateRule(
  name: string,
  conditions: AutomationCondition[],
  actionCount: number,
): string | null {
  if (!name.trim()) return 'Kural adı boş olamaz.';
  // Aksiyonsuz kural hiçbir şey yapmaz; kullanıcıya çalıştığını zannettirmemeli.
  if (actionCount === 0) return 'En az bir aksiyon gerekli.';

  for (const condition of conditions) {
    if (!condition.field) return 'Koşul alanı seçilmeli.';
    if (operatorNeedsValue(condition.op) && !condition.value?.trim()) {
      return `'${condition.field}' koşulu bir değer gerektiriyor.`;
    }
  }

  return null;
}

/**
 * Aksiyon tipinin ZORUNLU parametreleri. Backend `AutomationRuleValidator.MissingParameter`
 * ile aynı liste — ayrışırsa ekran kabul eder, sunucu reddeder.
 */
export const ACTION_PARAMS: Record<string, string[]> = {
  'order.setStatus': ['statusId'],
  notify: ['title', 'body'],
  'email.send': ['to', 'subject', 'body'],
  'order.appendNote': ['text'],
};

export function requiredParamsFor(actionType: string): string[] {
  return ACTION_PARAMS[actionType] ?? [];
}

/** Aksiyonun zorunlu alanları dolu mu. */
export function isActionComplete(action: AutomationActionSpec): boolean {
  return requiredParamsFor(action.type).every((key) => !!action.params[key]?.trim());
}

const OUTCOME_LABELS: Record<string, string> = {
  Matched: 'Çalıştı',
  NotMatched: 'Eşleşmedi',
  Failed: 'Hata',
};

export function describeRun(run: AutomationRun): string {
  const outcome = OUTCOME_LABELS[run.outcome] ?? run.outcome;
  return run.isSimulation ? `PROVA — ${outcome}` : outcome;
}

// ─── Ekran ────────────────────────────────────────────────────────────────────

export function AutomationWorkspace() {
  const [catalog, setCatalog] = useState<AutomationCatalog | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulateFor, setSimulateFor] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState('');

  // Kural olusturma formu. Onceden bu ekranda kural YAZILAMIYORDU: validateRule ve
  // createRule yazilmis ama hicbir yerden cagrilmiyordu - yani motor vardi, kullanicinin
  // ona kural verecek yolu yoktu.
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEvent, setDraftEvent] = useState('');
  const [draftConditions, setDraftConditions] = useState<AutomationCondition[]>([]);
  const [draftActions, setDraftActions] = useState<AutomationActionSpec[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedCatalog, loadedRules, loadedRuns] = await Promise.all([
        automationApi.catalog(),
        automationApi.rules(),
        automationApi.runs(),
      ]);
      setCatalog(loadedCatalog);
      setRules(loadedRules);
      setRuns(loadedRuns);
      setError(null);
    } catch {
      setError('Otomasyon verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function toggleActive(rule: AutomationRule) {
    try {
      await automationApi.updateRule(rule.id, { ...rule, isActive: !rule.isActive });
      await reload();
    } catch {
      setError('Kural güncellenemedi.');
    }
  }

  async function remove(rule: AutomationRule) {
    try {
      await automationApi.deleteRule(rule.id);
      await reload();
    } catch {
      setError('Kural silinemedi.');
    }
  }

  function startCreating() {
    const firstEvent = catalog?.events[0]?.event ?? '';
    setCreating(true);
    setDraftName('');
    setDraftEvent(firstEvent);
    setDraftConditions([]);
    setDraftActions([{ type: 'notify', params: { title: '', body: '' } }]);
    setError(null);
  }

  async function create() {
    // Backend ile AYNI kural; buradaki kontrol yalnizca aninda geri bildirim icin.
    const problem = validateRule(draftName, draftConditions, draftActions.length);
    if (problem) { setError(problem); return; }

    const incomplete = draftActions.find((a) => !isActionComplete(a));
    if (incomplete) {
      setError(`'${incomplete.type}' aksiyonunun zorunlu alanları eksik.`);
      return;
    }

    try {
      await automationApi.createRule({
        name: draftName.trim(),
        triggerEvent: draftEvent,
        isActive: true,
        priority: 0,
        conditions: draftConditions,
        actions: draftActions,
      });
      setCreating(false);
      await reload();
    } catch {
      setError('Kural kaydedilemedi (aynı adda bir kural olabilir).');
    }
  }

  function updateCondition(index: number, patch: Partial<AutomationCondition>) {
    setDraftConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updateActionParam(index: number, key: string, value: string) {
    setDraftActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, params: { ...a.params, [key]: value } } : a)));
  }

  const fieldsForDraft = catalog?.events.find((e) => e.event === draftEvent)?.fields ?? [];

  async function simulate(rule: AutomationRule) {
    const id = Number(subjectId);
    if (!Number.isInteger(id) || id <= 0) { setError('Geçerli bir kayıt numarası girin.'); return; }

    try {
      await automationApi.simulate(rule.id, id);
      setSimulateFor(null);
      setSubjectId('');
      await reload();
    } catch {
      setError('Prova çalıştırılamadı (kayıt bulunamamış olabilir).');
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 md:p-6 gap-5 bg-transparent max-w-5xl">
      {/* Top Header */}
      <div data-tour="automation-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[var(--fg)]" />
            <h1 className="text-sm font-bold text-[var(--fg)]">Otomasyon Kuralları & İş Akışları</h1>
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Sipariş veya durum değişikliklerinde tetiklenen otomatik kuralları ve bildirimleri yönetin.
          </p>
        </div>

        {!loading && catalog && !creating && (
          <button
            data-tour="automation-new-btn"
            type="button"
            onClick={startCreating}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Yeni Kural</span>
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[4px] bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Otomasyon verileri yükleniyor…</div>
      )}

      {/* Rule Creator Wizard */}
      {creating && catalog && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2.5">
            <h3 className="text-xs font-bold text-[var(--fg)]">Yeni Kural Oluştur</h3>
            <span className="text-[11px] text-[var(--fg-muted)]">Olay tetiklendiğinde koşulları denetler ve aksiyonları çalıştırır.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-semibold uppercase text-[var(--fg-muted)] mb-1">Kural Adı</label>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Örn: Kargoya verilince müşteriye e-posta gönder"
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold uppercase text-[var(--fg-muted)] mb-1">Tetikleyici Olay</label>
              <select
                value={draftEvent}
                onChange={(e) => {
                  setDraftEvent(e.target.value);
                  setDraftConditions([]);
                }}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs font-semibold text-[var(--fg)] outline-none cursor-pointer focus:border-[var(--fg)]"
              >
                {catalog.events.map((event) => (
                  <option key={event.event} value={event.event}>{event.event}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-soft)]">
            <span className="text-[10.5px] font-bold uppercase text-[var(--fg-muted)]">
              Koşullar {draftConditions.length === 0 && '— (Koşulsuz kural olayın her örneğinde çalışır)'}
            </span>

            {draftConditions.map((condition, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 p-2 text-xs">
                <select
                  value={condition.field}
                  onChange={(e) => updateCondition(index, { field: e.target.value })}
                  className="h-7.5 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--fg)] outline-none"
                >
                  {fieldsForDraft.map((field) => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>

                <select
                  value={condition.op}
                  onChange={(e) => updateCondition(index, { op: e.target.value })}
                  className="h-7.5 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--fg)] outline-none"
                >
                  {catalog.operators.map((op) => (
                    <option key={op} value={op}>{OPERATOR_LABELS[op] ?? op}</option>
                  ))}
                </select>

                {operatorNeedsValue(condition.op) && (
                  <input
                    value={condition.value ?? ''}
                    onChange={(e) => updateCondition(index, { value: e.target.value })}
                    placeholder="Değer"
                    className="h-7.5 w-40 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--fg)] outline-none"
                  />
                )}

                <button
                  type="button"
                  onClick={() => setDraftConditions((prev) => prev.filter((_, i) => i !== index))}
                  className="ml-auto text-xs font-semibold text-rose-500 hover:opacity-80 cursor-pointer"
                >
                  Kaldır
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setDraftConditions((prev) => [
                ...prev,
                { field: fieldsForDraft[0] ?? '', op: 'eq', value: '' },
              ])}
              disabled={fieldsForDraft.length === 0}
              className="w-fit inline-flex items-center gap-1 rounded-[4px] border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
            >
              <Plus size={11} />
              <span>Koşul Ekle</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-soft)]">
            <span className="text-[10.5px] font-bold uppercase text-[var(--fg-muted)]">Aksiyonlar</span>

            {draftActions.map((action, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 p-2 text-xs">
                <select
                  value={action.type}
                  onChange={(e) => setDraftActions((prev) => prev.map((a, i) =>
                    i === index ? { type: e.target.value, params: {} } : a))}
                  className="h-7.5 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-semibold text-[var(--fg)] outline-none"
                >
                  {catalog.actions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                {requiredParamsFor(action.type).map((key) => (
                  <input
                    key={key}
                    value={action.params[key] ?? ''}
                    onChange={(e) => updateActionParam(index, key, e.target.value)}
                    placeholder={key}
                    className="h-7.5 w-40 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--fg)] outline-none"
                  />
                ))}

                {draftActions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDraftActions((prev) => prev.filter((_, i) => i !== index))}
                    className="ml-auto text-xs font-semibold text-rose-500 hover:opacity-80 cursor-pointer"
                  >
                    Kaldır
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setDraftActions((prev) => [...prev, { type: 'notify', params: {} }])}
              className="w-fit inline-flex items-center gap-1 rounded-[4px] border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <Plus size={11} />
              <span>Aksiyon Ekle</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => { setCreating(false); setError(null); }}
              className="h-8 px-3 rounded-[4px] border border-[var(--border)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => void create()}
              className="h-8 px-4 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs font-bold text-[var(--fg)] shadow-xs hover:border-[var(--fg-muted)] transition cursor-pointer"
            >
              Kuralı Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {!loading && (
        <div data-tour="automation-rules-list" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--fg)] uppercase tracking-wider">
              Tanımlı Kurallar ({rules.length})
            </h2>
          </div>

          {rules.length === 0 ? (
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-8 text-center text-xs text-[var(--fg-muted)]">
              Henüz tanımlanmış bir otomasyon kuralı bulunmuyor.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex flex-col gap-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs transition ${
                  rule.isActive ? '' : 'opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleActive(rule)}
                      className={`rounded-[3px] px-2 py-0.5 text-[10px] font-bold cursor-pointer transition ${
                        rule.isActive
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)]'
                      }`}
                    >
                      {rule.isActive ? 'Aktif' : 'Pasif'}
                    </button>
                    <span className="text-xs font-bold text-[var(--fg)]">{rule.name}</span>
                    <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--fg-muted)]">
                      {rule.triggerEvent}
                    </span>
                    <span className="text-[10px] text-[var(--fg-muted)]">öncelik {rule.priority}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { setSimulateFor(rule.id); setError(null); }}
                      className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                    >
                      <Play size={10} />
                      <span>Prova</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(rule)}
                      className="flex h-7 w-7 items-center justify-center rounded-[3px] text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Flow conditions & actions */}
                <div className="flex flex-col gap-1 text-[11px] text-[var(--fg-muted)] bg-[var(--bg-subtle)]/40 p-2 rounded-[3px] border border-[var(--border-soft)]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[var(--fg)]">Eğer:</span>
                    {rule.conditions.length === 0 ? (
                      <span>Koşul yok (her zaman tetiklenir)</span>
                    ) : (
                      rule.conditions.map((condition, index) => (
                        <span key={`${condition.field}-${index}`} className="rounded-[2px] bg-[var(--card)] px-1.5 py-0.2 border border-[var(--border-soft)] font-mono text-[10.5px] text-[var(--fg)]">
                          {describeCondition(condition)}
                        </span>
                      ))
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[var(--fg)]">İse:</span>
                    {rule.actions.map((a, i) => (
                      <span key={i} className="rounded-[2px] bg-[var(--card)] px-1.5 py-0.2 border border-[var(--border-soft)] font-mono text-[10.5px] text-[var(--fg)]">
                        {a.type}
                      </span>
                    ))}
                  </div>
                </div>

                {rule.lastErrorMessage && (
                  <p className="text-[11px] font-semibold text-rose-500">Son hata: {rule.lastErrorMessage}</p>
                )}

                {simulateFor === rule.id && (
                  <div className="flex flex-wrap items-center gap-2 rounded-[3px] border border-dashed border-[var(--border)] p-2 bg-[var(--bg-subtle)]/30">
                    <label className="text-[11px] font-semibold text-[var(--fg-muted)] flex items-center gap-1.5">
                      <span>Prova yapılacak kayıt ID:</span>
                      <input
                        autoFocus
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        placeholder="Örn: 105"
                        className="h-7 w-24 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-mono text-[var(--fg)] outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void simulate(rule)}
                      className="h-7 px-2.5 rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-xs font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      Çalıştır (Veri Değişmez)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulateFor(null)}
                      className="text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer ml-1"
                    >
                      Kapat
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Runs History */}
      {!loading && (
        <div data-tour="automation-history" className="flex flex-col gap-2.5 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--fg)] uppercase tracking-wider">
              Çalıştırma Geçmişi ({runs.length})
            </h2>
            <button
              type="button"
              onClick={() => void reload()}
              className="text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={11} />
              <span>Yenile</span>
            </button>
          </div>

          {runs.length === 0 ? (
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-6 text-center text-xs text-[var(--fg-muted)]">
              Henüz çalıştırma kaydı bulunmuyor.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {runs.slice(0, 15).map((run) => {
                const isSuccess = run.outcome === 'Matched';
                const isSim = run.isSimulation;
                return (
                  <div
                    key={run.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-[3px] px-2 py-0.5 text-[10.5px] font-bold ${
                        isSim
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : isSuccess
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {describeRun(run)}
                      </span>
                      <span className="font-semibold text-[var(--fg)]">{run.ruleName}</span>
                      <span className="text-[var(--fg-muted)] font-mono text-[11px]">
                        {run.subjectType} #{run.subjectId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)]">
                      {run.detail && <span>{run.detail}</span>}
                      {run.errorMessage && <span className="text-rose-500 font-medium">{run.errorMessage}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Catalog Inspector */}
      {catalog && (
        <details className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 text-xs text-[var(--fg-muted)]">
          <summary className="cursor-pointer font-semibold text-[var(--fg)] select-none">
            Kullanılabilir Olaylar ve Alanlar Kataloğu ({catalog.events.length} olay)
          </summary>
          <div className="mt-2.5 flex flex-col gap-2 pt-2 border-t border-[var(--border-soft)]">
            {catalog.events.map((event) => (
              <div key={event.event} className="flex flex-col gap-0.5">
                <span className="font-mono text-xs font-bold text-[var(--fg)]">{event.event}</span>
                <span className="text-[11px] text-[var(--fg-muted)]">
                  Tip: {event.subjectType} · Alanlar: {event.fields.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
