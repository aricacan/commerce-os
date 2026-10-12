'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, RotateCcw, Bot, FlaskConical, AlertTriangle, Play, Activity } from 'lucide-react';
import {
  omnichannelApi,
  type SandboxSessionDto, type BotTestScenarioDto, type BotTestRunDto, type BotCatalogQualityDto,
} from '../../lib/api/omnichannel';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { describeError } from '../../lib/errors';
import { countryLabel, useOmnichannelCountries } from './useOmnichannelCountries';
import { useCatalogProfiles } from './useCatalogProfiles';
import { ConsultationPanel } from './ConsultationPanel';
import { MessageBubble } from './MessageBubble';
import { HorizontalScroller } from './HorizontalScroller';
import { SandboxPhotoButton } from './SandboxPhotoButton';
import { failedResult, scenariosOf, summarizeRun, type SandboxSuite } from './sandboxSuiteRun';

// Kapsam: bir ülke (kanalın profili yoksa botun kullandığı varsayılan katalog) ya da bir
// katalog profili (profil kanala bağlanmadan denenebilsin diye).
// catalogLive=false (ör. Kosova varsayılanı): fiyat/stok yok; katalog testleri ve kalite özeti gösterilmez.
// translatable: ülkenin dili Türkçe değil — bot/müşteri mesajları Gelen Kutusundaki gibi Türkçeye çevrilebilir.
interface Scope {
  key: string; country: string; profileId: number | null; label: string; catalogLive: boolean; translatable: boolean;
}

const TURKISH_LANGUAGE_CODE = 'tr';

const SUGGESTIONS = [
  'Merhaba',
  'Ford Connect güneşliği var mı?',
  'Kargom nerede?',
  'Fiyat ne kadar?',
  'Temsilciye bağlan',
];

function DebugChip({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] text-[10.5px]">
      <span className="text-[var(--fg-muted)]">{label}:</span>
      <span className="font-mono text-[var(--fg)] font-bold">{value}</span>
    </span>
  );
}

function QualityStat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  const isWarning = warn && value > 0;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono">
      <strong className={isWarning ? 'text-amber-500 font-bold' : 'text-[var(--fg)]'}>{value}</strong>
      <span className="text-[var(--fg-muted)]">{label}</span>
    </span>
  );
}

export function SandboxTab() {
  const { countries, error: countriesError } = useOmnichannelCountries();
  const { profiles } = useCatalogProfiles();
  const [scopeKey, setScopeKey] = useState<string | null>(null);
  const [session, setSession] = useState<SandboxSessionDto | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<BotTestScenarioDto[]>([]);
  const [testRun, setTestRun] = useState<BotTestRunDto | null>(null);
  const [runningSuite, setRunningSuite] = useState<SandboxSuite | null>(null);
  // Senaryo senaryo ilerleme: "12/30".
  const [suiteProgress, setSuiteProgress] = useState<{ done: number; total: number } | null>(null);
  const [showTests, setShowTests] = useState(false);
  const [quality, setQuality] = useState<BotCatalogQualityDto | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Kapsam = aktif ülkeler. Kataloğu bağlı olmayan ülke (ör. Kosova) de seçilebilir:
  // "stok söylenmez, temsilciye devredilir" akışı da test edilebilmeli.
  const scopes = useMemo<Scope[]>(() => {
    const isForeign = (code: string) =>
      (countries.find((c) => c.code === code)?.defaultLanguage ?? TURKISH_LANGUAGE_CODE) !== TURKISH_LANGUAGE_CODE;
    return [
      ...countries.filter((c) => c.isActive).map((c) => ({
        key: c.code, country: c.code, profileId: null, label: countryLabel(c),
        catalogLive: c.catalogStatus === 'Live', translatable: isForeign(c.code),
      })),
      ...profiles.map((p) => ({
        key: `profile-${p.id}`, country: p.country, profileId: p.id, label: `Profil: ${p.name}`,
        catalogLive: true, translatable: isForeign(p.country),
      })),
    ];
  }, [countries, profiles]);

  useEffect(() => {
    if (scopeKey === null && scopes.length > 0) setScopeKey(scopes[0].key);
  }, [scopeKey, scopes]);

  useEffect(() => {
    if (countriesError) setError(countriesError);
  }, [countriesError]);

  const scope = scopes.find((s) => s.key === scopeKey) ?? null;
  // scope'un GÜNCEL değerini closure'lardan bağımsız okumak için — useCallback/useEffect
  // closure'ları içindeki `scope` o an ki render'a sabitlenmiştir; kullanıcı bir istek daha
  // dönmeden ülke değiştirirse eski closure'ın `scope`'u hiç güncellenmez, bu yüzden yanıt
  // geldiğinde "hâlâ aynı ülke miyiz" sorusu bir ref üzerinden sorulmalı.
  const currentScopeKeyRef = useRef(scopeKey);
  currentScopeKeyRef.current = scopeKey;
  const isCurrentScope = (key: string) => key === currentScopeKeyRef.current;

  // Kapsam değişince önceki ülkenin oturumu/test sonucu yenisi gelene kadar görünmesin.
  const changeScope = (key: string) => {
    if (key === scopeKey) return;
    setSession(null);
    setTestRun(null);
    setDraft('');
    setScopeKey(key);
  };

  const load = useCallback(async () => {
    if (!scope) return;
    const requestedKey = scope.key;
    setError(null);
    try {
      const result = await omnichannelApi.getSandbox(scope.country, scope.profileId);
      // Kullanıcı istek beklerken ülkeyi değiştirdiyse (ör. TR->UK->TR hızlıca) daha geç
      // dönen bir yanıt daha yeni bir yanıtın üzerine yazabiliyordu — sonuç, o an ekranda
      // görünen ülkeye ait değilse atlanır.
      if (requestedKey === currentScopeKeyRef.current) setSession(result);
    } catch (e) {
      setError(describeError(e));
    }
  }, [scope]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!scope) return;
    const requestedKey = scope.key;
    if (!scope.catalogLive) { setQuality(null); return; }
    omnichannelApi.getSandboxCatalogQuality(scope.country, scope.profileId)
      .then((result) => {
        if (requestedKey === currentScopeKeyRef.current) setQuality(result);
      })
      .catch(() => {
        if (requestedKey === currentScopeKeyRef.current) setQuality(null);
      });
  }, [scope]);

  useEffect(() => {
    omnichannelApi.getSandboxScenarios().then(setScenarios).catch(() => setScenarios([]));
  }, []);

  // Senaryolar sırayla, her biri ayrı istekle çalışır (bkz. sandboxSuiteRun.ts); sonuç tablosu
  // her senaryodan sonra güncellenir, bir senaryonun hatası paketi durdurmaz.
  const runSuite = async (suite: SandboxSuite) => {
    if (!scope || runningSuite) return;
    const requestedKey = scope.key;
    const selected = scenariosOf(scenarios, suite);
    if (selected.length === 0) { setError('Test senaryoları yüklenemedi.'); return; }

    setRunningSuite(suite); setError(null); setShowTests(true); setTestRun(null);
    const startedAt = Date.now();
    const results: BotTestRunDto['results'] = [];
    try {
      for (const scenario of selected) {
        if (!isCurrentScope(requestedKey)) return;
        setSuiteProgress({ done: results.length, total: selected.length });
        try {
          const run = await omnichannelApi.runSandboxScenario(scope.country, suite, scenario.id, scope.profileId);
          results.push(...run.results);
        } catch (e) {
          results.push(failedResult(scenario, describeError(e)));
        }
        if (isCurrentScope(requestedKey)) setTestRun(summarizeRun(suite, results, Date.now() - startedAt));
      }
      if (isCurrentScope(requestedKey)) await load();
    } finally {
      setRunningSuite(null);
      setSuiteProgress(null);
    }
  };

  const suiteLabel = (suite: SandboxSuite, idle: string) =>
    runningSuite === suite
      ? `Çalışıyor… ${suiteProgress ? `${suiteProgress.done}/${suiteProgress.total}` : ''}`.trim()
      : idle;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [session?.messages.length]);

  const send = async (text: string) => {
    const body = text.trim();
    if (!body || sending || !scope) return;
    const requestedKey = scope.key;

    setSending(true);
    setError(null);
    setDraft('');
    try {
      const result = await omnichannelApi.sendSandbox(scope.country, body, scope.profileId);
      if (isCurrentScope(requestedKey)) setSession(result);
    } catch (e) {
      if (!isCurrentScope(requestedKey)) return;
      setError(describeError(e));
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  // Fotoğraf gönderimi: yazma alanındaki metin açıklama olur (ör. "a keni?").
  const sendPhoto = async (file: File) => {
    if (sending || !scope) return;
    const requestedKey = scope.key;
    const caption = draft.trim();

    setSending(true);
    setError(null);
    setDraft('');
    try {
      const result = await omnichannelApi.sendSandboxPhoto(scope.country, file, caption, scope.profileId);
      if (isCurrentScope(requestedKey)) setSession(result);
    } catch (e) {
      if (!isCurrentScope(requestedKey)) return;
      setError(describeError(e));
      setDraft(caption);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    if (!scope) return;
    const requestedKey = scope.key;
    setError(null);
    try {
      const result = await omnichannelApi.resetSandbox(scope.country, scope.profileId);
      if (isCurrentScope(requestedKey)) setSession(result);
    } catch (e) {
      if (isCurrentScope(requestedKey)) setError(describeError(e));
    }
  };

  const messages = session?.messages ?? [];

  return (
    <div className="w-full flex-1 flex flex-col h-full min-h-0 text-xs">
      {/* Top Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 px-4 sm:px-5 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical size={15} className="text-[var(--fg-muted)]" />
          <div>
            <h2 className="font-bold text-xs text-[var(--fg)]">Bot Simülatörü ve Test Alanı</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-40">
            <FilterSelect
              value={scopeKey ?? ''}
              onChange={changeScope}
              placeholder="Ülke seçin"
              height="h-7"
              options={scopes.map((s) => ({
                value: s.key,
                label: s.label,
              }))}
            />
          </div>

          <button
            type="button"
            onClick={() => void reset()}
            className="inline-flex h-9 sm:h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>Sıfırla</span>
          </button>

          <button
            type="button"
            onClick={() => void runSuite('smoke')}
            disabled={runningSuite !== null || !scope?.catalogLive}
            title={scope?.catalogLive ? undefined : 'Bu ülkenin fiyat/stok kataloğu yok — katalog testleri çalışmaz'}
            className="inline-flex h-9 sm:h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
          >
            <Play size={11} />
            <span>{suiteLabel('smoke', 'Hızlı test')}</span>
          </button>

          <button
            type="button"
            onClick={() => void runSuite('full')}
            disabled={runningSuite !== null || !scope?.catalogLive}
            title={scope?.catalogLive ? undefined : 'Bu ülkenin fiyat/stok kataloğu yok — katalog testleri çalışmaz'}
            className="inline-flex h-9 sm:h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
          >
            <Activity size={11} />
            <span>{suiteLabel('full', scenarios.length ? `Tam test (${scenarios.length})` : 'Tam test')}</span>
          </button>
        </div>
      </div>

      {/* HATA SERIDI: setError bes ayri yerden cagriliyordu ama hicbir yerde
          GOSTERILMIYORDU - kullanici testin/oturumun neden calismadigini goremiyordu. */}
      {error && (
        <div className="flex items-center gap-2 px-5 py-1.5 bg-rose-500/10 border-b border-rose-500/30 text-rose-600 text-[11px] font-semibold">
          <AlertTriangle size={13} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-rose-600/70 hover:text-rose-600 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* TEST SONUCLARI: paket calisiyor, testRun doluyordu ama sonuc hicbir yerde
          gorunmuyordu - yani test butonlari calisip HICBIR SEY gostermiyordu. */}
      {showTests && testRun && (
        <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-2">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="font-bold text-[var(--fg)]">
              {testRun.suite} testi: {testRun.passed}/{testRun.total} geçti
            </span>
            {testRun.failed > 0 && (
              <span className="font-semibold text-rose-500">{testRun.failed} başarısız</span>
            )}
            <span className="text-[var(--fg-muted)]">{testRun.durationMs} ms</span>
            <button
              type="button"
              onClick={() => setShowTests(false)}
              className="ml-auto text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
            >
              Gizle
            </button>
          </div>

          {/* Yalnizca BASARISIZ senaryolar listelenir: gecen 30 testi siralamak, gozden
              kacirilmamasi gereken iki hatayi gomerdi. */}
          {testRun.results.filter((r) => !r.passed).length > 0 && (
            <div className="mt-1.5 flex flex-col gap-1 max-h-40 overflow-y-auto">
              {testRun.results.filter((r) => !r.passed).map((r) => (
                <div key={r.scenarioId} className="text-[10.5px] leading-relaxed">
                  <span className="font-semibold text-rose-500">✕ {r.name}</span>
                  <span className="text-[var(--fg-muted)]">
                    {' '}— beklenen: {r.expected} · gelen: {r.actual}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warning when Handed Over */}
      {session && !session.isBotActive && (
        <div className="flex items-center gap-2 px-5 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-soft)] text-[var(--fg-muted)] text-[11px] font-semibold">
          <AlertTriangle size={13} />
          <span>Bot bu konuşmayı temsilciye devretti.</span>
        </div>
      )}

      {/* Debug Info Strip */}
      {session && (
        <div className="px-4 sm:px-5 py-1.5 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 text-xs shrink-0">
          <HorizontalScroller ariaLabel="Bot hata ayıklama bilgisi" fadeFromClass="from-[var(--bg)]">
            <DebugChip label="Niyet" value={session.debug.lastIntent} />
            <DebugChip label="Araçlar" value={session.debug.lastTools} />
            <DebugChip label="Aksiyon" value={session.debug.pendingAction} />
            <DebugChip label="Araç" value={[session.debug.brand, session.debug.model, session.debug.vehicleYear].filter(Boolean).join(' ')} />
            <DebugChip label="Süre" value={session.debug.lastDurationMs != null ? `${session.debug.lastDurationMs} ms` : null} />
          </HorizontalScroller>
        </div>
      )}

      {/* Quality Strip */}
      {quality && (
        <div className="flex items-center gap-3 flex-wrap px-4 sm:px-5 py-1.5 border-b border-[var(--border-soft)] bg-[var(--card)] text-xs shrink-0">
          <span className="font-bold text-[10px] text-[var(--fg-muted)] uppercase tracking-wider">Katalog:</span>
          <QualityStat label="aktif" value={quality.totalProducts} />
          <QualityStat label="markasız" value={quality.missingBrand} warn />
          <QualityStat label="modelsiz" value={quality.missingModel} warn />
          <QualityStat label="yılsız" value={quality.missingModelYear} warn />
        </div>
      )}

      {/* Chat Messages Body */}
      {/* Balonlar Gelen Kutusundakiyle aynı: bot/temsilci/müşteri ayrımı ve çeviri canlıdakinin önizlemesi. */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[var(--bg)] px-2 py-4 sm:px-5">
        {messages.length === 0 && (
          <div className="py-10 text-center text-xs text-[var(--fg-muted)] space-y-3">
            <p className="font-semibold text-xs text-[var(--fg)]">Bot simülasyonu hazır</p>
            <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-lg mx-auto pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="px-2.5 py-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] font-semibold transition cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            supportsDeliveryReceipts={false}
            supportsReadReceipts={false}
            showDeliveryStatus={false}
            translatable={scope?.translatable ?? false}
          />
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)] font-mono">
            <Bot size={13} className="animate-spin" />
            <span>Bot cevap hazırlıyor…</span>
          </div>
        )}
      </div>

      {/* Prompt / Input Bar */}
      <div className="border-t border-[var(--border-soft)] bg-[var(--card)] px-2.5 pt-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:px-5 shrink-0">
        {/* Bot test konuşmasında temsilciye soru açarsa kart canlıdakiyle aynı bileşenle görünür. */}
        {session && (
          <div className="mb-2 empty:hidden">
            <ConsultationPanel
              key={session.conversationId}
              conversationId={session.conversationId}
              refreshKey={`${messages.length}:${sending}`}
              onAnswered={() => void load()}
            />
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Müşteri gibi yazın (ör. 2018 caddy paspas var mı?)"
            className="min-w-0 flex-1 h-10 sm:h-8 rounded-lg sm:rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-base sm:text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
          />
          <SandboxPhotoButton disabled={sending || !scope} onPhotoSelected={(file) => void sendPhoto(file)} />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="inline-flex h-10 sm:h-8 shrink-0 items-center gap-1.5 rounded-lg sm:rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
          >
            <Send size={12} />
            <span>Gönder</span>
          </button>
        </form>
      </div>
    </div>
  );
}
