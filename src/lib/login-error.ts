import type { TranslationKey } from './translations/tr';

// Giriş hatasını SEBEBİNE göre mesaja çevirir.
//
// Önceden her hata "E-posta veya şifre hatalı" gösteriyordu: çok fazla deneme (429), sunucu
// hatası ya da bağlantı kopması da. Kullanıcı doğru şifreyle defalarca denedi ve her deneme
// kotayı tüketip kilidi uzattı.
//
// request() hataları "<durum>: <gövde>" biçiminde fırlatıyor (bkz. lib/api/core.ts).
export function loginErrorKey(error: unknown): TranslationKey {
  const message = error instanceof Error ? error.message : '';
  const status = Number(/^(\d{3}):/.exec(message)?.[1]);

  if (status === 401) return 'login_error';
  if (status === 429) return 'login_error_rate_limited';
  if (status >= 500) return 'login_error_server';
  if (Number.isNaN(status)) return 'login_error_unreachable';
  return 'login_error';
}
