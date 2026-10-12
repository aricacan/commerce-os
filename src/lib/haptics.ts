// Dokunsal geri bildirim. Telefonda bir eylemin "kaydedildiğini" göz yerine parmakla
// hissettirir — jestlerde (kaydırma, aşağı çekme) özellikle önemli, çünkü kullanıcının
// gözü çoğu zaman parmağının altındaki satırda olmuyor.
//
// Desteklemeyen cihazlarda (iOS Safari `vibrate`'i uygulamıyor) sessizce hiçbir şey yapar —
// bu yüzden çağıran tarafta kontrol gerekmez.
//
// Süreler kasıtlı olarak çok kısa: uzun titreşim "hata" gibi hissettirir ve rahatsız eder.

const LIGHT_MS = 10;      // Seçim/eşik geçişi
const MEDIUM_MS = 18;     // Eylem tetiklendi
const SUCCESS_MS = [12, 40, 12];   // İki kısa vuruş — "oldu"
const WARNING_MS = [24, 60, 24];   // Daha belirgin — "dikkat"

function fire(pattern: number | number[]): void {
  // prefers-reduced-motion'ı seçen kullanıcı genelde titreşimi de istemez.
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  navigator.vibrate?.(pattern);
}

export const haptic = {
  /** Eşik geçildi / seçim değişti. */
  light: () => fire(LIGHT_MS),
  /** Eylem tetiklendi (kaydırma bırakıldı, yenileme başladı). */
  medium: () => fire(MEDIUM_MS),
  /** İşlem başarıyla tamamlandı. */
  success: () => fire(SUCCESS_MS),
  /** Yıkıcı veya dikkat isteyen eylem. */
  warning: () => fire(WARNING_MS),
};
