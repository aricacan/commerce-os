import { SITE_PROVIDER, type SiteConnectionDto } from '../../lib/api/sitehub';

// Genel sağlayıcının eşleme ayarı — backend'deki GenericSiteAdapterConfig ile
// birebir aynı şekil. Yeni bir site eklemek için kod yazmak gerekmesin diye
// sitenin API sözleşmesi burada tarif edilir.

export const ACK_STYLE = {
  // POST gövdesi: { "items": [ { "type": "offer", "id": 14 } ] }
  ItemsArray: 0,
  // Kayıt başına ayrı POST: ...?type=offer&id=14
  QueryPerItem: 1,
  // Site "işlendi" kavramını desteklemiyor — ack hiç çağrılmaz.
  None: 2,
  // Kayıt başına PATCH, gövdede tek bir bayrak alanını 1 yapar (Inthermform: "erp_synced").
  PatchField: 3,
} as const;
export type AckStyle = (typeof ACK_STYLE)[keyof typeof ACK_STYLE];

export const STATS_MODE = {
  // Yanıt gövdesinde hazır bir özet nesnesi var (adminx: "summary").
  SummaryObject: 0,
  // İstatistik ayrı bir uçtan HAM SATIR olarak geliyor (storeb: pageviews).
  CountRows: 1,
  // Site istatistik sunmuyor.
  None: 2,
} as const;
export type StatsMode = (typeof STATS_MODE)[keyof typeof STATS_MODE];

export interface AdapterFieldMap {
  id: string;
  type?: string;
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  service?: string;
  ip?: string;
  receivedAt?: string;
  // B2B formlarında (distribütörlük vb.) firma adı — kişi adından ayrı.
  company?: string;
}

export interface AdapterConfig {
  // Null = bu sitede talep/gelen kutusu akışı yok (ör. DEMO Levha — yalnızca
  // ürün/kategori/blog içeriği, teklif formu veya trafik ucu sunmuyor).
  inboxPath: string | null;
  ackPath?: string | null;
  authHeaderName?: string | null;
  authQueryParam?: string | null;
  // "Authorization: Bearer <key>" gibi ön ekli başlıklar için — boş bırakılırsa
  // anahtar başlığa olduğu gibi yazılır.
  authHeaderValuePrefix?: string | null;
  daysQueryParam?: string | null;
  limitQueryParam?: string | null;
  limit: number;
  // Artımlı çekim: son senkrondan sonrasını iste. "İşlendi" kavramı olmayan
  // siteler için tek verimli yol — yoksa her turda aynı kayıtlar tekrar iner.
  sinceQueryParam?: string | null;
  sinceDateFormat: string;
  itemsPath: string;
  successPath?: string | null;
  errorPath?: string | null;
  fields: AdapterFieldMap;
  offerTypeValue: string;
  messageTypeValue: string;
  defaultType?: string | null;
  dateFormats: string[];
  timeZoneId?: string | null;
  ackStyle: AckStyle;
  ackItemsKey: string;
  ackTypeKey: string;
  ackIdKey: string;
  ackFailedPath?: string | null;
  ackUpdatedPath?: string | null;
  // PatchField biçimi: PATCH gönderilecek uç ("{id}" yer tutucusu ile) ve
  // gövdede 1 yapılacak alan adı.
  ackItemPath?: string | null;
  ackFieldName: string;
  // İstatistik talep listesinden AYRI bir uçtan geliyorsa.
  statsMode: StatsMode;
  summaryPath: string;
  statsPath?: string | null;
  statsItemsPath: string;
  statsSessionField?: string | null;
  // Blog (ERP → site içerik gönderme). Alan adları sabit (slug/title/excerpt/
  // content/coverImage/published) — yalnızca uç adresi burada değişir.
  blogListPath?: string | null;
  // "{slug}" yer tutucu çalışma zamanında gerçek slug ile değiştirilir.
  blogItemPath?: string | null;
  // Ayarlıysa title/excerpt/content'in İngilizce karşılığı bu son ekle ayrı bir
  // alan olarak okunur/yazılır (ör. "En" → "titleEn"). DEMO Levha gibi her alanı
  // iki dilde tutan sitelerde kullanılır.
  blogBilingualSuffix?: string | null;
  // Ayarlıysa "published: bool" yerine bu ADDA bir tarih alanı kullanılır —
  // tarih doluysa yayında, boşsa taslak (DEMO Levha: "publishedAt"). BlogStatusField
  // ayarlıysa bundan ÖNCELİKLİDİR.
  blogPublishedAtField?: string | null;
  // Yayın durumu metin enum ise (Inthermform: "status": "draft"/"published")
  // alan adı ve iki değeri burada.
  blogStatusField?: string | null;
  blogPublishedValue: string;
  blogDraftValue: string;
  // Kapak görselinin YAZMA anahtarı (okuma "coverImage"/"cover_image" ikisini
  // de dener). Inthermform snake_case "cover_image" bekliyor.
  blogCoverImageField: string;
  // Tek yazı GÖRÜNTÜLEME (GET) yolu farklıysa; null ise BlogItemPath'in
  // "{slug}" yer tutucusu kullanılır.
  blogLookupPath?: string | null;
  // Ayarlıysa (ör. "id") güncelleme/silme önce slug'la bir GET yapıp bu alanı
  // çözer, sonra BlogItemPath'in "{id}" yer tutucusuyla mutasyonu yapar —
  // Inthermform'un PATCH/DELETE uçları yalnızca id kabul ettiği için.
  blogMutateByField?: string | null;
}

// Varsayılan: adminx paneli (admplastik ailesi). Aynı panelden yapılmış siteler
// hiçbir alanı değiştirmeden çalışır — kullanıcı yalnızca farklı olanı düzenler.
export const DEFAULT_ADAPTER_CONFIG: AdapterConfig = {
  inboxPath: 'erp-api.php?action=all',
  ackPath: 'erp-api.php?action=ack',
  authHeaderName: 'X-API-Key',
  authQueryParam: null,
  authHeaderValuePrefix: null,
  daysQueryParam: 'days',
  limitQueryParam: 'limit',
  limit: 200,
  sinceQueryParam: null,
  sinceDateFormat: "yyyy-MM-dd'T'HH:mm:ss'Z'",
  itemsPath: 'inbox,items,data',
  successPath: 'success',
  errorPath: 'error',
  fields: {
    id: 'id',
    type: 'type',
    name: 'name',
    email: 'email',
    phone: 'phone',
    subject: 'subject',
    message: 'message',
    service: 'service',
    ip: 'ip',
    receivedAt: 'received_at',
  },
  offerTypeValue: 'offer',
  messageTypeValue: 'message',
  defaultType: null,
  dateFormats: ['yyyy-MM-dd HH:mm:ss'],
  timeZoneId: 'Europe/Istanbul',
  ackStyle: ACK_STYLE.ItemsArray,
  ackItemsKey: 'items',
  ackTypeKey: 'type',
  ackIdKey: 'id',
  ackFailedPath: 'failed',
  ackUpdatedPath: 'updated',
  ackItemPath: null,
  ackFieldName: 'erp_synced',
  statsMode: STATS_MODE.SummaryObject,
  summaryPath: 'summary',
  statsPath: null,
  statsItemsPath: 'data',
  statsSessionField: 'session_id',
  blogListPath: 'blog-api.php',
  blogItemPath: 'blog-api.php?slug={slug}',
  blogBilingualSuffix: null,
  blogPublishedAtField: null,
  blogStatusField: null,
  blogPublishedValue: 'published',
  blogDraftValue: 'draft',
  blogCoverImageField: 'coverImage',
  blogLookupPath: null,
  blogMutateByField: null,
};

// StoreB (example.com) hazır şablonu — {ok,data} zarfı, Bearer token, iletişim/
// ortaklık formları tek uçtan "form_type" ile ayrışıyor, trafik ayrı uçtan (ham
// satır) geliyor. "Yeni Site" formunda tek tıkla dolduruluyor.
export const STOREB_ADAPTER_CONFIG: AdapterConfig = {
  ...DEFAULT_ADAPTER_CONFIG,
  inboxPath: '/api/erp/emails',
  ackPath: null,
  authHeaderName: 'Authorization',
  authHeaderValuePrefix: 'Bearer ',
  daysQueryParam: null,
  limitQueryParam: 'limit',
  limit: 200,
  sinceQueryParam: 'since',
  sinceDateFormat: "yyyy-MM-dd'T'HH:mm:ss'Z'",
  itemsPath: 'data',
  successPath: 'ok',
  errorPath: 'error',
  fields: {
    id: 'id',
    type: 'form_type',
    name: 'from_name',
    email: 'from_email',
    subject: 'subject',
    message: 'body_copy',
    receivedAt: 'created_at',
    company: 'company',
  },
  offerTypeValue: 'partnership',
  messageTypeValue: 'contact',
  dateFormats: [],
  timeZoneId: null,
  ackStyle: ACK_STYLE.None,
  statsMode: STATS_MODE.CountRows,
  statsPath: '/api/erp/pageviews',
  statsItemsPath: 'data',
  statsSessionField: 'session_id',
  blogListPath: '/api/blog',
  blogItemPath: '/api/blog/{slug}',
  blogBilingualSuffix: null,
  blogPublishedAtField: null,
};

// DEMO Levha (example.com) hazır şablonu — {data,meta} zarfı, X-Api-Key başlığı,
// içerik uçları (ürün/kategori/blog/katalog) herkese açık okuma, kişisel veri
// içeren uçlar (tickets/subscribers/stats) HER metotta anahtar istiyor.
//
// /api/tickets — SiteHub'ın "gelen kutusu" karşılığı. Tek tip (teklif/mesaj
// ayrımı yok), DefaultType ile "message"a düşülüyor. Alan adı DİKKAT: telefon
// alanının JSON anahtarı "telephone" — "phone" değil.
//
// Ack kavramı yok (is_handled/erp_synced gibi bir bayrak dönmüyor) — mükerrer
// kayıt koruması yalnızca (SiteConnectionId, SourceType, SourceId) unique
// index'e dayanıyor, tıpkı StoreB gibi. "since" filtresi de dokümante
// edilmemiş, bu yüzden ayarlanmadı — her turda tüm liste taranıp yeni
// olmayanlar atlanıyor.
//
// Blog her alanı iki dilde tutuyor (title/titleEn) ve yayın durumunu boolean
// değil "publishedAt" tarihiyle işaretliyor — bu iki fark blogBilingualSuffix
// ve blogPublishedAtField ile karşılanıyor, C# tarafında kod değişmiyor.
//
// NOT: /api/stats alan adları (leads_total, visits_total...) bizim sabit özet
// alanlarımızla (pending_offers, page_views_total...) örtüşmüyor — yanlış
// eşleşip 0 göstermektense hiç bağlanmadı (statsMode: None). Ürün/kategori/
// sektör/sayfa/katalog (tam CMS) uçları da SiteHub'ın kapsamı dışında — bu
// modül talep+trafik+blog için tasarlandı.
export const DEMO_LEVHA_ADAPTER_CONFIG: AdapterConfig = {
  ...DEFAULT_ADAPTER_CONFIG,
  // API kök adresi zaten ".../api" ile bitiyor (bkz. KNOWN_SITES) — yol
  // burada "/api" ÖN EKİ OLMADAN yazılır, yoksa /api/api/tickets'a çıkar.
  inboxPath: 'tickets',
  ackPath: null,
  authHeaderName: 'X-Api-Key',
  authHeaderValuePrefix: null,
  daysQueryParam: null,
  limitQueryParam: 'perPage',
  limit: 50,
  sinceQueryParam: null,
  itemsPath: 'data',
  successPath: null,
  errorPath: 'error.message',
  fields: {
    id: 'id',
    name: 'name',
    email: 'email',
    phone: 'telephone',
    subject: 'subject',
    message: 'message',
    receivedAt: 'createdAt',
  },
  defaultType: 'message',
  dateFormats: [],
  timeZoneId: null,
  ackStyle: ACK_STYLE.None,
  statsMode: STATS_MODE.None,
  statsPath: null,
  blogListPath: 'blog',
  blogItemPath: 'blog/{slug}',
  blogBilingualSuffix: 'En',
  blogPublishedAtField: 'publishedAt',
};

// Inthermform (example.com) hazır şablonu — üç noktada diğerlerinden ayrışıyor:
//
//   1. Taban adres TEK bir uç dosyaya kadar iniyor ("api.php"); tüm kaynaklar
//      path segment değil SORGU DİZESİYLE seçiliyor ("?resource=leads").
//   2. "İşlendi" bayrağı toggle değil, kayıt başına PATCH ile "erp_synced"
//      alanını 1 yapmak (dördüncü ack biçimi).
//   3. Blog durumu ne boolean ne tarih, METİN ENUM ("status": draft/published);
//      üstelik güncelleme/silme SLUG değil ID istiyor (GET ikisini de kabul
//      ediyor) — bu yüzden blogMutateByField="id" ile önce id çözülüyor.
//
// Talep tipi tek (yalnızca "leads", teklif/mesaj ayrımı yok) — defaultType
// "message" seçildi, formda değiştirilebilir.
export const INTHERMFORM_ADAPTER_CONFIG: AdapterConfig = {
  ...DEFAULT_ADAPTER_CONFIG,
  inboxPath: '?resource=leads',
  ackPath: null,
  authHeaderName: 'X-Api-Key',
  authHeaderValuePrefix: null,
  daysQueryParam: null,
  limitQueryParam: 'limit',
  limit: 50,
  sinceQueryParam: 'since',
  sinceDateFormat: 'yyyy-MM-dd',
  itemsPath: 'data',
  successPath: 'ok',
  errorPath: 'error',
  fields: {
    id: 'id',
    name: 'name',
    email: 'email',
    phone: 'phone',
    message: 'message',
    receivedAt: 'created_at',
    company: 'company',
  },
  defaultType: 'message',
  ackStyle: ACK_STYLE.PatchField,
  ackItemPath: '?resource=leads&id={id}',
  ackFieldName: 'erp_synced',
  statsMode: STATS_MODE.None,
  statsPath: null,
  blogListPath: '?resource=posts',
  blogItemPath: '?resource=posts&id={id}',
  blogLookupPath: '?resource=posts&slug={slug}',
  blogMutateByField: 'id',
  blogCoverImageField: 'cover_image',
  blogStatusField: 'status',
};

// Site blog akışına dahil mi? Sunucunun açık bayrağı esas; eski bir backend yanıtında alan
// yoksa (frontend backend'den önce deploy edilir) sunucunun ESKİ tahmin kuralı uygulanır:
// ADM her zaman, Generic'te blogListPath doluysa.
export function siteSupportsBlog(site: SiteConnectionDto): boolean {
  if (typeof site.supportsBlog === 'boolean') return site.supportsBlog;
  if (site.provider === SITE_PROVIDER.AdmPlastik) return true;
  if (site.provider !== SITE_PROVIDER.Generic) return false;
  return Boolean(parseAdapterConfig(site.adapterConfigJson).blogListPath?.trim());
}

// Kayıtlı JSON'u forma yükler. Bozuk/eksik JSON varsayılana düşer — form
// açılmazlık etmesin, kullanıcı düzeltebilsin.
export function parseAdapterConfig(json: string | null | undefined): AdapterConfig {
  if (!json) return DEFAULT_ADAPTER_CONFIG;

  try {
    const parsed = JSON.parse(json) as Partial<AdapterConfig>;
    return {
      ...DEFAULT_ADAPTER_CONFIG,
      ...parsed,
      fields: { ...DEFAULT_ADAPTER_CONFIG.fields, ...(parsed.fields ?? {}) },
      dateFormats: parsed.dateFormats?.length ? parsed.dateFormats : DEFAULT_ADAPTER_CONFIG.dateFormats,
    };
  } catch {
    return DEFAULT_ADAPTER_CONFIG;
  }
}
