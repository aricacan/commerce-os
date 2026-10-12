// Oturum içi bellek: sayfa yenilenince sıfırlanır. Önemli akışlarda (omnichannel mesaj,
// sipariş durumu) yazılanın ekranda görünmesini sağlar; kalıcı hiçbir şey saklanmaz.

const store = new Map<string, unknown>();

export function sessionGet<T>(key: string, create: () => T): T {
  if (!store.has(key)) store.set(key, create());
  return store.get(key) as T;
}

export function sessionSet<T>(key: string, value: T): void {
  store.set(key, value);
}
