// API hatalarını kullanıcıya gösterilebilir tek cümleye çevirir.
//
// lib/api/core.ts hataları `Error("404: {\"title\":\"...\"}")` biçiminde fırlatıyor —
// bu ham metin kullanıcıya GÖSTERİLEMEZ. Burası önce ProblemDetails gövdesini
// (backend'in standart hata biçimi) açmayı dener, olmazsa duruma göre anlaşılır
// bir karşılık üretir.

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Gönderilen bilgiler geçersiz.',
  401: 'Oturumun sona ermiş. Tekrar giriş yapman gerekiyor.',
  403: 'Bu işlem için yetkin yok.',
  404: 'Kayıt bulunamadı.',
  409: 'Bu kayıt başkası tarafından değiştirilmiş. Sayfayı yenileyip tekrar dene.',
  413: 'Dosya çok büyük.',
  422: 'Gönderilen bilgiler işlenemedi.',
  429: 'Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.',
  500: 'Sunucuda bir hata oluştu.',
  502: 'Sunucuya ulaşılamıyor.',
  503: 'Servis şu anda kullanılamıyor.',
  504: 'Sunucu zamanında yanıt vermedi.',
};

const GENERIC = 'Beklenmeyen bir hata oldu.';

/** `"404: {...}"` önekini durum kodu ve gövde olarak ayırır. */
function splitStatusPrefix(message: string): { status: number; body: string } | null {
  const match = /^(\d{3}):\s*([\s\S]*)$/.exec(message);
  if (!match) return null;
  return { status: Number(match[1]), body: match[2] };
}

/**
 * Düz metin gövdeyi kullanıcıya OLDUĞU GİBİ göstermenin güvenli olduğu durum kodları.
 *
 * Backend'imiz 401/403/5xx için HER ZAMAN `application/problem+json` döndürür
 * (GlobalExceptionMiddleware; controller'larda `Unauthorized("...")`/`StatusCode(401|403, "...")`
 * kullanımı YOK). Dolayısıyla bu kodlarla gelen DÜZ METİN bir gövde bize ait değildir —
 * araya giren bir katmandan (reverse proxy, gateway, tünel, CDN) gelir. Onu ekrana
 * basmak kullanıcıya uygulamanın hatasıymış gibi görünen, hiçbir sayfayla ilgisi
 * olmayan mesajlar gösteriyordu (canlıda: Lojistik sayfasında "API key required" —
 * bu metin kod tabanında HİÇBİR YERDE geçmiyor).
 *
 * JSON (ProblemDetails) gövdeler bu kısıtlamadan etkilenmez: onlar bizim ürettiğimiz,
 * yapısı belli mesajlardır ve her durum kodunda gösterilmeye devam eder.
 */
const PLAIN_TEXT_BODY_TRUSTED_STATUSES = new Set([400, 404, 409, 413, 422, 429]);

/** ProblemDetails gövdesinden okunabilir mesaj çıkarmayı dener. */
function messageFromBody(body: string, status: number): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      // `error`: controller'ların BadRequest(new { error = "..." }) biçimi.
      const parsed = JSON.parse(trimmed) as { detail?: string; title?: string; message?: string; error?: string };
      const found = parsed.detail ?? parsed.title ?? parsed.message ?? parsed.error;
      if (found && found.trim()) return found.trim();
    } catch {
      // Gövde JSON değilmiş — aşağıdaki düz metin yoluna düş.
    }
    return null;
  }

  // Düz metin: yalnızca backend'in insan cümlesi ürettiği durum kodlarında güvenilir.
  if (!PLAIN_TEXT_BODY_TRUSTED_STATUSES.has(status)) return null;

  // İnsan cümlesinde süslü/köşeli parantez ve etiket işareti bulunmaz. Bunlar geçiyorsa
  // gövde bozuk JSON, HTML ya da kod dökümüdür — kullanıcıya ham hâlini basmayız.
  if (/[{}<>[\]]/.test(trimmed)) return null;

  // Çok uzun düz metin muhtemelen stack trace — gösterme.
  return trimmed.length <= 200 ? trimmed : null;
}

/** API hatasının HTTP durum kodu (`"409: {...}"` öneki); hata API'den gelmediyse null. */
export function httpStatusOf(error: unknown): number | null {
  if (!(error instanceof Error)) return null;
  return splitStatusPrefix(error.message?.trim() ?? '')?.status ?? null;
}

export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return GENERIC;

  const message = error.message?.trim();
  if (!message) return GENERIC;

  // Oturum düşmesi: core.ts bunu sabit metinle fırlatıyor, kullanıcı zaten
  // login'e yönlendiriliyor — teknik ifadeyi göstermeyelim.
  if (message === 'Session expired') return STATUS_MESSAGES[401];

  // Zaman aşımı mesajı zaten Türkçe ve açıklayıcı (bkz. core.ts).
  if (message.startsWith('İstek zaman aşımına uğradı')) return message;

  // Ağ katmanı hatası — fetch bağlanamadığında bunu verir.
  if (message === 'Failed to fetch' || message === 'Load failed') {
    return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
  }

  const parts = splitStatusPrefix(message);
  if (!parts) return message.length <= 200 ? message : GENERIC;

  return messageFromBody(parts.body, parts.status) ?? STATUS_MESSAGES[parts.status] ?? GENERIC;
}

export interface ErrorCategory {
  title: string;
  description: string;
}

/**
 * P33: route error boundary'si (app/(app)/error.tsx) HER render çökmesinde AYNI jenerik
 * mesajı gösteriyordu — "oturumum mu düştü, sunucu mu çöktü, ben mi bir şey bozdum"
 * ayrımı yoktu. `describeError()`'dan FARKLI: o mesajı olduğu gibi göstermek için,
 * bu yalnızca kategoriyi ayırt etmek için. Tanımadığı hata için `null` döner — o zaman
 * çağıran taraf kendi jenerik mesajında kalır (gerçek bir kod hatası olabilir, uydurma
 * bir "sunucu hatası" göstermeyelim).
 */
export function classifyRenderError(message: string): ErrorCategory | null {
  if (/^401:|Session expired/.test(message)) {
    return {
      title: 'Oturumun sona ermiş',
      description: 'Güvenlik nedeniyle oturumun kapanmış. Devam etmek için tekrar giriş yapman gerekiyor.',
    };
  }
  if (/^403:/.test(message)) {
    return {
      title: 'Bu sayfa için yetkin yok',
      description: 'Hesabının bu sayfayı görüntüleme izni bulunmuyor. Yetkin olduğunu düşünüyorsan sistem yöneticinle konuş.',
    };
  }
  if (/^(50\d):|Failed to fetch|Load failed/.test(message)) {
    return {
      title: 'Sunucuya ulaşılamadı',
      description: 'Sunucu şu anda yanıt vermiyor ya da bağlantın koptu. İnternetini kontrol edip tekrar dene.',
    };
  }
  return null;
}
