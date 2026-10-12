import { notificationApi } from './api';

// NotificationPanel'in "Bildirimleri Aç" butonu VE giriş sonrası otomatik istek (bkz.
// useAutoPushPrompt) aynı aboneleştirme mantığını paylaşır — tek kaynak.
async function getVapidPublicKey(): Promise<string | null> {
  const envKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;

  try {
    const { publicKey } = await notificationApi.getVapidPublicKey();
    return publicKey;
  } catch (e) {
    console.error('Failed to load Web Push public key:', e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type PushSubscribeResult = 'subscribed' | 'unsupported' | 'denied' | 'error';

export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) return 'error';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    const rawSub = subscription.toJSON();
    await notificationApi.subscribe({
      endpoint: subscription.endpoint,
      keys: { p256dh: rawSub.keys?.p256dh, auth: rawSub.keys?.auth },
    });
    return 'subscribed';
  } catch (e) {
    console.error('Failed to subscribe to Web Push:', e);
    return 'error';
  }
}
