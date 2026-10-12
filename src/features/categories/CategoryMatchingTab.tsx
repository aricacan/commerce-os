'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wand2, RefreshCw, Layers, AlertTriangle, Check, X, Database,
} from 'lucide-react';
import { categorySystemApi } from '../../lib/api';
import type { ProductRematchResult, CategoryDerivationApplyResult, SourceCategoryBackfillResult, CategoryLifecycleResult } from '../../lib/api/products';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';

// Ortak kategori sistemi paneli.
//
// İki eylem de İKİ ADIMLIDIR: önce kuru çalıştırma (hiçbir şey yazılmaz, ne olacağı
// raporlanır), kullanıcı onaylarsa gerçek yazım. 5.000+ ürünün kategorisini tek tıkla
// ve geri alınamaz şekilde değiştirmek kabul edilebilir bir tasarım değil.

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2 shadow-2xs">
      <span className="text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">{label}</span>
      <span className={`font-mono text-base font-bold tabular-nums ${tone ?? 'text-[var(--fg)]'}`}>{value}</span>
    </div>
  );
}

function ActionCard({
  icon: Icon, title, description, buttonLabel, onRun, busy, disabled,
}: {
  icon: typeof Wand2;
  title: string;
  description: string;
  buttonLabel: string;
  onRun: () => void;
  busy: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[var(--fg-muted)]" />
        <span className="text-xs font-bold text-[var(--fg)]">{title}</span>
      </div>
      <p className="text-ui-xs leading-relaxed text-[var(--fg-muted)]">{description}</p>
      <button
        type="button"
        onClick={onRun}
        disabled={busy || disabled}
        className="mt-auto inline-flex h-8 cursor-pointer items-center gap-1.5 self-start rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
      >
        <RefreshCw size={12} className={busy ? 'animate-spin' : undefined} />
        <span>{busy ? 'Çalışıyor…' : buttonLabel}</span>
      </button>
    </div>
  );
}

export function CategoryMatchingTab() {
  const queryClient = useQueryClient();
  const [rematchPreview, setRematchPreview] = useState<ProductRematchResult | null>(null);
  const [derivePreview, setDerivePreview] = useState<CategoryDerivationApplyResult | null>(null);

  const { data: raw = [], isLoading: rawLoading } = useQuery({
    queryKey: ['category-system-raw'],
    queryFn: categorySystemApi.raw,
    staleTime: 60_000,
  });

  const { data: coverage } = useQuery({
    queryKey: ['category-system-coverage'],
    queryFn: categorySystemApi.coverage,
    staleTime: 60_000,
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['category-system-suggestions'],
    queryFn: categorySystemApi.suggestions,
    staleTime: 30_000,
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ['category-system-conflicts'],
    queryFn: categorySystemApi.conflicts,
    staleTime: 60_000,
  });

  const invalidateAll = () => {
    ['categories-admin', 'category-products', 'category-system-raw',
     'category-system-coverage', 'category-system-suggestions', 'category-system-conflicts']
      .forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  // ── Ham kategorileri ERP'lerden doğrudan çek ─────────────────────────────
  //
  // Arşivi normalde ürün senkronu doldurur, ama senkron kendi sebepleriyle boş dönebiliyor
  // (Base, günün GBP kuru yoksa yanlış fiyat yazmamak için boş liste döndürüyor). Kategori
  // bilgisinin kurla ilgisi yok; bu yol yalnızca SKU + kategori okur.
  //
  // ARKA PLANDA çalışır: iş tüm ERP kataloglarını sayfa sayfa okuduğu için dakikalar
  // sürüyor ve senkron çağrı 25 saniyelik istek zaman aşımına HER SEFERİNDE takılıyordu
  // (iş sunucuda devam ederken kullanıcı hata görüyordu). Artık /start bir jobId döner,
  // aşağıdaki döngü sonuç gelene kadar durumu pollar.
  const runBackfill = async (dryRun: boolean): Promise<SourceCategoryBackfillResult> => {
    const { jobId } = await categorySystemApi.startBackfill(dryRun);

    // Toplam bekleme tavanı: 20 dk (240 × 5 sn). Aşılırsa iş sunucuda devam ediyor
    // olabilir; kullanıcıya "hâlâ çalışıyor" demek, sessizce başarısız saymaktan iyidir.
    for (let attempt = 0; attempt < 240; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const status = await categorySystemApi.backfillStatus(jobId);
      if (status.state === 'Completed' && status.result) return status.result;
      if (status.state === 'Failed') throw new Error(status.errorMessage || 'Ham kategori çekme başarısız.');
      if (status.state === 'NotFound') throw new Error('Ham kategori çekme işi bulunamadı (sunucu yeniden başlatılmış olabilir).');
    }
    throw new Error('Ham kategori çekme 20 dakikada bitmedi — iş sunucuda devam ediyor olabilir, biraz sonra sayfayı yenileyin.');
  };

  const backfillMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (dryRun: boolean) => runBackfill(dryRun),
    onSuccess: (result) => {
      const failed = result.sources.filter((s) => s.error);
      if (result.dryRun) {
        const lines = result.sources
          .map((s) => s.error
            ? `${s.sourceCode}: HATA — ${s.error}`
            : `${s.sourceCode}: ${s.fetchedProducts} ürün çekildi, ${s.matched} eşleşti, ` +
              `${s.written} yeni + ${s.updated} güncelleme`)
          .join('\n');

        if (result.totalWritten === 0 && result.totalUpdated === 0 && failed.length === 0) {
          toast.success('Ham kategori arşivi zaten güncel.');
          return;
        }
        const ok = window.confirm(`${lines}\n\nYazılsın mı?`);
        if (ok) backfillMutation.mutate(false);
        return;
      }
      if (failed.length > 0) {
        toast.error(
          `${result.totalWritten} satır yazıldı ama ${failed.length} kaynak başarısız: ` +
          failed.map((s) => s.sourceCode).join(', '));
      } else {
        toast.success(`${result.totalWritten} yeni, ${result.totalUpdated} güncellenmiş ham kategori satırı.`);
      }
      invalidateAll();
    },
    onError: (error) => toast.error(describeError(error)),
  });

  // ── Kategori ağacını türet + uygula ──────────────────────────────────────
  const deriveMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (dryRun: boolean) => categorySystemApi.applyDerivation(dryRun),
    onSuccess: (result) => {
      if (result.dryRun) {
        setDerivePreview(result);
        if (result.categoriesCreated === 0 && result.linksCreated === 0) {
          toast.success('Kategori ağacı zaten güncel — açılacak kategori ya da kurulacak bağ yok.');
          return;
        }
        const ok = window.confirm(
          `${result.categoriesCreated} yeni kategori açılacak, ${result.linksCreated} yeni kaynak bağı kurulacak.\n` +
          `${result.linksUpdated} bağ güncellenecek, ${result.linksSkippedManual} elle kurulmuş bağ korunacak.\n\nUygulansın mı?`,
        );
        if (ok) deriveMutation.mutate(false);
        return;
      }
      toast.success(`${result.categoriesCreated} kategori açıldı, ${result.linksCreated} bağ kuruldu.`);
      setDerivePreview(null);
      invalidateAll();
    },
    onError: (error) => toast.error(describeError(error)),
  });

  // ── Ürünleri yeniden eşle ────────────────────────────────────────────────
  const rematchMutation = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (dryRun: boolean) => categorySystemApi.rematch(dryRun),
    onSuccess: (result) => {
      if (result.dryRun) {
        setRematchPreview(result);
        if (result.changed === 0) {
          toast.success(`${result.scanned} ürün tarandı — kategorisi değişmesi gereken ürün yok.`);
          return;
        }
        const ok = window.confirm(
          `${result.scanned} ürün tarandı. ${result.changed} ürünün kategorisi DEĞİŞECEK.\n` +
          `${result.byRule} tanesi ürün adı kuralından, ${result.bySourceLink} tanesi kaynak kategorisinden.\n\nUygulansın mı?`,
        );
        if (ok) rematchMutation.mutate(false);
        return;
      }
      toast.success(`${result.changed} ürünün kategorisi düzeltildi.`);
      setRematchPreview(null);
      invalidateAll();
    },
    onError: (error) => toast.error(describeError(error)),
  });

  // AI ad önerisi (LlmCategoryNamer) her yeni ham kategori için ayrı bir LLM turu atıyor —
  // DEMO'nin ilk çalıştırmasında canlıda 30+ tur, dakikalar sürebiliyor. ARKA PLANDA çalışır,
  // runBackfill ile AYNI desen (bkz. yukarısı): /start bir jobId döner, aşağıdaki döngü
  // sonuç gelene kadar pollar.
  const runRefreshSuggestions = async (): Promise<CategoryLifecycleResult> => {
    const { jobId } = await categorySystemApi.startRefreshSuggestions();

    // NotFound ilk turlarda NORMALDİR: durum dosyasını işin kendisi (Hangfire worker işi
    // kuyruktan aldığında) yazıyor. Worker'lar meşgulse iş 5sn'den uzun kuyrukta bekler ve
    // sorunsuz çalışan bir işe "bulunamadı" hatası basmış oluruz. Bu yüzden ilk birkaç
    // NotFound tolere edilir; ısrar ederse gerçekten kayıp demektir.
    const notFoundTolerance = 6; // ~30 sn kuyruk payı
    let notFoundCount = 0;

    for (let attempt = 0; attempt < 240; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const status = await categorySystemApi.refreshSuggestionsStatus(jobId);
      if (status.state === 'Completed' && status.result) return status.result;
      if (status.state === 'Failed') throw new Error(status.errorMessage || 'Öneri tazeleme başarısız.');
      if (status.state === 'NotFound') {
        if (++notFoundCount > notFoundTolerance) {
          throw new Error('Öneri tazeleme işi bulunamadı (sunucu yeniden başlatılmış olabilir).');
        }
        continue;
      }
      notFoundCount = 0;
    }
    throw new Error('Öneri tazeleme 20 dakikada bitmedi — iş sunucuda devam ediyor olabilir, biraz sonra sayfayı yenileyin.');
  };

  const refreshSuggestions = useMutation({
    meta: { silentError: true } as const,
    mutationFn: runRefreshSuggestions,
    onSuccess: (r) => {
      toast.success(
        `${r.newCategorySuggestions} yeni kategori, ${r.deactivateSuggestions} kapatma, ` +
        `${r.splitSuggestions} bölme önerisi. ${r.staleSuggestionsClosed} geçersiz öneri kapatıldı.`);
      invalidateAll();
    },
    onError: (error) => toast.error(describeError(error)),
  });

  const resolveSuggestion = useMutation({
    meta: { silentError: true } as const,
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) =>
      categorySystemApi.resolveSuggestion(id, accept),
    onSuccess: () => invalidateAll(),
    onError: (error) => toast.error(describeError(error)),
  });

  const totalRawProducts = raw.reduce((sum, r) => sum + r.productCount, 0);
  const sourceCount = new Set(raw.map((r) => r.sourceCode)).size;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Ham Kategori" value={rawLoading ? '…' : raw.length} />
        <Stat
          label="Kaynak Kapsamı"
          value={coverage ? `${coverage.withData}/${coverage.total}` : rawLoading ? '…' : sourceCount}
          tone={coverage && !coverage.canMatch ? 'text-rose-500' : undefined}
        />
        <Stat label="Kapsanan Ürün" value={rawLoading ? '…' : totalRawProducts.toLocaleString('tr-TR')} />
        <Stat label="Bekleyen Öneri" value={suggestions.length}
              tone={suggestions.length > 0 ? 'text-amber-500' : undefined} />
        <Stat label="Çelişki" value={conflicts.length}
              tone={conflicts.length > 0 ? 'text-rose-500' : undefined} />
      </div>

      {coverage && coverage.sources.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Database size={13} className="text-[var(--fg-muted)]" />
              <span className="text-xs font-bold text-[var(--fg)]">Kaynak Kapsamı</span>
            </div>
            {!coverage.canMatch && (
              <span className="text-ui-xs text-rose-500 font-medium">
                Eşleştirme için en az 2 kaynak gereklidir ({coverage.withData} mevcut).
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {coverage.sources.map((s) => (
              <span
                key={s.id}
                title={s.hasData
                  ? `${s.products.toLocaleString('tr-TR')} ürün · ${s.categories} kategori`
                  : 'Bu kaynağın ham kategorileri arşivde yok'}
                className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-1 font-mono text-ui-xs ${
                  s.hasData
                    ? 'border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg)]'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
              >
                {s.hasData ? <Check size={11} /> : <X size={11} />}
                {s.code}
                {s.hasData && (
                  <span className="text-[var(--fg-muted)]">{s.products.toLocaleString('tr-TR')}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {raw.length === 0 && !rawLoading && (
        <div className="flex items-start gap-2 rounded-[4px] border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
          <Database size={13} className="mt-0.5 shrink-0" />
          <span>Ham kategori verisi henüz yok. &quot;Ham Kategorileri Çek&quot; butonuyla doldurabilirsiniz.</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ActionCard
          icon={Database}
          title="1. Ham Kategorileri Çek"
          description="ERP sistemlerinden yalnızca SKU ve kategori verilerini okuyarak arşivi günceller."
          buttonLabel="Ham Kategorileri Çek"
          busy={backfillMutation.isPending}
          onRun={() => backfillMutation.mutate(true)}
        />

        <ActionCard
          icon={Wand2}
          title="2. Kategorileri Eşle"
          description="Ham kategorileri karşılaştırarak aynı SKU'ları paylaşanları tek kategoride birleştirir."
          buttonLabel="Kategorileri Eşle"
          busy={deriveMutation.isPending}
          disabled={raw.length === 0}
          onRun={() => deriveMutation.mutate(true)}
        />

        <ActionCard
          icon={Layers}
          title="3. Ürünleri Düzelt"
          description="Ürün kurallarına ve kaynak eşleşmelerine göre ürün kategorilerini yeniden atar."
          buttonLabel="Ürünleri Düzelt"
          busy={rematchMutation.isPending}
          onRun={() => rematchMutation.mutate(true)}
        />
      </div>

      {rematchPreview && rematchPreview.changed > 0 && (
        <div className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
          <span className="text-xs font-bold text-[var(--fg)]">
            Önizleme — değişecek ürünler ({rematchPreview.changed} üründen ilk {rematchPreview.sample.length})
          </span>
          <div className="max-h-64 overflow-auto">
            <table className="w-full border-collapse text-left text-ui-xs">
              <thead className="sticky top-0 bg-[var(--bg-subtle)] text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="p-2">SKU</th><th className="p-2">Ürün</th>
                  <th className="p-2">Şu an</th><th className="p-2">Olacak</th><th className="p-2">Karar</th>
                </tr>
              </thead>
              <tbody>
                {rematchPreview.sample.map((c) => (
                  <tr key={c.productId} className="border-t border-[var(--border-soft)]">
                    <td className="p-2 font-mono text-ui-xs text-[var(--fg-muted)]">{c.sku}</td>
                    <td className="max-w-[280px] truncate p-2 text-[var(--fg)]">{c.productName}</td>
                    <td className="p-2 text-[var(--fg-muted)]">{c.fromCategory ?? '—'}</td>
                    <td className="p-2 font-semibold text-[var(--fg)]">{c.toCategory}</td>
                    <td className="p-2 text-ui-xs text-[var(--fg-subtle)]">{c.decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {derivePreview && derivePreview.notes.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5">
          <span className="text-xs font-bold text-[var(--fg)]">Açılacak kategoriler</span>
          <ul className="flex max-h-40 flex-col gap-1 overflow-auto text-ui-xs text-[var(--fg-muted)]">
            {derivePreview.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}

      {/* ── Öneriler ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-[var(--fg)]">
            Kategori Önerileri {suggestions.length > 0 && `(${suggestions.length})`}
          </span>
          <button
            type="button"
            onClick={() => refreshSuggestions.mutate()}
            disabled={refreshSuggestions.isPending}
            className="inline-flex h-7.5 cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-ui-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshSuggestions.isPending ? 'animate-spin' : undefined} />
            <span>Önerileri Tazele</span>
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-ui-xs text-[var(--fg-muted)]">
            Bekleyen öneri yok. &quot;Önerileri Tazele&quot; katalogla ağacı karşılaştırır: bağlanamayan
            yeni kaynak kategorileri, boşalmış kategoriler ve bölünebilecek büyük kategoriler.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5">
                <span className="shrink-0 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-ui-2xs font-bold uppercase text-[var(--fg-muted)]">
                  {s.kind}
                </span>
                <span className="min-w-0 flex-1 text-ui-xs text-[var(--fg)]">{s.reason}</span>
                <span className="shrink-0 font-mono text-ui-xs tabular-nums text-[var(--fg-muted)]">
                  {s.productCount} ürün
                </span>
                <button
                  type="button"
                  onClick={() => resolveSuggestion.mutate({ id: s.id, accept: true })}
                  disabled={resolveSuggestion.isPending}
                  title="Onayla"
                  className="flex h-6.5 w-6.5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-emerald-600 transition hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => resolveSuggestion.mutate({ id: s.id, accept: false })}
                  disabled={resolveSuggestion.isPending}
                  title="Reddet"
                  className="flex h-6.5 w-6.5 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Çelişkiler ──────────────────────────────────────────────────── */}
      {conflicts.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-rose-500" />
            <span className="text-xs font-bold text-[var(--fg)]">Çelişkiler ({conflicts.length})</span>
          </div>
          <p className="text-ui-xs text-[var(--fg-muted)]">
            Ürün kuralları ile kaynak kategorisi farklılık gösteren ürünler. Ürün kuralları önceliklidir.
          </p>
          <div className="max-h-72 overflow-auto rounded-[4px] border border-[var(--border-soft)]">
            <table className="w-full border-collapse text-left text-ui-xs">
              <thead className="sticky top-0 bg-[var(--bg-subtle)] text-ui-2xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="p-2">Ürün</th><th className="p-2">Kaynak</th>
                  <th className="p-2">Kaynak kategorisi</th>
                  <th className="p-2">Ürün adı diyor ki</th><th className="p-2">Kaynak diyor ki</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c) => (
                  <tr key={`${c.productId}-${c.sourceCode}`} className="border-t border-[var(--border-soft)]">
                    <td className="max-w-[260px] truncate p-2 text-[var(--fg)]">{c.productName}</td>
                    <td className="p-2 font-mono text-ui-xs text-[var(--fg-muted)]">{c.sourceCode}</td>
                    <td className="p-2 text-[var(--fg-muted)]">{c.externalCategoryName}</td>
                    <td className="p-2 font-semibold text-emerald-600 dark:text-emerald-400">{c.ruleCategory}</td>
                    <td className="p-2 text-[var(--fg-muted)]">{c.sourceLinkCategory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
