'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { CalendarDays, Check, ChevronDown, ChevronRight, Package, Pencil, Ship, Trash2, Upload, X, Trash, Play, Unlink } from 'lucide-react';
import type { BaseTrackBatch, BaseTrackImportResult } from '@/lib/api';
import {
  useArriveBatch, useBaseTrackBatches, useBaseTrackEvents, useBaseTrackLinkedOrders, useBaseTrackSettings,
  useBaseTrackSummary, useDeleteRoom, useImportDispatch, useImportOrders, useRenameRoom,
  useTransitionBatch,
} from '@/hooks/basetrack/useBaseTrack';
import { STATE_META, STATES, StateChip, formatDate, tdStyle, thStyle, ErrorState } from './shared';
import {
  palette, softTint, card, btnGhost, btnPrimary, input, select, icon,
  pageShell, pageInner, pageHeading, pageSubtitle,
} from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { formatDateTime } from '../../lib/format';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { useMobile } from '../../hooks/useMobile';
import { formatOrderNumberWithHash } from '../../utils/orderNumber';

// Geri bildirim tek bir useFeedback örneğinden gelir ve alt bileşenlere prop olarak
// iner — her satırın kendi toast yığınını açması üst üste binmiş bildirimler yaratırdı.
interface Feedback {
  notify: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
  confirm: (options: {
    title: string; body?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean;
  }) => Promise<boolean>;
}

export function PipelineTab() {
  const isMobile = useMobile();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [collapsedRooms, setCollapsedRooms] = useState<Set<string>>(new Set());
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [importResult, setImportResult] = useState<{ label: string; result: BaseTrackImportResult } | null>(null);
  const { notify, confirm, feedback } = useFeedback();
  const fb: Feedback = { notify, confirm };

  const summary = useBaseTrackSummary();
  const settings = useBaseTrackSettings();
  const depotLabel = settings.data?.depotLabel ?? 'DEMO UK';
  const batches = useBaseTrackBatches({ search, state: stateFilter || undefined, unmatchedOnly });

  const rooms = useMemo(() => {
    const map = new Map<string, BaseTrackBatch[]>();
    for (const b of batches.data ?? []) {
      const arr = map.get(b.orderDate) ?? [];
      arr.push(b);
      map.set(b.orderDate, arr);
    }
    return [...map.entries()].map(([date, list]) => ({ date, list }));
  }, [batches.data]);

  const toggleRoom = (date: string) =>
    setCollapsedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });

  const importOrders = useImportOrders();
  const importDispatch = useImportDispatch();
  const renameRoom = useRenameRoom();
  const deleteRoom = useDeleteRoom();
  const ordersInput = useRef<HTMLInputElement>(null);
  const dispatchInput = useRef<HTMLInputElement>(null);

  const handleDeleteRoom = async (date: string, count: number) => {
    const ok = await confirm({
      title: `${formatDate(date)} odası silinsin mi?`,
      body: `${count} sipariş kaydı ve geçmişi kalıcı olarak silinecek. TR depo stoğu etkilenmez (fiziksel sayım ayrı). Bu işlem geri alınamaz.`,
      confirmLabel: 'Odayı Sil',
      danger: true,
    });
    if (!ok) return;

    deleteRoom.mutate(date, {
      onSuccess: () => {
        notify.success(`${formatDate(date)} odası silindi.`);
        setSelectedRooms((prev) => {
          const next = new Set(prev);
          next.delete(date);
          return next;
        });
      },
      onError: (e) => notify.error((e as Error).message),
    });
  };

  // Toplu silme tek tek istek atar (toplu uç yok); sonuç tek bildirimde özetlenir.
  const deleteManyRooms = async (dates: readonly string[]) => {
    setBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;
    for (const date of dates) {
      try {
        await deleteRoom.mutateAsync(date);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setSelectedRooms(new Set());
    setBulkDeleting(false);

    if (successCount === 0) notify.error(`Silme işlemi başarısız. ${failCount} hata oluştu.`);
    else if (failCount > 0) notify.info(`${successCount} oda silindi, ${failCount} hata oluştu.`);
    else notify.success(`${successCount} oda silindi.`);
  };

  const handleBulkDelete = async () => {
    if (selectedRooms.size === 0) return;
    const ok = await confirm({
      title: `Seçilen ${selectedRooms.size} oda silinsin mi?`,
      body: 'Odalar, içlerindeki tüm sipariş kayıtları ve geçmişleri kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Seçilenleri Sil',
      danger: true,
    });
    if (ok) await deleteManyRooms(Array.from(selectedRooms));
  };

  const handleDeleteAll = async () => {
    if (rooms.length === 0) return;
    const ok = await confirm({
      title: 'Tüm odalar silinsin mi?',
      body: `Sevkiyat hattındaki ${rooms.length} oda ve içlerindeki tüm sipariş/geçmiş kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: 'Hepsini Sil',
      danger: true,
    });
    if (ok) await deleteManyRooms(rooms.map((r) => r.date));
  };

  const handleImport = (
    file: File | undefined,
    mutation: typeof importOrders,
    label: string,
  ) => {
    if (!file) return;
    mutation.mutate(file, {
      onSuccess: (r) => {
        const warn = r.warnings.length > 0 ? ` · ${r.warnings.length} uyarı` : '';
        notify.success(
          `${label}: ${r.totalRows} satır — ${r.created} yeni, ${r.updated} güncellendi, ` +
          `${r.unchanged} değişmedi, ${r.unmatched} eşleşmedi${warn}`,
        );
        // Toast tek satır — uyarı sayısı orada görünür ama İÇERİĞİ hiçbir yerde
        // gösterilmiyordu. Tam liste burada kalıcı bir kutuda kalır (kullanıcı kapatana/
        // yeni import yapana kadar).
        setImportResult({ label, result: r });
      },
      onError: (e) => notify.error(`${label} hatası: ${(e as Error).message}`),
    });
  };

  const summaryCards = [
    { key: 'TrDepot', qty: summary.data?.trDepotQty ?? 0, label: `${depotLabel} (Bekleyen)` },
    { key: 'InTransit', qty: summary.data?.inTransitQty ?? 0, label: 'Sevkiyat (Yolda)' },
    { key: 'UkDepot', qty: summary.data?.ukDepotQty ?? 0, label: 'UK Depo (Vardı)' },
  ];

  return (
    <div style={pageShell}>
      <div style={{ ...pageInner(1400), display: 'flex', flexDirection: 'column', gap: 16, padding: isMobile ? '12px 14px 48px' : undefined }}>
        <div data-tour="basetrack-pipeline-header">
          <h2 style={pageHeading}>Sevkiyat Hattı</h2>
          <p style={pageSubtitle}>
            Sipariş tarihine göre gruplanmış partiler — {depotLabel} deposundan UK deposuna kadar.
          </p>
        </div>

        {/* Özet kartları */}
        <div data-tour="basetrack-pipeline-summary" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {summaryCards.map(({ key, qty, label }) => (
            <div key={key} style={{ ...card, borderLeft: `3px solid ${STATE_META[key].color}` }}>
              <div style={{ fontSize: 12, color: palette.textMuted }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: STATE_META[key].color }}>{qty}</div>
            </div>
          ))}
          <div style={card}>
            <div style={{ fontSize: 12, color: palette.textMuted }}>Açık Batch</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: palette.textStrong }}>
              {summary.data?.openBatchCount ?? 0}
              {(summary.data?.unmatchedBatchCount ?? 0) > 0 && (
                <span style={{ fontSize: 12, color: palette.danger, marginLeft: 8 }}>
                  {summary.data!.unmatchedBatchCount} eşleşmemiş
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Araç çubuğu */}
        <div data-tour="basetrack-pipeline-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <input
            style={{ ...input, minWidth: 220, maxWidth: 300 }}
            placeholder="SKU / stok kodu / ürün ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* Native ok gizli, kendi chevron'umuz sağda — bkz. design.select */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              style={{ ...select, minWidth: 160 }}
            >
              <option value="">Tüm durumlar</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s === 'TrDepot' ? depotLabel : STATE_META[s].label}</option>
              ))}
            </select>
            <ChevronDown
              size={icon.md}
              strokeWidth={icon.stroke}
              style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: palette.textFaint }}
            />
          </div>

          {/* Eşleşmeyen filtresi — açıkken aksan rengiyle işaretlenir */}
          <button
            onClick={() => setUnmatchedOnly((v) => !v)}
            style={{
              ...btnGhost,
              borderColor: unmatchedOnly ? palette.accentBorder : palette.borderSoft,
              background: unmatchedOnly ? palette.accentSoft : 'transparent',
              color: unmatchedOnly ? palette.accent : palette.text,
            }}
          >
            <Unlink size={icon.md} strokeWidth={icon.stroke} />
            Sadece eşleşmeyenler
          </button>

          {selectedRooms.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{ ...btnGhost, color: palette.danger, borderColor: palette.danger }}
            >
              <Trash2 size={icon.md} strokeWidth={icon.stroke} />
              {bulkDeleting ? 'Siliniyor...' : `Sil (${selectedRooms.size})`}
            </button>
          )}
          {rooms.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={bulkDeleting}
              style={{ ...btnGhost, color: palette.danger }}
              title="Tüm sevkiyat odalarını sil"
            >
              <Trash size={icon.md} strokeWidth={icon.stroke} />
              Tümünü Sil
            </button>
          )}
          <div style={{ flex: 1 }} />
          <input
            ref={ordersInput} type="file" accept=".xlsx" hidden
            onChange={(e) => { handleImport(e.target.files?.[0], importOrders, 'Sipariş importu'); e.target.value = ''; }}
          />
          <input
            ref={dispatchInput} type="file" accept=".xlsx" hidden
            onChange={(e) => { handleImport(e.target.files?.[0], importDispatch, 'Sevkiyat importu'); e.target.value = ''; }}
          />
          <button
            style={btnPrimary}
            disabled={importOrders.isPending}
            onClick={() => ordersInput.current?.click()}
          >
            <Upload size={icon.md} strokeWidth={icon.stroke} />
            {importOrders.isPending ? 'Yükleniyor...' : 'Sipariş Excel'}
          </button>
          <button
            style={btnGhost}
            disabled={importDispatch.isPending}
            onClick={() => dispatchInput.current?.click()}
          >
            <Ship size={icon.md} strokeWidth={icon.stroke} />
            {importDispatch.isPending ? 'Yükleniyor...' : 'Yola Çıkan Excel'}
          </button>
        </div>

        {importResult && importResult.result.warnings.length > 0 && (
          <div style={{
            ...card, borderLeft: `3px solid ${palette.warning}`, fontSize: 12.5,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: palette.warningText }}>
                {importResult.label}: {importResult.result.warnings.length} uyarı
              </strong>
              <button onClick={() => setImportResult(null)} style={{ ...btnGhost, padding: '3px 9px', fontSize: 11.5 }}>Kapat</button>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: palette.textMuted }}>
              {importResult.result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Sevkiyat odaları — her sipariş tarihi kendi açılır paneli */}
        <div data-tour="basetrack-pipeline-rooms" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {batches.isError && <ErrorState />}
          {!batches.isError && batches.isLoading && (
            <div style={{ ...card, fontSize: 13, color: palette.textMuted }}>Yükleniyor...</div>
          )}
          {!batches.isError && !batches.isLoading && rooms.length === 0 && (
            <div style={{ ...card, fontSize: 13, color: palette.textMuted }}>
              Kayıt yok — önce sipariş Excel&apos;ini yükleyin.
            </div>
          )}
          {rooms.map(({ date, list }) => (
            <RoomPanel
              key={date}
              date={date}
              depotLabel={depotLabel}
              label={list[0]?.roomLabel ?? null}
              batches={list}
              expanded={!collapsedRooms.has(date)}
              isSelected={selectedRooms.has(date)}
              onToggleSelect={(checked) => {
                setSelectedRooms((prev) => {
                  const next = new Set(prev);
                  if (checked) next.add(date); else next.delete(date);
                  return next;
                });
              }}
              onToggle={() => toggleRoom(date)}
              onRename={(newLabel) => renameRoom.mutate({ date, label: newLabel })}
              onRequestDelete={() => { void handleDeleteRoom(date, list.length); }}
              expandedBatchId={expandedId}
              onToggleBatch={(id) => setExpandedId(expandedId === id ? null : id)}
              fb={fb}
            />
          ))}
        </div>
      </div>
      {feedback}
    </div>
  );
}

function RoomPanel({
  date, depotLabel, label, batches, expanded, isSelected, onToggleSelect, onToggle, onRename,
  onRequestDelete, expandedBatchId, onToggleBatch, fb,
}: {
  date: string;
  depotLabel: string;
  label: string | null;
  batches: BaseTrackBatch[];
  expanded: boolean;
  isSelected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onToggle: () => void;
  onRename: (label: string) => void;
  onRequestDelete: () => void;
  expandedBatchId: number | null;
  onToggleBatch: (id: number) => void;
  fb: Feedback;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const arrive = useArriveBatch();
  const transition = useTransitionBatch();

  const totalQty = batches.reduce((s, b) => s + b.orderedQty, 0);
  const sums = {
    TrDepot: batches.reduce((s, b) => s + b.qtyTrDepot, 0),
    InTransit: batches.reduce((s, b) => s + b.qtyInTransit, 0),
    UkDepot: batches.reduce((s, b) => s + b.qtyUkDepot, 0),
  };

  const title = label ?? formatDate(date);
  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
    color: palette.textMuted,
  };

  const saveRename = () => {
    onRename(draft.trim());
    setEditing(false);
  };

  // Toplu UK Varış + Base Aksiyonlama
  const handleBulkArrive = async () => {
    const transitBatches = batches.filter((b) => b.qtyInTransit > 0);
    if (transitBatches.length === 0) return;

    const ok = await fb.confirm({
      title: 'UK Varış — Toplu Base Push',
      body: `Bu odadaki yolda olan ${transitBatches.length} sipariş UK depoya ulaştırılıp Base stoğuna eklenecek. Bu işlem geri alınamaz.`,
      confirmLabel: 'Hepsini Varış + Base Yap',
    });
    if (!ok) return;

    setBulkProcessing(true);
    let success = 0;
    let fail = 0;

    for (const b of transitBatches) {
      try {
        await arrive.mutateAsync({ batchId: b.id });
        success++;
      } catch {
        fail++;
      }
    }

    setBulkProcessing(false);
    if (success === 0) fb.notify.error(`Toplu varış işlemi başarısız. ${fail} hata oluştu.`);
    else if (fail > 0) fb.notify.info(`${success} sipariş UK depoya ulaştı, ${fail} hata oluştu.`);
    else fb.notify.success(`${success} sipariş UK depoya ulaştı ve Base stokları güncellendi.`);
  };

  // Toplu Yola Çıkarma Aksiyonlama
  const handleBulkShip = async () => {
    const depotBatches = batches.filter((b) => b.qtyTrDepot > 0);
    if (depotBatches.length === 0) return;

    const ok = await fb.confirm({
      title: `${depotLabel} → Sevkiyat (toplu)`,
      body: `Bu odadaki ${depotLabel} deposunda bekleyen ${depotBatches.length} siparişin tamamı yola çıkarılacak. Kısmi adet gerekiyorsa satır bazında "Yola Çıkar" kullanın.`,
      confirmLabel: 'Tümünü Yola Çıkar',
    });
    if (!ok) return;

    setBulkProcessing(true);
    let success = 0;
    let fail = 0;

    for (const b of depotBatches) {
      try {
        await transition.mutateAsync({
          batchId: b.id,
          fromState: 'TrDepot',
          toState: 'InTransit',
          quantity: b.qtyTrDepot,
        });
        success++;
      } catch {
        fail++;
      }
    }

    setBulkProcessing(false);
    if (success === 0) fb.notify.error(`Toplu sevk işlemi başarısız. ${fail} hata oluştu.`);
    else if (fail > 0) fb.notify.info(`${success} sipariş yola çıkarıldı, ${fail} hata oluştu.`);
    else fb.notify.success(`${success} sipariş yola çıkarıldı.`);
  };

  return (
    <div style={{
      ...card, padding: 0, overflow: 'hidden',
      border: `1px solid ${isSelected ? palette.accentBorder : palette.border}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        background: palette.inputBg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}>
          <CustomCheckbox
            checked={isSelected}
            onChange={onToggleSelect}
          />
        </div>
        <button onClick={onToggle} style={{ ...iconBtn, color: palette.text }} aria-label="Odayı aç/kapat">
          {expanded
            ? <ChevronDown size={icon.lg} strokeWidth={icon.stroke} />
            : <ChevronRight size={icon.lg} strokeWidth={icon.stroke} />}
        </button>
        <CalendarDays size={icon.lg} strokeWidth={icon.stroke} color={palette.accent} />

        {editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(false); }}
              placeholder={formatDate(date)}
              style={{ ...input, padding: '5px 9px', minWidth: 200 }}
            />
            <button onClick={saveRename} title="Kaydet" style={{ ...iconBtn, color: palette.success }}>
              <Check size={icon.lg} strokeWidth={icon.stroke} />
            </button>
            <button onClick={() => setEditing(false)} title="Vazgeç" style={{ ...iconBtn, color: palette.danger }}>
              <X size={icon.lg} strokeWidth={icon.stroke} />
            </button>
          </div>
        ) : (
          <button onClick={onToggle} style={{ ...iconBtn, gap: 8, flexDirection: 'row' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: palette.textStrong }}>{title}</span>
            <span style={{ fontSize: 12, color: palette.textMuted }}>
              {batches.length} ürün · {totalQty} adet
            </span>
          </button>
        )}

        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <StateChip state="TrDepot" qty={sums.TrDepot} label={depotLabel} />
          <StateChip state="InTransit" qty={sums.InTransit} />
          <StateChip state="UkDepot" qty={sums.UkDepot} />
        </div>

        {/* Toplu aksiyon tuşları */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {sums.TrDepot > 0 && (
            <button
              onClick={() => { void handleBulkShip(); }}
              disabled={bulkProcessing}
              style={{ ...btnGhost, padding: '5px 11px', fontSize: 11.5 }}
              title={`${depotLabel} deposunda bekleyen tüm siparişleri yola çıkar`}
            >
              <Play size={icon.sm} strokeWidth={icon.stroke} />
              Tümünü Yola Çıkar ({batches.filter((b) => b.qtyTrDepot > 0).length})
            </button>
          )}

          {sums.InTransit > 0 && (
            <button
              onClick={() => { void handleBulkArrive(); }}
              disabled={bulkProcessing}
              style={{ ...btnGhost, padding: '5px 11px', fontSize: 11.5, color: palette.success }}
              title="Yoldaki tüm siparişleri UK depoya ulaştır ve Base stoğuna ekle"
            >
              <Check size={icon.sm} strokeWidth={icon.stroke} />
              Hepsini Varış + Base Yap ({batches.filter((b) => b.qtyInTransit > 0).length})
            </button>
          )}
        </div>

        {!editing && (
          <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
            <button
              onClick={() => { setDraft(label ?? ''); setEditing(true); }}
              title="Oda adını değiştir"
              aria-label="Oda adını değiştir"
              style={iconBtn}
            >
              <Pencil size={icon.md} strokeWidth={icon.stroke} />
            </button>
            <button onClick={onRequestDelete} title="Odayı sil" aria-label="Odayı sil" style={{ ...iconBtn, color: palette.danger }}>
              <Trash2 size={icon.md} strokeWidth={icon.stroke} />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle} />
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Ürün</th>
                <th style={thStyle}>Adet</th>
                <th style={thStyle}>Durum</th>
                <th style={thStyle}>İrsaliye No</th>
                <th style={thStyle}>Sevk Tarihi</th>
                <th style={thStyle}>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <BatchRow
                  key={b.id}
                  batch={b}
                  depotLabel={depotLabel}
                  expanded={expandedBatchId === b.id}
                  onToggle={() => onToggleBatch(b.id)}
                  fb={fb}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BatchRow({
  batch, depotLabel, expanded, onToggle, fb,
}: {
  batch: BaseTrackBatch;
  depotLabel: string;
  expanded: boolean;
  onToggle: () => void;
  fb: Feedback;
}) {
  const transition = useTransitionBatch();
  const arrive = useArriveBatch();
  const [shipDialogOpen, setShipDialogOpen] = useState(false);

  // Kısmi sevk: bir kısmı yola çıkmış/varmış, bir kısmı hâlâ depoda bekliyor —
  // satır vurgulanır ve kalan adet için "yollandı mı?" teyidi istenir.
  const isPartial = batch.qtyTrDepot > 0 && (batch.qtyInTransit > 0 || batch.qtyUkDepot > 0);

  // Sevk adedi serbestçe girilebilir — üretim/sevkiyat mevcuttakinden az olabilir
  // (örn. 5 taneden 4 tanesi üretildi), o yüzden max'a kilitli değil.
  const doShip = (qty: number) => {
    setShipDialogOpen(false);
    transition.mutate(
      { batchId: batch.id, fromState: 'TrDepot', toState: 'InTransit', quantity: qty },
      { onError: (e) => fb.notify.error(`Taşıma hatası: ${(e as Error).message}`) },
    );
  };

  const doArrive = async () => {
    const ok = await fb.confirm({
      title: 'UK Varış — Base\'e stok gönder',
      body: `${batch.qtyInTransit} adet UK depoya taşınacak ve Base'de "${batch.supplierStockCode}" stoğu ${batch.qtyInTransit} adet artırılacak. Bu işlem geri alınamaz.`,
      confirmLabel: 'Onayla & Base\'e Gönder',
    });
    if (!ok) return;

    arrive.mutate(
      { batchId: batch.id },
      {
        onSuccess: () => fb.notify.success(`${batch.supplierStockCode}: Base stoğu artırıldı.`),
        onError: (e) => fb.notify.error(`Base push hatası: ${(e as Error).message}`),
      },
    );
  };

  return (
    <>
      <tr style={{ cursor: 'pointer', background: isPartial ? palette.warningSoft : undefined }} onClick={onToggle}>
        <td style={tdStyle}>
          {expanded
            ? <ChevronDown size={icon.md} strokeWidth={icon.stroke} />
            : <ChevronRight size={icon.md} strokeWidth={icon.stroke} />}
        </td>
        <td style={{ ...tdStyle, fontWeight: 600 }}>
          {batch.sku ?? <span style={{ color: palette.danger }}>Eşleşmedi</span>}
          <div style={{ fontSize: 11, color: palette.textMuted }}>
            {batch.supplierStockCode}
          </div>
        </td>
        <td style={{ ...tdStyle, maxWidth: 320 }}>{batch.productName}</td>
        <td style={tdStyle}>{batch.orderedQty}</td>
        <td style={tdStyle}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <StateChip state="TrDepot" qty={batch.qtyTrDepot} label={depotLabel} />
            <StateChip state="InTransit" qty={batch.qtyInTransit} />
            <StateChip state="UkDepot" qty={batch.qtyUkDepot} />
            {isPartial && (
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                color: palette.warningText, background: softTint(palette.warning), whiteSpace: 'nowrap',
              }}>
                Kısmi sevk
              </span>
            )}
          </div>
        </td>
        <td style={tdStyle}>{batch.deliveryNoteNo ?? '—'}</td>
        <td style={tdStyle}>{batch.firstShipmentDate ? formatDate(batch.firstShipmentDate) : '—'}</td>
        <td style={{ ...tdStyle, minWidth: 132 }} onClick={(e) => e.stopPropagation()}>
          {/* Dikey istif: iki buton yan yana sıkışıp kaymasın, her biri tam genişlik */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'stretch' }}>
            {batch.qtyTrDepot > 0 && (
              <button
                style={{
                  ...btnGhost, padding: '5px 10px', fontSize: 12, whiteSpace: 'nowrap',
                  ...(isPartial ? { color: palette.warningText, borderColor: palette.warning } : {}),
                }}
                disabled={transition.isPending}
                onClick={() => setShipDialogOpen(true)}
                title={isPartial ? 'Kalan adet yollandıysa adedi girip yola çıkarın' : undefined}
              >
                {isPartial ? `Kalanı Yola Çıkar (${batch.qtyTrDepot})` : 'Yola Çıkar'}
              </button>
            )}
            {batch.qtyInTransit > 0 && (
              <button
                style={{ ...btnPrimary, padding: '5px 10px', fontSize: 12, background: palette.success, whiteSpace: 'nowrap' }}
                disabled={arrive.isPending}
                onClick={() => { void doArrive(); }}
              >
                {arrive.isPending ? 'Push...' : 'UK Varış + Base'}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && <LinkedOrdersRow batchId={batch.id} productId={batch.productId} />}
      {expanded && <EventsRow batchId={batch.id} />}

      <QuantityDialog
        open={shipDialogOpen}
        title={`${depotLabel} → Sevkiyat`}
        description={`${depotLabel} deposunda ${batch.qtyTrDepot} adet bekliyor. Kaç adedi yola çıktı?`}
        max={batch.qtyTrDepot}
        defaultValue={batch.qtyTrDepot}
        confirmLabel="Yola Çıkar"
        onConfirm={doShip}
        onCancel={() => setShipDialogOpen(false)}
      />
    </>
  );
}

// Kutu ↔ Sipariş eşleşmesi: bu batch'in (fiziksel kutunun) ürününü içeren siparişler —
// SKU eşleşmemiş batch'lerde (productId null) hiç istek atmadan bilgi mesajı gösterir.
function LinkedOrdersRow({ batchId, productId }: { batchId: number; productId: number | null }) {
  const linkedOrders = useBaseTrackLinkedOrders(batchId);

  return (
    <tr>
      <td style={{ ...tdStyle, background: palette.inputBg, borderBottom: 'none' }} colSpan={8}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Package size={icon.sm} strokeWidth={icon.stroke} color={palette.textMuted} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Bu Ürünü İçeren Siparişler
          </span>
        </div>
        {productId === null ? (
          <span style={{ fontSize: 12, color: palette.textMuted }}>
            SKU eşleşmedi — sipariş eşleşmesi için önce ürün kataloğuyla eşleştirilmeli.
          </span>
        ) : linkedOrders.isLoading ? (
          <span style={{ fontSize: 12, color: palette.textMuted }}>Siparişler yükleniyor...</span>
        ) : linkedOrders.data && linkedOrders.data.length === 0 ? (
          <span style={{ fontSize: 12, color: palette.textMuted }}>Bu ürünü içeren sipariş bulunamadı.</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {linkedOrders.data?.map((o) => (
              <div key={o.orderId} style={{ fontSize: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <Link
                  href={`/orders/${o.orderId}`}
                  style={{ color: palette.accent, fontWeight: 700, textDecoration: 'none' }}
                >
                  {formatOrderNumberWithHash(o.platformOrderNumber)}
                </Link>
                <span style={{ color: palette.textFaint, minWidth: 90 }}>{formatDate(o.orderDate)}</span>
                <span style={{ color: palette.textMuted }}>{o.quantity} adet</span>
                {o.storeName && <span style={{ color: palette.textMuted }}>· {o.storeName}</span>}
                {o.customerName && <span style={{ color: palette.textMuted }}>· {o.customerName}</span>}
                <span style={{ color: palette.textFaint }}>· {o.universalStatus}</span>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

function EventsRow({ batchId }: { batchId: number }) {
  const events = useBaseTrackEvents(batchId);
  return (
    <tr>
      <td style={{ ...tdStyle, background: palette.inputBg }} colSpan={8}>
        {events.isLoading && <span style={{ fontSize: 12, color: palette.textMuted }}>Geçmiş yükleniyor...</span>}
        {events.data && events.data.length === 0 && <span style={{ fontSize: 12, color: palette.textMuted }}>Hareket yok.</span>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {events.data?.map((e) => (
            <div key={e.id} style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: palette.textFaint, minWidth: 130 }}>
                {formatDateTime(e.createdAt)}
              </span>
              <span style={{ fontWeight: 600, color: e.failed ? palette.danger : palette.text }}>
                {e.fromState ? `${STATE_META[e.fromState]?.label ?? e.fromState} → ` : ''}
                {STATE_META[e.toState]?.label ?? e.toState} · {e.quantity} adet
                {e.failed ? ' (BAŞARISIZ)' : ''}
              </span>
              <span style={{ color: palette.textMuted }}>
                {e.source}{e.createdBy ? ` · ${e.createdBy}` : ''}{e.note ? ` · ${e.note}` : ''}
              </span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

// Serbest miktar girişli onay diyaloğu — "kalanı" değil, kullanıcının girdiği herhangi
// bir adedi (1..max) taşımak için. Miktar girişi gerektiği için ortak confirm() yerine
// kendi modalı var.
function QuantityDialog({
  open, title, description, max, defaultValue, confirmLabel = 'Onayla', cancelLabel = 'Vazgeç', onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  max: number;
  defaultValue: number;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState(String(defaultValue));

  useEffect(() => {
    if (open) setRaw(String(defaultValue));
  }, [open, defaultValue]);

  if (!open || typeof document === 'undefined') return null;

  const qty = Number.parseInt(raw, 10);
  const valid = Number.isFinite(qty) && qty > 0 && qty <= max;

  // Portal: bu diyalog bir <tbody><tr> içindeki BatchRow'dan açılıyor — inline render
  // edilirse fixed-overlay <div> geçersiz şekilde <tbody> altına düşer (hydration hatası
  // + tarayıcı DOM'u düzeltmeye çalışıp tabloyu bozar). body'ye taşıyoruz.
  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 30001,
        background: 'oklch(21% 0.006 260 / 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...card, borderRadius: 14, width: '100%', maxWidth: 360, padding: 22,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: palette.textStrong }}>{title}</h3>
          <p style={{ fontSize: 12.5, color: palette.textMuted, margin: '4px 0 0', lineHeight: 1.5 }}>{description}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="number" min={1} max={max} autoFocus value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid) onConfirm(qty); }}
            style={{ ...input, width: 100, fontSize: 16, fontWeight: 700, textAlign: 'center' }}
          />
          <span style={{ fontSize: 12.5, color: palette.textFaint }}>/ {max} adet mevcut</span>
        </div>
        {!valid && raw !== '' && (
          <span style={{ fontSize: 11.5, color: palette.danger, marginTop: -10 }}>
            1 ile {max} arasında bir adet girin.
          </span>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnGhost}>{cancelLabel}</button>
          <button
            onClick={() => valid && onConfirm(qty)}
            disabled={!valid}
            style={{ ...btnPrimary, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
