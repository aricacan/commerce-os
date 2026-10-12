// Yalnız kampanya analiz detayı (/campaigns/analysis/[id]) burada kaldı; kampanya dosyaları,
// tarife ve DSS analizi Trendyol Hub'ın sekmeleri (/trendyol/*). Sayfa kendi "geri" bağlantısını taşır.
export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col overflow-hidden">{children}</div>;
}
