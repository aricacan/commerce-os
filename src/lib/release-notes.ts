// Sürüm güncellemeleri — Dashboard'daki "Sürüm güncellemeleri" kartının veri kaynağı.
//
// KURAL: her push'ta o günün satırları BURAYA eklenir (en yeni gün en üstte). Commit
// mesajı kopyalanmaz; ekibin okuyacağı dilde "ne değişti, ne işe yarar" yazılır.
// Tarih biçimi YYYY-MM-DD (yerel gün).
//
// SÜRÜM NUMARASI: v{büyük}.{proje ayı}.{gün} — tarihten otomatik türer (bkz. releaseVersion).
// Proje Temmuz 2026'da başladı: Temmuz=1, Ağustos=2, Eylül=3, Ekim=4… 6 Ekim → v1.4.6.
// Çok büyük bir özellik gelince o günün kaydına `major: 2` yazılır; sonraki günlerin numarası da
// 2'den devam eder (yeni bir major koyana kadar en son yazılan geçerlidir).

export interface ReleaseNoteDay {
  readonly date: string;
  readonly items: readonly string[];
  /** Büyük sürüm; yazılmazsa bir önceki (daha eski) günün majoru, hiç yoksa 1. */
  readonly major?: number;
}

export const RELEASE_NOTES: readonly ReleaseNoteDay[] = [
  {
    date: '2026-10-08',
    items: [
      "Omnichannel: WhatsApp'ta bot mesajlarının gitmemesi düzeltildi (görsel ayrı mesaj, seçenekler görselsiz liste); Meta'nın sonradan bildirdiği gönderim hataları yakalanıp bir kez düz metinle yeniden deneniyor.",
      "Omnichannel: beğeni/çıkartmaya \"fotoğrafı aldım\" cevabı gitmiyor; kesik buton başlıkları doğru seçeneğe eşleşiyor; mesajlar gönderim zamanına göre sıralanıyor; bot kendini kanalın markasıyla tanıtıyor.",
      "Omnichannel: devirden önce müşteriyi 5–10 dk bekleten danışma kartı kaldırıldı; bot müşterinin parça parça yazmasını 10 sn bekleyip tek cevap veriyor (Bot Ayarları'ndan değiştirilebilir).",
      "Müşteriler (Customer 360): WhatsApp, Instagram ve Facebook'taki aynı kişi tek kayıtta; ilgilendiği ürünler, siparişler, bilgiler ve zaman çizelgesi panelde; \"aynı kişi mi?\" birleştirme önerileri.",
      "Altın Set: gerçek konuşmalarla değerlendirme koşuları; sohbet ayrıntılarında bot tur izi; İzleme'de gölge karşılaştırma.",
      "Omnichannel: Altın Set'in yeni adı Kalite Merkezi — genel bakış ve %95 hedefli trend, iki koşuyu tur tur karşılaştırma, devir ve \"Yanlış\" işaretlerinden otomatik aday kutusu, canlı konuşmalardan veri seti, gölge karşılaştırma ve onaylı cevap kütüphanesi tek yerde.",
    ],
  },
  {
    date: '2026-10-07',
    items: [
      'Modüller işlevini anlatan adlara geçti: B2B Outreach (eski Radar), AI Copilot (Intelligent), OEM Matcher (Sonar), WMS (Fiziksel Depo), Lojistik (Kargo). Eski adresler otomatik yeni adrese yönleniyor.',
      'Hub\'lar: Base Hub (sevkiyat, stok, araç kataloğu, kapsam ve ürün takibi tek ekranda), Trendyol Hub (kampanya, komisyon tarifesi, DSS, fatura yükleme, kârlılık) ve Sentos Hub (eski SentosTrack). Sol paneldeki Base ve Trendyol grupları kaldırıldı; hub\'lar Uygulamalar menüsünde.',
      'QR Kodları ve Şifre Kasası Sistem Ayarları\'na taşındı; mevcut kayıtlar ve basılı QR adresleri aynen çalışıyor. Namaz vakti/ayet bildirimleri kaldırıldı.',
      'Arka plan işleri (Hangfire) Sistem İzleme › Operasyon › Arka Plan İşleri altında.',
      'Slack › Şirket Bağlantıları: her şirket kendi Slack çalışma alanı, varsayılan Slack webhook\'u (şifreli saklanır) ve Trello panosunu girebiliyor; üst menüdeki Slack/Trello kısayolları şirkete göre geliyor.',
      'Uygulamalar menüsüne ve sol panele modül logoları eklendi.',
      'Yapay zekâ: Groq kaldırıldı — tüm yapay zekâ işleri DeepSeek ile çalışıyor; asıl model hata verirse yedek DeepSeek modeli bir kez deneniyor. Ayarlar › Yapay Zekâ ekranındaki sağlayıcı seçimi ve panel model atamaları kaldırıldı.',
    ],
  },
  {
    date: '2026-10-06',
    items: [
      'Bot: konuşmada söylenen araç ve ürün tipi "4mm" gibi kısa cevaplarda unutulmuyor; kategori önerileri müşterinin istediği parçaya göre sıralanıyor.',
      'Bot: aynı mesaj müşteri yazmadan ikinci kez gitmiyor; sipariş formundaki ad ve e-posta müşteri kaydına işleniyor; kayıtlı adresi olan müşteriye adres tekrar sorulmuyor.',
      'Yapay zekâ: Ayarlar › Yapay Zekâ ekranından DeepSeek ↔ Groq sağlayıcısı yeniden başlatmadan değiştirilebiliyor.',
      'Siparişler: tek yaşam döngüsü ve "Tamamlandı" etiketi; 90 günden eski siparişler önizlenip toplu tamamlanabiliyor; kargo/teslim olaylarında otomatik durum geçişi eklendi (varsayılan kapalı).',
      'Siparişler: Shopify numaralı siparişlerde okunur sipariş kodu (#11092) görünüyor.',
      'Shopify Hub: listelerde toplam sayılar, ürün düzenle/sil, sipariş oluştur/düzenle/sil, menü ve koleksiyonlar için ağaç görünümü.',
      'Panel: giriş ekranı yenilendi; sürüm numarası ve gün gün sürüm güncellemeleri sayfası eklendi.',
    ],
  },
  {
    date: '2026-10-05',
    items: [
      'Shopify Hub: müşteri, sipariş, iade ve denetim kaydı yazma altyapısı; ürün, içerik, ödeme linki, indirim ve olay modülleri.',
      'Bot: canlı konuşma analizinden çıkan 10 kusur düzeltildi.',
    ],
  },
  {
    date: '2026-10-04',
    items: [
      'Omnichannel Genel Bakış: KPI şeridi, kart ızgarası ve ortak tarih aralığı; İzleme ekranına devir, SLA, teslimat ve sipariş bölümleri.',
      'Sohbet siparişi: e-posta zorunlu; siparişin nereye yazılacağı (Shopify mağazası / ERP / yalnız panel) kurallarla seçiliyor.',
      'Shopify Hub: Genel Bakış, Siparişler, Ürünler ve Müşteriler ekranları.',
      'Kargo: bölge fiyatları ve tarihli sürümler; desi tarifesi sürümleri; pazaryeri komisyon önerisi.',
      'Gelen kutusu: net kanal kimliği ve "Sohbeti çevir".',
      'ERP yenileme işleri sayfa değişince de takip ediliyor.',
    ],
  },
  {
    date: '2026-10-03',
    items: [
      'Kargo maliyet motoru: ülke/kaynak bazlı politika, ücretsiz kargo eşiği, UK posta.',
      'Siparişler: net kâr ve marj kolonu, pazaryeri kesintileri.',
      'E-posta kanalı: gelen kutusu sınıflandırıcısı, giden e-posta kaydı, bağlantı testi.',
      'Kanallar yeniden tasarlandı; Omnichannel Ayarlar iki sayfaya indi (Kanallar ve Profiller, Hesap geneli).',
      '"Geçen ay" tarih ön ayarı 9 ekrana eklendi.',
    ],
  },
  {
    date: '2026-10-02',
    items: [
      'Shopify Hub modülü: Shopify\'a bağlan, sipariş açma, webhook; onaylanan sohbet siparişi ülkenin Shopify mağazasında otomatik açılıyor.',
      'E-posta destek kutusu (IMAP/SMTP) gelen kutusuna bağlandı.',
      'Kanal Merkezi ve Profil Merkezi; kanal bazlı bot eşik, menü ve metinleri.',
      'Sohbet siparişi uçtan uca oluştur / düzenle / iptal / sil.',
    ],
  },
  {
    date: '2026-10-01',
    items: [
      'Temsilci Danışma: bot çözemediğinde devir yerine temsilciye soru kartı açıyor; 5 dakikada seçilmezse bot önerisini gönderiyor.',
      '"Bota talimat ver": konuşmaya özel temsilci talimatı.',
      'Devirler: "Botla devam ettir" ile toplu geri alma (önizlemeli).',
      'Zengin devir ve sipariş bildirimleri (e-posta + Slack + panel).',
      'Müşteriler: KPI şeridi ve segment sekmeleri; Facebook/Instagram müşteri adı Meta\'dan okunuyor.',
    ],
  },
  {
    date: '2026-09-30',
    items: [
      'Bot: Mercedes sınıf adları marka olarak tanınıyor; metinsiz medya mesajına tek onay gidiyor.',
    ],
  },
];

// "6 Ekim Salı" — kartta ve pencerede gün başlığı.
export function formatReleaseDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
}

// "6 Eki" — rozet için kısa biçim.
export function formatReleaseDateShort(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ── Sürüm numarası ───────────────────────────────────────────────────────────
const PROJECT_START_YEAR = 2026;
const PROJECT_START_MONTH = 7; // Temmuz = proje ayı 1
const MONTHS_PER_YEAR = 12;
const DEFAULT_MAJOR = 1;

function parseDate(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
}

// Büyük sürüm: günün kendi `major`ı, yoksa kendisinden ESKİ günlerin en yakınındaki yazılı değer.
function majorOf(day: ReleaseNoteDay, all: readonly ReleaseNoteDay[]): number {
  if (day.major !== undefined) return day.major;

  const older = all
    .filter((other) => other.major !== undefined && other.date < day.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return older?.major ?? DEFAULT_MAJOR;
}

export function releaseVersion(day: ReleaseNoteDay, all: readonly ReleaseNoteDay[] = RELEASE_NOTES): string {
  const parts = parseDate(day.date);
  if (!parts) return day.date;

  const projectMonth = (parts.year - PROJECT_START_YEAR) * MONTHS_PER_YEAR + (parts.month - PROJECT_START_MONTH) + 1;
  return `v${majorOf(day, all)}.${projectMonth}.${parts.day}`;
}

// "06/10/2026" — sürüm sayfasındaki gün başlığı.
export function formatReleaseDateNumeric(date: string): string {
  const parts = parseDate(date);
  if (!parts) return date;

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`;
}

// ── Sayfalama ────────────────────────────────────────────────────────────────
export const RELEASE_PAGE_SIZE = 5;

export interface ReleasePage {
  readonly days: readonly ReleaseNoteDay[];
  readonly page: number;
  readonly totalPages: number;
}

// Yalnız KAYITLI günler sayfalanır: güncelleme yapılmayan günler listede hiç yer almaz (atlanır).
// Geçersiz ya da aralık dışı sayfa en yakın geçerli sayfaya çekilir.
export function paginateReleaseNotes(
  requestedPage: number,
  pageSize: number = RELEASE_PAGE_SIZE,
  notes: readonly ReleaseNoteDay[] = RELEASE_NOTES,
): ReleasePage {
  const totalPages = Math.max(1, Math.ceil(notes.length / pageSize));
  const page = Number.isFinite(requestedPage) ? Math.min(Math.max(Math.trunc(requestedPage), 1), totalPages) : 1;
  const start = (page - 1) * pageSize;

  return { days: notes.slice(start, start + pageSize), page, totalPages };
}
