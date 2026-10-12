import { describeError, httpStatusOf } from '../../lib/errors';

const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

// Bakım uçlarına özel anlamlı hata: 404 = sunucu bu sürümü henüz almamış, 403 = rol yetmiyor.
export function maintenanceErrorText(error: unknown): string {
  const status = httpStatusOf(error);
  if (status === HTTP_NOT_FOUND) return 'Bu bakım işlemi sunucuda henüz yok (backend güncel değil).';
  if (status === HTTP_FORBIDDEN) return 'Bu bakım işlemi için Omnichannel yöneticisi olman gerekiyor.';
  return describeError(error);
}
