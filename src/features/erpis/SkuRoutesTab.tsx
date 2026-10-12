'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  useApplyErpisSkuRoutes, useDeleteErpisSkuRoute, useErpisCardMatrix,
  useFillUnnamedErpisCardTags, useSaveErpisCardTag, useSaveErpisSkuRoute,
} from '@/hooks/erpis/useErpisCatalog';
import { useErpisCompanies } from '@/hooks/erpis/useErpis';
import type { ErpisApplyRoutesResult, ErpisCardMatrixGroup, ErpisCardMatrixRow } from '@/lib/api';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { EmptyState, ErrorState, formatNumber } from './shared';
import { parseId } from './erpisFilterUtils';

// Kalıbın "küçük" sayılma eşiği: tüm kartların bu kadarlık payı.
//
// Sabit bir kart sayısı (ör. 100) veri büyüdükçe anlamını yitirirdi; oran her zaman
// "asıl kümeler" ile "kuyruk" ayrımını verir.
const SMALL_GROUP_SHARE = 0.01;

// Kartlar üç kutuda toplanıyor: DEMO Ürünler, DEMO Levha Ürünleri, Diğer Ürünler.
//
// Erpis'in kendi kart tipleri ("GİDERLER", "DEMİRBAŞ", "YARIMAMUL") AYRI KUTU DEĞİL:
// e-ticaret ekibi ürünü kimin ürettiğine göre ayırıyor, Erpis'in muhasebe terimlerine
// göre değil.
//
// Öneri listesi KULLANILAN ADLARDAN türer, sabit bir listeden değil: kullanıcı bir kutuyu
// yeniden adlandırdığında öneri eski adı göstermeye devam etseydi, aynı kümeye iki farklı
// ad verilip filtrede dördüncü bir kutu açılırdı.

// Firma Kuralları — Erpis kartlarının TEK kural sayfası.
//
// İKİ SORUYU BİRLİKTE cevaplıyor, çünkü ikisi de aynı kartın aynı iki özelliğine bakıyor:
//   1. Bu kart HANGİ FİRMANIN?      → kod kalıbına göre (satır grubu başlığı)
//   2. Bu kart filtrede HANGİ ADLA? → kod kalıbı + kart tipi çiftine göre (satırlar)
//
// Önce ayrı iki ekrandı ve kuralların biçimi de karmaydı: bir kısmı kod kalıbıyla, bir
// kısmı "GİDERLER" gibi kart tipiyle eşleşiyordu. Bir kartın hangi kurala düştüğü ekrana
// bakarak anlaşılmıyordu. Artık her satırın biçimi aynı: kalıp + tip + sayı + ad.
//
// MATRİS VERİDEN TÜRER: hangi (kalıp, tip) çiftleri var sorusu kullanıcıya sorulmaz,
// gösterilir. Böylece hiçbir kart kapsam dışında kalmaz.
//
// FİRMA NEDEN TİPE GÖRE AYARLANMIYOR: sipariş raporunda "tipiadi" kolonu yok, kartın tipi
// ancak stok kartı dosyasından biliniyor. Yönlendirme tipe bağlansaydı sipariş
// dosyasındaki satırlar hangi firmaya yazılacağını bilemezdi.
export function SkuRoutesTab() {
  const matrix = useErpisCardMatrix();
  const companies = useErpisCompanies();
  const saveRoute = useSaveErpisSkuRoute();
  const removeRoute = useDeleteErpisSkuRoute();
  const saveTag = useSaveErpisCardTag();
  const fillUnnamed = useFillUnnamedErpisCardTags();
  const apply = useApplyErpisSkuRoutes();

  const [preview, setPreview] = useState<ErpisApplyRoutesResult | null>(null);

  // Yeni firma kuralı: kullanıcı ÖRNEK KOD yapıştırıyor, maskeyi sunucu çıkarıyor.
  // "99999999-999999-99999999" yazmasını beklemek gerçekçi değil.
  const [newSample, setNewSample] = useState('');
  const [newCompanyId, setNewCompanyId] = useState<number | null>(null);
  const [showSmall, setShowSmall] = useState(false);

  const companyOptions = (companies.data ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({ value: String(c.id), label: c.name }));

  async function runApply(dryRun: boolean) {
    const result = await apply.mutateAsync(dryRun);
    setPreview(dryRun ? result : null);
  }

  async function addRoute() {
    if (!newSample.trim() || newCompanyId == null) return;
    await saveRoute.mutateAsync({ companyId: newCompanyId, sample: newSample.trim() });
    setNewSample('');
  }

  if (matrix.isError) return <div className="p-4"><ErrorState /></div>;

  const groups = matrix.data?.groups ?? [];

  // UZUN KUYRUK KATLANIYOR.
  //
  // Gerçek veride 50 kod kalıbı var ama üçü kartların %98'ini tutuyor; geri kalan
  // kırk yedi kalıp tek haneli sayılarla sayfayı on ekran uzatıyor ve asıl kuralları
  // görünmez kılıyordu. Gizlenmiyorlar, KATLANIYORLAR: sayıları ve kart toplamları
  // düğmenin üstünde yazıyor ve tek tıkla açılıyorlar.
  // Ekranda hâlihazırda kullanılan adlar — ad kutularının öneri listesi.
  const usedLabels = [...new Set(
    groups.flatMap((g) => g.rows.map((r) => r.label)).filter((l): l is string => !!l),
  )];

  const totalCards = groups.reduce((sum, g) => sum + g.itemCount, 0);
  const smallThreshold = Math.max(1, Math.round(totalCards * SMALL_GROUP_SHARE));

  const bigGroups = groups.filter((g) => g.itemCount >= smallThreshold);
  const smallGroups = groups.filter((g) => g.itemCount < smallThreshold);
  const smallCards = smallGroups.reduce((sum, g) => sum + g.itemCount, 0);

  return (
    <div className="flex flex-col gap-3 p-4">
      <datalist id="erpis-card-labels">
        {usedLabels.map((l) => <option key={l} value={l} />)}
      </datalist>

      <div className="rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-3">
        <span className="text-[11.5px] font-bold text-[var(--fg)]">Nasıl çalışır</span>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--fg-muted)]">
          Her kart bir <strong className="font-bold">kod kalıbına</strong> ve bir{' '}
          <strong className="font-bold">kart tipine</strong> sahip. Kalıp hangi firmanın
          olduğunu, kalıp + tip çifti ise filtrede hangi adla görüneceğini belirler.{' '}
          <strong className="font-bold">
            Aynı adı birden çok çifte verirseniz filtrede tek kutuda birleşirler.
          </strong>{' '}
          Kartlar üç kutuda toplanıyor: <b>DEMO Ürünler</b>, <b>DEMO Levha Ürünleri</b>,{' '}
          <b>Diğer Ürünler</b>. Aşağıdaki liste verinizden çıkarıldı — her kart mutlaka bir
          satırda.
        </p>
      </div>

      {/* Başlık KENDİ SATIRINDA: aynı satırda dururken örnek kod kutusuna 260px
          taban genişlik kalmıyor, firma seçicisi ve Ekle düğmesi alta düşüp form
          üç parçaya bölünüyordu. */}
      <div data-tour="erpis-routes-add" className="flex flex-col gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--card)] p-3">
        <span className="text-[11.5px] font-bold text-[var(--fg)]">Kod kalıbı ekle</span>
        <div className="flex flex-wrap items-center gap-2">
        <input
          value={newSample}
          onChange={(e) => setNewSample(e.target.value)}
          placeholder="Örnek stok kodu — ör. İ.003-0500001030-500799007"
          className="min-w-[200px] flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 py-2 font-mono text-[12px] text-[var(--fg)] outline-none"
        />
        <FilterSelect
          value={newCompanyId ? String(newCompanyId) : ''}
          options={companyOptions}
          placeholder="Firma seçin"
          onChange={(v) => setNewCompanyId(parseId(v))}
          showAllOption={false}
          minWidth={190}
        />
        <button
          type="button"
          onClick={() => void addRoute()}
          disabled={!newSample.trim() || newCompanyId == null || saveRoute.isPending}
          className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
        >
          {saveRoute.isPending && <Loader2 size={13} className="animate-spin" />}
          Ekle
        </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="Henüz kart yok"
          hint="Bir stok kartı ya da sipariş raporu yükleyin; kod kalıpları ve kart tipleri buradan listelenir."
        />
      ) : (
        <div data-tour="erpis-routes-list" className="flex flex-col gap-3">
          {bigGroups.map((group) => (
            <PatternGroup
              key={group.skuPattern}
              group={group}
              companyOptions={companyOptions}
              onCompanyChange={(companyId) =>
                saveRoute.mutate({ pattern: group.skuPattern, companyId, sample: group.sample })}
              onPatternLabelChange={(label) => {
                if (group.companyId == null) return;
                saveRoute.mutate({
                  pattern: group.skuPattern, companyId: group.companyId, label: label || null,
                });
              }}
              onRemoveRoute={group.routeId == null ? undefined : () => removeRoute.mutate(group.routeId!)}
              onLabelChange={(row, label) =>
                saveTag.mutate({
                  skuPattern: row.skuPattern, itemTypeKey: row.itemTypeKey, label: label || null,
                })}
              onDefaultChange={(row, isDefaultVisible) =>
                saveTag.mutate({
                  skuPattern: row.skuPattern, itemTypeKey: row.itemTypeKey,
                  label: row.label, isDefaultVisible,
                })}
            />
          ))}

          {smallGroups.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowSmall((v) => !v)}
                className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-left text-[11.5px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                {showSmall ? 'Küçük kalıpları gizle' : 'Küçük kalıpları göster'}
                {' · '}
                {smallGroups.length} kalıp, {formatNumber(smallCards)} kart
              </button>

              {showSmall && smallGroups.map((group) => (
                <PatternGroup
                  key={group.skuPattern}
                  group={group}
                  companyOptions={companyOptions}
                  onCompanyChange={(companyId) =>
                    saveRoute.mutate({ pattern: group.skuPattern, companyId, sample: group.sample })}
                  onPatternLabelChange={(label) => {
                    if (group.companyId == null) return;
                    saveRoute.mutate({
                      pattern: group.skuPattern, companyId: group.companyId, label: label || null,
                    });
                  }}
                  onRemoveRoute={group.routeId == null ? undefined : () => removeRoute.mutate(group.routeId!)}
                  onLabelChange={(row, label) =>
                    saveTag.mutate({
                      skuPattern: row.skuPattern, itemTypeKey: row.itemTypeKey, label: label || null,
                    })}
                  onDefaultChange={(row, isDefaultVisible) =>
                    saveTag.mutate({
                      skuPattern: row.skuPattern, itemTypeKey: row.itemTypeKey,
                      label: row.label, isDefaultVisible,
                    })}
                />
              ))}
            </>
          )}

          {(matrix.data?.untaggedCount ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-amber-300 bg-amber-50 p-2.5 text-[11.5px] text-amber-900">
              <span>
                <b>{formatNumber(matrix.data!.untaggedCount)} kartın adı yok.</b> Filtrede{' '}
                <b>Etiketsiz</b> kutusunda görünürler.
              </span>
              {/* Yeni bir yükleme tanınmayan kalıp getirdiğinde onlarca satır birden
                  adsız doğuyor; tek tek doldurtmak yerine tek düğme. */}
              {/* Ad göndermiyoruz: sunucu kod şemasından türetiyor (8-6-8 → DEMO Ürünler,
                  harf önekli → DEMO Levha Ürünleri, geri kalan → Diğer Ürünler). Hepsini
                  tek ada yığmak, levha kodlarını da "Diğer" kutusuna atardı. */}
              <button
                type="button"
                onClick={() => fillUnnamed.mutate(null)}
                disabled={fillUnnamed.isPending}
                className="ml-auto flex items-center gap-1.5 rounded-[4px] border border-amber-400 bg-white px-2.5 py-1 font-bold text-amber-900 disabled:opacity-50"
              >
                {fillUnnamed.isPending && <Loader2 size={12} className="animate-spin" />}
                Kod şemasına göre adlandır
              </button>
            </div>
          )}
        </div>
      )}

      <div data-tour="erpis-routes-apply" className="flex flex-col gap-2 rounded-[5px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3">
        <span className="text-[11.5px] text-[var(--fg)]">
          Firma kuralları yalnızca <strong className="font-bold">yeni</strong> yüklemeleri
          yönlendirir. Daha önce yüklenmiş kartları da hizaya getirmek için kuralları
          geçmişe uygulayın. (Adlar için gerekmez — onlar her sorguda yeniden uygulanır.)
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runApply(true)}
            disabled={apply.isPending}
            className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
          >
            {apply.isPending && <Loader2 size={13} className="animate-spin" />}
            Ne olacağını göster
          </button>

          {preview != null && preview.moved > 0 && (
            <button
              type="button"
              onClick={() => void runApply(false)}
              disabled={apply.isPending}
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-[12px] font-bold text-[var(--fg)] shadow-xs disabled:opacity-50"
            >
              {formatNumber(preview.moved)} kartı taşı
            </button>
          )}
        </div>

        {preview != null && preview.blocked > 0 && (
          <div className="rounded-[4px] border border-amber-300 bg-amber-50 p-2 text-[11.5px] text-amber-900">
            <b>{formatNumber(preview.blocked)} kart taşınamaz:</b> hedef firmada aynı stok
            kodu zaten var. Bir kod bir firmada yalnız bir kez bulunabilir.
            {preview.blockedSamples && preview.blockedSamples.length > 0 && (
              <span className="mt-1 block font-mono text-[10.5px] text-amber-800">
                {preview.blockedSamples.join(' · ')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PatternGroupProps {
  group: ErpisCardMatrixGroup;
  companyOptions: { value: string; label: string }[];
  onCompanyChange: (companyId: number) => void;
  onPatternLabelChange: (label: string) => void;
  onRemoveRoute?: () => void;
  onLabelChange: (row: ErpisCardMatrixRow, label: string) => void;
  onDefaultChange: (row: ErpisCardMatrixRow, isDefaultVisible: boolean) => void;
}

function PatternGroup({
  group, companyOptions, onCompanyChange, onPatternLabelChange, onRemoveRoute,
  onLabelChange, onDefaultChange,
}: PatternGroupProps) {
  return (
    <div className="overflow-hidden rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
      {/* Grup başlığı: kod kalıbı ve FİRMA. Firma kalıp başına, çünkü sipariş
          raporunda kart tipi yok.

          SAĞDAKİ KONTROLLER TEK BLOKTA: önce hepsi tek tek `flex-wrap`in içindeydi ve
          sayı rozetinde `ml-auto` vardı; satır kırılınca rozet ikinci satırın sağına
          fırlıyor, firma seçicisi ve çöp kutusu ondan kopuyordu. Artık üçü birlikte
          kayıyor. Ortadaki maske/örnek `min-w-0 truncate` ile kısalıyor — taşıp
          düzeni bozmak yerine kesiliyor. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2">
        <input
          key={group.patternLabel ?? ''}
          defaultValue={group.patternLabel ?? ''}
          placeholder="Kalıp adı"
          disabled={group.companyId == null}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next === (group.patternLabel ?? '')) return;
            onPatternLabelChange(next);
          }}
          className="w-[120px] shrink-0 rounded-[4px] border border-transparent bg-transparent px-1.5 py-1 text-[12.5px] font-bold text-[var(--fg)] outline-none hover:border-[var(--border-soft)] focus:border-[var(--border)] focus:bg-[var(--bg)] disabled:opacity-50"
        />

        <div className="flex min-w-0 flex-1 basis-[140px] flex-col leading-tight">
          <span className="truncate font-mono text-[11.5px] text-[var(--fg-muted)]">
            {group.skuPattern}
          </span>
          {group.sample && (
            <span className="truncate font-mono text-[10.5px] text-[var(--fg-muted)] opacity-70">
              {group.sample}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-[4px] bg-[var(--card)] px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-[var(--fg)]">
            {formatNumber(group.itemCount)} kart
          </span>

          <FilterSelect
            value={group.companyId == null ? '' : String(group.companyId)}
            options={companyOptions}
            placeholder="Firma yok"
            onChange={(v) => {
              const id = parseId(v);
              if (id != null) onCompanyChange(id);
            }}
            showAllOption={false}
            minWidth={150}
          />

          {onRemoveRoute && (
            <button
              type="button"
              onClick={onRemoveRoute}
              title="Firma kuralını sil — bu kalıptaki kartlar yüklemenin firmasına düşer"
              className="p-1 text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* Tablo dar ekranda YATAY KAYIYOR.
          Dört sütun ve sabit genişlikli ad kutusu 400px altında sığmıyor; kartın
          `overflow-hidden`i de taşan kısmı kesip erişilemez yapıyordu. */}
      <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[12px]">
        <thead>
          <tr className="text-[10.5px] font-extrabold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
            <th className="px-3 py-1.5 text-left">Kart Tipi</th>
            <th className="px-3 py-1.5 text-right">Kart</th>
            <th className="px-3 py-1.5 text-left">Ad (filtrede görünen)</th>
            <th className="px-3 py-1.5 text-left">Varsayılan</th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row) => (
            <tr key={row.itemTypeKey} className="border-t border-[var(--border-soft)]">
              <td className="px-3 py-2 font-mono text-[11.5px] text-[var(--fg-muted)]">
                {row.itemTypeKey}
              </td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--fg)]">
                {formatNumber(row.itemCount)}
              </td>
              <td className="px-3 py-2">
                {/* Serbest metin ama önerili: aynı adı farklı yazmak (ör. "Diğer ürün")
                    filtrede ikinci bir kutu açardı. */}
                {/* key SUNUCUDAKİ değere bağlı: defaultValue yalnız ilk render'da
                    okunuyor, toplu adlandırmadan sonra kutular eski (boş) hâlleriyle
                    kalıyordu — veri doğruyken ekran yanlış görünüyordu. */}
                <input
                  key={row.label ?? ''}
                  defaultValue={row.label ?? ''}
                  placeholder="Ad ver"
                  list="erpis-card-labels"
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next === (row.label ?? '')) return;
                    onLabelChange(row, next);
                  }}
                  className="w-full min-w-[130px] rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)] px-2 py-1 text-[12px] font-semibold text-[var(--fg)] outline-none focus:border-[var(--border)]"
                />
              </td>
              <td className="px-3 py-2">
                {/* Varsayılan = kullanıcı hiçbir kutu seçmediğinde gelir mi.
                    Adı olmayan satırda anlamsız, o yüzden kapalı. */}
                <input
                  type="checkbox"
                  checked={row.isDefaultVisible}
                  disabled={!row.label}
                  title="Filtrede seçim yokken bu kartlar gelsin mi"
                  onChange={(e) => onDefaultChange(row, e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--fg)] disabled:opacity-40"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
