'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, RefreshCw, Search } from 'lucide-react';
import { palette } from '../shared/design';
import {
  sonarOems,
  type OemDetailDto,
  type OemEntryDto,
  type OemLedgerPage,
} from '../../lib/api/sonar';
import {
  Badge, Button, Card, Empty, ErrorNote, Page, PageHeader, Toolbar,
  formatPrice, formatRelative,
} from './shared';

const PAGE_SIZE = 50;

/**
 * OEM sözlüğü paneli.
 *
 * Sistemin gördüğü her numaranın kalıcı kimliği. Excel yüklemesi ve tarama
 * otomatik besler; kullanıcı düzeltirse o kayıt bir daha otomatik akışla
 * ezilmez — yoksa emeği bir sonraki yüklemede sessizce kaybolurdu.
 */
export function OemsTab() {
  const [search, setSearch] = useState('');
  const [onlyWithSupplier, setOnlyWithSupplier] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OemLedgerPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openOem, setOpenOem] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await sonarOems.search({
        search: search.trim() || undefined,
        onlyWithSupplier: onlyWithSupplier || undefined,
        page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OEM listesi yüklenemedi.');
    }
  }, [search, onlyWithSupplier, page]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  return (
    <Page>
      <PageHeader
        dataTour="sonar-oems-header"
        title="OEM Sözlüğü"
        description="Sistemin gördüğü her numara burada birikir. Excel ve taramalar otomatik besler; sizin düzelttiğiniz kayıtlar bir daha üzerine yazılmaz."
        actions={
          <Button onClick={() => void load()}>
            <RefreshCw size={13} /> Yenile
          </Button>
        }
      />

      <Toolbar dataTour="sonar-oems-toolbar">
        <div className="flex min-w-[220px] flex-1 items-center gap-2">
          <Search size={14} style={{ color: palette.textFaint }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Numara ya da ürün adı — 701 941 141 A da yazabilirsiniz"
            className="w-full bg-transparent text-xs outline-none"
            style={{ color: palette.text }}
          />
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs"
          style={{ color: palette.textMuted }}>
          <input
            type="checkbox"
            checked={onlyWithSupplier}
            onChange={(e) => { setOnlyWithSupplier(e.target.checked); setPage(1); }}
          />
          Yalnız tedarikçide bulunanlar
        </label>
      </Toolbar>

      {error && <ErrorNote message={error} />}

      {data && data.items.length === 0 && (
        <Empty
          title="Henüz kayıtlı OEM yok"
          hint="Excel yükleyin ya da bir tedarikçi sitesi tarayın; numaralar buraya kendiliğinden düşer."
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="flex flex-col gap-2" data-tour="sonar-oems-list">
            {data.items.map((entry) => (
              <OemRow
                key={entry.id}
                entry={entry}
                isOpen={openOem === entry.normalizedOem}
                onToggle={() => setOpenOem(
                  openOem === entry.normalizedOem ? null : entry.normalizedOem)}
                onCurated={() => void load()}
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs"
            style={{ color: palette.textMuted }}>
            <span className="tabular-nums">
              {data.totalCount} numara · sayfa {data.page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Önceki
              </Button>
              <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </Button>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function OemRow({ entry, isOpen, onToggle, onCurated }: {
  entry: OemEntryDto;
  isOpen: boolean;
  onToggle: () => void;
  onCurated: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium" style={{ color: palette.textStrong }}>
              {entry.rawOem ?? entry.normalizedOem}
            </span>
            {entry.isCurated && <Badge tone="ok">Düzeltildi</Badge>}
            {entry.supplierCount > 0
              ? <Badge tone="info">{entry.supplierCount} tedarikçi</Badge>
              : <Badge tone="neutral">Tedarikçi yok</Badge>}
          </div>

          <div className="mt-1 truncate text-sm" style={{ color: palette.text }}>
            {entry.displayName ?? '—'}
          </div>

          <div
            className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"
            style={{ color: palette.textFaint }}
          >
            {[entry.vehicleMake, entry.vehicleModel, entry.partType]
              .filter(Boolean).map((x) => <span key={x}>{x}</span>)}
            <span>{entry.excelRowCount} Excel satırı</span>
            <span>Son görülme: {formatRelative(entry.lastSeenAt)}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-label="Düzelt"
          className="rounded-lg p-2"
          style={{ color: palette.textMuted }}
        >
          <Pencil size={14} />
        </button>
      </div>

      {editing && (
        <CurateForm
          entry={entry}
          onDone={() => { setEditing(false); onCurated(); }}
        />
      )}

      {isOpen && <SupplierLines normalizedOem={entry.normalizedOem} />}
    </Card>
  );
}

/** Bir numaranın hangi tedarikçide kaça ve kaç adet olduğu. */
function SupplierLines({ normalizedOem }: { normalizedOem: string }) {
  const [detail, setDetail] = useState<OemDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const result = await sonarOems.detail(normalizedOem);
        if (alive) setDetail(result);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Detay alınamadı.');
      }
    })();
    return () => { alive = false; };
  }, [normalizedOem]);

  if (error) return <ErrorNote message={error} />;
  if (!detail) return <p className="mt-3 text-xs" style={{ color: palette.textFaint }}>Yükleniyor…</p>;

  if (detail.suppliers.length === 0) {
    return (
      <p className="mt-3 text-xs" style={{ color: palette.textFaint }}>
        Bu numara henüz hiçbir tedarikçide bulunmadı. Tarama yapılmamış olabilir —
        &quot;bulunmadı&quot; ile &quot;yok&quot; aynı şey değildir.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {detail.suppliers.map((line) => (
        <div
          key={`${line.siteId}-${line.supplierCode}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-xs"
          style={{ background: palette.chipBg }}
        >
          <span className="font-medium" style={{ color: palette.textStrong }}>
            {line.siteName}
          </span>
          <span className="font-mono" style={{ color: palette.text }}>{line.supplierCode}</span>
          <span style={{ color: palette.text }}>{formatPrice(line.price, line.currency)}</span>
          {line.stockQty !== null && <span style={{ color: palette.textMuted }}>{line.stockQty} adet</span>}
          {line.stockState && <span style={{ color: palette.textMuted }}>{line.stockState}</span>}
          <span className="ml-auto" style={{ color: palette.textFaint }}>
            {formatRelative(line.scrapedAt)} doğrulandı
          </span>
        </div>
      ))}
    </div>
  );
}

function CurateForm({ entry, onDone }: { entry: OemEntryDto; onDone: () => void }) {
  const [form, setForm] = useState({
    displayName: entry.displayName ?? '',
    vehicleMake: entry.vehicleMake ?? '',
    vehicleModel: entry.vehicleModel ?? '',
    partType: entry.partType ?? '',
    notes: entry.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await sonarOems.curate(entry.id, form);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-3 flex flex-col gap-2 rounded-lg p-3"
      style={{ background: palette.inputBg, border: `1px solid ${palette.borderSoft}` }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Ürün adı" value={form.displayName}
          onChange={(v) => setForm((f) => ({ ...f, displayName: v }))} />
        <Field label="Parça tipi" value={form.partType}
          onChange={(v) => setForm((f) => ({ ...f, partType: v }))} />
        <Field label="Araç marka" value={form.vehicleMake}
          onChange={(v) => setForm((f) => ({ ...f, vehicleMake: v }))} />
        <Field label="Araç model" value={form.vehicleModel}
          onChange={(v) => setForm((f) => ({ ...f, vehicleModel: v }))} />
      </div>

      <Field label="Not" value={form.notes}
        onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />

      {error && <ErrorNote message={error} />}

      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-xs" style={{ color: palette.textFaint }}>
          Kaydettiğinizde bu numara otomatik akışla bir daha değiştirilmez.
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          style={{ background: palette.accent, color: palette.textOnFill }}
        >
          <Check size={13} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: palette.textMuted }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-3 py-1.5 text-xs"
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          color: palette.text,
        }}
      />
    </label>
  );
}
