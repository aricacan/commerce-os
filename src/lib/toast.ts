import {
  pushAlert,
  updateAlert,
  dismissAlert,
  STICKY,
  type AlertType,
} from '../stores/alert-stack';

// Uygulama genelinde tek bildirim çağrı noktası. Görsel katman AlertStack'te,
// kuyruk alert-stack store'unda; burası sadece ergonomi — çağıran taraf
// `pushAlert(msg, 'success')` yerine `toast.success(msg)` yazsın diye.
//
// NEDEN: İşlemlerin çoğu sessizce tamamlanıyordu; kullanıcı kaydın gidip gitmediğini
// bilemiyordu. Kural: kullanıcının başlattığı her yazma işlemi bir sonuç bildirimi doğurmalı.
//
// React dışından da çağrılabilir (api.ts, event handler, react-query onError).

import { haptic } from './haptics';

const SUCCESS_MS = 3000;
const ERROR_MS = 6000; // Hata daha uzun kalsın — kullanıcı okuyup ne olduğunu anlasın.
// Geri alma penceresi: "yanlış tıkladım" fark etmeye yetecek kadar uzun,
// ekranı meşgul etmeyecek kadar kısa.
const UNDO_MS = 7000;

type PromiseMessages<T> = {
  loading: string;
  /** Sonuca göre metin üretmek için fonksiyon da verilebilir. */
  success: string | ((value: T) => string);
  error: string | ((error: unknown) => string);
};

function resolveMessage<T>(template: string | ((value: T) => string), value: T): string {
  return typeof template === 'function' ? template(value) : template;
}

export const toast = {
  success(message: string, durationMs = SUCCESS_MS): string {
    haptic.success();
    return pushAlert(message, 'success', durationMs);
  },

  error(message: string, durationMs = ERROR_MS): string {
    haptic.warning();
    return pushAlert(message, 'error', durationMs);
  },

  info(message: string): string {
    haptic.light();
    return pushAlert(message, 'info');
  },

  warning(message: string): string {
    haptic.warning();
    return pushAlert(message, 'warning');
  },

  /**
   * Süren iş bildirimi — KENDİLİĞİNDEN KAPANMAZ.
   * Dönen id ile `toast.dismiss(id)` çağırmak ÇAĞIRANIN sorumluluğudur;
   * unutulursa bildirim ekranda asılı kalır. Mümkünse `toast.promise()` kullan.
   */
  loading(message: string): string {
    return pushAlert(message, 'info', STICKY);
  },

  /**
   * Bir işi baştan sona bildirir: yükleniyor → başarılı/hatalı.
   * Tek bildirim yerinde güncellenir, üst üste iki kutu binmez.
   *
   *   await toast.promise(saveOrder(), {
   *     loading: 'Sipariş kaydediliyor…',
   *     success: 'Sipariş kaydedildi',
   *     error: (e) => `Kaydedilemedi: ${describeError(e)}`,
   *   });
   *
   * Hata YUTULMAZ — bildirildikten sonra yeniden fırlatılır ki çağıran
   * taraf (react-query, try/catch) kendi işini yapabilsin.
   */
  /**
   * "Yaptım — ama geri alabilirsin" bildirimi.
   *
   * Onay modal'ının yerine geçer: kullanıcı önce sonucu GÖRÜR, sonra isterse döner.
   * Modal, her seferinde herkesi durduruyor; geri alma yalnızca yanlış yapanı ilgilendiriyor.
   *
   * ⚠️ Yalnızca GERÇEKTEN geri alınabilir işlemler için. ERP senkronu, toplu fiyat
   * güncelleme gibi geri dönüşü olmayan işlerde onay modal'ı KALMALI.
   */
  undo(message: string, onUndo: () => void, durationMs = UNDO_MS): string {
    return pushAlert(message, 'info', durationMs, {
      action: { label: 'Geri Al', onClick: onUndo },
    });
  },

  async promise<T>(promise: Promise<T>, messages: PromiseMessages<T>): Promise<T> {
    const id = pushAlert(messages.loading, 'info', STICKY, { pending: true });
    try {
      const value = await promise;
      updateAlert(id, {
        message: resolveMessage(messages.success, value),
        type: 'success',
        durationMs: SUCCESS_MS,
        pending: false,
      });
      return value;
    } catch (error) {
      updateAlert(id, {
        message: resolveMessage(messages.error, error),
        type: 'error',
        durationMs: ERROR_MS,
        pending: false,
      });
      throw error;
    }
  },

  dismiss(id: string): void {
    dismissAlert(id);
  },
};

export type { AlertType };
