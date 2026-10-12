'use client';

import { useState } from 'react';
import { Eye, Play, Plug, RefreshCw } from 'lucide-react';
import { EmptyState, ErrorState, SectionCard, formatDateTime, formatNumber } from './shared';
import {
  useErpisCompanies, useErpisDatasets, useErpisSqlSources, usePreviewErpisSqlSource,
  useRunErpisSqlSourceNow, useTestErpisSqlConnection, useUpdateErpisSqlSource,
} from '@/hooks/erpis/useErpis';
import { ERPIS_DATASET_KIND_LABELS, type ErpisDataset, type ErpisSqlSource } from '@/lib/api';
import { datasetsForSource, missingTargetReason } from './sqlSourceRules';
import { SqlSourcePreview } from './SqlSourcePreview';

// Bu ekranın gördüğü kaynaklar (ErpisSqlSyncCatalog) KOD İÇİNDE tanımlı — burada
// prosedür adı, parametreler ya da kolon eşlemesi DÜZENLENEMEZ (bkz. backend yorumu:
// yanlış düzenlenmiş bir kolon eşlemesi canlıda veriyi sessizce bozar). Panelden yalnız
// çalışma ayarları değişir: aç/kapa, sıklık, hedef firma/rapor tipi, ERP şirket kodu.
const INTERVAL_OPTIONS = [
  { value: 15, label: '15 dakika' },
  { value: 30, label: '30 dakika' },
  { value: 60, label: '1 saat' },
  { value: 120, label: '2 saat' },
  { value: 360, label: '6 saat' },
  { value: 1440, label: '1 gün' },
];

const STATUS_LABEL: Record<string, string> = {
  Pending: 'Henüz çalışmadı',
  Success: 'Başarılı',
  Unchanged: 'Değişiklik yok',
  Error: 'Hata',
  Queued: 'Sırada',
  Running: 'Çalışıyor',
};

const STATUS_COLOR: Record<string, string> = {
  Pending: 'text-[var(--fg-muted)]',
  Success: 'text-emerald-600',
  Unchanged: 'text-[var(--fg-muted)]',
  Error: 'text-red-600',
  Queued: 'text-amber-600',
  Running: 'text-sky-600',
};

// "Sıradaki" sütunu, geçmişte kalmış bir saati olduğu gibi yazıyordu: kaynak çalışırken
// ya da vadesi geçmişken kullanıcı "18.09 00:03" görüp "neden çalışmadı" diye soruyordu.
// Zamanlayıcı 5 dakikada bir tur attığı için doğru cevap "sırada" olmalı.
function nextRunLabel(status: string, nextRunAt: string | null): string {
  if (status === 'Running') return 'çalışıyor';
  if (status === 'Queued') return 'sırada';
  if (!nextRunAt) return 'ilk turda';

  const next = new Date(nextRunAt);
  if (Number.isNaN(next.getTime())) return '—';

  // Vadesi geçmiş: zamanlayıcı en geç 5 dakika içinde alacak.
  return next.getTime() <= Date.now() ? 'sırada (birkaç dakika içinde)' : formatDateTime(nextRunAt);
}

// Uzun süren tur şeffaf olsun: "23:37'den beri" tek başına ne kadar sürdüğünü söylemiyor.
function runningForLabel(lastRunAt: string | null): string | null {
  if (!lastRunAt) return null;

  const started = new Date(lastRunAt);
  if (Number.isNaN(started.getTime())) return null;

  const minutes = Math.floor((Date.now() - started.getTime()) / 60_000);
  if (minutes < 1) return null;
  return minutes < 60 ? `${minutes} dk sürüyor` : `${Math.floor(minutes / 60)} sa ${minutes % 60} dk sürüyor`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Bilinmeyen hata.';
}

const FIELD_LABEL = 'text-[10px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]';
const FIELD_INPUT = 'rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11.5px] text-[var(--fg)]';
const ACTION_BUTTON =
  'flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50';

const MASS_CLOSE_CONFIRM =
  'Bu tur çok sayıda açık siparişi kapatacak. Önizlemedeki örnekleri ERP’de kontrol ettiniz mi? Onaylıyorsanız yazılacak.';

export function SqlSourcesTab() {
  const sources = useErpisSqlSources();
  const companies = useErpisCompanies();
  const datasets = useErpisDatasets();
  const updateSource = useUpdateErpisSqlSource();
  const testConnection = useTestErpisSqlConnection();

  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);

  async function handleTestConnection() {
    setConnectionMessage(null);
    const result = await testConnection.mutateAsync();
    setConnectionMessage(result.message);
  }

  if (sources.error) {
    return <div className="p-4"><ErrorState text={sources.error instanceof Error ? sources.error.message : undefined} /></div>;
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div data-tour="erpis-sql-connection">
        <SectionCard
          title="SQL Server Bağlantısı"
          subtitle="Erpis'in şirket içi SQL Server'ına salt okunur bağlantı. Kaynaklar bu bağlantı üzerinden çalışır."
          action={
            <button
              type="button"
              onClick={() => void handleTestConnection()}
              disabled={testConnection.isPending}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[11.5px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
            >
              <Plug size={13} strokeWidth={1.8} />
              Bağlantıyı Test Et
            </button>
          }
        >
          {connectionMessage && (
            <p className={`text-[11.5px] font-semibold ${
              testConnection.data?.success ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {connectionMessage}
            </p>
          )}
        </SectionCard>
      </div>

      {(sources.data?.length ?? 0) === 0 && !sources.isLoading ? (
        <EmptyState title="Tanımlı kaynak yok" />
      ) : (
        <div data-tour="erpis-sql-sources-list">
          <SectionCard
            title="Kaynaklar"
            action={<AutoSyncSummary sources={sources.data ?? []} />}
            subtitle="Her satır bir SQL prosedürü. Prosedür/kolon eşlemesi kodda sabit — burada yalnız açık/kapalı, sıklık ve hedef değişir. İlk açmadan önce Önizle ile ne olacağını görün."
          >
            <div className="flex flex-col gap-2">
              {(sources.data ?? []).map((source: ErpisSqlSource) => (
                <SourceRow
                  key={source.key}
                  source={source}
                  companies={companies.data ?? []}
                  datasets={datasets.data ?? []}
                  onUpdate={(body) => updateSource.mutate({ key: source.key, body })}
                  isUpdating={updateSource.isPending}
                />
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

// Kaynaklar kartının sağ üstündeki özet — Genel Bakış'taki "Canlı Veri (SP)" KPI'sıyla
// AYNI sayım. Hiçbir kaynak otomatik çekimde değilse uyarı rengine geçer: satırları tek tek
// okumadan "neden veri gelmiyor" sorusunun cevabı burada görünsün.
function AutoSyncSummary({ sources }: { sources: ErpisSqlSource[] }) {
  if (sources.length === 0) return null;

  const active = sources.filter((s) => s.isEnabled).length;
  const tone = active === 0
    ? 'border-amber-300 bg-amber-50 text-amber-800'
    : 'border-emerald-300 bg-emerald-50 text-emerald-800';

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone}`}>
      {active === 0
        ? `⚠ Otomatik çekim hiçbir kaynakta açık değil (0 / ${sources.length})`
        : `${active} / ${sources.length} kaynak otomatik çekiyor`}
    </span>
  );
}

type UpdateBody = {
  isEnabled: boolean;
  intervalMinutes: number;
  companyId: number | null;
  datasetId: number | null;
  erpCompanyCode: string | null;
};

type RunState = { success: boolean; message: string; requiresConfirmation: boolean };

function SourceRow({ source, companies, datasets, onUpdate, isUpdating }: {
  source: ErpisSqlSource;
  companies: { id: number; name: string; isActive: boolean }[];
  datasets: ErpisDataset[];
  onUpdate: (body: UpdateBody) => void;
  isUpdating: boolean;
}) {
  const runNow = useRunErpisSqlSourceNow();
  const preview = usePreviewErpisSqlSource();
  const [runResult, setRunResult] = useState<RunState | null>(null);

  const canEnable = source.isConfigured;
  const needsDataset = source.target === 'Import';
  const needsErpCode = source.requiresErpCompanyCode;
  const expectedKind = source.expectedKind;
  const datasetOptions = datasetsForSource(source, datasets);
  const missingReason = missingTargetReason(source);
  const busy = runNow.isPending || preview.isPending;

  // Her değişiklik o anki TÜM ayarları gönderir — PUT tam kayıt bekliyor. Eski önizleme ve
  // çalıştırma sonucu yeni ayara ait değil; ekranda kalıp yanıltmasın.
  function update(changes: Partial<UpdateBody>) {
    preview.reset();
    setRunResult(null);
    onUpdate({
      isEnabled: source.isEnabled,
      intervalMinutes: source.intervalMinutes,
      companyId: source.companyId,
      datasetId: source.datasetId,
      erpCompanyCode: source.erpCompanyCode,
      ...changes,
    });
  }

  function toggleEnabled(next: boolean) {
    if (next && missingReason) {
      window.alert(`Kaynak açılamaz: ${missingReason}`);
      return;
    }
    update({ isEnabled: next });
  }

  async function handleRunNow(confirmMassClose = false) {
    if (confirmMassClose && !window.confirm(MASS_CLOSE_CONFIRM)) return;

    setRunResult(null);
    let result;
    try {
      result = await runNow.mutateAsync({ key: source.key, confirmMassClose });
    } catch (error) {
      // İstek hiç sonuç döndüremediyse (ağ, zaman aşımı, 500) kullanıcı bunu GÖRMELİ —
      // önceden yakalanmıyordu ve düğme "hiçbir şey olmuyor" gibi davranıyordu.
      setRunResult({ success: false, message: `Çalıştırılamadı: ${errorText(error)}`, requiresConfirmation: false });
      return;
    }
    setRunResult(
      !result.success
        ? { success: false, message: result.errorMessage ?? 'Bilinmeyen hata.', requiresConfirmation: result.requiresConfirmation }
        // Çalışma artık arka planda: prosedür 17 bin satırda 13-52 sn sürebiliyor, istek
        // bunu beklemiyor. Sonuç yukarıdaki Durum/Son çalışma alanına 15 sn içinde düşer.
        : result.queued
          ? { success: true, message: 'Kuyruğa alındı — arka planda çalışıyor, durum birkaç saniyede güncellenir.', requiresConfirmation: false }
          : { success: true, message: `Başarılı — ${formatNumber(result.rowCount ?? 0)} satır.`, requiresConfirmation: false },
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[12.5px] font-bold text-[var(--fg)]">{source.displayName}</span>
          <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">{source.procedureName}</span>
        </div>

        {!canEnable ? (
          <span className="rounded-[4px] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--fg-muted)]">
            SP bekleniyor — örnek çıktı alınmadı
          </span>
        ) : (
          // Anahtar DURUMU açık-seçik söylüyor. Önceki "işaret kutusu + Kapalı" yazısı iki
          // türlü okunuyordu: işaretsiz kutunun yanındaki "Kapalı", "kapatma seçeneği
          // işaretli değil = açık" diye anlaşılabiliyordu — canlıda iki kaynak kapalıyken
          // açık sanıldı ve otomatik çekimin neden çalışmadığı saatlerce arandı.
          <button
            type="button"
            role="switch"
            aria-checked={source.isEnabled}
            aria-label={`Otomatik çekim ${source.isEnabled ? 'açık' : 'kapalı'} — değiştirmek için tıklayın`}
            onClick={() => toggleEnabled(!source.isEnabled)}
            disabled={isUpdating}
            className={`flex items-center gap-2 rounded-full border py-0.5 pl-0.5 pr-2.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
              source.isEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}
          >
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                source.isEnabled ? 'bg-emerald-500' : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
                  source.isEnabled ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </span>
            {source.isEnabled ? 'Otomatik çekim açık' : 'Otomatik çekim kapalı'}
          </button>
        )}
      </div>

      {canEnable && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className={FIELD_LABEL}>Sıklık</span>
            <select
              value={source.intervalMinutes}
              onChange={(e) => update({ intervalMinutes: Number(e.target.value) })}
              disabled={isUpdating}
              className={FIELD_INPUT}
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[160px] flex-col gap-1">
            <span className={FIELD_LABEL}>Hedef firma</span>
            <select
              value={source.companyId ?? ''}
              onChange={(e) => update({ companyId: e.target.value ? Number(e.target.value) : null })}
              disabled={isUpdating}
              className={FIELD_INPUT}
            >
              <option value="">— Seçilmedi —</option>
              {companies.filter((c) => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          {needsDataset && (
            <label className="flex min-w-[180px] flex-col gap-1">
              <span className={FIELD_LABEL}>
                Hedef rapor tipi{expectedKind ? ` (${ERPIS_DATASET_KIND_LABELS[expectedKind]})` : ''}
              </span>
              <select
                value={source.datasetId ?? ''}
                onChange={(e) => update({ datasetId: e.target.value ? Number(e.target.value) : null })}
                disabled={isUpdating || datasetOptions.length === 0}
                className={`${FIELD_INPUT} disabled:opacity-60`}
              >
                <option value="">{datasetOptions.length === 0 ? '— Uygun rapor tipi yok —' : '— Seçilmedi —'}</option>
                {datasetOptions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          )}

          {needsErpCode && (
            <ErpCompanyCodeInput
              // Sunucudaki değer değişince (başka bir sekmede kaydedildi) alan yeniden kurulur.
              key={source.erpCompanyCode ?? ''}
              value={source.erpCompanyCode ?? ''}
              disabled={isUpdating}
              onSave={(code) => update({ erpCompanyCode: code })}
            />
          )}

          <button
            type="button"
            onClick={() => { setRunResult(null); preview.mutate(source.key); }}
            disabled={busy || missingReason != null}
            title={missingReason ?? 'Prosedürü çalıştırır, hiçbir şey yazmaz'}
            className={ACTION_BUTTON}
          >
            {preview.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Eye size={12} strokeWidth={1.8} />}
            Önizle
          </button>

          <button
            type="button"
            onClick={() => void handleRunNow()}
            disabled={busy || missingReason != null}
            title={missingReason ?? 'Vadeyi beklemeden şimdi çalıştır'}
            className={ACTION_BUTTON}
          >
            {runNow.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} strokeWidth={1.8} />}
            Şimdi Çalıştır
          </button>
        </div>
      )}

      {canEnable && (
        <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-[var(--fg-muted)]">
          <span className={`flex items-center gap-1 font-bold ${STATUS_COLOR[source.status] ?? ''}`}>
            {source.status === 'Running' && <RefreshCw size={11} className="animate-spin" />}
            {STATUS_LABEL[source.status] ?? source.status}
          </span>
          <span>
            {source.status === 'Running' ? 'Başladı' : 'Son çalışma'}: {formatDateTime(source.lastRunAt) || '—'}
            {source.status === 'Running' && runningForLabel(source.lastRunAt) ? ` (${runningForLabel(source.lastRunAt)})` : ''}
          </span>
          <span>Son başarı: {formatDateTime(source.lastSuccessAt) || '—'}</span>
          <span>Sıradaki: {nextRunLabel(source.status, source.nextRunAt)}</span>
          <span>{formatNumber(source.lastRowCount)} satır</span>
          {source.consecutiveFailures > 0 && (
            <span className="font-bold text-red-600">{source.consecutiveFailures} ardışık hata</span>
          )}
        </div>
      )}

      {canEnable && needsDataset && expectedKind && datasetOptions.length === 0 && (
        <p className="rounded-[4px] bg-amber-50 px-2 py-1 text-[10.5px] font-semibold text-amber-800">
          «{ERPIS_DATASET_KIND_LABELS[expectedKind]}» türünde aktif bir rapor tipi yok. Sistem › Excel Kolon Eşlemesi
          sekmesinden bu türde bir rapor tipi ekleyin, sonra burada seçin.
        </p>
      )}

      {canEnable && missingReason && (
        <p className="text-[10.5px] font-semibold text-[var(--fg-muted)]">{missingReason}</p>
      )}

      {canEnable && source.lastError && (
        <p className="rounded-[4px] bg-red-50 px-2 py-1 text-[10.5px] font-semibold text-red-700">
          {source.lastError}
        </p>
      )}

      {(source.status === 'Running' || source.status === 'Queued') && (
        <p className="text-[10.5px] font-semibold text-sky-700">
          Prosedür arka planda {source.status === 'Running' ? 'çalışıyor' : 'sırasını bekliyor'}. Büyük raporlar
          (stok kartları, kapalı siparişler) ERP sunucusunun yüküne göre birkaç dakika sürebilir; sonuç burada görünecek.
        </p>
      )}

      {preview.isPending && (
        <p className="text-[10.5px] font-semibold text-[var(--fg-muted)]">
          Önizleme hazırlanıyor — prosedür çalışıyor, birkaç dakika sürebilir. Hiçbir şey yazılmaz.
        </p>
      )}

      {preview.isError && (
        <p className="rounded-[4px] bg-red-50 px-2 py-1 text-[10.5px] font-semibold text-red-700">
          Önizleme alınamadı: {errorText(preview.error)}
        </p>
      )}

      {preview.data && <SqlSourcePreview preview={preview.data} />}

      {/* Aynı hata metni hem son durumda hem düğme sonucunda görünüp tekrar etmesin. */}
      {runResult && runResult.message !== source.lastError && (
        <p className={`text-[10.5px] font-semibold ${runResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
          {runResult.message}
        </p>
      )}

      {runResult?.requiresConfirmation && (
        <div>
          <button
            type="button"
            onClick={() => void handleRunNow(true)}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-[4px] border border-amber-400 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 disabled:opacity-50"
          >
            <Play size={12} strokeWidth={1.8} />
            Onayla ve çalıştır
          </button>
        </div>
      )}
    </div>
  );
}

// Serbest metin — her tuşta kaydedilmez, alandan çıkınca ya da Enter'da kaydedilir.
function ErpCompanyCodeInput({ value, disabled, onSave }: {
  value: string;
  disabled: boolean;
  onSave: (code: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  function commit() {
    const next = draft.trim();
    if (next !== value) onSave(next);
  }

  return (
    <label className="flex w-[130px] flex-col gap-1">
      <span className={FIELD_LABEL} title="Bizim firma kodumuz değil; Erpis'teki şirketin kodu (@sirketkodu).">
        ERP şirket kodu
      </span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        disabled={disabled}
        placeholder="ör. STOREB"
        maxLength={32}
        className={FIELD_INPUT}
      />
    </label>
  );
}
