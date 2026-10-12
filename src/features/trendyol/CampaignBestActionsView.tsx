'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ArrowUpDown, Target, Search, Sparkles } from 'lucide-react';
import { campaignApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useMobile } from '../../hooks/useMobile';
import type { TranslationKey } from '../../lib/translations/tr';
import type { BestAction, OfferAnalysis } from '../../types/api';
import { ExportMenu, type ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';

const BEST_ACTIONS_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'productName', header: 'Ürün' },
  { key: 'barcode', header: 'Barkod' },
  { key: 'bestCampaign', header: 'En İyi Kampanya' },
  { key: 'buyingPrice', header: 'Alış', type: 'money' },
  { key: 'listPrice', header: 'Liste Fiyatı', type: 'money' },
  { key: 'salePrice', header: 'Satış Fiyatı', type: 'money' },
  { key: 'discountPercent', header: 'İndirim %', type: 'decimal' },
  { key: 'netProfit', header: 'Net Kâr', type: 'money' },
  { key: 'margin', header: 'Kâr Marjı %', type: 'decimal' },
  { key: 'weightedScore', header: 'Ağırlıklı Skor', type: 'decimal' },
  { key: 'recommendation', header: 'Tavsiye' },
];

type TFunc = (key: TranslationKey) => string;

function typeLabel(type: string, t: TFunc): string {
  if (type === 'Flash') return t('campaign_flash');
  if (type === 'Starred') return t('campaign_starred');
  if (type === 'Plus') return t('campaign_plus');
  return type;
}

type RecTone = 'success' | 'warning' | 'danger' | 'muted';

function recommendationInfo(level: string, t: TFunc): { label: string; tone: RecTone; badgeClass: string } {
  if (level === 'Yap') {
    return { label: t('campaign_rec_do'), tone: 'success', badgeClass: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' };
  }
  if (level === 'DikkatliDegerlendir') {
    return { label: t('campaign_rec_caution'), tone: 'warning', badgeClass: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
  }
  if (level === 'Yapma') {
    return { label: t('campaign_rec_dont'), tone: 'danger', badgeClass: 'bg-rose-500/10 text-rose-500 border border-rose-500/20' };
  }
  return { label: level, tone: 'muted', badgeClass: 'bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-soft)]' };
}

type SortKey = 'netProfit' | 'salePrice' | 'margin' | 'weightedScore';

export function CampaignBestActionsView() {
  const { t } = useI18n();
  const isMobile = useMobile();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [onlyProfitable, setOnlyProfitable] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('weightedScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-best-actions'],
    queryFn: () => campaignApi.bestActions(),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const list = data.actions.filter((a) => {
      if (typeFilter !== 'all' && a.bestCampaignType !== typeFilter) return false;
      if (onlyProfitable && a.bestNetProfit <= 0) return false;
      if (search) {
        const term = search.toLowerCase();
        return a.productName.toLowerCase().includes(term) || a.barcode.toLowerCase().includes(term);
      }
      return true;
    });

    const valueOf = (a: BestAction) => {
      switch (sortKey) {
        case 'netProfit': return a.bestNetProfit;
        case 'salePrice': return a.bestSalePrice;
        case 'margin': return a.bestProfitMargin;
        case 'weightedScore': return a.bestWeightedScore;
      }
    };

    return [...list].sort((a, b) => (valueOf(a) - valueOf(b)) * (sortDir === 'asc' ? 1 : -1));
  }, [data, typeFilter, onlyProfitable, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs overflow-y-auto">
      {/* Header & KPI Summary */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[var(--fg-muted)]" />
            <h1 className="text-sm font-bold text-[var(--fg)]">Kampanya Aksiyon Önerileri</h1>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Maliyet, komisyon ve kargo hesaplamalarına göre en kârlı kampanya seçenekleri.
          </p>
        </div>

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
              <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Analiz Edilen Ürün</span>
              <div className="text-xl font-bold text-[var(--fg)] my-1">{data.totalProducts}</div>
              <div className="text-[10px] text-[var(--fg-muted)]">Teklif havuzundaki ürünler</div>
            </div>

            <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
              <span className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">Çoklu Kampanya Seçeneği</span>
              <div className="text-xl font-bold text-[var(--fg)] my-1">{data.productsWithMultipleOptions}</div>
              <div className="text-[10px] text-[var(--fg-muted)]">Birden fazla kampanya alternatifi olanlar</div>
            </div>

            <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col justify-between">
              <span className="text-[10.5px] font-semibold text-emerald-600 uppercase">Toplam Ağırlıklı Kâr</span>
              <div className="text-xl font-bold text-emerald-600 my-1">₺{data.totalWeightedProfit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
              <div className="text-[10px] text-[var(--fg-muted)]">Önerilen aksiyonların kâr potansiyeli</div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Action Toolbar */}
      <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'Flash', 'Starred', 'Plus'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTypeFilter(f)}
                className={`h-7.5 px-3 rounded-[4px] text-xs font-semibold transition cursor-pointer ${
                  typeFilter === f
                    ? 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] shadow-xs font-bold'
                    : 'border border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {f === 'all' ? 'Tüm Kampanyalar' : typeLabel(f, t)}
              </button>
            ))}

            <label className="ml-2 flex items-center gap-1.5 text-xs text-[var(--fg-muted)] cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={onlyProfitable}
                onChange={(e) => setOnlyProfitable(e.target.checked)}
                className="h-3.5 w-3.5 rounded-[2px]"
              />
              <span>Sadece Kârlı Olanlar</span>
            </label>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün adı veya barkod ara..."
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>

            {data && (
              <ExportMenu
                filename="kampanya-aksiyonlari"
                columns={BEST_ACTIONS_EXPORT_COLUMNS}
                getData={() => filtered.map((a): ExportRow => ({
                  productName: a.productName,
                  barcode: a.barcode,
                  bestCampaign: typeLabel(a.bestCampaignType, t) + (a.bestTimeWindow ? ` (${a.bestTimeWindow})` : ''),
                  buyingPrice: a.buyingPrice,
                  listPrice: a.listPrice ?? 0,
                  salePrice: a.bestSalePrice,
                  discountPercent: a.discountPercent ?? 0,
                  netProfit: a.bestNetProfit,
                  margin: a.bestProfitMargin,
                  weightedScore: a.bestWeightedScore,
                  recommendation: a.recommendationLevel ? recommendationInfo(a.recommendationLevel, t).label : '',
                }))}
              />
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-xs text-[var(--fg-muted)]">Kampanya aksiyonları hesaplanıyor...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="p-10 rounded-[4px] border border-dashed border-[var(--border)] text-center text-xs text-[var(--fg-muted)]">
          {data?.actions.length === 0 ? 'Henüz analiz edilecek kampanya kaydı bulunmuyor.' : 'Filtreye uygun kampanya aksiyonu bulunamadı.'}
        </div>
      )}

      {/* Mobile Card List */}
      {!isLoading && isMobile && (
        <div className="flex flex-col gap-2.5">
          {filtered.map((action) => (
            <ActionCard
              key={action.barcode}
              action={action}
              expanded={expanded === action.barcode}
              onToggle={() => setExpanded(expanded === action.barcode ? null : action.barcode)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Desktop Responsive Table */}
      {!isLoading && !isMobile && filtered.length > 0 && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[10.5px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                  <th className="p-3">Ürün & Barkod</th>
                  <th className="p-3">En İyi Kampanya</th>
                  <th className="p-3 text-right">Alış</th>
                  <th className="p-3 text-right">Liste</th>
                  <SortableTh label="Satış Fiyatı" sortKey="salePrice" align="right" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="p-3 text-right">İndirim %</th>
                  <SortableTh label="Net Kâr" sortKey="netProfit" align="right" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Kâr Marjı %" sortKey="margin" align="right" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <SortableTh label="Skor" sortKey="weightedScore" align="right" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                  <th className="p-3">Tavsiye</th>
                  <th className="p-3 text-center">Seçenek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filtered.map((action) => (
                  <ActionRow
                    key={action.barcode}
                    action={action}
                    expanded={expanded === action.barcode}
                    onToggle={() => setExpanded(expanded === action.barcode ? null : action.barcode)}
                    t={t}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableTh({
  label, sortKey, activeKey, dir, onSort, align = 'left',
}: {
  label: string; sortKey: SortKey; activeKey: SortKey; dir: 'asc' | 'desc';
  onSort: (key: SortKey) => void; align?: 'left' | 'right' | 'center';
}) {
  const active = activeKey === sortKey;
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th className={`p-3 ${alignClass}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider cursor-pointer hover:text-[var(--fg)] transition ${
          active ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'
        }`}
      >
        <span>{label}</span>
        {active ? (
          dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
        ) : (
          <ArrowUpDown size={11} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

function ActionRow({
  action: a, expanded, onToggle, t,
}: {
  action: BestAction; expanded: boolean; onToggle: () => void; t: TFunc;
}) {
  const rec = a.recommendationLevel ? recommendationInfo(a.recommendationLevel, t) : null;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`hover:bg-[var(--bg-subtle)]/30 transition cursor-pointer text-xs ${
          expanded ? 'bg-[var(--bg-subtle)]/50' : ''
        }`}
      >
        <td className="p-3">
          <div className="font-semibold text-[var(--fg)] max-w-[240px] truncate">{a.productName}</div>
          <div className="text-[11px] text-[var(--fg-muted)] mt-0.5">{a.barcode}</div>
        </td>
        <td className="p-3">
          <span className="inline-block px-2 py-0.5 rounded-[3px] bg-[var(--bg-subtle)] border border-[var(--border-soft)] font-semibold text-[11px] text-[var(--fg)]">
            {typeLabel(a.bestCampaignType, t)}
            {a.bestTimeWindow && ` (${a.bestTimeWindow})`}
          </span>
        </td>
        <td className="p-3 text-right text-[var(--fg-muted)]">₺{a.buyingPrice.toFixed(2)}</td>
        <td className="p-3 text-right text-[var(--fg-muted)]">
          {a.listPrice != null ? `₺${a.listPrice.toFixed(2)}` : '—'}
        </td>
        <td className="p-3 text-right font-semibold text-[var(--fg)]">₺{a.bestSalePrice.toFixed(2)}</td>
        <td className="p-3 text-right font-semibold">
          {a.discountPercent != null ? `%${a.discountPercent.toFixed(1)}` : '—'}
        </td>
        <td className={`p-3 text-right font-bold ${a.bestNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          ₺{a.bestNetProfit.toFixed(2)}
        </td>
        <td className={`p-3 text-right font-bold ${a.bestProfitMargin >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
          %{a.bestProfitMargin.toFixed(1)}
        </td>
        <td className="p-3 text-right font-bold text-[var(--fg)]">
          {a.bestWeightedScore.toFixed(0)}
        </td>
        <td className="p-3">
          {rec && (
            <span className={`inline-block px-2 py-0.5 rounded-[2px] text-[10.5px] font-bold ${rec.badgeClass}`}>
              {rec.label}
            </span>
          )}
        </td>
        <td className="p-3 text-center">
          <div className="inline-flex items-center gap-1 text-[var(--fg-muted)]">
            <span className="font-semibold text-xs">{a.allOptions.length}</span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--bg-subtle)]/40 border-b border-[var(--border-soft)]">
          <td colSpan={11} className="p-4">
            <ActionDetail action={a} t={t} />
          </td>
        </tr>
      )}
    </>
  );
}

function ActionCard({
  action: a, expanded, onToggle, t,
}: {
  action: BestAction; expanded: boolean; onToggle: () => void; t: TFunc;
}) {
  const rec = a.recommendationLevel ? recommendationInfo(a.recommendationLevel, t) : null;
  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-2 p-3.5 text-left cursor-pointer hover:bg-[var(--bg-subtle)]/30 transition"
      >
        <div className="flex items-start justify-between gap-2 w-full">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-[var(--fg)]">{a.productName}</p>
            <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">{a.barcode}</p>
          </div>
          {expanded ? <ChevronUp size={15} className="text-[var(--fg-muted)] shrink-0" /> : <ChevronDown size={15} className="text-[var(--fg-muted)] shrink-0" />}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="px-2 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-soft)] font-semibold text-[10.5px] text-[var(--fg)]">
            {typeLabel(a.bestCampaignType, t)}
          </span>
          {rec && <span className={`px-2 py-0.5 rounded-[2px] text-[10.5px] font-bold ${rec.badgeClass}`}>{rec.label}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-soft)] w-full">
          <div>
            <span className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold">Satış Fiyatı</span>
            <div className="font-bold text-xs text-[var(--fg)] mt-0.5">₺{a.bestSalePrice.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-[10px] text-[var(--fg-muted)] uppercase font-semibold">Net Kâr (%{a.bestProfitMargin.toFixed(1)})</span>
            <div className={`font-bold text-xs mt-0.5 ${a.bestNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              ₺{a.bestNetProfit.toFixed(2)}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-soft)] p-3.5 bg-[var(--bg-subtle)]/30">
          <ActionDetail action={a} t={t} />
        </div>
      )}
    </div>
  );
}

function ActionDetail({ action: a, t }: { action: BestAction; t: TFunc }) {
  return (
    <div className="space-y-3">
      {a.recommendation && (
        <div className="p-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] flex items-start gap-2.5">
          <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--fg)] leading-relaxed m-0">{a.recommendation}</p>
        </div>
      )}

      {a.allOptions.length > 0 && (
        <div>
          <span className="font-bold text-xs text-[var(--fg)] block mb-2">
            Mevcut Tüm Kampanya Seçenekleri ({a.allOptions.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {a.allOptions
              .slice()
              .sort((x, y) => y.netProfit - x.netProfit)
              .map((opt, i) => (
                <OptionCard key={i} option={opt} isBest={opt.campaignType === a.bestCampaignType} t={t} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionCard({ option: o, isBest, t }: { option: OfferAnalysis; isBest: boolean; t: TFunc }) {
  return (
    <div
      className={`p-3 rounded-[4px] border transition flex flex-col gap-2 ${
        isBest
          ? 'border-[var(--fg)] bg-[var(--card)] shadow-xs'
          : 'border-[var(--border-soft)] bg-[var(--card)]/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[11px] text-[var(--fg)]">
          {typeLabel(o.campaignType, t)}
        </span>
        {isBest && (
          <span className="px-1.5 py-0.2 rounded-[2px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold">
            En İyi Seçenek
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[10px] text-[var(--fg-muted)]">Satış Fiyatı</span>
          <div className="font-semibold text-[var(--fg)]">₺{o.salePrice.toFixed(2)}</div>
        </div>
        <div>
          <span className="text-[10px] text-[var(--fg-muted)]">Net Kâr</span>
          <div className={`font-bold ${o.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            ₺{o.netProfit.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--border-soft)] flex items-center justify-between text-[10.5px] text-[var(--fg-muted)]">
        <span>Komisyon: %{o.commissionRate}</span>
        <span>Kargo: ₺{o.shippingCost.toFixed(0)}</span>
      </div>
    </div>
  );
}
