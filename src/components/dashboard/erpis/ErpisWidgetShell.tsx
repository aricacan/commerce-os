'use client';

import { useRef, type ReactNode } from 'react';
import { ExportMenu } from '../../ui/ExportMenu';
import type { ErpisExportData } from './erpisExport';

// Erpis panosunun kart kabuğu ve ortak stilleri.
//
// Değerler e-ticaret panosundan BİREBİR kopyalandı (StaticWidgets.tsx .widget-card-static
// ve KpiBar.tsx .store-summary-card): aynı cam zemin, aynı 6px köşe, aynı gölge, aynı
// tipografi ölçeği. Kopyalamak zorunlu çünkü o stiller ilgili bileşenlerin kendi <style>
// blokları içinde yaşıyor ve Erpis panosunda o bileşenler render edilmiyor.
//
// Köşeler bilinçli olarak KESKİN (6px): panonun geri kalanı da öyle, yuvarlak kart
// Erpis'i yamalı gösterirdi.

export function ErpisWidgetStyles() {
  return (
    <style>{`
      .erpis-widgets-section {
        display: flex; flex-direction: column; gap: 16px;
        padding: 16px;
        max-width: 100%;
        /* clip, hidden DEĞİL: overflow-x:hidden diğer ekseni de auto yapıp bu bölümü kendi
           içinde kaydırılan bir kutuya çeviriyordu — sayfa değil yalnız widget'lar kayıyor,
           üstteki KPI'lar yapışkan gibi yerinde kalıyordu. flex-shrink:0 de kolonun kalan
           yüksekliğine sıkışmasını önler. */
        overflow-x: clip;
        flex-shrink: 0;
      }
      .erpis-widgets-row {
        display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: stretch;
      }
      .erpis-widgets-row.even { grid-template-columns: 1fr 1fr; }
      .erpis-widgets-row.thirds { grid-template-columns: repeat(3, 1fr); }
      /* Tek kartlık satır: tam genişlik. Trend gibi zaman ekseni olan grafikler dar bir
         kolonda okunmuyor — nokta sayısı arttıkça eksen etiketleri üst üste biniyor. */
      .erpis-widgets-row.full { grid-template-columns: 1fr; }
      @media (max-width: 1280px) {
        .erpis-widgets-row.thirds { grid-template-columns: repeat(2, 1fr); }
      }
      @media (max-width: 1024px) {
        .erpis-widgets-row,
        .erpis-widgets-row.even,
        .erpis-widgets-row.thirds { grid-template-columns: 1fr; }
      }

      .erpis-card {
        background: rgba(255,255,255,0.78);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(15,23,42,0.06);
        border-radius: 6px;
        padding: 16px 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.02), inset 0 1px 1px rgba(255,255,255,0.8);
        display: flex; flex-direction: column; min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }
      /* Koyu tema kartı.
         Seçici DÜZ CSS: bu bir <style> etiketi, CSS Modules değil. Burada ":global(...)"
         geçersiz bir seçici ve tarayıcı LİSTENİN TAMAMINI düşürüyordu — koyu temada
         kartlar beyaz kalıp metin okunmuyordu. Uygulama koyu temayı <html class="dark">
         ile işaretliyor; data-theme yedek olarak duruyor. */
      .dark .erpis-card,
      [data-theme="dark"] .erpis-card {
        background: rgba(22,22,22,0.78);
        border-color: rgba(255,255,255,0.06);
        box-shadow: 0 4px 20px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.05);
      }
      @media (max-width: 768px) {
        .erpis-card { padding: 12px; }
        /* Mobilde kart aralığı ve kenar boşluğu daraltılır: 16px + 16px, 375 piksellik
           ekranda kartın içine kalan genişliği ciddi biçimde yiyordu. */
        .erpis-widgets-section { padding: 10px; gap: 10px; }
        /* Kart başlığındaki kontroller mobilde tek satırda ve başlığın altında düzenli yerleşir */
        .erpis-card-header { flex-direction: column; align-items: stretch; gap: 8px; }
        .erpis-card-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 100%;
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 4px;
        }
        /* Hero rakamı ve mini istatistikler alt alta. */
        .erpis-hero-row { flex-direction: column; align-items: flex-start; gap: 6px; }
        .erpis-hero-value { font-size: 20px; }
        .erpis-hero-label { font-size: 9px; }
        .erpis-ministats { gap: 12px; flex-wrap: wrap; }
      }

      .erpis-card-header {
        display: flex; justify-content: space-between; align-items: flex-start;
        margin-bottom: 14px; gap: 8px;
      }
      .erpis-card-header h3 {
        font-size: 13.5px; font-weight: 800; color: var(--fg);
        letter-spacing: -0.1px; margin: 0;
      }
      .erpis-card-header p {
        font-size: 10px; color: var(--fg-muted); margin: 2px 0 0;
      }
      @media (max-width: 768px) { .erpis-card-header p { display: none; } }

      /* Hero rakam + sağdaki mini istatistik şeridi — modül özet kartlarıyla aynı. */
      .erpis-hero-row {
        display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
        padding-bottom: 10px; border-bottom: 1px solid var(--border-soft);
        margin-bottom: 12px;
      }
      .erpis-hero-value {
        font-size: 22px; font-weight: 800; line-height: 1.1;
        letter-spacing: -0.4px; color: var(--fg);
      }
      .erpis-hero-label {
        font-size: 9.5px; font-weight: 700; text-transform: uppercase;
        color: var(--fg-muted); margin-top: 2px; letter-spacing: 0.2px;
      }
      .erpis-ministats { display: flex; gap: 14px; }
      .erpis-ministat { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
      .erpis-ministat-value { font-size: 13.5px; font-weight: 800; color: var(--fg); }
      .erpis-ministat-label {
        font-size: 8.5px; font-weight: 700; text-transform: uppercase;
        color: var(--fg-subtle); letter-spacing: 0.3px;
      }

      /* Kart içi küçük KPI kutuları (Ciro/Maliyet kartındaki .kpi-mini-card ile aynı). */
      .erpis-mini-grid {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;
      }
      @media (max-width: 768px) { .erpis-mini-grid { grid-template-columns: repeat(2, 1fr); } }
      .erpis-mini-card {
        background: var(--card); border: 1px solid var(--border-soft);
        border-radius: 5px; padding: 8px 12px;
        display: flex; flex-direction: column; min-width: 0;
      }
      .erpis-mini-label {
        font-size: 9.5px; font-weight: 700; color: var(--fg-muted);
        text-transform: uppercase; letter-spacing: 0.3px;
      }
      .erpis-mini-value { font-size: 14.5px; font-weight: 800; line-height: 1.1; color: var(--fg); }
      .erpis-mini-sub { font-size: 8.5px; color: var(--fg-muted); margin-top: 1px; }

      /* Sıralama listesi — Çok Satanlar kartındaki leaderboard deseni. */
      .erpis-rank-row {
        display: flex; align-items: center; gap: 10px;
        padding: 8px 4px; border-bottom: 1px solid var(--border-soft);
      }
      .erpis-rank-row:last-child { border-bottom: none; }
      .erpis-rank-num {
        font-size: 11px; font-weight: 850; color: var(--accent);
        width: 22px; flex-shrink: 0;
      }
      .erpis-rank-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .erpis-rank-label {
        font-size: 11.5px; font-weight: 700; color: var(--fg);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      /* Stok kodunun altındaki ürün adı: kodla aynı satırı paylaşmıyor, bir tık küçük
         ve soluk — hangisinin kimlik hangisinin açıklama olduğu tipografiden anlaşılsın. */
      .erpis-rank-sublabel {
        font-size: 10px; font-weight: 500; color: var(--fg-muted);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .erpis-rank-body .erpis-bar-track { margin-top: 3px; }
      /* Kart başlığındaki kontroller başlıkla aynı hizada ve sarmalanabilir olmalı:
         üç segment düğmesi dar kartta başlığın üstüne taşıyordu. */
      .erpis-card-header { flex-wrap: wrap; }
      /* Kontroller ve dışa aktar düğmesi tek grupta: ayrı ayrı yerleştirilince dar
         kartta menü başlığın altına düşüyordu. */
      .erpis-card-actions {
        display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
        justify-content: flex-end;
      }
      .erpis-bar-track {
        height: 5px; background: var(--border-soft); border-radius: 99px; overflow: hidden;
      }
      .erpis-bar-fill {
        height: 100%; border-radius: 99px;
        transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .erpis-rank-value {
        font-size: 11.5px; font-weight: 800; color: var(--fg);
        flex-shrink: 0; text-align: right; font-variant-numeric: tabular-nums;
      }
      .erpis-rank-share { font-size: 9.5px; color: var(--fg-muted); }

      /* Dönem özeti tablosu — Mağaza Özeti tablosuyla aynı ölçüler. */
      .erpis-summary-table { width: 100%; border-collapse: collapse; }
      .erpis-summary-table th {
        font-size: 9.5px; font-weight: 700; color: var(--fg-muted);
        text-transform: uppercase; letter-spacing: 0.3px;
        padding: 0 8px 8px; text-align: right;
      }
      .erpis-summary-table th:first-child { text-align: left; }
      .erpis-summary-table td {
        padding: 9px 8px; font-size: 12px; text-align: right;
        border-top: 1px solid var(--border-soft);
        font-variant-numeric: tabular-nums;
      }
      .erpis-summary-table td:first-child {
        text-align: left; font-weight: 700; color: var(--fg);
      }
      .erpis-summary-table .erpis-strong { font-weight: 700; color: var(--fg); }
      .erpis-summary-table .erpis-muted { color: var(--fg-muted); }

      /* Donut ortası etiketi. */
      .erpis-donut-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
      .erpis-donut-center {
        position: absolute; display: flex; flex-direction: column;
        align-items: center; justify-content: center; pointer-events: none;
      }
      .erpis-donut-title {
        font-size: 9px; font-weight: 700; text-transform: uppercase;
        color: var(--fg-muted); letter-spacing: 0.3px;
      }
      .erpis-donut-value { font-size: 13.5px; font-weight: 850; color: var(--fg); }

      .erpis-legend-row {
        display: flex; align-items: center; gap: 8px; padding: 5px 0;
      }
      .erpis-legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
      .erpis-legend-label {
        font-size: 11px; color: var(--fg); flex: 1; min-width: 0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .erpis-legend-value {
        font-size: 11px; font-weight: 800; color: var(--fg);
        font-variant-numeric: tabular-nums;
      }

      .erpis-loader {
        height: 200px; display: flex; align-items: center; justify-content: center;
      }
      .erpis-spinner {
        width: 24px; height: 24px; border-radius: 99px;
        border: 2.5px solid var(--border); border-top-color: var(--accent);
        animation: erpis-spin 0.7s linear infinite;
      }
      @keyframes erpis-spin { to { transform: rotate(360deg); } }

      .erpis-empty {
        height: 200px; display: flex; flex-direction: column; gap: 4px;
        align-items: center; justify-content: center; text-align: center;
      }
      .erpis-empty-title { font-size: 12.5px; font-weight: 800; color: var(--fg); }
      .erpis-empty-hint { font-size: 11px; color: var(--fg-muted); max-width: 260px; line-height: 1.5; }
    `}</style>
  );
}

export function ErpisCard({ title, subtitle, action, exportData, children }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /**
   * Kartın PDF/Excel'e yazılacak verisi. Verilirse başlık çubuğuna dışa aktar menüsü
   * eklenir; PNG zaten kartın kendi DOM'undan alınıyor.
   *
   * Fonksiyon olarak alınıyor: menü açılmadıkça satırlar hazırlanmasın, her render'da
   * boşuna tablo kurulmasın.
   */
  exportData?: () => ErpisExportData | null;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="erpis-card" ref={cardRef}>
      <div className="erpis-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="erpis-card-actions">
          {action}
          {exportData && (
            // E-ticaret panosuyla AYNI menü: özelleştirme diyaloğu (sütun seçimi, satır
            // sınırı, para birimi kipi), Excel, CSV, PDF, PNG, yazdır, panoya kopyala.
            // Kendi üç seçenekli menümüz vardı; iki panoda iki farklı dışa aktarma
            // deneyimi öğrenilmesi gereken ikinci bir arayüzdü.
            <ExportMenu
              compact
              filename={exportFilename(title)}
              // Görünmez ama işlevsel: PDF başlığı ve düğmenin erişilebilirlik adı.
              label={title}
              containerRef={cardRef}
              columns={exportData()?.columns}
              getData={() => exportData()?.rows ?? []}
            />
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function ErpisHero({ value, label, stats }: {
  value: string;
  label: string;
  stats?: { label: string; value: string }[];
}) {
  return (
    <div className="erpis-hero-row">
      <div>
        <div className="erpis-hero-value">{value}</div>
        <div className="erpis-hero-label">{label}</div>
      </div>
      {stats && stats.length > 0 && (
        <div className="erpis-ministats">
          {stats.map((s) => (
            <div key={s.label} className="erpis-ministat">
              <span className="erpis-ministat-value">{s.value}</span>
              <span className="erpis-ministat-label">{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ErpisLoader() {
  return <div className="erpis-loader"><div className="erpis-spinner" /></div>;
}

export function ErpisEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="erpis-empty">
      <span className="erpis-empty-title">{title}</span>
      {hint && <span className="erpis-empty-hint">{hint}</span>}
    </div>
  );
}

// Dosya adı: başlıktaki Türkçe karakterler ve boşluklar sadeleştirilir — indirilen
// dosya adları işletim sistemleri arasında taşınabilir kalsın.
function exportFilename(title: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I',
    ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U',
  };

  return title
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => map[c] ?? c)
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'erpis';
}
