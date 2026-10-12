'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Package,
} from 'lucide-react';
import { ProductErpSummary } from '../../components/products/ProductErpSummary';
import { useProductSkuDetail } from '../../hooks/useProductSkuDetail';
import { useI18n } from '../../lib/i18n';
import { productApi } from '../../lib/api';

type Period = '30' | '60' | '90' | 'all';

const PERIODS: readonly Period[] = ['30', '60', '90', 'all'];
const CUTOFF_DAYS: Record<Exclude<Period, 'all'>, number> = { '30': 30, '60': 60, '90': 90 };

function currencySymbol(currency: string | null) {
  return currency === 'GBP' ? '£' : '₺';
}

export function ProductDetailPage({ sku }: { sku: string }) {
  const { lang } = useI18n();
  const { data, isLoading, isError } = useProductSkuDetail(sku);
  const [period, setPeriod] = useState<Period>('30');
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zipDownloading, setZipDownloading] = useState(false);

  const images = data?.imageUrls?.length ? data.imageUrls : (data?.imageUrl ? [data.imageUrl] : []);
  const activeImage = images[selectedImageIndex] ?? images[0] ?? null;

  async function handleDownloadZip() {
    if (!data || zipDownloading) return;
    setZipDownloading(true);
    try {
      await productApi.downloadImagesZip(data.sku);
    } catch {
      // İndirme başarısız olursa sessizce yut — kullanıcı butonu tekrar deneyebilir,
      // ayrıca bir toast/bildirim altyapısı bu sayfada yok.
    } finally {
      setZipDownloading(false);
    }
  }

  const salesCount = period === '30'
    ? data?.sales30d
    : period === '60'
      ? data?.sales60d
      : period === '90'
        ? data?.sales90d
        : data?.salesTotal;

  const chartData = period === 'all'
    ? data?.salesTimeline
    : data?.salesTimeline?.filter(day => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - CUTOFF_DAYS[period]);
        return new Date(day.date) >= cutoff;
      });

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'transparent' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Link
            href="/products"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 12px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--fg)', fontSize: 12.5, fontWeight: 600,
              textDecoration: 'none', transition: 'all 0.15s',
            }}
          >
            <ArrowLeft size={14} />
            <span>{lang === 'tr' ? 'Ürün Kataloğuna Dön' : 'Back to Catalog'}</span>
          </Link>
          <span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
            SKU: {sku}
          </span>
        </div>

        {isLoading && (
          <div style={{ display: 'flex', height: 260, alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--fg-muted)' }}>
            {lang === 'tr' ? 'Ürün ayrıntıları yükleniyor...' : 'Loading product details...'}
          </div>
        )}

        {isError && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 32, borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)',
            gap: 8, textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
              {lang === 'tr' ? 'Ürün bilgileri alınamadı.' : 'Could not load product details.'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--fg-muted)' }}>SKU: {sku}</p>
          </div>
        )}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Ürün Ana Kartı */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 16,
              alignItems: 'center',
              padding: 16,
              borderRadius: 6,
              border: '1px solid var(--border-soft)',
              background: 'var(--card)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 160 }}>
                {activeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage}
                    alt={data.name}
                    style={{ width: 160, height: 160, borderRadius: 6, border: '1px solid var(--border-soft)', background: '#fff', objectFit: 'contain', padding: 6 }}
                  />
                ) : (
                  <div style={{ width: 160, height: 160, borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={28} style={{ color: 'var(--fg-muted)' }} />
                  </div>
                )}

                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {images.map((url, idx) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        aria-label={lang === 'tr' ? `Görsel ${idx + 1}'i göster` : `Show image ${idx + 1}`}
                        style={{
                          width: 34, height: 34, padding: 2, borderRadius: 4, cursor: 'pointer',
                          background: '#fff',
                          border: idx === selectedImageIndex ? '2px solid var(--accent)' : '1px solid var(--border-soft)',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </button>
                    ))}
                  </div>
                )}

                {images.length > 0 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      disabled={zipDownloading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '5px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600,
                        border: '1px solid var(--border-soft)', background: 'var(--bg-subtle)',
                        color: 'var(--fg)', cursor: zipDownloading ? 'default' : 'pointer',
                        opacity: zipDownloading ? 0.6 : 1,
                      }}
                    >
                      <Download size={12} />
                      {zipDownloading
                        ? (lang === 'tr' ? 'İndiriliyor...' : 'Downloading...')
                        : (lang === 'tr' ? 'Tüm görselleri indir (.zip)' : 'Download all images (.zip)')}
                    </button>
                    {activeImage && (
                      <a
                        href={activeImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={lang === 'tr' ? 'Görseli yeni sekmede aç' : 'Open image in new tab'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 26, height: 26, borderRadius: 4,
                          border: '1px solid var(--border-soft)', background: 'var(--bg-subtle)', color: 'var(--fg-muted)',
                        }}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                  <span className="font-mono" style={{
                    fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)',
                    background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)',
                    padding: '2px 6px', borderRadius: 4,
                  }}>
                    SKU: {data.sku}
                  </span>
                  {data.barcode && (
                    <span className="font-mono" style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--fg-muted)',
                      background: 'var(--bg-subtle)', border: '1px solid var(--border-soft)',
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      Barkod: {data.barcode}
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.3, margin: '0 0 4px 0' }}>
                  {data.name}
                </h1>
                {data.brand && (
                  <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
                    {[data.brand, data.model, data.modelYear].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                <div style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontWeight: 500 }}>
                    {lang === 'tr' ? 'Toplam Satış' : 'Total Sales'}
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', margin: '2px 0 0 0' }}>
                    {data.salesTotal} {lang === 'tr' ? 'adet' : 'units'}
                  </p>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-muted)', fontWeight: 500 }}>
                    {lang === 'tr' ? 'Alış Fiyatı' : 'Cost Price'}
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', margin: '2px 0 0 0' }}>
                    {data.cost
                      ? `${currencySymbol(data.cost.currency)}${data.cost.buyingPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Alt Grid: ERP Kayıtları & Pazaryeri / Satış */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* ERP Kayıtları */}
                <section style={{ padding: 16, borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
                      {lang === 'tr' ? 'ERP Kayıtları' : 'ERP Records'}
                    </h2>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0 0' }}>
                      {lang === 'tr' ? 'Her kaynağın kendi adı, fiyatı ve stoğu' : 'Price and stock breakdown across connectors'}
                    </p>
                  </div>
                  <ProductErpSummary variants={data.erpVariants ?? []} detailed />
                </section>

                {/* Ürün Açıklaması */}
                {data.description && (
                  <section style={{ padding: 14, borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)' }}>
                    <button
                      type="button"
                      onClick={() => setDescriptionOpen(o => !o)}
                      style={{
                        display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                        border: 'none', background: 'transparent', color: 'var(--fg)', cursor: 'pointer',
                        padding: 0, fontSize: 12.5, fontWeight: 700,
                      }}
                    >
                      <span>{lang === 'tr' ? 'Ürün Açıklaması' : 'Product Description'}</span>
                      {descriptionOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                    {descriptionOpen && (
                      <p style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.5, marginTop: 8, margin: '8px 0 0 0' }}>
                        {data.description}
                      </p>
                    )}
                  </section>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Pazaryerleri */}
                <section style={{ padding: 16, borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)' }}>
                  <div style={{ marginBottom: 12 }}>
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
                      {lang === 'tr' ? 'Pazaryerleri' : 'Marketplaces'}
                    </h2>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0 0' }}>
                      {lang === 'tr' ? 'Siparişin gerçek ERP ve mağaza kaynağı' : 'Order sources and stores'}
                    </p>
                  </div>

                  {data.platforms.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {data.platforms.map(platform => (
                        <div
                          key={`${platform.name}-${platform.connectorType}-${platform.storeName}`}
                          style={{
                            padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-soft)',
                            background: 'var(--bg-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                            <strong style={{ fontSize: 12, color: 'var(--fg)' }}>{platform.name}</strong>
                            <span style={{
                              fontSize: 9.5, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                              background: 'var(--card)', border: '1px solid var(--border-soft)', color: 'var(--fg)',
                            }}>
                              {platform.orderCount}
                            </span>
                          </div>
                          <p style={{ fontSize: 10.5, color: 'var(--fg-muted)', margin: '4px 0 0 0' }}>
                            {platform.connectorType} · {platform.storeName}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{
                      padding: 12, borderRadius: 4, border: '1px solid var(--border-soft)',
                      background: 'var(--bg-subtle)', fontSize: 11.5, color: 'var(--fg-muted)', textAlign: 'center', margin: 0,
                    }}>
                      {lang === 'tr' ? 'Bu SKU için pazaryeri siparişi yok.' : 'No marketplace orders for this SKU.'}
                    </p>
                  )}
                </section>

                {/* Satış Eğilimi */}
                <section style={{ padding: 16, borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
                        {lang === 'tr' ? 'Satış Eğilimi' : 'Sales Trend'}
                      </h2>
                      <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '2px 0 0 0' }}>
                        {lang === 'tr' ? 'Seçilen dönemde satılan adet' : 'Units sold in period'}
                      </p>
                    </div>
                    <strong style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)' }}>
                      {salesCount ?? 0}
                    </strong>
                  </div>

                  <div style={{
                    display: 'flex', gap: 4, padding: 2, borderRadius: 4,
                    border: '1px solid var(--border-soft)', background: 'var(--bg-subtle)', marginBottom: 12,
                  }}>
                    {PERIODS.map(item => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPeriod(item)}
                        style={{
                          flex: 1, padding: '4px 0', borderRadius: 3, border: 'none', cursor: 'pointer',
                          fontSize: 10.5, fontWeight: 600,
                          background: period === item ? 'var(--card)' : 'transparent',
                          color: period === item ? 'var(--fg)' : 'var(--fg-muted)',
                          boxShadow: period === item ? 'var(--shadow-xs)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        {item === 'all' ? (lang === 'tr' ? 'Tümü' : 'All') : `${item}G`}
                      </button>
                    ))}
                  </div>

                  <div style={{ height: 120 }}>
                    {chartData && chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 2, bottom: 0, left: -30 }}>
                          <defs>
                            <linearGradient id="skuSalesGradPage" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.28} />
                              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, background: 'var(--card)', border: '1px solid var(--border)' }} />
                          <Area
                            type="monotone"
                            dataKey="quantity"
                            name={lang === 'tr' ? 'Satış' : 'Sales'}
                            stroke="var(--accent)"
                            strokeWidth={1.5}
                            fill="url(#skuSalesGradPage)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>
                        {lang === 'tr' ? 'Bu dönemde satış yok.' : 'No sales in this period.'}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
