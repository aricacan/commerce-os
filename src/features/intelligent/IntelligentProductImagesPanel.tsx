'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
  Image as ImageIcon,
  RefreshCw,
  Search,
  UploadCloud,
  AlertCircle,
  Layers,
  Sparkles,
  ExternalLink,
  History,
} from 'lucide-react';
import {
  intelligentApi,
  type ProductImageSearchResult,
} from '../../lib/api/intelligent';
import { useMobile } from '../../hooks/useMobile';
import { palette, icon, btnPrimary, card, softTint } from '../shared/design';

const cellHead: React.CSSProperties = {
  padding: '9px 12px', fontSize: 11, fontWeight: 700, color: palette.textLabel,
  textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap',
};
const cell: React.CSSProperties = { padding: '9px 12px', fontSize: 12.5, color: palette.text };

export function IntelligentProductImagesPanel() {
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [searchFile, setSearchFile] = useState<File | null>(null);
  const [searchUrl, setSearchUrl] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ProductImageSearchResult[] | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const [statsQuery, overviewQuery, itemsQuery] = useQueries({
    queries: [
      { queryKey: ['intelligent', 'images', 'stats'], queryFn: intelligentApi.getImageStats, staleTime: 30_000 },
      { queryKey: ['intelligent', 'images', 'overview'], queryFn: intelligentApi.getImageOverview, staleTime: 30_000 },
      { queryKey: ['intelligent', 'images', 'list', 50], queryFn: () => intelligentApi.listProductImages(50), staleTime: 30_000 },
    ],
  });
  const stats = statsQuery.data ?? null;
  const overview = overviewQuery.data ?? null;
  const items = itemsQuery.data ?? [];
  const loading = statsQuery.isLoading || overviewQuery.isLoading || itemsQuery.isLoading;
  const loadError = statsQuery.isError && overviewQuery.isError && itemsQuery.isError;
  const refreshImageData = () => queryClient.invalidateQueries({ queryKey: ['intelligent', 'images'] });

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await intelligentApi.triggerImageSync();
      setSyncMessage({ ok: true, text: res.message || 'Senkronizasyon kuyruğa alındı.' });
      setTimeout(() => { void refreshImageData(); }, 3000);
    } catch (e) {
      setSyncMessage({ ok: false, text: e instanceof Error ? e.message : 'Senkronizasyon başlatılamadı.' });
    } finally {
      setSyncing(false);
    }
  };

  // Yeniden indeksleme yıkıcı bir işlem (indeks sıfırdan kurulur, bitince eski indeks
  // silinir) — yanlışlıkla tıklanmasın diye onay ister.
  const handleReindex = async () => {
    if (!window.confirm(
      'Tüm ERP fotoğrafları sıfırdan yeniden vektörleştirilecek ve tamamlanınca eski indeks silinecek. ' +
      'İşlem uzun sürebilir. Devam edilsin mi?'
    )) return;

    setReindexing(true);
    setSyncMessage(null);
    try {
      const res = await intelligentApi.triggerImageReindex();
      setSyncMessage({ ok: true, text: res.message || 'Yeniden indeksleme kuyruğa alındı.' });
      setTimeout(() => { void refreshImageData(); }, 3000);
    } catch (e) {
      setSyncMessage({ ok: false, text: e instanceof Error ? e.message : 'Yeniden indeksleme başlatılamadı.' });
    } finally {
      setReindexing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchFile && !searchUrl.trim()) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const res = await intelligentApi.searchByImage(searchFile || undefined, searchUrl.trim() || undefined);
      setSearchResults(res.matches || []);
    } catch (err) {
      setSearchResults([]);
      setSyncMessage({ ok: false, text: `Görsel arama hatası: ${err instanceof Error ? err.message : 'işlenemedi'}` });
    } finally {
      setSearching(false);
    }
  };

  const filteredItems = items.filter((it) => {
    const q = filterQuery.toLowerCase();
    return it.sku.toLowerCase().includes(q)
      || it.productName.toLowerCase().includes(q)
      || it.brand.toLowerCase().includes(q);
  });

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: palette.bg, WebkitOverflowScrolling: 'touch' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: isMobile ? '12px 14px 48px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Başlık */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: palette.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ImageIcon size={icon.xl} strokeWidth={icon.stroke} color={palette.accent} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: palette.textStrong, margin: 0, letterSpacing: '-0.01em' }}>
                Ürün Resimleri — Görsel RAG
              </h2>
              <p style={{ fontSize: 12.5, color: palette.textMuted, margin: '4px 0 0', lineHeight: 1.5 }}>
                ERP (Sentos &amp; Base) SKU görsellerini DINOv2 ile vektörleştirip Qdrant deposunda saklar.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, width: isMobile ? '100%' : 'auto' }}>
            <button onClick={handleSync} disabled={syncing || reindexing} style={{ ...btnPrimary, opacity: syncing || reindexing ? 0.6 : 1, width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
              <RefreshCw size={icon.md} strokeWidth={icon.stroke} style={syncing ? { animation: 'intelligent-spin 1s linear infinite' } : undefined} />
              {syncing ? 'Senkronize ediliyor…' : 'ERP Resimlerini Senkronize Et'}
            </button>
            <button
              onClick={handleReindex}
              disabled={syncing || reindexing}
              title="Vektör anahtarı şeması değiştiğinde indeksi sıfırdan kurar ve eski indeksi siler."
              style={{
                ...btnPrimary, background: 'transparent', color: palette.warningText,
                border: `1px solid ${palette.warningText}`,
                opacity: syncing || reindexing ? 0.6 : 1,
                width: isMobile ? '100%' : 'auto', justifyContent: 'center',
              }}
            >
              <History size={icon.md} strokeWidth={icon.stroke} style={reindexing ? { animation: 'intelligent-spin 1s linear infinite' } : undefined} />
              {reindexing ? 'Yeniden indeksleniyor…' : 'Sıfırdan Yeniden İndeksle'}
            </button>
          </div>
        </div>

        {loadError && (
          <div style={{
            ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            background: softTint(palette.danger, 8), border: `1px solid ${palette.danger}`,
            color: palette.danger, fontSize: 12.5, fontWeight: 600,
          }}>
            <AlertCircle size={icon.md} strokeWidth={icon.stroke} />
            Veri yüklenemedi — backend/Qdrant&apos;a ulaşılamıyor olabilir. Sayfayı yenileyip tekrar deneyin.
          </div>
        )}

        {syncMessage && (
          <div style={{
            ...card, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
            background: softTint(syncMessage.ok ? palette.accent : palette.danger, 8),
            border: `1px solid ${syncMessage.ok ? palette.accentBorder : palette.danger}`,
            color: syncMessage.ok ? palette.accent : palette.danger, fontSize: 12.5, fontWeight: 600,
          }}>
            <AlertCircle size={icon.md} strokeWidth={icon.stroke} />
            {syncMessage.text}
          </div>
        )}

        {/* Özet KPI kartları */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
          <StatCard
            label="Tekil SKU"
            value={overview?.uniqueSkuCount ?? stats?.totalProducts ?? 0}
            accent
            hint="Mağazalar arası benzersiz ürün kodu"
          />
          <StatCard
            label="Fotoğraflı SKU"
            value={overview?.totalReady ?? 0}
            hint="SKU + fotoğrafı olan (embed'e hazır)"
          />
          <StatCard
            label="Qdrant Vektörü"
            value={overview?.totalVectorizedImages ?? stats?.totalImages ?? 0}
            hint={`DINOv2 · 384-dim Cosine · ${overview?.totalVectorized ?? stats?.totalProducts ?? 0} ürün satırı`}
          />
          <StatCard
            label="Son Senkron"
            valueText={overview?.lastSync ? new Date(overview.lastSync.finishedAt).toLocaleString('tr-TR') : (stats?.lastSyncedAt ? new Date(stats.lastSyncedAt).toLocaleString('tr-TR') : 'Henüz yapılmadı')}
            hint="Otomatik: 6 saatte bir"
          />
        </div>

        {/* ERP kapsam dökümü */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${palette.borderFaint}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={icon.lg} strokeWidth={icon.stroke} color={palette.accent} />
            <span style={{ fontSize: 14, fontWeight: 700, color: palette.textStrong }}>ERP Görsel Kapsamı</span>
          </div>

          {overview?.lastSync && (
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${palette.borderFaint}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              <MiniStat label="Embed edilen" value={overview.lastSync.embedded} color={palette.success} />
              <MiniStat label="Değişmeyen" value={overview.lastSync.skipped} color={palette.textMuted} />
              <MiniStat label="Hatalı" value={overview.lastSync.errors} color={palette.danger} />
              <MiniStat label="Silinen" value={overview.lastSync.deleted} color={palette.warningText} />
              <MiniStat label="Aday" value={overview.lastSync.totalCandidates} color={palette.accent} />
              {overview.lastSync.rebuild && (
                <MiniStat
                  label={overview.lastSync.legacyCollectionDropped ? 'Yeniden indeks · eski silindi' : 'Yeniden indeks'}
                  value={overview.lastSync.embedded}
                  color={palette.warningText}
                />
              )}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: palette.chipBg }}>
                  <th style={{ ...cellHead, textAlign: 'left' }}>ERP / Mağaza</th>
                  <th style={{ ...cellHead, textAlign: 'right' }}>Aktif</th>
                  <th style={{ ...cellHead, textAlign: 'right' }}>SKU&apos;lu</th>
                  <th style={{ ...cellHead, textAlign: 'right' }}>Fotoğraflı</th>
                  <th style={{ ...cellHead, textAlign: 'right' }}>Fotosuz</th>
                  <th style={{ ...cellHead, textAlign: 'right' }}>Hazır</th>
                  <th style={{ ...cellHead, textAlign: 'right' }}>Vektörize</th>
                  <th style={{ ...cellHead, textAlign: 'right' }}>Vektör (foto)</th>
                </tr>
              </thead>
              <tbody>
                {overview && overview.perStore.length > 0 ? (
                  overview.perStore.map((s) => (
                    <tr key={s.storeCode} style={{ borderTop: `1px solid ${palette.borderFaint}` }}>
                      <td style={{ ...cell, fontWeight: 700, color: palette.accent }}>{s.storeCode}</td>
                      <td style={{ ...cell, textAlign: 'right' }}>{s.totalActive}</td>
                      <td style={{ ...cell, textAlign: 'right', color: palette.textMuted }}>{s.withSku}</td>
                      <td style={{ ...cell, textAlign: 'right', color: palette.textMuted }}>{s.withImage}</td>
                      <td style={{ ...cell, textAlign: 'right', color: palette.warningText }}>{s.totalActive - s.withImage}</td>
                      <td style={{ ...cell, textAlign: 'right', color: palette.success, fontWeight: 700 }}>{s.ready}</td>
                      <td style={{ ...cell, textAlign: 'right', color: palette.accent, fontWeight: 700 }}>{s.vectorized}</td>
                      <td style={{ ...cell, textAlign: 'right', color: palette.textMuted }}>{s.vectorizedImages ?? 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} style={{ ...cell, textAlign: 'center', color: palette.textFaint, padding: 24 }}>
                    {loading ? 'Yükleniyor…' : 'Veri yok — senkronizasyonu çalıştırın.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Görsel ile SKU bul */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${palette.borderFaint}`, paddingBottom: 12 }}>
            <Sparkles size={icon.lg} strokeWidth={icon.stroke} color={palette.warning} />
            <span style={{ fontSize: 14, fontWeight: 700, color: palette.textStrong }}>Görsel ile SKU Bul</span>
          </div>

          <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <label htmlFor="vrag-search-file" style={{
              border: `2px dashed ${palette.borderSoft}`, borderRadius: 12, padding: 18, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: palette.inputBg, minHeight: 108, textAlign: 'center',
            }}>
              <input id="vrag-search-file" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files?.[0]) setSearchFile(e.target.files[0]); }} />
              <UploadCloud size={26} strokeWidth={icon.stroke} color={palette.accent} />
              <span style={{ fontSize: 12, color: searchFile ? palette.accent : palette.textMuted, fontWeight: searchFile ? 700 : 500 }}>
                {searchFile ? searchFile.name : 'Cihazdan fotoğraf seç veya sürükle'}
              </span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: palette.textLabel }}>Veya fotoğraf URL&apos;si:</span>
              <input type="url" placeholder="https://…/aksesuar.jpg" value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${palette.borderSoft}`, background: palette.inputBg, color: palette.text, fontSize: 13, outline: 'none' }} />
              <button type="submit" disabled={searching || (!searchFile && !searchUrl.trim())}
                style={{ ...btnPrimary, justifyContent: 'center', opacity: searching || (!searchFile && !searchUrl.trim()) ? 0.5 : 1 }}>
                <Search size={icon.md} strokeWidth={icon.stroke} />
                {searching ? 'Vektör hesaplanıyor…' : 'Eşleşen SKU\'yu bul'}
              </button>
            </div>
          </form>

          {searchResults && (
            <div style={{ borderTop: `1px solid ${palette.borderFaint}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ ...cellHead, padding: 0 }}>Eşleşen SKU sonuçları ({searchResults.length})</span>
              {searchResults.length === 0 ? (
                <p style={{ fontSize: 12.5, color: palette.warningText, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <AlertCircle size={icon.md} /> Eşleşen ürün yok — önce ERP görsel senkronunu çalıştırın.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {searchResults.map((res, i) => (
                    <div key={i} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 10, display: 'flex', gap: 10, alignItems: 'center', background: palette.card }}>
                      {res.imageUrl
                        ? <Image unoptimized src={res.imageUrl} alt={res.sku} width={52} height={52} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 7, border: `1px solid ${palette.border}`, flexShrink: 0 }} />
                        : <div style={{ width: 52, height: 52, borderRadius: 7, background: palette.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: palette.textFaint, flexShrink: 0 }}>Görsel yok</div>}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'center' }}>
                          <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: palette.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.sku}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: softTint(palette.success, 16), color: palette.success, flexShrink: 0 }}>%{Math.round(res.score * 100)}</span>
                        </div>
                        <p style={{ fontSize: 12, color: palette.text, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.productName || 'İsimsiz ürün'}</p>
                        <div style={{ fontSize: 11, color: palette.textFaint, marginTop: 2 }}>{res.brand || 'Oto aksesuar'} · {res.storeCode}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* İndekslenen görseller */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${palette.borderFaint}`, paddingBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: palette.textStrong }}>Qdrant&apos;ta İndekslenen Görseller</span>
            <div style={{ position: 'relative', width: 240, maxWidth: '100%' }}>
              <Search size={icon.md} strokeWidth={icon.stroke} color={palette.textFaint} style={{ position: 'absolute', left: 10, top: 9 }} />
              <input type="text" placeholder="SKU veya ürün ara…" value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: 9, border: `1px solid ${palette.borderSoft}`, background: palette.inputBg, color: palette.text, fontSize: 12.5, outline: 'none' }} />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 28, textAlign: 'center', color: palette.textFaint, fontSize: 13 }}>Yükleniyor…</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: palette.textFaint, fontSize: 13 }}>
              İndekslenmiş görsel yok. Senkronizasyon butonuyla verileri aktarabilirsiniz.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {filteredItems.map((it, i) => (
                <div key={i} style={{ border: `1px solid ${palette.border}`, borderRadius: 10, padding: 8, background: palette.card }}>
                  <div style={{ aspectRatio: '1', borderRadius: 7, overflow: 'hidden', position: 'relative', marginBottom: 8, background: palette.chipBg }}>
                    {it.imageUrl
                      ? <Image unoptimized src={it.imageUrl} alt={it.sku} width={320} height={320} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: palette.textFaint }}>Resim yok</div>}
                    {it.imageUrl && (
                      <a href={it.imageUrl} target="_blank" rel="noreferrer" style={{ position: 'absolute', top: 6, right: 6, padding: 4, borderRadius: 6, background: 'rgba(0,0,0,0.5)', color: '#fff', display: 'flex' }}>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: palette.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sku}</div>
                  <p style={{ fontSize: 11, color: palette.textMuted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.productName}>{it.productName || 'Ürün'}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 5, borderTop: `1px solid ${palette.borderFaint}`, fontSize: 10, color: palette.textFaint }}>
                    <span>{it.storeCode}</span><span>{it.brand || 'OEM'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes intelligent-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatCard({ label, value, valueText, hint, accent }: { label: string; value?: number; valueText?: string; hint: string; accent?: boolean }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: palette.textLabel, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</span>
      <span style={{ fontSize: valueText ? 14 : 24, fontWeight: 800, color: accent ? palette.accent : palette.textStrong, marginTop: 2 }}>
        {valueText ?? value}
      </span>
      <span style={{ fontSize: 11, color: palette.textFaint }}>{hint}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: palette.inputBg, border: `1px solid ${palette.borderFaint}`, borderRadius: 9, padding: '9px 11px' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10.5, color: palette.textMuted, marginTop: 1 }}>{label}</div>
    </div>
  );
}
