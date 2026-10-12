'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, RefreshCw, Search, Send, Trash2, X } from 'lucide-react';
import {
  MISSING_FIELD_LABELS,
  productGapApi,
  ProductGapCandidateStatus,
  type ProductGapCandidate,
  type SendProductGapOptions,
} from '../../lib/api/product-gap';
import { productDraftApi } from '../../lib/api/product-drafts';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { CustomCheckbox } from '../../components/ui/CustomCheckbox';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { candidateStatusLabel, dispatchStatusLabel, matchTypeLabel } from './product-gap-ui';
import { SendProductDialog } from './SendProductDialog';
import { IgnoreReasonDialog } from './IgnoreReasonDialog';
import { DispatchLogTable } from './DispatchLogTable';

// "all" = durum filtresi uygulanmaz (backend'e status parametresi hiç gönderilmez).
type StatusFilter = number | 'all';
type PairForm = { id: number | null; sourceId: number | ''; targetId: number | ''; isActive: boolean };

const PRIMARY_BTN =
  'inline-flex items-center gap-1.5 rounded-[4px] bg-zinc-600 text-white font-semibold hover:bg-zinc-500 transition cursor-pointer disabled:opacity-40';
const GHOST_BTN =
  'inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer disabled:opacity-40';

export function ProductGapWorkspace() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const locale = isTr ? 'tr-TR' : 'en-US';
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlTab = searchParams.get('tab');
  const tab: 'candidates' | 'log' = urlTab === 'log' ? 'log' : 'candidates';

  const urlStatus = searchParams.get('status');
  const statusFilter: StatusFilter = useMemo(() => {
    if (urlStatus === 'all') return 'all';
    if (urlStatus !== null && !isNaN(Number(urlStatus))) return Number(urlStatus);
    return ProductGapCandidateStatus.Pending;
  }, [urlStatus]);

  const urlPair = searchParams.get('pair');
  const selectedPairId: number | 'all' = useMemo(() => {
    if (urlPair && urlPair !== 'all' && !isNaN(Number(urlPair))) return Number(urlPair);
    return 'all';
  }, [urlPair]);

  const urlSearch = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(urlSearch);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v === null || v === '') params.delete(k);
        else params.set(k, v);
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setTab = (t: 'candidates' | 'log') => {
    updateUrl({ tab: t === 'candidates' ? null : t });
  };

  const setStatusFilter = (s: StatusFilter) => {
    updateUrl({
      status: s === ProductGapCandidateStatus.Pending ? null : String(s),
    });
  };

  const setSelectedPairId = (p: number | 'all') => {
    updateUrl({ pair: p === 'all' ? null : String(p) });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== urlSearch) {
        updateUrl({ q: search.trim() || null });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, urlSearch, updateUrl]);

  const [pairForm, setPairForm] = useState<PairForm | null>(null);
  const [pairToDelete, setPairToDelete] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sendTarget, setSendTarget] = useState<ProductGapCandidate | 'bulk' | null>(null);
  const [ignoreTarget, setIgnoreTarget] = useState<ProductGapCandidate | null>(null);

  const pairsQuery = useQuery({
    queryKey: ['product-gap', 'pairs'],
    queryFn: () => productGapApi.pairs(),
    staleTime: 30_000,
  });

  const contextQuery = useQuery({
    queryKey: ['product-drafts', 'context'],
    queryFn: () => productDraftApi.context(),
    staleTime: 60_000,
  });

  const candidatesQuery = useQuery({
    queryKey: ['product-gap', 'candidates', selectedPairId, statusFilter],
    queryFn: () => productGapApi.candidates(
      selectedPairId === 'all' ? undefined : selectedPairId,
      statusFilter === 'all' ? undefined : statusFilter,
    ),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['product-gap'] });
  };

  const savePair = useMutation({
    mutationFn: (form: PairForm) => {
      const body = { dataSourceAId: Number(form.sourceId), dataSourceBId: Number(form.targetId) };
      return form.id === null
        ? productGapApi.createPair(body)
        : productGapApi.updatePair(form.id, { ...body, isActive: form.isActive });
    },
    onSuccess: (_, form) => {
      invalidate();
      setPairForm(null);
      toast.success(form.id === null
        ? (isTr ? 'ERP çifti eklendi.' : 'ERP pair created.')
        : (isTr ? 'ERP çifti güncellendi.' : 'ERP pair updated.'));
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const deletePair = useMutation({
    mutationFn: (id: number) => productGapApi.deletePair(id),
    onSuccess: () => {
      setSelectedPairId('all');
      setPairToDelete(null);
      invalidate();
      toast.success(isTr ? 'ERP çifti silindi.' : 'ERP pair deleted.');
    },
    onError: (e) => {
      setPairToDelete(null);
      toast.error(describeError(e));
    },
  });

  const scan = useMutation({
    mutationFn: () => productGapApi.scan(selectedPairId === 'all' ? undefined : selectedPairId),
    onSuccess: (result) => {
      invalidate();
      toast.success(
        isTr
          ? `${result.pairsScanned} çift tarandı · ${result.candidatesFound} yeni · ${result.candidatesResolved} çözüldü`
          : `${result.pairsScanned} pairs scanned · ${result.candidatesFound} new · ${result.candidatesResolved} resolved`,
      );
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const sendOne = useMutation({
    mutationFn: ({ id, options }: { id: number; options: SendProductGapOptions }) => productGapApi.send(id, options),
    onSuccess: (result) => {
      invalidate();
      setSendTarget(null);
      if (result.success) toast.success(isTr ? 'Ürün karşı ERP kuyruğuna gönderildi.' : 'Product queued to the target ERP.');
      else toast.error(result.error ?? (isTr ? 'Gönderilemedi.' : 'Send failed.'));
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const sendBulk = useMutation({
    mutationFn: ({ ids, includeImages }: { ids: number[]; includeImages: boolean }) =>
      productGapApi.sendBulk(ids, includeImages),
    onSuccess: (results) => {
      invalidate();
      setSelectedIds(new Set());
      setSendTarget(null);
      const failed = results.filter((r) => !r.success);
      const ok = results.length - failed.length;
      if (ok > 0) toast.success(`${ok} ${isTr ? 'ürün gönderildi.' : 'products sent.'}`);
      // Sunucu her adayı tek tek işler; ilk hatayı göstermek nedeni açıklar,
      // hepsini toast'lamak ekranı doldururdu.
      if (failed.length > 0) {
        toast.error(`${failed.length} ${isTr ? 'gönderim başarısız' : 'sends failed'}: ${failed[0].error ?? ''}`);
      }
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const ignore = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => productGapApi.ignore(id, reason),
    onSuccess: () => {
      invalidate();
      setIgnoreTarget(null);
      toast.success(isTr ? 'Ürün yok sayıldı.' : 'Product ignored.');
    },
    onError: (e) => toast.error(describeError(e)),
  });

  // "{ConnectorType} {Mağaza} ({Ülke})" — ör. "Sentos StoreA (TR)", "Base StoreB (UK)".
  // Tamamen dinamik: yeni bir ERP hesabı (DataSource) eklendiğinde kod değişmeden belirir.
  // Ülke ETİKETTE GÖRÜNÜR çünkü seçim artık ülkeye bağlı (aşağıdaki filtreye bakın).
  const dataSourceOptions = useMemo(() => {
    const stores = contextQuery.data?.stores ?? [];
    return stores.flatMap((store) =>
      store.erpSources.map((source) => ({
        value: String(source.id),
        label: source.country ? `${source.connectorType} ${store.name} (${source.country})` : `${source.connectorType} ${store.name}`,
        country: source.country ?? '',
      })),
    );
  }, [contextQuery.data]);

  // FARKLI ÜLKE SEÇİLEMEZ. Eşleştirme yalnızca SKU/barkoda bakıyor; TR bir hesapla UK bir
  // hesap (Base) eşlenince UK kataloğu TR mağazasında "eksik ürün" olarak listeleniyor ve
  // panel İngilizce ürünlerle doluyordu. Backend de aynı kuralı uyguluyor (çift kurulurken
  // ve tararken) — burada engellemek, kullanıcıya hatayı yemeden önce göstermek içindir.
  const sourceCountry = useMemo(
    () => dataSourceOptions.find((o) => o.value === String(pairForm?.sourceId ?? ''))?.country ?? '',
    [dataSourceOptions, pairForm?.sourceId],
  );

  // Ülkesi girilmemiş eski kayıtlar listede KALIR — veri eksikliği seçimi tamamen
  // engellememeli (backend de aynı istisnayı tanıyor).
  const targetOptions = useMemo(
    () => (sourceCountry
      ? dataSourceOptions.filter((o) => !o.country || o.country === sourceCountry)
      : dataSourceOptions),
    [dataSourceOptions, sourceCountry],
  );

  const pairs = useMemo(() => pairsQuery.data ?? [], [pairsQuery.data]);
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data]);
  const activePair = selectedPairId === 'all' ? null : pairs.find((p) => p.id === selectedPairId) ?? null;

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    if (!query) return candidates;
    return candidates.filter((c) =>
      `${c.productName} ${c.productSku ?? ''} ${c.productBarcode ?? ''}`.toLocaleLowerCase(locale).includes(query));
  }, [candidates, search, locale]);

  // Yalnızca "Bekliyor" durumundaki adaylar gönderilebilir (backend de bunu zorluyor) —
  // seçim de bu kümeyle sınırlı, aksi halde kullanıcı gönderilemeyecek satırları seçerdi.
  const sendableIds = useMemo(
    () => visible.filter((c) => c.status === ProductGapCandidateStatus.Pending).map((c) => c.id),
    [visible],
  );

  // Liste değiştiğinde (filtre/tarama/gönderim) ekranda olmayan eski seçimleri düşür.
  useEffect(() => {
    setSelectedIds((prev) => {
      const allowed = new Set(sendableIds);
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sendableIds]);

  const allSelected = sendableIds.length > 0 && selectedIds.size === sendableIds.length;
  const dispatchEnabled = contextQuery.data?.externalDispatchEnabled ?? true;

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pairOptions = [
    { value: 'all', label: isTr ? 'Tüm ERP çiftleri' : 'All ERP pairs' },
    ...pairs.map((pair) => ({
      value: String(pair.id),
      label: `${pair.dataSourceAName} ↔ ${pair.dataSourceBName}`,
      sublabel: pair.isActive ? undefined : (isTr ? 'pasif' : 'inactive'),
    })),
  ];

  const statusOptions = [
    { value: String(ProductGapCandidateStatus.Pending), label: isTr ? 'Bekleyen' : 'Pending' },
    { value: String(ProductGapCandidateStatus.Incomplete), label: isTr ? 'Eksik' : 'Incomplete' },
    { value: String(ProductGapCandidateStatus.Sent), label: isTr ? 'Gönderilen' : 'Sent' },
    { value: String(ProductGapCandidateStatus.Resolved), label: isTr ? 'Çözülen' : 'Resolved' },
    { value: String(ProductGapCandidateStatus.Ignored), label: isTr ? 'Yok sayılan' : 'Ignored' },
    { value: 'all', label: isTr ? 'Tüm durumlar' : 'All statuses' },
  ];

  const countLabel = search.trim()
    ? `${visible.length.toLocaleString(locale)} / ${candidates.length.toLocaleString(locale)}`
    : visible.length.toLocaleString(locale);

  const bulkTargetName = useMemo(() => {
    const names = new Set(visible.filter((c) => selectedIds.has(c.id)).map((c) => c.missingDataSourceName));
    return names.size === 1 ? [...names][0] : `${names.size} ${isTr ? 'farklı ERP' : 'different ERPs'}`;
  }, [visible, selectedIds, isTr]);

  if (tab === 'log') {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden text-xs">
        <TabBar tab={tab} setTab={setTab} isTr={isTr} />
        <DispatchLogTable isTr={isTr} />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden text-xs">
      <TabBar tab={tab} setTab={setTab} isTr={isTr} />

      {/* ── Ayar barı ────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--card)] px-4 py-2">
        <div data-tour="gaps-pair">
          <FilterSelect
            value={selectedPairId === 'all' ? 'all' : String(selectedPairId)}
            options={pairOptions}
            placeholder={isTr ? 'ERP çifti' : 'ERP pair'}
            onChange={(v) => setSelectedPairId(v === 'all' ? 'all' : Number(v))}
            minWidth={210}
            searchable={pairs.length > 6}
          />
        </div>

        {activePair && (
          <>
            <button
              type="button"
              title={isTr ? 'Çifti düzenle' : 'Edit pair'}
              onClick={() => setPairForm({
                id: activePair.id,
                sourceId: activePair.dataSourceAId,
                targetId: activePair.dataSourceBId,
                isActive: activePair.isActive,
              })}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)] cursor-pointer"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              title={isTr ? 'Çifti sil' : 'Delete pair'}
              onClick={() => setPairToDelete(activePair.id)}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[var(--fg-muted)] transition hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}

        <div data-tour="gaps-status">
          <FilterSelect
            value={String(statusFilter)}
            options={statusOptions}
            placeholder={isTr ? 'Durum' : 'Status'}
            onChange={(v) => setStatusFilter(v === 'all' ? 'all' : Number(v))}
            minWidth={130}
          />
        </div>

        <div data-tour="gaps-search" className="relative">
          <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTr ? 'SKU, barkod veya ürün ara…' : 'Search SKU, barcode or product…'}
            className="h-8 w-56 rounded-[4px] border border-[var(--border)] bg-[var(--card)] pl-6 pr-6 text-[11.5px] text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] transition hover:text-[var(--fg)] cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <span className="text-[11.5px] font-semibold text-[var(--fg)]">
          {countLabel} <span className="font-normal text-[var(--fg-muted)]">{isTr ? 'ürün' : 'products'}</span>
        </span>

        <div data-tour="gaps-actions" className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPairForm({ id: null, sourceId: '', targetId: '', isActive: true })}
            className={`${GHOST_BTN} h-8 px-2.5 text-[11.5px]`}
          >
            <Plus size={13} />
            <span>{isTr ? 'Yeni Çift' : 'New Pair'}</span>
          </button>
          <button
            type="button"
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className={`${PRIMARY_BTN} h-8 px-3 text-[11.5px]`}
          >
            <RefreshCw size={13} className={scan.isPending ? 'animate-spin' : ''} />
            <span>{isTr ? 'Şimdi Tara' : 'Scan Now'}</span>
          </button>
        </div>
      </div>

      {/* ── Çift ekle/düzenle satırı ─────────────────────────────────────── */}
      {pairForm && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-4 py-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {isTr ? 'Kaynak' : 'Source'}
          </span>
          <FilterSelect
            value={pairForm.sourceId === '' ? '' : String(pairForm.sourceId)}
            options={dataSourceOptions}
            placeholder={isTr ? 'Seçin…' : 'Select…'}
            onChange={(v) => {
              const nextSourceId = v === '' ? '' : Number(v);
              const nextCountry = dataSourceOptions.find((o) => o.value === v)?.country ?? '';
              const targetCountry = dataSourceOptions.find((o) => o.value === String(pairForm.targetId))?.country ?? '';
              // Kaynak değişince BAŞKA ÜLKEDEKİ hedef temizlenir; aksi halde ekranda
              // seçili görünen ama artık listede olmayan bir hedefle kaydet'e basılabilirdi.
              const keepTarget = !nextCountry || !targetCountry || nextCountry === targetCountry;
              setPairForm({ ...pairForm, sourceId: nextSourceId, targetId: keepTarget ? pairForm.targetId : '' });
            }}
            minWidth={180}
          />

          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {isTr ? 'Hedef' : 'Target'}
          </span>
          <FilterSelect
            value={pairForm.targetId === '' ? '' : String(pairForm.targetId)}
            options={targetOptions}
            placeholder={isTr ? 'Seçin…' : 'Select…'}
            onChange={(v) => setPairForm({ ...pairForm, targetId: v === '' ? '' : Number(v) })}
            minWidth={180}
          />

          {pairForm.id !== null && (
            <button
              type="button"
              onClick={() => setPairForm({ ...pairForm, isActive: !pairForm.isActive })}
              className="flex items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              <CustomCheckbox checked={pairForm.isActive} onChange={(v) => setPairForm({ ...pairForm, isActive: v })} />
              {isTr ? 'Otomatik taramada aktif' : 'Active in auto scan'}
            </button>
          )}

          <button
            type="button"
            disabled={!pairForm.sourceId || !pairForm.targetId || savePair.isPending}
            onClick={() => savePair.mutate(pairForm)}
            className={`${PRIMARY_BTN} h-8 px-3 text-[11.5px]`}
          >
            <Check size={13} />
            {isTr ? 'Kaydet' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setPairForm(null)}
            className={`${GHOST_BTN} h-8 w-8 justify-center px-0`}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ── Seçim barı ───────────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-4 py-2">
          <span className="text-[11.5px] font-semibold text-[var(--fg)]">
            {selectedIds.size} {isTr ? 'ürün seçildi' : 'products selected'}
          </span>
          <button
            type="button"
            disabled={sendBulk.isPending}
            onClick={() => setSendTarget('bulk')}
            className={`${PRIMARY_BTN} h-7 px-2.5 text-[11px]`}
          >
            <Send size={12} />
            {isTr ? 'Seçilenleri Gönder' : 'Send Selected'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-[11px] font-medium text-[var(--fg-muted)] underline-offset-2 transition hover:underline cursor-pointer"
          >
            {isTr ? 'Seçimi temizle' : 'Clear selection'}
          </button>
        </div>
      )}

      {/* ── Sonuçlar ─────────────────────────────────────────────────────── */}
      <div data-tour="gaps-table" className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[var(--card)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)] shadow-[inset_0_-1px_0_var(--border-soft)]">
            <tr>
              <th className="w-9 px-3 py-2.5">
                <CustomCheckbox
                  checked={allSelected}
                  disabled={sendableIds.length === 0}
                  onChange={() => setSelectedIds(allSelected ? new Set() : new Set(sendableIds))}
                />
              </th>
              <th className="px-3 py-2.5">{isTr ? 'Ürün' : 'Product'}</th>
              <th className="px-3 py-2.5">{isTr ? 'Kaynak' : 'Source'}</th>
              <th className="px-3 py-2.5">{isTr ? 'Hedef' : 'Target'}</th>
              <th className="px-3 py-2.5">{isTr ? 'Eşleşme' : 'Match'}</th>
              <th className="px-3 py-2.5">{isTr ? 'Durum' : 'Status'}</th>
              <th className="px-3 py-2.5 text-right">{isTr ? 'İşlem' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {candidatesQuery.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[var(--fg-muted)]">
                  {isTr ? 'Yükleniyor…' : 'Loading…'}
                </td>
              </tr>
            )}
            {!candidatesQuery.isLoading && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[var(--fg-muted)]">
                  {search.trim()
                    ? (isTr ? 'Aramaya uyan ürün yok.' : 'No product matches the search.')
                    : (isTr ? 'Kayıt yok. “Şimdi Tara” ile kontrol edin.' : 'No records. Try “Scan Now”.')}
                </td>
              </tr>
            )}
            {visible.map((c: ProductGapCandidate) => {
              const status = candidateStatusLabel(c.status, isTr);
              const dispatch = dispatchStatusLabel(c.dispatchStatus, isTr);
              const canSend = c.status === ProductGapCandidateStatus.Pending;
              // Eksik aday gönderilemez ama "Düzelt" ile tamamlanıp gönderilebilir.
              const needsFix = c.status === ProductGapCandidateStatus.Incomplete;
              // Gönderildi ama dış kuyrukta patladı: düzeltme yayınlandığında tekrar
              // denenebilmeli, aksi halde satır kalıcı olarak "Hata"da kilitli kalıyor.
              const canRetry = c.status === ProductGapCandidateStatus.Sent && c.dispatchError !== null;
              const checked = selectedIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`transition hover:bg-[var(--bg-subtle)]/40 ${checked ? 'bg-[var(--bg-subtle)]/60' : ''}`}
                >
                  <td className="px-3 py-2">
                    <CustomCheckbox checked={checked} disabled={!canSend} onChange={() => toggleSelected(c.id)} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-[var(--fg)]">{c.productName}</div>
                    <div className="font-mono text-[10.5px] text-[var(--fg-muted)]">
                      {c.productSku || c.productBarcode || '—'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[11.5px] text-[var(--fg)]">{c.existingDataSourceName}</td>
                  <td className="px-3 py-2 text-[11.5px] text-[var(--fg)]">{c.missingDataSourceName}</td>
                  <td className="px-3 py-2 text-[11px] text-[var(--fg-muted)]">{matchTypeLabel(c.matchType, isTr)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col items-start gap-1">
                      <span className={`inline-flex rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold ${status.className}`}>
                        {status.label}
                      </span>
                      {dispatch && (
                        <span
                          title={c.dispatchError ?? undefined}
                          className={`inline-flex rounded-[4px] px-1.5 py-0.5 text-[9.5px] font-semibold ${dispatch.className}`}
                        >
                          {dispatch.label}
                        </span>
                      )}
                      {/* Hata metni tooltip'te saklı kalmasın: sebebi görmek için fareyle
                          beklemek ya da DB'ye bakmak gerekiyordu. */}
                      {c.dispatchError && (
                        <span className="max-w-[260px] text-[10px] leading-snug text-rose-500">
                          {c.dispatchError}
                        </span>
                      )}
                      {c.dispatchExternalId && (
                        <span className="font-mono text-[10px] text-[var(--fg-muted)]">
                          {isTr ? 'ERP kaydı' : 'ERP record'} #{c.dispatchExternalId}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {/* ERP'den silme "Gönderilenler" sekmesinde: silinecek kaydın ne zaman,
                        kim tarafından, hangi bilgilerle gittiği orada görünüyor. */}
                    {canRetry && (
                      <button
                        type="button"
                        onClick={() => setSendTarget(c)}
                        className={`${GHOST_BTN} h-7 px-2 text-[11px]`}
                      >
                        <RefreshCw size={11} />
                        {isTr ? 'Tekrar Gönder' : 'Retry'}
                      </button>
                    )}
                    {needsFix && (
                      <button
                        type="button"
                        onClick={() => setSendTarget(c)}
                        title={c.missingFields.map((f) => MISSING_FIELD_LABELS[f]?.tr ?? f).join(', ')}
                        className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-orange-500/50 bg-orange-500/10 px-2 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-500/20 cursor-pointer dark:text-orange-400"
                      >
                        <Pencil size={11} />
                        {isTr ? 'Düzelt' : 'Fix'}
                      </button>
                    )}
                    {canSend && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSendTarget(c)}
                          className={`${PRIMARY_BTN} h-7 px-2 text-[11px]`}
                        >
                          <Send size={11} />
                          {isTr ? 'Gönder' : 'Send'}
                        </button>
                        <button
                          type="button"
                          title={isTr ? 'Yok say' : 'Ignore'}
                          onClick={() => setIgnoreTarget(c)}
                          className={`${GHOST_BTN} h-7 w-7 justify-center px-0`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Diyaloglar ───────────────────────────────────────────────────── */}
      {sendTarget && (
        <SendProductDialog
          candidate={sendTarget === 'bulk' ? null : sendTarget}
          bulkCount={sendTarget === 'bulk' ? selectedIds.size : undefined}
          targetName={sendTarget === 'bulk' ? bulkTargetName : sendTarget.missingDataSourceName}
          dispatchEnabled={dispatchEnabled}
          dispatchNotice={contextQuery.data?.dispatchNotice}
          busy={sendOne.isPending || sendBulk.isPending}
          isTr={isTr}
          onClose={() => setSendTarget(null)}
          onSend={(options) => {
            if (sendTarget === 'bulk') sendBulk.mutate({ ids: [...selectedIds], includeImages: options.includeImages });
            else sendOne.mutate({ id: sendTarget.id, options });
          }}
        />
      )}

      {ignoreTarget && (
        <IgnoreReasonDialog
          productName={ignoreTarget.productName}
          busy={ignore.isPending}
          isTr={isTr}
          onClose={() => setIgnoreTarget(null)}
          onConfirm={(reason) => ignore.mutate({ id: ignoreTarget.id, reason })}
        />
      )}

      <ConfirmDialog
        open={pairToDelete !== null}
        title={isTr ? 'ERP çiftini sil' : 'Delete ERP pair'}
        description={isTr
          ? 'Bu çift ve ona ait tüm tarama sonuçları silinir. Ürünler etkilenmez, tarama tekrar tanımlanabilir.'
          : 'This pair and all of its scan results will be deleted. Products are not affected.'}
        confirmLabel={isTr ? 'Sil' : 'Delete'}
        cancelLabel={isTr ? 'Vazgeç' : 'Cancel'}
        onConfirm={() => { if (pairToDelete !== null) deletePair.mutate(pairToDelete); }}
        onCancel={() => setPairToDelete(null)}
      />
    </div>
  );
}

// İki görünüm arasında geçiş: "Adaylar" ne gönderilecek, "Gönderilenler" ne gönderildi.
function TabBar({
  tab, setTab, isTr,
}: { tab: 'candidates' | 'log'; setTab: (t: 'candidates' | 'log') => void; isTr: boolean }) {
  const items: Array<{ key: 'candidates' | 'log'; label: string }> = [
    { key: 'candidates', label: isTr ? 'Adaylar' : 'Candidates' },
    { key: 'log', label: isTr ? 'Gönderilenler' : 'Sent' },
  ];

  return (
    <div data-tour="gaps-tabs" className="flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--card)] px-4 pt-2">
      <div className="flex items-center gap-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`h-8 rounded-t-[4px] border-b-2 px-3 text-[11.5px] font-semibold transition cursor-pointer ${
              tab === item.key
                ? 'border-zinc-600 text-[var(--fg)]'
                : 'border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
