import type { ErpisSkuRoute } from '@/lib/api';

// Seçicilerden gelen metin kimliği sayıya çevirir; boş seçim null döner.
//
// Number('') === 0: "seçim yok" durumu sunucuya 0 kimliği olarak gidiyor ve var olmayan
// bir firmaya/rapor tipine istek atılıyordu.
export function parseId(value: string | null | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Türkçe küçük harf. toLowerCase() "İ"yi "i̇" (noktalı iki karakter), "I"yı "i" yapıyor;
// "İhracat" araması "ihracat" ile eşleşmiyordu.
export function trLower(value: string | null | undefined): string {
  return (value ?? '').toLocaleLowerCase('tr-TR');
}

// Firma Kuralları'nda etiket verilmemişse DEMO'nin kendi bitmiş ürün kalıbı.
const DEFAULT_DEMO_PATTERN = '99999999-999999-99999999';

export interface ErpisProductGroups {
  /** "DEMO Ürünler" kutusunun kalıpları. */
  demo: string[];
  /** "Diğer Ürünler" — kuralı olan ama DEMO olmayan TÜM kalıplar. */
  other: string[];
}

// DEMO / Diğer ürün grupları — Firma Kuralları'ndaki ETİKETTEN türetilir.
//
// YALNIZCA Ürünler ekranı kullanıyor ve orada davranış İSTENEN ŞEKİLDE: "DEMO Ürünler",
// adında demo geçen tüm kuralları (levha dahil) kapsıyor. Yeni Ürünler ekranı bu iki sabit
// kutuyu BIRAKTI — orada kullanıcı kuralların kendi adlarını görüyor (bkz. patternChoices),
// çünkü "DEMO Ürünler" deyince levha kodlarının da gelmesi orada yanlıştı.
export function productGroups(routes: ErpisSkuRoute[] | undefined): ErpisProductGroups {
  const list = routes ?? [];
  const labelled = list.filter((r) => trLower(r.label).includes('demo')).map((r) => r.pattern);
  const demo = labelled.length > 0
    ? labelled
    : list.filter((r) => r.pattern === DEFAULT_DEMO_PATTERN).map((r) => r.pattern);

  return {
    demo,
    other: list.map((r) => r.pattern).filter((p) => !demo.includes(p)),
  };
}

/** Filtre kutusu: Firma Kuralları'nda tanımlı BİR kuralın ekrandaki karşılığı. */
export interface ErpisPatternChoice {
  label: string;
  patterns: string[];
}

// Kutular ARTIK SABİT DEĞİL, kuralların kendi adlarından türüyor.
//
// Önce iki sabit kutu vardı (DEMO / Diğer) ve hangi kuralın hangi kutuya gittiği ad
// tahminiyle belirleniyordu: "demo levha ürünleri" adındaki kural "demo" geçtiği için DEMO
// kutusuna düşüyor, kullanıcı DEMO Ürünler deyince harfli levha kodlarını da görüyordu.
// Kullanıcı kurallarını zaten adlandırıyor; ekran o adları göstermeli, tahmin etmemeli.
//
// Aynı ada sahip birden çok kural tek kutuda toplanır (ör. iki farklı kalıp, tek "Levha").
export function patternChoices(routes: ErpisSkuRoute[] | undefined): ErpisPatternChoice[] {
  const byLabel = new Map<string, string[]>();

  for (const route of routes ?? []) {
    // Etiketsiz kural kalıbının kendisiyle görünür: adsız bir kutu seçilemez olurdu.
    const label = (route.label ?? '').trim() || route.pattern;
    const patterns = byLabel.get(label) ?? [];
    patterns.push(route.pattern);
    byLabel.set(label, patterns);
  }

  return [...byLabel.entries()].map(([label, patterns]) => ({ label, patterns }));
}

// ── Kart etiketleri ─────────────────────────────────────────────────────────
//
// Etiket kutuları SUNUCUDAN geliyor (bkz. ErpisCardTag): aynı adı taşıyan kurallar orada
// birleştirilmiş, sayılmış ve sıralanmış hâlde. İstemci yalnız seçimi tutuyor.
//
// Önceki hâlde kutular kodda sabitti ("DEMO Ürünler" / "Diğer Ürünler") ve kodun tanımadığı
// bir kart hiçbir kutuda görünmüyordu.

/** Etiket kutusu işaretli mi. */
export function isTagActive(label: string, selected: string[] | undefined): boolean {
  return (selected ?? []).includes(label);
}

// Kutu değişince yeni etiket listesi. Boşalırsa undefined döner: sunucu boş seçimi
// "varsayılan görünür etiketler" diye yorumluyor, boş dizi ise "hiçbiri" olurdu.
export function toggleTag(
  label: string, selected: string[] | undefined, checked: boolean,
): string[] | undefined {
  const rest = (selected ?? []).filter((l) => l !== label);
  const next = checked ? [...rest, label] : rest;
  return next.length > 0 ? next : undefined;
}

// Bir grubun kutusu işaretli mi: grubun TÜM kalıpları seçiliyse.
export function isGroupActive(group: string[], selected: string[] | undefined): boolean {
  return group.length > 0 && group.every((p) => (selected ?? []).includes(p));
}

// Kutu değişince yeni kalıp listesi. Grubun kalıpları eklenir/çıkarılır; kullanıcının
// "Kod Ailesi" seçicisinden elle seçtiği diğer kalıplar korunur.
export function toggleGroup(
  group: string[], selected: string[] | undefined, checked: boolean,
): string[] | undefined {
  const rest = (selected ?? []).filter((p) => !group.includes(p));
  const next = checked ? [...rest, ...group] : rest;
  return next.length > 0 ? next : undefined;
}
