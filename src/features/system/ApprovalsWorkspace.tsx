'use client';

import { lazy, Suspense, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, categoryApi, productCostApi, categoryPriceApi } from '../../lib/api';
import { SecureAccessBarrier } from '../../components/layout/SecureAccessBarrier';
import { RefreshCw, Tag, FolderTree, Check, X, SlidersHorizontal, Bot, Trash2, TrendingUp, ShieldAlert } from 'lucide-react';
import { applyOptimistic, rollbackOptimistic } from '../../lib/optimistic';
import { describeError } from '../../lib/errors';
import { toast } from '../../lib/toast';
import { useMobile } from '../../hooks/useMobile';
import { SwipeableRow } from '../../components/ui/SwipeableRow';
import type { Category, CategoryPriceModerationItem, PendingModeration } from '../../types/api';
import type { CostModerationItem } from '../../lib/api/product-cost';

const Area = lazy(async () => ({ default: (await import('recharts')).Area }));
const AreaChart = lazy(async () => ({ default: (await import('recharts')).AreaChart }));
const Bar = lazy(async () => ({ default: (await import('recharts')).Bar }));
const BarChart = lazy(async () => ({ default: (await import('recharts')).BarChart }));
const Cell = lazy(async () => ({ default: (await import('recharts')).Cell }));
const Legend = lazy(async () => ({ default: (await import('recharts')).Legend }));
const Pie = lazy(async () => ({ default: (await import('recharts')).Pie }));
const PieChart = lazy(async () => ({ default: (await import('recharts')).PieChart }));
const ResponsiveContainer = lazy(async () => ({ default: (await import('recharts')).ResponsiveContainer }));
const Tooltip = lazy(async () => ({ default: (await import('recharts')).Tooltip }));
const XAxis = lazy(async () => ({ default: (await import('recharts')).XAxis }));
const YAxis = lazy(async () => ({ default: (await import('recharts')).YAxis }));

// PASTA DİLİMLERİ TEK RENGİN TONLARIDIR, GÖKKUŞAĞI DEĞİL.
//
// Eskiden burada altı ayrı marka rengi (mavi/yeşil/mor/sarı/açık mavi/pembe) vardı ve üç
// ayrı alt sekmede indis kaydırmasıyla (i, i+1, i+2) kullanılıyordu — yani AYNI kategori
// her sekmede BAŞKA bir renkteydi. Renk hiçbir şey kodlamadığı için okunacak bir şey de
// yoktu, sadece gürültü vardı. Dilimler artık tek bir nötr tonun giderek soluklaşan
// basamakları: sıralama okunur, anlam uydurulmaz. Efsane (Legend) kategori adını söyler.
const CHART_COLORS = [
  'color-mix(in oklch, var(--fg) 88%, var(--card))',
  'color-mix(in oklch, var(--fg) 72%, var(--card))',
  'color-mix(in oklch, var(--fg) 56%, var(--card))',
  'color-mix(in oklch, var(--fg) 42%, var(--card))',
  'color-mix(in oklch, var(--fg) 30%, var(--card))',
  'color-mix(in oklch, var(--fg) 20%, var(--card))',
];

// Grafik serilerinin tek ortak rengi — çubuk ve alan grafikleri için.
const CHART_SERIES = 'var(--fg)';

function fmtTL(n: number) {
  return '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── TAB 1: KATEGORİ EŞLEME GRAFİKLERİ ──────────────────────────────────────────

function CategoryTabAnalytics({ items, categories }: { items: PendingModeration[]; categories: Category[] }) {
  const confidenceData = useMemo(() => {
    let low = 0, mid = 0, high = 0;
    items.forEach((item) => {
      const conf = Math.round((item.confidence || 0) * 100);
      if (conf < 60) low++;
      else if (conf < 70) mid++;
      else high++;
    });
    return [
      { name: 'Düşük (%0-59)', Miktar: low },
      { name: 'Orta (%60-69)', Miktar: mid },
      { name: 'Yüksek (%70+)', Miktar: high },
    ];
  }, [items]);

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const cat = categories.find((category) => category.id === item.suggestedCategoryId);
      const name = cat ? cat.name : (item.rawCategory || 'Diğer');
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [items, categories]);

  const scoreTrend = useMemo(() => {
    if (items.length === 0) return [];
    return items.slice(0, 7).map((item, idx) => ({
      index: `#${idx + 1}`,
      Skor: Math.round((item.confidence || 0) * 100),
    }));
  }, [items]);

  return (
    <div className="mod-analytics-grid">
      <div className="mod-card" style={{ height: 210 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} style={{ color: 'var(--fg-muted)' }} /> Güven Skoru Dağılımı
        </h3>
        <div style={{ height: 155 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--fg-muted)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--fg-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'var(--bg-subtle)' }} />
              <Bar dataKey="Miktar" fill={CHART_SERIES} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mod-card" style={{ height: 210 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderTree size={14} style={{ color: 'var(--fg-muted)' }} /> Kategori Dağılımı
        </h3>
        <div style={{ height: 155 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryDistribution} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {categoryDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mod-card" style={{ height: 190 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} style={{ color: 'var(--fg-muted)' }} /> Skor Trendi
        </h3>
        <div style={{ height: 135 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scoreTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--fg)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--fg)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="index" stroke="var(--fg-muted)" fontSize={9} />
              <YAxis stroke="var(--fg-muted)" fontSize={10} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="Skor" stroke={CHART_SERIES} strokeWidth={2} fill="url(#scoreGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: ALIŞ FİYATI EŞLEME GRAFİKLERİ ────────────────────────────────────────

function CostTabAnalytics({ items }: { items: CostModerationItem[] }) {
  const confidenceData = useMemo(() => {
    let low = 0, mid = 0, high = 0;
    items.forEach((item) => {
      const conf = item.confidence || 0;
      if (conf < 60) low++;
      else if (conf < 80) mid++;
      else high++;
    });
    return [
      { name: 'Düşük (%0-59)', Adet: low },
      { name: 'Orta (%60-79)', Adet: mid },
      { name: 'Yüksek (%80+)', Adet: high },
    ];
  }, [items]);

  const priceDistribution = useMemo(() => {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    items.forEach((item) => {
      const pr = item.price || 0;
      if (pr < 100) p1++;
      else if (pr < 500) p2++;
      else if (pr < 1500) p3++;
      else p4++;
    });
    return [
      { name: '0-100 TL', value: p1 },
      { name: '100-500 TL', value: p2 },
      { name: '500-1500 TL', value: p3 },
      { name: '1500+ TL', value: p4 },
    ].filter(x => x.value > 0);
  }, [items]);

  const priceTrend = useMemo(() => {
    return items.slice(0, 7).map((item, i) => ({
      name: `#${i + 1}`,
      Fiyat: item.price || 0,
    }));
  }, [items]);

  return (
    <div className="mod-analytics-grid">
      <div className="mod-card" style={{ height: 210 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} style={{ color: 'var(--fg-muted)' }} /> Alış Eşleşme Güveni
        </h3>
        <div style={{ height: 155 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--fg-muted)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--fg-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="Adet" fill={CHART_SERIES} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mod-card" style={{ height: 210 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag size={14} style={{ color: 'var(--fg-muted)' }} /> Fiyat Aralığı Dağılımı
        </h3>
        <div style={{ height: 155 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={priceDistribution} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {priceDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mod-card" style={{ height: 190 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} style={{ color: 'var(--fg-muted)' }} /> Fiyat Dağılım Trendi
        </h3>
        <div style={{ height: 135 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--fg)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--fg)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="var(--fg-muted)" fontSize={9} />
              <YAxis stroke="var(--fg-muted)" fontSize={10} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="Fiyat" stroke={CHART_SERIES} strokeWidth={2} fill="url(#costGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: KATEGORİ FİYATI GRAFİKLERİ ──────────────────────────────────────────

function CategoryPriceTabAnalytics({ items }: { items: CategoryPriceModerationItem[] }) {
  const confidenceData = useMemo(() => {
    let low = 0, mid = 0, high = 0;
    items.forEach((item) => {
      const conf = Math.round((item.confidence || 0) * 100);
      if (conf < 60) low++;
      else if (conf < 80) mid++;
      else high++;
    });
    return [
      { name: 'Düşük (%0-59)', Adet: low },
      { name: 'Orta (%60-79)', Adet: mid },
      { name: 'Yüksek (%80+)', Adet: high },
    ];
  }, [items]);

  const currencyDistribution = useMemo(() => {
    let tl = 0, gbp = 0, eur = 0;
    items.forEach((item) => {
      const c = (item.currency || 'TL').toUpperCase();
      if (c.includes('GBP') || c.includes('STERLİN')) gbp++;
      else if (c.includes('EUR') || c.includes('EURO')) eur++;
      else tl++;
    });
    return [
      { name: 'TRY (₺)', value: tl },
      { name: 'GBP (£)', value: gbp },
      { name: 'EUR (€)', value: eur },
    ].filter(x => x.value > 0);
  }, [items]);

  const priceTrend = useMemo(() => {
    return items.slice(0, 7).map((item, i) => ({
      name: `#${i + 1}`,
      Fiyat: item.rawPrice || 0,
    }));
  }, [items]);

  return (
    <div className="mod-analytics-grid">
      <div className="mod-card" style={{ height: 210 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} style={{ color: 'var(--fg-muted)' }} /> Fiyat Eşleşme Güveni
        </h3>
        <div style={{ height: 155 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--fg-muted)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--fg-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="Adet" fill={CHART_SERIES} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mod-card" style={{ height: 210 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={14} style={{ color: 'var(--fg-muted)' }} /> Para Birimi Dağılımı
        </h3>
        <div style={{ height: 155 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={currencyDistribution} innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                {currencyDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mod-card" style={{ height: 190 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <TrendingUp size={14} style={{ color: 'var(--fg-muted)' }} /> Hedef Fiyat Trendi
        </h3>
        <div style={{ height: 135 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="catPriceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--fg)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--fg)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="var(--fg-muted)" fontSize={9} />
              <YAxis stroke="var(--fg-muted)" fontSize={10} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="Fiyat" stroke={CHART_SERIES} strokeWidth={2} fill="url(#catPriceGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2 TABLO BİLEŞENİ ────────────────────────────────────────────────────────

function CostMatchModerationTab() {
  const qc = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cost-match-moderation'],
    queryFn: () => productCostApi.moderationQueue(),
    staleTime: 10_000,
  });

  const handleError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setErrorMsg(
      msg.startsWith('404')
        ? 'Bu öneri artık geçerli değil (muhtemelen Excel eşleştirmesi yeniden çalıştırıldı). Liste tazeleniyor...'
        : `İşlem başarısız: ${msg}`
    );
    refetch();
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const approve = useMutation({
    meta: { silentError: true, successMessage: 'Onaylandı' } as const,
    mutationFn: (id: number) => productCostApi.approveModeration(id),
    onMutate: (id) =>
      applyOptimistic<{ items: CostModerationItem[] }>(qc, ['cost-match-moderation'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== id) };
      }),
    onError: (e, _vars, context) => {
      rollbackOptimistic(qc, context);
      handleError(e);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cost-match-moderation'] });
      qc.invalidateQueries({ queryKey: ['product-costs'] });
    },
  });

  // "Geri Al" backend'e gerçekten yazıyor (undoRejectModeration → Status'u Pending'e
  // döndürür). Yalnızca yerel cache'e geri yazsaydık, reject isteği zaten sunucuda
  // kalıcı olduğu için bir sonraki invalidateQueries onu tekrar silerdi — kullanıcıya
  // "geri aldım" hissi verip arkadan sessizce iptal eden bir tuzak olurdu.
  const undoReject = useMutation({
    mutationFn: (id: number) => productCostApi.undoRejectModeration(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cost-match-moderation'] }),
    onError: (e) => handleError(e),
  });

  const reject = useMutation({
    meta: { silentError: true } as const,
    mutationFn: (id: number) => productCostApi.rejectModeration(id),
    onMutate: (id) => {
      const ctx = applyOptimistic<{ items: CostModerationItem[] }>(qc, ['cost-match-moderation'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== id) };
      });

      toast.undo('Öneri reddedildi', () => undoReject.mutate(id));

      return ctx;
    },
    onError: (e, _vars, context) => {
      rollbackOptimistic(qc, context);
      handleError(e);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['cost-match-moderation'] });
    },
  });

  const isMobile = useMobile();
  const items = data?.items ?? [];

  return (
    <div className="moderation-stack">
      <div className="mod-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>
            Alış Fiyatı Eşleşmeleri — Onay Bekleyen
            <span style={{ marginLeft: 8, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{items.length}</span>
          </h2>
        </div>

        {errorMsg && (
          <div style={{ padding: '8px 20px', background: 'rgba(var(--danger-rgb),0.08)', color: 'var(--danger)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid rgba(var(--danger-rgb),0.2)' }}>
            ⚠ {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ color: 'var(--success)', fontSize: 28, fontWeight: 800 }}>✓</div>
            <div style={{ fontSize: 13 }}>Onay bekleyen alış fiyatı eşleşmesi yok.</div>
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
            {items.map((item) => {
              const color = item.confidence < 60 ? 'var(--danger)' : item.confidence < 80 ? 'var(--warning)' : 'var(--success)';
              return (
                <SwipeableRow
                  key={item.id}
                  right={{ label: 'Onayla', Icon: Check, onAction: () => approve.mutate(item.id) }}
                  left={{ label: 'Reddet', Icon: X, destructive: true, onAction: () => reject.mutate(item.id) }}
                >
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, border: '1px solid var(--border)' }}>
                        {item.costItemName}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>%{item.confidence} Güven</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${item.confidence}%`, background: color }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{item.productName}</div>
                    {item.reason && <div style={{ fontSize: 10.5, color: 'var(--warning)' }}>⚠ {item.reason}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-soft)', paddingTop: 8, marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 13 }}>{fmtTL(item.price)}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => approve.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending}
                          style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: 'var(--success)', color: '#fff', fontWeight: 600, fontSize: 11.5 }}
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => reject.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending}
                          style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--fg-muted)', fontWeight: 600, fontSize: 11.5 }}
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  </div>
                </SwipeableRow>
              );
            })}
          </div>
        ) : (
          <div className="mod-table-scroll">
          <table className="mod-table">
            <thead>
              <tr>
                <th>Alış Kalemi</th>
                <th>Ürün</th>
                <th>Fiyat</th>
                <th>Güven</th>
                <th style={{ width: 150 }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const color = item.confidence < 60 ? 'var(--danger)' : item.confidence < 80 ? 'var(--warning)' : 'var(--success)';
                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ background: 'var(--bg-subtle)', padding: '3px 6px', borderRadius: 4, fontSize: 11, border: '1px solid var(--border)' }}>
                        {item.costItemName}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{item.productName}</div>
                      {item.reason && (
                        <div style={{ fontSize: 10.5, color: 'var(--warning)', marginTop: 2 }}>⚠ {item.reason}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 12.5 }}>{fmtTL(item.price)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'right' }}>%{item.confidence}</div>
                        <div className="confidence-bar">
                          <div className="confidence-fill" style={{ width: `${item.confidence}%`, background: color }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => approve.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 10px', border: 'none', borderRadius: 7, background: 'var(--success)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                        >
                          <Check size={13} /> Onayla
                        </button>
                        <button
                          onClick={() => reject.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg-subtle)', color: 'var(--fg-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                        >
                          <X size={13} /> Reddet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />}>
        <CostTabAnalytics items={items} />
      </Suspense>
    </div>
  );
}

// ─── TAB 3 TABLO BİLEŞENİ ────────────────────────────────────────────────────────

function CategoryPriceModerationTab() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['category-price-moderation-central'],
    queryFn: () => categoryPriceApi.moderationQueue(),
    staleTime: 10_000,
  });

  const approve = useMutation({
    meta: { silentError: true, successMessage: 'Onaylandı' } as const,
    mutationFn: (id: number) => categoryPriceApi.approveModeration(id),
    onMutate: (id) =>
      applyOptimistic<{ items: CategoryPriceModerationItem[] }>(qc, ['category-price-moderation-central'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== id) };
      }),
    onError: (error, _vars, context) => {
      rollbackOptimistic(qc, context);
      toast.error(describeError(error));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['category-price-moderation-central'] });
      qc.invalidateQueries({ queryKey: ['category-price-targets'] });
    },
  });

  const reject = useMutation({
    meta: { silentError: true, successMessage: 'Reddedildi' } as const,
    mutationFn: (id: number) => categoryPriceApi.rejectModeration(id),
    onMutate: (id) =>
      applyOptimistic<{ items: CategoryPriceModerationItem[] }>(qc, ['category-price-moderation-central'], (old) => {
        if (!old) return old;
        return { ...old, items: old.items.filter((item) => item.id !== id) };
      }),
    onError: (error, _vars, context) => {
      rollbackOptimistic(qc, context);
      toast.error(describeError(error));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['category-price-moderation-central'] });
    },
  });

  const isMobile = useMobile();
  const items = data?.items ?? [];

  return (
    <div className="moderation-stack">
      <div className="mod-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>
            Kategori Fiyatı Eşleşmeleri — Onay Bekleyen
            <span style={{ marginLeft: 8, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{items.length}</span>
          </h2>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ color: 'var(--success)', fontSize: 28, fontWeight: 800 }}>✓</div>
            <div style={{ fontSize: 13 }}>Onay bekleyen kategori fiyatı eşleşmesi yok.</div>
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
            {items.map((item) => {
              const conf = Math.round(item.confidence * 100);
              const color = conf < 60 ? 'var(--danger)' : conf < 80 ? 'var(--warning)' : 'var(--success)';
              return (
                <SwipeableRow
                  key={item.id}
                  right={{ label: 'Onayla', Icon: Check, onAction: () => approve.mutate(item.id) }}
                  left={{ label: 'Reddet', Icon: X, destructive: true, onAction: () => reject.mutate(item.id) }}
                >
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, border: '1px solid var(--border)' }}>
                        {item.rawCategoryText}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color }}>%{conf} Güven</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${conf}%`, background: color }} />
                    </div>
                    {item.suggestedCategoryName ? (
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Bot size={13} style={{ color: 'var(--fg-muted)' }} /> Öneri: {item.suggestedCategoryName}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: 'var(--fg-subtle)' }}>Öneri yok</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-soft)', paddingTop: 8, marginTop: 2 }}>
                      <span style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 13 }}>
                        {item.currency === 'Tl' ? '₺' : '£'}{item.rawPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => approve.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending || !item.suggestedInternalCategoryId}
                          style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: item.suggestedInternalCategoryId ? 'var(--success)' : 'var(--bg-subtle)', color: item.suggestedInternalCategoryId ? '#fff' : 'var(--fg-subtle)', fontWeight: 600, fontSize: 11.5 }}
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => reject.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending}
                          style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--fg-muted)', fontWeight: 600, fontSize: 11.5 }}
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  </div>
                </SwipeableRow>
              );
            })}
          </div>
        ) : (
          <div className="mod-table-scroll">
          <table className="mod-table">
            <thead>
              <tr>
                <th>Excel Kategori Metni</th>
                <th>Önerilen Kategori</th>
                <th>Fiyat</th>
                <th>Güven</th>
                <th style={{ width: 150 }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const conf = Math.round(item.confidence * 100);
                const color = conf < 60 ? 'var(--danger)' : conf < 80 ? 'var(--warning)' : 'var(--success)';
                return (
                  <tr key={item.id}>
                    <td>
                      <span style={{ background: 'var(--bg-subtle)', padding: '3px 6px', borderRadius: 4, fontSize: 11, border: '1px solid var(--border)' }}>
                        {item.rawCategoryText}
                      </span>
                    </td>
                    <td>
                      {item.suggestedCategoryName ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: 12.5 }}>
                          <Bot size={13} style={{ color: 'var(--fg-muted)' }} /> {item.suggestedCategoryName}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Öneri yok</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--fg)', fontSize: 12.5 }}>
                      {item.currency === 'Tl' ? '₺' : '£'}{item.rawPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'right' }}>%{conf}</div>
                        <div className="confidence-bar">
                          <div className="confidence-fill" style={{ width: `${conf}%`, background: color }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => approve.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending || !item.suggestedInternalCategoryId}
                          title={!item.suggestedInternalCategoryId ? 'Önce bir kategori atanmalı' : 'Onayla'}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 10px', border: 'none', borderRadius: 7, background: item.suggestedInternalCategoryId ? 'var(--success)' : 'var(--bg-subtle)', color: item.suggestedInternalCategoryId ? '#fff' : 'var(--fg-subtle)', fontWeight: 600, cursor: item.suggestedInternalCategoryId ? 'pointer' : 'not-allowed', fontSize: 12 }}
                        >
                          <Check size={13} /> Onayla
                        </button>
                        <button
                          onClick={() => reject.mutate(item.id)}
                          disabled={approve.isPending || reject.isPending}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg-subtle)', color: 'var(--fg-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                        >
                          <X size={13} /> Reddet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />}>
        <CategoryPriceTabAnalytics items={items} />
      </Suspense>
    </div>
  );
}

// ─── ANA MODERASYON SAYFASI BİLEŞENİ ───────────────────────────────────────────

export function ApprovalsWorkspace() {
  const queryClient = useQueryClient();
  const isMobile = useMobile();

  const [tab, setTab] = useState<'category' | 'cost' | 'category-price'>('category');
  const [selectedCategories, setSelectedCategories] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const { data: pendingItems = [], isLoading, refetch } = useQuery({
    queryKey: ['moderation-pending'],
    queryFn: () => moderationApi.pending(),
    staleTime: 10_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => categoryApi.master(),
    staleTime: 60_000,
  });

  const approveMutation = useMutation({
    meta: { silentError: true, successMessage: 'Karar onaylandı' } as const,
    mutationFn: (v: { logId: number; platformName: string; rawCategoryName: string; approvedCategoryId: number }) =>
      moderationApi.approve(v),
    onMutate: (v) =>
      applyOptimistic<PendingModeration[]>(queryClient, ['moderation-pending'], (old) => {
        if (!old) return old;
        return old.filter((item) => item.logId !== v.logId);
      }),
    onError: (e: unknown, _vars, context) => {
      rollbackOptimistic(queryClient, context);
      toast.error(describeError(e));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-pending'] });
    },
  });

  const dismissMutation = useMutation({
    meta: { silentError: true, successMessage: 'Kayıt kapatıldı' } as const,
    mutationFn: (logId: number) => moderationApi.dismiss(logId),
    onMutate: (logId) =>
      applyOptimistic<PendingModeration[]>(queryClient, ['moderation-pending'], (old) => {
        if (!old) return old;
        return old.filter((item) => item.logId !== logId);
      }),
    onError: (e: unknown, _vars, context) => {
      rollbackOptimistic(queryClient, context);
      toast.error(describeError(e));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-pending'] });
    },
  });

  const dismissAllMutation = useMutation({
    meta: { successMessage: 'Kayıt kapatıldı' } as const,
    mutationFn: () => moderationApi.dismissAll(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['moderation-pending'] });
      setMsg(`${res.deleted} kayıt temizlendi.`);
      setTimeout(() => setMsg(''), 3000);
    },
    onError: (e: unknown) => {
      setErr('Toplu silme başarısız: ' + describeError(e));
      setTimeout(() => setErr(''), 4000);
    },
  });

  return (
    <SecureAccessBarrier title="Operasyon Onayları" description="Kritik eşleme ve fiyat onaylarına erişmek için şifrenizi girin.">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <style>{`
          .moderation-stack { display: flex; flex-direction: column; gap: 12px; }
          .mod-analytics-grid { display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 12px; }
          .mod-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; box-shadow: var(--shadow-sm); }
          .mod-table-scroll { overflow-x: auto; }
          .mod-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
          .mod-table th { text-align: left; padding: 9px 10px; color: var(--fg-muted); font-weight: 700; border-bottom: 1px solid var(--border); background: var(--bg-subtle); white-space: nowrap; }
          .mod-table td { padding: 10px; color: var(--fg); border-bottom: 1px solid var(--border-soft); vertical-align: middle; }
          .select-custom { appearance: none; min-width: 220px; min-height: 36px; background-color: var(--card); color: var(--fg); border: 1px solid var(--border); border-radius: 10px; padding: 8px 34px 8px 11px; font-size: 12.5px; font-weight: 650; outline: none; cursor: pointer; box-shadow: var(--shadow-xs); background-image: linear-gradient(45deg, transparent 50%, var(--fg-muted) 50%), linear-gradient(135deg, var(--fg-muted) 50%, transparent 50%); background-position: calc(100% - 16px) 52%, calc(100% - 11px) 52%; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
          .select-custom:hover { border-color: var(--fg-subtle); background-color: var(--bg-subtle); }
          .select-custom:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
          .confidence-bar { height: 6px; border-radius: 3px; background: var(--border-soft); overflow: hidden; }
          .confidence-fill { height: 100%; transition: width 0.6s; }
          @media (max-width: 980px) { .mod-analytics-grid { grid-template-columns: 1fr; } }
        `}</style>

        {/* Eşitlenmiş & Soldan Başlayan Kontrol Barı (Uyarı Metni Temizlendi) */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div data-tour="moderation-tabs" style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', padding: 4, borderRadius: 10 }}>
              <button
                type="button"
                onClick={() => setTab('category')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none',
                  background: tab === 'category' ? 'var(--card)' : 'transparent',
                  color: tab === 'category' ? 'var(--accent)' : 'var(--fg-muted)',
                  fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                  boxShadow: tab === 'category' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Kategori Eşleme
              </button>
              <button
                type="button"
                onClick={() => setTab('cost')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none',
                  background: tab === 'cost' ? 'var(--card)' : 'transparent',
                  color: tab === 'cost' ? 'var(--accent)' : 'var(--fg-muted)',
                  fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                  boxShadow: tab === 'cost' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Alış Fiyatı Eşleme
              </button>
              <button
                type="button"
                onClick={() => setTab('category-price')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, border: 'none',
                  background: tab === 'category-price' ? 'var(--card)' : 'transparent',
                  color: tab === 'category-price' ? 'var(--accent)' : 'var(--fg-muted)',
                  fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                  boxShadow: tab === 'category-price' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                Kategori Fiyatı
              </button>
            </div>
          </div>

          <div data-tour="moderation-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => refetch()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--card)', color: 'var(--fg)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}
            >
              <RefreshCw size={13} /> Yenile
            </button>

            {tab === 'category' && (
              <button
                type="button"
                onClick={() => {
                  if (pendingItems.length === 0) return;
                  if (!window.confirm(`${pendingItems.length} kaydın hepsi silinsin mi? Bu işlem geri alınamaz.`)) return;
                  dismissAllMutation.mutate();
                }}
                disabled={dismissAllMutation.isPending || pendingItems.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid rgba(var(--danger-rgb),0.35)', borderRadius: 8, background: 'rgba(var(--danger-rgb),0.08)', color: 'var(--danger)', cursor: pendingItems.length === 0 ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 600, opacity: pendingItems.length === 0 ? 0.5 : 1 }}
              >
                <Trash2 size={13} /> Tümünü Sil
              </button>
            )}
          </div>
        </div>

        {msg && <div style={{ background: 'rgba(var(--success-rgb),0.12)', color: 'var(--success)', padding: '10px 20px', fontSize: 13, borderBottom: '1px solid rgba(var(--success-rgb),0.2)' }}>✓ {msg}</div>}
        {err && <div style={{ background: 'rgba(var(--danger-rgb),0.12)', color: 'var(--danger)', padding: '10px 20px', fontSize: 13, borderBottom: '1px solid rgba(var(--danger-rgb),0.2)' }}>✗ {err}</div>}

        <div data-tour="moderation-content" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {tab === 'cost' ? (
            <CostMatchModerationTab />
          ) : tab === 'category-price' ? (
            <CategoryPriceModerationTab />
          ) : (
            <div className="moderation-stack">
              {/* Left: pending table */}
              <div className="mod-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>
                    Onay Bekleyen Eşlemeler
                    <span style={{ marginLeft: 8, background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>{pendingItems.length}</span>
                  </h2>
                </div>

                {isLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)' }}>Yükleniyor...</div>
                ) : pendingItems.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--fg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ color: 'var(--success)', fontSize: 28, fontWeight: 800 }}>✓</div>
                    <div style={{ fontSize: 13 }}>Onay bekleyen AI eşlemesi yok.</div>
                  </div>
                ) : isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}>
                    {pendingItems.map((item) => {
                      const conf = Math.round((item.confidence || 0) * 100);
                      const color = conf < 60 ? 'var(--danger)' : conf < 70 ? 'var(--warning)' : 'var(--success)';
                      const handleApprove = () => {
                        const catId = selectedCategories[item.logId] ?? item.suggestedCategoryId;
                        if (!catId) { alert('Lütfen kategori seçin.'); return; }
                        approveMutation.mutate({ logId: item.logId, platformName: 'Sentos', rawCategoryName: item.rawCategory, approvedCategoryId: catId });
                      };
                      return (
                        <SwipeableRow
                          key={item.logId}
                          right={{ label: 'Onayla', Icon: Check, onAction: handleApprove }}
                          left={{ label: 'Sil', Icon: Trash2, destructive: true, onAction: () => dismissMutation.mutate(item.logId) }}
                        >
                          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: 4, fontSize: 10.5, border: '1px solid var(--border)' }}>
                                {item.rawCategory || 'Bilinmiyor'}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color }}>%{conf} Skor</span>
                            </div>
                            <div className="confidence-bar">
                              <div className="confidence-fill" style={{ width: `${conf}%`, background: color }} />
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{item.productName}</div>
                            <div style={{ marginTop: 2 }}>
                              <select
                                className="select-custom"
                                value={selectedCategories[item.logId] ?? (item.suggestedCategoryId || '')}
                                onChange={(e) => setSelectedCategories(prev => ({ ...prev, [item.logId]: Number(e.target.value) }))}
                                style={{ width: '100%', fontSize: 12, minHeight: 34 }}
                              >
                                <option value="">Kategori Seçin...</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, borderTop: '1px solid var(--border-soft)', paddingTop: 8, marginTop: 4 }}>
                              <button
                                onClick={handleApprove}
                                disabled={approveMutation.isPending}
                                style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: 'var(--success)', color: '#fff', fontWeight: 600, fontSize: 11.5 }}
                              >
                                Onayla
                              </button>
                              <button
                                onClick={() => dismissMutation.mutate(item.logId)}
                                disabled={dismissMutation.isPending}
                                style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--danger)', fontWeight: 600, fontSize: 11.5 }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </SwipeableRow>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mod-table-scroll">
                  <table className="mod-table">
                    <thead>
                      <tr>
                        <th>Ürün Adı</th>
                        <th>Ham Kategori</th>
                        <th>Önerilen Kategori</th>
                        <th>Skor</th>
                        <th style={{ width: 120 }}>İşlem</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingItems.map((item) => {
                        const conf = Math.round((item.confidence || 0) * 100);
                        const color = conf < 60 ? 'var(--danger)' : conf < 70 ? 'var(--warning)' : 'var(--success)';
                        return (
                          <tr key={item.logId}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.productName}</div>
                              <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>#{item.logId}</div>
                            </td>
                            <td>
                              <span style={{ background: 'var(--bg-subtle)', padding: '3px 6px', borderRadius: 4, fontSize: 11, border: '1px solid var(--border)' }}>
                                {item.rawCategory || 'Bilinmiyor'}
                              </span>
                            </td>
                            <td>
                              <select
                                className="select-custom"
                                value={selectedCategories[item.logId] ?? (item.suggestedCategoryId || '')}
                                onChange={(e) => setSelectedCategories(prev => ({ ...prev, [item.logId]: Number(e.target.value) }))}
                                style={{ width: '100%', fontSize: 12 }}
                              >
                                <option value="">Seçin...</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'right' }}>%{conf}</div>
                                <div className="confidence-bar">
                                  <div className="confidence-fill" style={{ width: `${conf}%`, background: color }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <button
                                onClick={() => {
                                  const catId = selectedCategories[item.logId] ?? item.suggestedCategoryId;
                                  if (!catId) { alert('Lütfen kategori seçin.'); return; }
                                  approveMutation.mutate({ logId: item.logId, platformName: 'Sentos', rawCategoryName: item.rawCategory, approvedCategoryId: catId });
                                }}
                                disabled={approveMutation.isPending}
                                style={{ width: '100%', padding: '7px 10px', border: 'none', borderRadius: 7, background: 'var(--success)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                              >
                                Onayla
                              </button>
                            </td>
                            <td>
                              <button
                                onClick={() => dismissMutation.mutate(item.logId)}
                                disabled={dismissMutation.isPending}
                                title="Onaylamadan sil"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg-subtle)', color: 'var(--danger)', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>

              {/* Right: dedicated category tab analytics */}
              <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-[var(--bg-subtle)]" />}>
                <CategoryTabAnalytics items={pendingItems} categories={categories} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </SecureAccessBarrier>
  );
}
