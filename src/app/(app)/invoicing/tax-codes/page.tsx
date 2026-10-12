'use client';

import { localDateStr } from '../../../../utils/date';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Percent, Pencil, X, Search, FileDown, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { taxCodeApi, type TaxCode, type TaxCodeType } from '../../../../lib/api/tax-code';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { downloadExcel, type ExportColumn } from '../../../../lib/export';
import { toast } from '../../../../lib/toast';
import { useI18n } from '../../../../lib/i18n';

const TYPE_LABEL: Record<TaxCodeType, { tr: string; en: string }> = {
  Vat: { tr: 'KDV', en: 'VAT' },
  Withholding: { tr: 'Tevkifat', en: 'Withholding' },
  Exemption: { tr: 'İstisna', en: 'Exemption' },
  Otv: { tr: 'ÖTV', en: 'SCT (ÖTV)' },
};

function TaxCodeFormDialog({ existing, onClose, onSaved }: { existing?: TaxCode; onClose: () => void; onSaved: () => void }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [code, setCode] = useState(existing?.code ?? '');
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<TaxCodeType>(existing?.type ?? 'Vat');
  const [rate, setRate] = useState(String(existing?.rate ?? ''));
  const [effectiveFrom, setEffectiveFrom] = useState(existing?.effectiveFrom ?? localDateStr());
  const [effectiveTo, setEffectiveTo] = useState(existing?.effectiveTo ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!existing && !code.trim()) {
      setError(tr ? 'Vergi kodu alanı zorunludur.' : 'Code is required.');
      return;
    }
    if (!name.trim()) {
      setError(tr ? 'Vergi adı zorunludur.' : 'Name is required.');
      return;
    }
    if (rate === '' || Number.isNaN(Number(rate))) {
      setError(tr ? 'Oran sayısal olmalıdır.' : 'Rate must be numeric.');
      return;
    }

    setSaving(true);
    try {
      if (existing) {
        await taxCodeApi.update(existing.id, {
          name: name.trim(),
          rate: Number(rate),
          effectiveTo: effectiveTo || undefined,
          isActive,
        });
      } else {
        await taxCodeApi.create({
          code: code.trim(),
          name: name.trim(),
          type,
          rate: Number(rate),
          effectiveFrom,
          effectiveTo: effectiveTo || undefined,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Percent size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {existing ? (tr ? 'Vergi Kodunu Düzenle' : 'Edit Tax Code') : (tr ? 'Yeni Vergi Kodu' : 'New Tax Code')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          {existing && (
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2.5 text-[11px] text-[var(--fg-muted)]">
              {tr
                ? 'ℹ️ Kod ve Vergi Tipi değiştirilemez — geçmiş fatura ve UBL kayıtlarının bütünlüğü korunur.'
                : 'Code and type cannot be changed.'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {tr ? 'Vergi Kodu *' : 'Tax Code *'}
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="KDV20"
                disabled={!!existing}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {tr ? 'Vergi Türü *' : 'Tax Type *'}
              </label>
              <FilterSelect
                value={type}
                onChange={(v) => setType((v || 'Vat') as TaxCodeType)}
                placeholder="KDV"
                height="h-8.5"
                options={(Object.keys(TYPE_LABEL) as TaxCodeType[]).map((t) => ({
                  value: t,
                  label: tr ? TYPE_LABEL[t].tr : TYPE_LABEL[t].en,
                }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              {tr ? 'Açıklama / Tanım *' : 'Name / Description *'}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="KDV %20 (Genel Oran)"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              {tr ? 'Oran (% veya Tevkifat Payı)' : 'Rate (% or ratio)'}
            </label>
            <input
              type="number"
              step="0.0001"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="20"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {tr ? 'Geçerlilik Başlangıcı *' : 'Effective From *'}
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                disabled={!!existing}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {tr ? 'Geçerlilik Bitişi' : 'Effective To'}
              </label>
              <input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] outline-none"
              />
            </div>
          </div>

          {existing && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)] pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded-[3px]"
              />
              <span>{tr ? 'Vergi Kodu Aktif' : 'Active'}</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : existing ? (tr ? 'Güncelle' : 'Update') : (tr ? 'Vergi Kodunu Kaydet' : 'Save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TaxCodesPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TaxCode | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tax-codes', 'all'],
    queryFn: () => taxCodeApi.list(false),
    staleTime: 15_000,
  });

  const taxCodes = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return taxCodes;
    const lower = search.toLowerCase();
    return taxCodes.filter(
      (t) => t.code.toLowerCase().includes(lower) || t.name.toLowerCase().includes(lower)
    );
  }, [taxCodes, search]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = taxCodes.length;
    const active = taxCodes.filter((t) => t.isActive).length;
    const vatCount = taxCodes.filter((t) => t.type === 'Vat').length;
    const withholdingCount = taxCodes.filter((t) => t.type === 'Withholding' || t.type === 'Exemption').length;
    return { total, active, vatCount, withholdingCount };
  }, [taxCodes]);

  // Excel Export
  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error(tr ? 'Dışa aktarılacak vergi kodu yok.' : 'No tax codes to export.');
      return;
    }
    const cols: ExportColumn[] = [
      { header: tr ? 'Vergi Kodu' : 'Code', key: 'code', type: 'text' },
      { header: tr ? 'Vergi Tanımı' : 'Name', key: 'name', type: 'text' },
      { header: tr ? 'Vergi Türü' : 'Type', key: 'type', type: 'text' },
      { header: tr ? 'Oran' : 'Rate', key: 'rate', type: 'text' },
      { header: tr ? 'Başlangıç Tarihi' : 'Effective From', key: 'effectiveFrom', type: 'text' },
      { header: tr ? 'Bitiş Tarihi' : 'Effective To', key: 'effectiveTo', type: 'text' },
      { header: tr ? 'Durum' : 'Status', key: 'status', type: 'text' },
    ];

    const rows = filtered.map((t) => ({
      code: t.code,
      name: t.name,
      type: TYPE_LABEL[t.type]?.tr || t.type,
      rate: t.type === 'Withholding' ? String(t.rate) : `%${t.rate}`,
      effectiveFrom: t.effectiveFrom,
      effectiveTo: t.effectiveTo || 'Süresiz',
      status: t.isActive ? (tr ? 'Aktif' : 'Active') : tr ? 'Pasif' : 'Inactive',
    }));

    void downloadExcel(`vergi_kodlari_${new Date().toISOString().slice(0, 10)}`, rows, cols, 'VergiKodlari');
    toast.success(tr ? 'Vergi kodları Excel olarak indirildi.' : 'Tax codes exported as Excel.');
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* ── Sub Tab Navigation ── */}
      <InvoicingSubTabBar />

      {/* ── Main Scrollable Area ── */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">
        
        {/* KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Toplam Vergi Kodu' : 'Total Codes'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.total}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Aktif Kodlar' : 'Active Codes'}</div>
            <div className="mt-1 text-lg font-bold text-emerald-500">{stats.active}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'KDV Oranları' : 'VAT Rates'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.vatCount}</div>
          </div>
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs">
            <div className="text-[11px] font-semibold text-[var(--fg-muted)]">{tr ? 'Tevkifat & İstisnalar' : 'Withholding & Exempt'}</div>
            <div className="mt-1 text-lg font-bold text-[var(--fg)]">{stats.withholdingCount}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          <div className="relative w-64 sm:w-80">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'Vergi Kodu veya Adı Ara...' : 'Search tax code or name...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filtered.length === 0}
              title={tr ? 'Excel İndir' : 'Export Excel'}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
            >
              <FileDown size={13} />
              <span className="hidden sm:inline">{tr ? 'Excel İndir' : 'Export'}</span>
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              title={tr ? 'Yenile' : 'Refresh'}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>{tr ? 'Vergi Kodu Ekle' : 'New Tax Code'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-4 py-3">{tr ? 'KOD' : 'CODE'}</th>
                  <th className="px-4 py-3">{tr ? 'VERGİ TANIMI' : 'NAME'}</th>
                  <th className="px-4 py-3">{tr ? 'TÜR' : 'TYPE'}</th>
                  <th className="px-4 py-3">{tr ? 'ORAN' : 'RATE'}</th>
                  <th className="px-4 py-3">{tr ? 'GEÇERLİLİK DÖNEMİ' : 'VALIDITY'}</th>
                  <th className="px-4 py-3">{tr ? 'DURUM' : 'STATUS'}</th>
                  <th className="px-4 py-3 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {/* HATA once: basarisiz sorgu "hic vergi kodu yok" gibi gorunmemeli. */}
                {isError ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6">
                      <ErrorState
                        title={tr ? 'Vergi kodları yüklenemedi' : 'Could not load tax codes'}
                        onRetry={() => refetch()}
                      />
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Vergi kodları yükleniyor...' : 'Loading tax codes...'}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek vergi kodu bulunamadı.' : 'No tax codes found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">{t.code}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--fg)]">{t.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-bold">
                          {tr ? TYPE_LABEL[t.type]?.tr || t.type : TYPE_LABEL[t.type]?.en || t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">
                        {t.type === 'Withholding' ? t.rate : `%${t.rate}`}
                      </td>
                      <td className="px-4 py-3 text-[var(--fg-muted)]">
                        {t.effectiveFrom} — {t.effectiveTo ?? (tr ? 'Süresiz' : 'Indefinite')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                            t.isActive
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400'
                          }`}
                        >
                          {t.isActive ? (tr ? 'Aktif' : 'Active') : tr ? 'Pasif' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditing(t)}
                          className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                        >
                          <Pencil size={11} />
                          <span>{tr ? 'Düzenle' : 'Edit'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {createOpen && (
        <TaxCodeFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            toast.success(tr ? 'Vergi kodu eklendi.' : 'Tax code added.');
            void qc.invalidateQueries({ queryKey: ['tax-codes'] });
          }}
        />
      )}

      {editing && (
        <TaxCodeFormDialog
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast.success(tr ? 'Vergi kodu güncellendi.' : 'Tax code updated.');
            void qc.invalidateQueries({ queryKey: ['tax-codes'] });
          }}
        />
      )}
    </div>
  );
}
