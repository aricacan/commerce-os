'use client';

import { useEffect, useState } from 'react';
import { Lock, Pencil } from 'lucide-react';
import { useErpisItem, useUpdateErpisItem } from '@/hooks/erpis/useErpisQuery';
import type { ErpisItemDetail, ErpisUpdateItemRequest } from '@/lib/api';
import { useAuthStore } from '../../stores/auth';
import { DetailRow, DetailSection, ErpisDrawer } from './ErpisDrawer';
import { ErrorState, formatDate, formatNumber } from './shared';
import { toErpFieldRows } from './erpisErpFields';
import { icon, palette } from '../shared/design';

// Yazma yetkisi olan roller — backend'deki WritePolicy ile aynı.
//
// Buradaki kontrol yalnız GÖRSEL: sunucu aynı kuralı ayrıca uyguluyor (403). Arayüzü
// gizlemek tek başına güvenlik değildir, ama yetkisi olmayana çalışmayacak bir buton
// göstermek de kötü bir deneyim.
const WRITE_ROLES = ['SuperAdmin', 'Admin'];

export function ItemDrawer({ id, onClose }: { id: number; onClose: () => void }) {
  const query = useErpisItem(id);
  const update = useUpdateErpisItem();
  const roles = useAuthStore((state) => state.user?.roles);
  const canWrite = roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  const [editing, setEditing] = useState(false);
  const [showBlankErpFields, setShowBlankErpFields] = useState(false);

  const detail = query.data;
  const item = detail?.item;

  return (
    <ErpisDrawer
      title={item?.sku ?? 'Stok kartı'}
      subtitle={item?.name ?? undefined}
      onClose={onClose}
    >
      {query.isError && <ErrorState />}
      {query.isLoading && <p className="text-[12px] text-[var(--fg-muted)]">Yükleniyor…</p>}

      {detail && item && (
        <>
          {item.parseSource === 'Manual' && (
            <div
              className="flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[11.5px] font-semibold"
              style={{ background: palette.chipBg, color: palette.textMuted }}
            >
              <Lock size={icon.sm} strokeWidth={icon.stroke} />
              Elle düzeltildi — otomatik yeniden ayrıştırma bu kartı değiştirmez.
            </div>
          )}

          {editing ? (
            <ItemEditForm
              detail={detail}
              saving={update.isPending}
              onCancel={() => setEditing(false)}
              onSave={async (body) => {
                await update.mutateAsync({ id, body });
                setEditing(false);
              }}
            />
          ) : (
            <>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 self-start rounded-[4px] border border-[var(--border-soft)] px-2.5 py-1 text-[11.5px] font-bold text-[var(--fg)]"
                >
                  <Pencil size={icon.sm} strokeWidth={icon.stroke} />
                  Düzelt
                </button>
              )}

              <DetailSection title="Ayrıştırılan">
                <DetailRow label="Marka" value={item.brand} />
                <DetailRow label="Model" value={item.model} />
                <DetailRow label="Yıl" value={item.yearText ?? yearRange(item.yearFrom, item.yearTo)} />
                <DetailRow label="Ürün Tipi" value={item.productType} />
                <DetailRow label="Renk" value={item.color} />
                <DetailRow label="Malzeme" value={item.material} />
                <DetailRow label="Desen" value={detail.pattern} />
                <DetailRow label="Varyant" value={item.variant} />
                <DetailRow label="Takım Adedi" value={detail.setPieceCount} />
                <DetailRow label="Ölçü" value={detail.dimensionsText} />
                <DetailRow label="Güven" value={`${formatNumber(item.parseConfidence)} / 100`} />
                <DetailRow label="Çözülemeyen Metin" value={detail.nameRemainder} />
              </DetailSection>
            </>
          )}

          <DetailSection title="Kart">
            <DetailRow label="SKU Türü" value={item.skuKind} />
            <DetailRow label="Kart Türü" value={item.itemKind} />
            <DetailRow label="Kategori" value={item.categoryName} />
            <DetailRow label="Ad (2)" value={item.name2} />
            <DetailRow label="İngilizce Ad" value={detail.nameEn} />
            <DetailRow label="Birim" value={detail.unit} />
            <DetailRow label="Barkod" value={item.ean} />
            <DetailRow label="GTİP" value={detail.gtip} />
            <DetailRow label="KDV" value={detail.vatRate == null ? null : `%${formatNumber(detail.vatRate)}`} />
            <DetailRow label="Aktif" value={item.isActive == null ? null : item.isActive ? 'Evet' : 'Hayır'} />
          </DetailSection>

          {/* ERP boş ölçüyü 0 yazıyor; "0,00 mm" gerçek değer gibi görünüyordu → "—".
              Ağırlık "bitmisurungramaji" kolonundan; değerler (ör. rüzgarlık 0,78) kg ölçeğinde. */}
          <DetailSection title="Ölçü ve Ambalaj">
            <DetailRow label="Bitmiş Ürün Ağırlığı" value={unit(detail.weightGr, 'kg')} />
            <DetailRow label="En" value={unit(detail.widthMm, 'mm')} />
            <DetailRow label="Boy" value={unit(detail.lengthMm, 'mm')} />
            <DetailRow label="Kalınlık" value={unit(detail.thicknessMm, 'mm')} />
            <DetailRow label="Hacim" value={unit(detail.volumeDm3, 'dm³')} />
            <DetailRow label="Adet" value={detail.pieceCount} />
            <DetailRow label="Ambalaj Kodu" value={detail.packagingSku} />
            <DetailRow label="Ambalaj Miktarı" value={formatNumber(detail.packagingQty, 2)} />
          </DetailSection>

          <DetailSection title="Tedarik">
            <DetailRow label="Tedarikçi" value={detail.supplierName} />
            <DetailRow label="Temin Süresi" value={unit(detail.leadTimeDays, 'gün')} />
            <DetailRow label="Min / Max Stok"
              value={detail.minStock || detail.maxStock
                ? `${formatNumber(detail.minStock, 2)} / ${formatNumber(detail.maxStock, 2)}`
                : null} />
            <DetailRow label="ABC Sınıfı" value={detail.abcClass} />
            <DetailRow label="Kayıt Tarihi" value={formatDate(detail.registeredAt)} />
            <DetailRow label="Kullanımdan Kalktı" value={formatDate(detail.discontinuedAt)} />
            <DetailRow label="Kalkma Nedeni" value={detail.discontinuedReason} />
          </DetailSection>

          {detail.stockLocations.length > 0 && (
            <DetailSection title={`Depo Rafları (${detail.stockLocations.length})`}>
              {detail.stockLocations.map((l) => (
                <DetailRow
                  key={`${l.zone}-${l.shelf}`}
                  label={`Bölge ${l.zone} · ${l.shelf}`}
                  value={`${formatNumber(l.quantity, 2)} adet`}
                />
              ))}
            </DetailSection>
          )}

          {detail.erpFields && detail.erpFields.length > 0 && (
            <ErpFieldsSection
              fields={detail.erpFields}
              showBlank={showBlankErpFields}
              onToggle={() => setShowBlankErpFields((v) => !v)}
            />
          )}

          {detail.customerCodes.length > 0 && (
            <DetailSection title={`Müşteri Kodları (${detail.customerCodes.length})`}>
              {detail.customerCodes.map((c) => (
                <DetailRow key={`${c.partyName}-${c.customerSku}`} label={c.partyName} value={c.customerSku} />
              ))}
            </DetailSection>
          )}
        </>
      )}
    </ErpisDrawer>
  );
}

// Yalnız AYRIŞTIRILAN alanlar düzenlenir: barkod, ölçü, tedarikçi gibi alanlar Erpis'ten
// geliyor ve bir sonraki yüklemede zaten üzerine yazılır — burada düzeltmek yanıltıcı olurdu.
function ItemEditForm({ detail, saving, onCancel, onSave }: {
  detail: ErpisItemDetail;
  saving: boolean;
  onCancel: () => void;
  onSave: (body: ErpisUpdateItemRequest) => void;
}) {
  const [form, setForm] = useState<ErpisUpdateItemRequest>(() => ({
    brand: detail.item.brand,
    model: detail.item.model,
    yearFrom: detail.item.yearFrom,
    yearTo: detail.item.yearTo,
    productType: detail.item.productType,
    color: detail.item.color,
    material: detail.item.material,
    variant: detail.item.variant,
    itemKind: detail.item.itemKind,
    categoryId: detail.item.categoryId,
  }));

  // Kullanıcı çekmece açıkken başka bir karta geçerse form eski değerlerle kalmamalı.
  useEffect(() => {
    setForm({
      brand: detail.item.brand,
      model: detail.item.model,
      yearFrom: detail.item.yearFrom,
      yearTo: detail.item.yearTo,
      productType: detail.item.productType,
      color: detail.item.color,
      material: detail.item.material,
      variant: detail.item.variant,
      itemKind: detail.item.itemKind,
      categoryId: detail.item.categoryId,
    });
  }, [detail.item]);

  return (
    <form
      className="flex flex-col gap-2 rounded-[4px] border border-[var(--border-soft)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <p className="text-[11px] text-[var(--fg-muted)]">
        Kaydedince kart <strong>elle düzeltildi</strong> olarak işaretlenir ve otomatik
        ayrıştırma bir daha bu kartı değiştirmez.
      </p>

      <Field label="Marka" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} />
      <Field label="Model" value={form.model} onChange={(v) => setForm({ ...form, model: v })} />
      <div className="flex gap-2">
        <NumberField label="Yıl (baş.)" value={form.yearFrom}
          onChange={(v) => setForm({ ...form, yearFrom: v })} />
        <NumberField label="Yıl (bit.)" value={form.yearTo}
          onChange={(v) => setForm({ ...form, yearTo: v })} />
      </div>
      <Field label="Ürün Tipi" value={form.productType} onChange={(v) => setForm({ ...form, productType: v })} />
      <Field label="Renk" value={form.color} onChange={(v) => setForm({ ...form, color: v })} />
      <Field label="Malzeme" value={form.material} onChange={(v) => setForm({ ...form, material: v })} />
      <Field label="Varyant" value={form.variant} onChange={(v) => setForm({ ...form, variant: v })} />

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[4px] bg-[var(--fg)] px-3 py-1.5 text-[12px] font-bold text-[var(--bg)] disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[4px] border border-[var(--border-soft)] px-3 py-1.5 text-[12px] font-bold text-[var(--fg)]"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}

function Field({ label, value, onChange }: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
        {label}
      </span>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 text-[12px] text-[var(--fg)] outline-none focus:border-[var(--border)]"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="h-8 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 text-[12px] tabular-nums text-[var(--fg)] outline-none focus:border-[var(--border)]"
      />
    </label>
  );
}

function yearRange(from: number | null, to: number | null): string | null {
  if (from == null) return null;
  return to == null ? `${from}-` : `${from}-${to}`;
}

// 0 = ERP'de girilmemiş. Gerçek sıfır ölçü/ağırlık/süre anlamlı değil.
function unit(value: number | null, suffix: string): string | null {
  return value == null || value === 0 ? null : `${formatNumber(value, 2)} ${suffix}`;
}

// Son katalog yüklemesindeki satırın TÜM kolonları, dosyadaki sırayla. Varsayılan olarak
// boş/0 alanlar gizli: 95 kolonun çoğu ERP'de doldurulmamış ve listeyi boğuyor.
function ErpFieldsSection({ fields, showBlank, onToggle }: {
  fields: NonNullable<ErpisItemDetail['erpFields']>;
  showBlank: boolean;
  onToggle: () => void;
}) {
  const rows = toErpFieldRows(fields);
  const visible = showBlank ? rows : rows.filter((r) => !r.isBlank);
  const hiddenCount = rows.length - visible.length;

  return (
    <DetailSection title={`ERP'deki Tüm Alanlar (${visible.length}/${rows.length})`}>
      <button
        type="button"
        onClick={onToggle}
        className="self-start py-1 text-[11.5px] font-bold text-[var(--fg-muted)] underline-offset-2 hover:underline"
      >
        {showBlank ? 'Boş ve sıfır alanları gizle' : `Boş ve sıfır alanları göster (${hiddenCount})`}
      </button>
      {visible.map((r) => (
        <DetailRow key={r.column} label={r.label} value={r.value} />
      ))}
    </DetailSection>
  );
}
