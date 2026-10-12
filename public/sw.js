// ERP Service Worker
//
// BİLİNÇLİ OLARAK MİNİMAL. Sadece iki iş yapar:
//   1. Push bildirimi al ve göster
//   2. Ağ tamamen gittiğinde offline.html göster
//
// Statik varlık (JS/CSS/görsel) ÖNBELLEKLENMEZ. Sebebi: bu bir canlı-veri paneli;
// çevrimdışı gösterilecek anlamlı bir şeyi yok ve önbellek bizi daha önce ısırdı —
// eski chunk'lara referans veren bayat HTML kullanıcının cihazında takılı kalıp
// sayfaların hiç açılmamasına sebep olmuştu. Next.js + CDN önbelleklemeyi zaten
// doğru yapıyor; araya girmenin getirisi yok, riski büyük.
//
// Sürüm değişince eski önbellekler activate'te silinir.
const CACHE = 'demo-v3';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API: her zaman ağdan. Ağ yoksa 503 — status 200 ile dönülürse api.ts'teki
  // request() res.ok görüp {error:'offline'} gövdesini gerçek veriymiş gibi UI'a
  // taşır (sessizce boş/bozuk veri render edilir).
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(
        () =>
          new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    return;
  }

  // Sayfa gezinmeleri: ağdan. Ağ yoksa DOĞRUDAN offline.html — önbellekteki eski
  // HTML'e düşmüyoruz, çünkü o HTML'in referans verdiği JS parçaları önbellekte
  // olmadığından ekrana bozuk/boş bir sayfa gelirdi.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Diğer her şey (JS, CSS, görsel, font): respondWith ÇAĞIRMA — istek tarayıcının
  // kendi HTTP önbelleğine ve CDN'e olduğu gibi gider.
});

self.addEventListener('push', (e) => {
  const data = e.data?.json() ?? { title: 'ERP', body: 'Yeni bildirim' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/notification-icon-192.png',
      badge: '/icons/notification-badge-96.png',
      tag: data.tag ?? 'demo-notification',
      data: data.url ?? '/dashboard',
    }),
  );
});

// Bildirime tıklanınca: uygulama zaten açıksa O sekmeye odaklan ve ilgili sayfaya
// git; yoksa yeni pencere aç. Aksi hâlde her bildirim yeni bir kopya açardı.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data || '/dashboard';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          return client.focus().then(() => client.navigate(target));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
