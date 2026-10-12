'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Play, X } from 'lucide-react';
import { palette } from '../shared/design';
import {
  sonarImports,
  sonarMatches,
  sonarSites,
  type ExcelSupplierEntry,
  type ImportBatchDto,
  type MatchReviewItemDto,
  type MatchRunSummary,
  type ScoreSignalDto,
  type SupplierSiteDto,
} from '../../lib/api/sonar';
import {
  Button, Card, Empty, ErrorNote, Page, PageHeader, Stat, formatPrice,
} from './shared';

export function MatchReviewTab() {
  const [sites, setSites] = useState<SupplierSiteDto[]>([]);
  const [batches, setBatches] = useState<ImportBatchDto[]>([]);
  const [siteId, setSiteId] = useState<number | ''>('');
  const [batchId, setBatchId] = useState<number | ''>('');

  const [queue, setQueue] = useState<MatchReviewItemDto[] | null>(null);
  const [summary, setSummary] = useState<MatchRunSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [s, b] = await Promise.all([sonarSites.list(), sonarImports.list()]);
        setSites(s);
        setBatches(b);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Veri alınamadı.');
      }
    })();
  }, []);

  const loadQueue = useCallback(async (batch: number) => {
    try {
      setError(null);
      setQueue(await sonarMatches.reviewQueue(batch));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İnceleme kuyruğu alınamadı.');
    }
  }, []);

  useEffect(() => {
    if (batchId !== '') void loadQueue(batchId);
  }, [batchId, loadQueue]);

  const runMatch = async () => {
    if (siteId === '' || batchId === '') return;
    setBusy(true);
    setError(null);
    try {
      setSummary(await sonarMatches.run(batchId, siteId));
      await loadQueue(batchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eşleştirme çalıştırılamadı.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (item: MatchReviewItemDto, approved: boolean) => {
    try {
      await sonarMatches.review(item.matchResultId, approved);
      setQueue((q) => q?.filter((i) => i.matchResultId !== item.matchResultId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Karar kaydedilemedi.');
    }
  };

  return (
    <Page>
      <PageHeader
        dataTour="sonar-review-header"
        title="Eşleştirme İncelemesi"
        description="Eşleştirme siteye HİÇ gitmez; kalıcı katalogla yapılır. İkinci Excel saniyeler içinde eşleşir."
      />

      {error && <ErrorNote message={error} />}

      <Card dataTour="sonar-review-picker">
        <div className="flex flex-wrap items-end gap-3">
          <Picker label="Excel dosyası" value={batchId} onChange={setBatchId}
            options={batches.map((b) => ({ value: b.id, label: b.fileName }))} />
          <Picker label="Tedarikçi sitesi" value={siteId} onChange={setSiteId}
            options={sites.map((s) => ({ value: s.id, label: s.displayName }))} />

          <Button
            variant="primary"
            onClick={() => void runMatch()}
            disabled={siteId === '' || batchId === '' || busy}
          >
            <Play size={13} /> {busy ? 'Eşleştiriliyor…' : 'Eşleştir'}
          </Button>
        </div>
      </Card>

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-tour="sonar-review-stats">
          <Stat label="İncelenen satır" value={summary.rowsConsidered} />
          <Stat label="Otomatik" value={summary.autoAccepted} tone="ok" />
          <Stat label="İncelemede" value={summary.needsReview} tone="warn" />
          <Stat label="Aday yok" value={summary.noCandidate} />
          <Stat label="Süre" value={`${summary.elapsedMs} ms`} />
        </div>
      )}

      {queue?.length === 0 && (
        <Empty title="İnceleme kuyruğu boş"
          hint="Belirsiz ya da eşiğin altında kalan eşleşme yok." />
      )}

      {queue && queue.length > 0 && (
        <div className="flex flex-col gap-2" data-tour="sonar-review-queue">
          {queue.map((item) => (
            <ReviewRow key={item.matchResultId} item={item}
              onApprove={() => void decide(item, true)}
              onReject={() => void decide(item, false)} />
          ))}
        </div>
      )}
    </Page>
  );
}

function Picker({ label, value, onChange, options }: {
  label: string;
  value: number | '';
  onChange: (value: number | '') => void;
  options: { value: number; label: string }[];
}) {
  return (
    <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
      <span className="text-xs font-medium" style={{ color: palette.textLabel }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="h-8 rounded-[4px] px-2.5 text-xs outline-none"
        style={{
          background: palette.inputBg,
          border: `1px solid ${palette.border}`,
          color: palette.text,
        }}
      >
        <option value="">Seçin…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function ReviewRow({ item, onApprove, onReject }: {
  item: MatchReviewItemDto;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        {/* Aranan: Excel satırı */}
        <div className="min-w-0 flex-1">
          <div className="text-xs" style={{ color: palette.textFaint }}>
            Satır {item.rowNumber} · OEM {item.queriedOem}
          </div>
          <div className="mt-0.5 font-medium" style={{ color: palette.textStrong }}>
            {item.productName}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: palette.textMuted }}>
            {[item.vehicleMake, item.vehicleModel, item.partType]
              .filter(Boolean).join(' · ') || '—'}
          </div>
        </div>

        {/* Bulunan: tedarikçi ürünü */}
        <div className="min-w-0 flex-1">
          <div className="text-xs" style={{ color: palette.textFaint }}>Bulunan</div>
          <div className="mt-0.5 font-medium" style={{ color: palette.textStrong }}>
            {item.supplierTitle ?? '—'}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs"
            style={{ color: palette.textMuted }}>
            <span>{item.supplierCode ?? 'kod yok'}</span>
            <span>{formatPrice(item.price, item.currency)}</span>
            {item.stockQty !== null && <span>{item.stockQty} adet</span>}
            {item.detailUrl && (
              <a href={item.detailUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1"
                style={{ color: palette.accent }}>
                Ürün <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onApprove}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{ background: 'rgba(34,197,94,0.15)', color: palette.success }}>
            <Check size={13} /> Onayla
          </button>
          <button type="button" onClick={onReject}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            style={{ border: `1px solid ${palette.border}`, color: palette.textMuted }}>
            <X size={13} /> Reddet
          </button>
        </div>
      </div>

      <ExcelSupplierStrip suppliers={item.excelSuppliers} />

      <Reasoning reason={item.reason} breakdown={item.breakdown} score={item.score} />
    </Card>
  );
}

/**
 * Excel'de HAZIR gelen diğer tedarikçilerin verisi.
 *
 * Karşılaştırmanın tamamı burada: bulunan ürünü boşlukta değil, kullanıcının
 * zaten bildiği tedarikçi verisinin YANINDA görmek kararı saniyeler içinde
 * verdirir. Fiyat ham metin gösterilir -- "1.240,50" mi "1,240.50" mi olduğunu
 * tahmin edip 1000 kat sapmaktansa dosyadaki haliyle göstermek dürüsttür.
 */
function ExcelSupplierStrip({ suppliers }: { suppliers: ExcelSupplierEntry[] }) {
  if (suppliers.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {suppliers.map((supplier) => (
        <div
          key={supplier.supplier}
          className="flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5"
          style={{ background: palette.chipBg, border: `1px solid ${palette.borderSoft}` }}
        >
          <span className="text-xs font-medium" style={{ color: palette.textStrong }}>
            {supplier.supplier}
          </span>
          <span className="flex flex-wrap gap-x-2 text-xs" style={{ color: palette.textMuted }}>
            <span>{supplier.code ?? 'kod yok'}</span>
            {supplier.price && (
              <span>{supplier.price}{supplier.currency ? ` ${supplier.currency}` : ''}</span>
            )}
            {supplier.availability && <span>{supplier.availability}</span>}
          </span>
          {supplier.productName && (
            <span className="max-w-xs truncate text-xs" style={{ color: palette.textFaint }}>
              {supplier.productName}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Skorun GEREKÇESİ.
 *
 * Ham sayı tek başına karar verdirmez: "0.87" kullanıcıya hiçbir şey söylemez.
 * "OEM tam eşleşti ama iki farklı ürün aynı güçte" söyler. Bu yüzden ekranda
 * asıl yer kaplayan şey sinyal dökümüdür, skor değil.
 */
function Reasoning({ reason, breakdown, score }: {
  reason: string | null;
  breakdown: ScoreSignalDto[];
  score: number | null;
}) {
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: palette.borderSoft }}>
      {reason && (
        <div className="mb-2 text-xs" style={{ color: palette.textMuted }}>
          <strong style={{ color: palette.text }}>Neden incelemede: </strong>{reason}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {breakdown.map((signal, index) => (
          <span
            key={`${signal.rule}-${index}`}
            title={signal.explanation}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
            style={{
              background: palette.chipBg,
              color: signal.delta >= 0 ? palette.text : palette.danger,
            }}
          >
            {signal.explanation}
            <span className="tabular-nums" style={{ color: palette.textFaint }}>
              {signal.delta >= 0 ? '+' : ''}{signal.delta.toFixed(2)}
            </span>
          </span>
        ))}

        {score !== null && (
          <span className="ml-auto text-xs tabular-nums" style={{ color: palette.textFaint }}>
            Skor {score.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
