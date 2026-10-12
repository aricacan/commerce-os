'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Link2, Link2Off, RefreshCw, Trash2, X } from 'lucide-react';
import type { FitmentRow, FitmentVehicle, UpdateFitmentRowBody } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useMobile } from '../../hooks/useMobile';
import { FitmentProductPicker } from './FitmentProductPicker';
import { EDIT_FIELD_KEYS, FitmentIconButton, formatVehicle } from './FitmentUi';

function VehicleLine({
  v,
  onUpdate,
}: {
  v: FitmentVehicle;
  onUpdate: (body: { resolvedProductId?: number | null; clear?: boolean }) => void;
}) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);

  return (
    <div className="relative border-b border-[var(--border-soft)] py-2 last:border-b-0">
      <div className="mb-1">
        <span className="text-xs font-bold text-[var(--fg)]">{formatVehicle(v)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        {v.resolvedProductId ? (
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="shrink-0 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--fg)]">
              {v.resolvedSku}
            </span>
            <span className="truncate text-xs text-[var(--fg-muted)]">{v.resolvedName}</span>
          </span>
        ) : (
          <span className="flex-1 text-xs text-[var(--fg-muted)]">{t('fitment_no_match')}</span>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {v.status === 'Suggested' && (
            <FitmentIconButton icon={<Check size={11} />} onClick={() => onUpdate({})} title={t('fitment_approve_candidate')} />
          )}
          <FitmentIconButton icon={<Link2 size={11} />} onClick={() => setPicking((p) => !p)} title={t('fitment_change_assign_sku')} />
          {v.resolvedProductId && (
            <FitmentIconButton icon={<Link2Off size={11} />} color="var(--danger)" onClick={() => onUpdate({ clear: true })} title={t('fitment_clear_link')} />
          )}
        </div>
      </div>
      {picking && (
        <div className="absolute right-0 top-full z-20 mt-1">
          <FitmentProductPicker onPick={(p) => { onUpdate({ resolvedProductId: p.productId }); setPicking(false); }} onClose={() => setPicking(false)} />
        </div>
      )}
    </div>
  );
}

export function FitmentRowDetailModal({
  row,
  onClose,
  onApprove,
  onResolve,
  onReject,
  onDelete,
  onUpdateVehicle,
  isEditing,
  editVals,
  onStartEdit,
  onCancelEdit,
  onChangeEdit,
  onSaveEdit,
  isSaving,
}: {
  row: FitmentRow;
  onClose: () => void;
  onApprove: () => void;
  onResolve: () => void;
  onReject: () => void;
  onDelete: () => void;
  onUpdateVehicle: (vehicleId: number, body: { resolvedProductId?: number | null; clear?: boolean }) => void;
  isEditing: boolean;
  editVals: UpdateFitmentRowBody;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeEdit: (v: UpdateFitmentRowBody) => void;
  onSaveEdit: () => void;
  isSaving: boolean;
}) {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const isMobile = useMobile();
  const vehicleLabel = [row.brand, row.model, row.year].filter(Boolean).join(' ');
  const displayName = row.matchedProductName || row.description?.trim() || vehicleLabel || row.barcode || null;
  const isMatched = !!row.matchedProductId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[840px] flex-col overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-soft)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-[var(--fg)]">{row.sku}</span>
            <span className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-semibold text-[var(--fg-muted)]">
              {row.category ?? t('fitment_uncategorized')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
          {/* Eşleşme Durumu Bilgi Çubuğu */}
          <div className="flex items-center gap-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--fg-muted)]">
            {isMatched ? <Check size={14} className="shrink-0 text-emerald-500" /> : <AlertTriangle size={14} className="shrink-0 text-amber-500" />}
            <p className="m-0">
              {isMatched
                ? <>{isTr ? 'Sistemde eşleşen ürün: ' : 'Matched to: '}<strong className="font-bold text-[var(--fg)]">{row.matchedProductName}</strong></>
                : (isTr ? 'Sistemde eşleşen ürün yok — onaylanınca yeni ürün olarak oluşturulacak.' : 'No matching product — will be created as new product.')}
            </p>
          </div>

          <div>
            <h3 className="m-0 text-sm font-bold text-[var(--fg)]">{displayName}</h3>
            <p className="m-0 mt-1 text-xs text-[var(--fg-muted)]">
              {t('fitment_source_vehicle_prefix')}{[row.brand, row.model, row.year].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>

          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-[1.2fr_0.8fr]'}`}>
            {/* Sol: Uyumlu Araçlar */}
            <div className="rounded-[4px] border border-[var(--border-soft)] p-3">
              <p className="mb-2 border-b border-[var(--border-soft)] pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                {t('fitment_compatible_vehicles')} ({row.vehicles.length})
              </p>
              {row.vehicles.length === 0 ? (
                <p className="text-xs text-[var(--fg-muted)]">{t('fitment_no_vehicles_extracted')}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {row.vehicles.map((v) => (
                    <VehicleLine key={v.id} v={v} onUpdate={(body) => onUpdateVehicle(v.id, body)} />
                  ))}
                </div>
              )}
            </div>

            {/* Sağ: Düzenleme Formu veya Özet */}
            <div className="rounded-[4px] border border-[var(--border-soft)] p-3">
              <div className="mb-2 flex items-center justify-between border-b border-[var(--border-soft)] pb-1.5">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  {t('fitment_edit')}
                </p>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={onStartEdit}
                    className="text-xs font-bold text-[var(--fg)] hover:underline"
                  >
                    {isTr ? 'Düzenle' : 'Edit'}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {(['category', 'brand', 'model', 'year'] as const).map((f) => (
                      <input
                        key={f}
                        type="text"
                        placeholder={t(EDIT_FIELD_KEYS[f])}
                        value={editVals[f] ?? ''}
                        onChange={(e) => onChangeEdit({ ...editVals, [f]: e.target.value })}
                        className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                      />
                    ))}
                  </div>
                  <textarea
                    placeholder={t('fitment_suitable_models_placeholder')}
                    value={editVals.suitableModelsRaw ?? ''}
                    onChange={(e) => onChangeEdit({ ...editVals, suitableModelsRaw: e.target.value })}
                    rows={3}
                    className="rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                  />
                  <input
                    type="text"
                    placeholder={t('fitment_color_option_placeholder')}
                    value={editVals.colorOptionRaw ?? ''}
                    onChange={(e) => onChangeEdit({ ...editVals, colorOptionRaw: e.target.value })}
                    className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                  />
                  <div className="mt-1 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)]"
                    >
                      {t('fitment_cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={onSaveEdit}
                      disabled={isSaving}
                      className="h-8 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3.5 text-xs font-semibold shadow-xs transition hover:opacity-90 disabled:opacity-50"
                    >
                      {isSaving ? t('fitment_saving') : t('save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 text-xs">
                  <div><span className="text-[var(--fg-muted)]">{t('fitment_field_brand')}:</span> <strong className="font-semibold text-[var(--fg)] ml-1">{row.brand || '—'}</strong></div>
                  <div><span className="text-[var(--fg-muted)]">{t('fitment_field_model')}:</span> <strong className="font-semibold text-[var(--fg)] ml-1">{row.model || '—'}</strong></div>
                  <div><span className="text-[var(--fg-muted)]">{t('fitment_field_year')}:</span> <strong className="font-semibold text-[var(--fg)] ml-1">{row.year || '—'}</strong></div>
                  <div><span className="text-[var(--fg-muted)]">{isTr ? 'Uyumlu Modeller' : 'Suitable Models'}:</span> <strong className="font-semibold text-[var(--fg)] ml-1">{row.suitableModelsRaw || '—'}</strong></div>
                  <div><span className="text-[var(--fg-muted)]">{isTr ? 'Renk Seçeneği' : 'Color Option'}:</span> <strong className="font-semibold text-[var(--fg)] ml-1">{row.colorOptionRaw || '—'}</strong></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border-soft)] p-3 px-4">
          <button
            type="button"
            onClick={() => { if (window.confirm(isTr ? `"${row.sku}" silinsin mi?` : `Delete "${row.sku}"?`)) { onDelete(); onClose(); } }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-red-500/30 px-3 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
          >
            <Trash2 size={13} /> {t('delete')}
          </button>

          <div className="flex items-center gap-2">
            {row.rowStatus !== 'Rejected' && row.rowStatus !== 'Approved' && (
              <button
                type="button"
                onClick={() => { onReject(); onClose(); }}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)]"
              >
                <X size={13} /> {t('fitment_reject')}
              </button>
            )}
            <button
              type="button"
              onClick={onResolve}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] shadow-xs transition hover:bg-[var(--bg-subtle)]"
            >
              <RefreshCw size={12} /> {t('fitment_resolve_sibling_skus')}
            </button>
            {row.rowStatus !== 'Approved' && (
              <button
                type="button"
                onClick={() => { onApprove(); onClose(); }}
                className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 px-3.5 text-xs font-semibold shadow-xs transition hover:opacity-90"
              >
                <Check size={13} /> {t('confirm')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
