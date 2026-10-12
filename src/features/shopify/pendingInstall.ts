// Shopify'dan başlayan kurulumda backend panele /shopify?install=<mağaza> ile yönlendirir. Kullanıcı henüz
// giriş yapmadıysa panel onu /login'e atar ve adres kaybolur; mağaza adı oturum süresince burada tutulur ki
// girişten sonra "Shopify'a bağlan" formu önceden dolsun.
const STORAGE_KEY = 'shopify.pendingInstall';
export const INSTALL_PARAM = 'install';

export function stashPendingInstall(shop: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, shop);
  } catch {
    // Depolama kapalıysa (gizli pencere) yalnız ön doldurma kaybolur.
  }
}

// Bir kez okunur: form dolduktan sonra anahtar silinir.
export function takePendingInstall(): string | null {
  try {
    const shop = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return shop;
  } catch {
    return null;
  }
}

// Giriş sayfasına atılmadan önce: adreste ?install= varsa sakla.
export function stashInstallFromUrl(url: URL): void {
  const shop = url.searchParams.get(INSTALL_PARAM);
  if (shop) stashPendingInstall(shop);
}
