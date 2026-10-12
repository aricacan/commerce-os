import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: { NEXT_PUBLIC_DEMO: "true" },
  // @zxing/browser ESM modülleri Next.js webpack ile uyumsuz — transpile edilmesi gerekiyor
  transpilePackages: ["@zxing/browser", "@zxing/library"],
  // Shopify admin, gömülü uygulama sayfasını iframe'de açar: yalnız bu rota Shopify'a izin verir
  // (panelin kendisi iframe'lenemez kalır).
  // Eski modül adresleri (yer imleri, paylaşılan linkler, e-postalar) yeni adlara KALICI (308)
  // yönlenir — 7 Eki 2026 modül adlandırması. Sıra önemli: ilk eşleşen kazanır, bu yüzden
  // özel adresler genel (:path*) kurallardan ÖNCE. `:path*` sıfır segmenti de kapsar (/radar).
  async redirects() {
    return [
      { source: '/radar/:path*', destination: '/b2b-outreach/:path*', permanent: true },
      { source: '/intelligent/:path*', destination: '/ai-copilot/:path*', permanent: true },
      { source: '/sonar/:path*', destination: '/oem-matcher/:path*', permanent: true },
      { source: '/warehouse/:path*', destination: '/wms/:path*', permanent: true },
      { source: '/shipping/:path*', destination: '/logistics/:path*', permanent: true },
      { source: '/basetrack/:path*', destination: '/base/:path*', permanent: true },
      { source: '/sentostrack/:path*', destination: '/sentos/:path*', permanent: true },
      // Hangfire paneli Sistem İzleme'nin "Arka Plan İşleri" sekmeleri oldu.
      { source: '/hangfire/runtime', destination: '/monitoring/jobs-runtime', permanent: true },
      { source: '/hangfire/:path*', destination: '/monitoring/jobs', permanent: true },
      // Vibe kaldırıldı: QR kodları ve Şifre Kasası Sistem Ayarları'nda.
      { source: '/vibe/qr-codes', destination: '/system/qr-codes', permanent: true },
      { source: '/vibe/credentials', destination: '/system/credentials', permanent: true },
      { source: '/vibe/:path*', destination: '/dashboard', permanent: true },
      // Kampanya ekranları Trendyol çalışma alanının sekmeleri (analiz detayı /campaigns'te kaldı).
      { source: '/campaigns/tariff', destination: '/trendyol/tariff', permanent: true },
      { source: '/campaigns/best-actions', destination: '/trendyol/best-actions', permanent: true },
      { source: '/campaigns', destination: '/trendyol/campaigns', permanent: true },
      // Omnichannel Altın Set'in adı Kalite Merkezi oldu (FAZ 7.5); eski bağlantılar yeni sekmeyi açar.
      { source: '/omnichannel/gold', destination: '/omnichannel/quality', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/shopify-app",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors https://admin.shopify.com https://*.myshopify.com" },
        ],
      },
    ];
  },
};

export default nextConfig;
