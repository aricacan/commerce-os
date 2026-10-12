'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Plus, Trash2, Upload, Trash } from 'lucide-react';
import {
  useAddDepotMovement, useBaseTrackDepot, useBaseTrackDepotMovements, useBaseTrackSettings,
  useDeleteDepotItem, useImportDepotExcel,
} from '@/hooks/basetrack/useBaseTrack';
import { ExportMenu, type ExportRow } from '@/components/ui/ExportMenu';
import type { ExportColumn } from '@/lib/export';
import type { BaseTrackImportResult } from '@/lib/api';
import { formatDate, tdStyle, thStyle, ErrorState } from './shared';
import {
  palette, card, btnGhost, btnPrimary, input, icon, label as labelStyle,
  pageShell, pageInner, pageHeading, pageSubtitle,
} from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { formatDateTime } from '../../lib/format';
import { CustomCheckbox } from '@/components/ui/CustomCheckbox';
import { useMobile } from '../../hooks/useMobile';

interface DepotItem {
  id: number; sku: string; productId: number | null; productName: string; quantity: number; updatedAt: string;
}

export function DepotTab() {
  const isMobile = useMobile();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({ sku: '', delta: '', note: '' });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<BaseTrackImportResult | null>(null);
  const { notify, confirm, feedback } = useFeedback();

  const items = useBaseTrackDepot(search);
  const settings = useBaseTrackSettings();
  const depotLabel = settings.data?.depotLabel ?? 'DEMO UK';
  const addMovement = useAddDepotMovement();
  const importExcel = useImportDepotExcel();
  const deleteItem = useDeleteDepotItem();
  const fileInput = useRef<HTMLInputElement>(null);

  const handleDelete = async (item: DepotItem) => {
    const ok = await confirm({
      title: `"${item.sku}" depo kalemi silinsin mi?`,
      body: `${item.quantity} adetlik kalem ve tüm hareket geçmişi kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    deleteItem.mutate(item.id, {
      onSuccess: () => {
        notify.success(`${item.sku} ${depotLabel} deposundan silindi.`);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      },
      onError: (e) => notify.error((e as Error).message),
    });
  };

  // Toplu silme tek tek istek atar (toplu uç yok); kaç tanesinin başarılı olduğunu
  // sayıp tek bildirimde özetliyoruz.
  const deleteMany = async (ids: readonly number[]) => {
    setBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of ids) {
      try {
        await deleteItem.mutateAsync(id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setSelectedIds(new Set());
    setBulkDeleting(false);

    if (successCount === 0) notify.error(`Silme işlemi başarısız. ${failCount} hata oluştu.`);
    else if (failCount > 0) notify.info(`${successCount} kalem silindi, ${failCount} hata oluştu.`);
    else notify.success(`${successCount} depo kalemi silindi.`);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `Seçilen ${selectedIds.size} depo kalemi silinsin mi?`,
      body: 'Seçilen kalemler ve tüm hareket geçmişleri kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Seçilenleri Sil',
      danger: true,
    });
    if (ok) await deleteMany(Array.from(selectedIds));
  };

  const handleDeleteAll = async () => {
    const all = items.data ?? [];
    if (all.length === 0) return;
    const ok = await confirm({
      title: `Tüm ${depotLabel} depo kalemleri silinsin mi?`,
      body: `${all.length} kalem ve hareket geçmişleri kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
      confirmLabel: 'Hepsini Sil',
      danger: true,
    });
    if (ok) await deleteMany(all.map((i) => i.id));
  };

  const submitMovement = () => {
    const delta = Number.parseInt(form.delta, 10);
    if (!form.sku.trim() || !Number.isFinite(delta) || delta === 0) {
      notify.error('SKU ve sıfırdan farklı bir adet girin (çıkış için negatif).');
      return;
    }
    addMovement.mutate(
      { sku: form.sku.trim(), delta, note: form.note || undefined },
      {
        onSuccess: (item) => {
          notify.success(`${item.sku}: yeni stok ${item.quantity}`);
          setForm({ sku: '', delta: '', note: '' });
          setAddDialogOpen(false);
        },
        onError: (e) => notify.error((e as Error).message),
      },
    );
  };

  const exportColumns: ExportColumn[] = [
    { key: 'SKU', header: 'SKU', type: 'text' },
    { key: 'Ürün', header: 'Ürün', type: 'text' },
    { key: 'Stok', header: 'Stok', type: 'int' },
    { key: 'Eşleşme', header: 'Eşleşme', type: 'text' },
    { key: 'Güncelleme', header: 'Güncelleme', type: 'date' },
  ];
  const exportRows = (): ExportRow[] =>
    (items.data ?? []).map((item) => ({
      SKU: item.sku,
      Ürün: item.productName || '',
      Stok: item.quantity,
      Eşleşme: item.productId === null ? 'Eşleşmedi' : 'Eşleşti',
      Güncelleme: item.updatedAt, // ham tarih -> Excel gerçek tarih hücresi
    }));

  const allSelected = items.data && items.data.length > 0 && items.data.every((item) => selectedIds.has(item.id));
  const toggleSelectAll = () => {
    if (!items.data) return;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.data.map((item) => item.id)));
    }
  };

  return (
    <div style={pageShell}>
      <div style={{ ...pageInner(1200), display: 'flex', flexDirection: 'column', gap: 16, padding: isMobile ? '12px 14px 48px' : undefined }}>
        <div data-tour="basetrack-depot-header">
          <h2 style={pageHeading}>{depotLabel} Depo</h2>
          <p style={pageSubtitle}>
            Ara deponun defter stoğu — Excel yüklemesi veya manuel hareketlerle güncellenir.
          </p>
        </div>

        {/* Tek satır araç çubuğu: arama + manuel ekle + Excel + dışa aktar hepsi bir arada */}
        <div data-tour="basetrack-depot-toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ ...input, maxWidth: 320, flex: 1 }}
            placeholder="Depoda ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button style={btnPrimary} onClick={() => setAddDialogOpen(true)}>
            <Plus size={icon.md} strokeWidth={icon.stroke} />
            Manuel Ekle
          </button>
          <input
            ref={fileInput} type="file" accept=".xlsx" hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                importExcel.mutate(file, {
                  onSuccess: (r) => {
                    notify.success(
                      `Excel: ${r.totalRows} satır — ${r.created} yeni, ${r.updated} güncellendi, ` +
                      `${r.unchanged} değişmedi, ${r.unmatched} eşleşmedi`,
                    );
                    setImportResult(r);
                  },
                  onError: (err) => notify.error(`Excel hatası: ${(err as Error).message}`),
                });
              }
              e.target.value = '';
            }}
          />
          <button style={btnGhost} disabled={importExcel.isPending} onClick={() => fileInput.current?.click()}>
            <Upload size={icon.md} strokeWidth={icon.stroke} />
            {importExcel.isPending ? 'Yükleniyor...' : 'Excel Import'}
          </button>
          <div style={{ marginLeft: 'auto' }}>
            <ExportMenu filename={`${depotLabel.toLowerCase().replace(/\s+/g, '-')}-depo`} getData={exportRows} columns={exportColumns} />
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{ ...btnGhost, color: palette.danger, borderColor: palette.danger }}
            >
              <Trash2 size={icon.md} strokeWidth={icon.stroke} />
              {bulkDeleting ? 'Siliniyor...' : `Seçilenleri Sil (${selectedIds.size})`}
            </button>
          )}
          {items.data && items.data.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={bulkDeleting}
              style={{ ...btnGhost, color: palette.danger }}
            >
              <Trash size={icon.md} strokeWidth={icon.stroke} />
              Hepsini Sil
            </button>
          )}
        </div>

        {importResult && importResult.warnings.length > 0 && (
          <div style={{
            ...card, borderLeft: `3px solid ${palette.warning}`, fontSize: 12.5,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: palette.warningText }}>Excel: {importResult.warnings.length} uyarı</strong>
              <button onClick={() => setImportResult(null)} style={{ ...btnGhost, padding: '3px 9px', fontSize: 11.5 }}>Kapat</button>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: palette.textMuted }}>
              {importResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div data-tour="basetrack-depot-table" style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 45, textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <CustomCheckbox
                      checked={!!allSelected}
                      onChange={toggleSelectAll}
                    />
                  </div>
                </th>
                <th style={thStyle} />
                <th style={thStyle}>SKU</th>
                <th style={thStyle}>Ürün</th>
                <th style={thStyle}>Stok</th>
                <th style={thStyle}>Güncelleme</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {items.isError && <tr><td style={tdStyle} colSpan={7}><ErrorState /></td></tr>}
              {!items.isError && items.isLoading && <tr><td style={tdStyle} colSpan={7}>Yükleniyor...</td></tr>}
              {!items.isError && !items.isLoading && (items.data?.length ?? 0) === 0 && (
                <tr><td style={tdStyle} colSpan={7}>{depotLabel} deposu boş — Excel yükleyin veya manuel hareket ekleyin.</td></tr>
              )}
              {items.data?.map((item) => (
                <DepotRow
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={(checked) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(item.id); else next.delete(item.id);
                      return next;
                    });
                  }}
                  onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  onDelete={() => { void handleDelete(item); }}
                />
              ))}
            </tbody>
          </table>
        </div>

        <AddMovementDialog
          open={addDialogOpen}
          depotLabel={depotLabel}
          form={form}
          onChange={setForm}
          onSubmit={submitMovement}
          onCancel={() => setAddDialogOpen(false)}
          pending={addMovement.isPending}
        />
      </div>
      {feedback}
    </div>
  );
}

// Manuel stok hareketi diyaloğu — panelin geri kalanıyla aynı temada, portal ile
// body'ye taşınır (overlay'in scroll edilen içerik alanı içinde kırpılmasın diye).
function AddMovementDialog({
  open, depotLabel, form, onChange, onSubmit, onCancel, pending,
}: {
  open: boolean;
  depotLabel: string;
  form: { sku: string; delta: string; note: string };
  onChange: (form: { sku: string; delta: string; note: string }) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  if (!open || typeof document === 'undefined') return null;

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
          ...card, borderRadius: 14, width: '100%', maxWidth: 400, padding: 22,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: palette.textStrong }}>
            {depotLabel} Deposuna Manuel Hareket
          </h3>
          <p style={{ fontSize: 12.5, color: palette.textMuted, margin: '4px 0 0', lineHeight: 1.5 }}>
            Pozitif adet giriş, negatif adet çıkış olarak işlenir.
          </p>
        </div>

        <div>
          <div style={labelStyle}>SKU</div>
          <input
            autoFocus style={input} placeholder="Örn. VKS123FBS"
            value={form.sku} onChange={(e) => onChange({ ...form, sku: e.target.value })}
          />
        </div>
        <div>
          <div style={labelStyle}>Adet (+/-)</div>
          <input
            style={{ ...input, width: 140 }} type="number" placeholder="+10 veya -5"
            value={form.delta} onChange={(e) => onChange({ ...form, delta: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          />
        </div>
        <div>
          <div style={labelStyle}>Not (opsiyonel)</div>
          <input
            style={input} placeholder="Örn. Fiziksel sayım düzeltmesi"
            value={form.note} onChange={(e) => onChange({ ...form, note: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onCancel} style={btnGhost}>Vazgeç</button>
          <button onClick={onSubmit} disabled={pending} style={btnPrimary}>
            {pending ? 'Kaydediliyor...' : 'Hareketi Kaydet'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DepotRow({
  item, expanded, isSelected, onToggleSelect, onToggle, onDelete,
}: {
  item: DepotItem;
  expanded: boolean;
  isSelected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr style={{ cursor: 'pointer', background: isSelected ? palette.accentSoft : undefined }} onClick={onToggle}>
        <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CustomCheckbox
              checked={isSelected}
              onChange={onToggleSelect}
            />
          </div>
        </td>
        <td style={tdStyle}>
          {expanded
            ? <ChevronDown size={icon.md} strokeWidth={icon.stroke} />
            : <ChevronRight size={icon.md} strokeWidth={icon.stroke} />}
        </td>
        <td style={{ ...tdStyle, fontWeight: 600 }}>
          {item.sku}
          {item.productId === null && (
            <span style={{ fontSize: 11, color: palette.danger, marginLeft: 8 }}>Eşleşmedi</span>
          )}
        </td>
        <td style={{ ...tdStyle, maxWidth: 380 }}>{item.productName || '—'}</td>
        <td style={{ ...tdStyle, fontWeight: 700 }}>{item.quantity}</td>
        <td style={tdStyle}>{formatDate(item.updatedAt)}</td>
        <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onDelete}
            title="Kalemi sil"
            aria-label="Kalemi sil"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer', color: palette.danger, padding: 4,
            }}
          >
            <Trash2 size={icon.md} strokeWidth={icon.stroke} />
          </button>
        </td>
      </tr>
      {expanded && <MovementsRow itemId={item.id} />}
    </>
  );
}

function MovementsRow({ itemId }: { itemId: number }) {
  const movements = useBaseTrackDepotMovements(itemId);
  return (
    <tr>
      <td style={{ ...tdStyle, background: palette.inputBg }} colSpan={7}>
        {movements.isLoading && <span style={{ fontSize: 12, color: palette.textMuted }}>Hareketler yükleniyor...</span>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {movements.data?.map((m) => (
            <div key={m.id} style={{ fontSize: 12, display: 'flex', gap: 8 }}>
              <span style={{ color: palette.textFaint, minWidth: 130 }}>
                {formatDateTime(m.createdAt)}
              </span>
              <span style={{ fontWeight: 600, color: m.delta > 0 ? palette.success : palette.danger }}>
                {m.delta > 0 ? `+${m.delta}` : m.delta}
              </span>
              <span style={{ color: palette.textMuted }}>
                {m.source}{m.createdBy ? ` · ${m.createdBy}` : ''}{m.note ? ` · ${m.note}` : ''}
              </span>
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}
