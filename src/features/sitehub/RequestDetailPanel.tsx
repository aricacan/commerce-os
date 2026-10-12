'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Mail, Phone, Globe, Clock } from 'lucide-react';
import {
  siteHubApi, REQUEST_STATUS,
  type SiteRequestDetailDto, type SiteRequestStatus,
} from '../../lib/api/sitehub';
import { ErrorState, TypeBadge, formatDateTime } from './shared';
import { FilterSelect } from '../../components/ui/FilterSelect';

interface Props {
  requestId: number;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: String(REQUEST_STATUS.New), label: 'Yeni (İşlenmemiş)' },
  { value: String(REQUEST_STATUS.InProgress), label: 'İnceleniyor' },
  { value: String(REQUEST_STATUS.Quoted), label: 'Teklif Verildi' },
  { value: String(REQUEST_STATUS.Won), label: 'Kazanıldı' },
  { value: String(REQUEST_STATUS.Lost), label: 'Kaybedildi' },
  { value: String(REQUEST_STATUS.Closed), label: 'Kapatıldı' },
];

function parseExtraFields(rawJson: string | null | undefined): Record<string, string> {
  if (!rawJson) return {};
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const excluded = new Set([
      'name', 'fullname', 'full_name', 'email', 'phone', 'telephone',
      'message', 'service', 'product', 'subject', 'site', 'siteid',
    ]);
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!excluded.has(k.toLowerCase()) && v !== null && v !== undefined && String(v).trim()) {
        result[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function RequestDetailPanel({ requestId, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<{
    requestId: number;
    status: SiteRequestStatus;
    note: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const requestQueryKey = ['sitehub', 'request', requestId] as const;

  const { data: request, isLoading: loading, error: queryError } = useQuery<SiteRequestDetailDto>({
    queryKey: requestQueryKey,
    queryFn: () => siteHubApi.getRequest(requestId),
  });
  const error = saveError ?? (queryError instanceof Error ? queryError.message : null);
  const status = draft?.requestId === requestId
    ? draft.status
    : request?.status ?? REQUEST_STATUS.New;
  const note = draft?.requestId === requestId
    ? draft.note
    : request?.internalNote ?? '';

  const extraFields = useMemo(() => parseExtraFields(request?.rawPayloadJson), [request?.rawPayloadJson]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await siteHubApi.updateRequest(requestId, { status, internalNote: note || null });
      await queryClient.invalidateQueries({ queryKey: requestQueryKey });
      onSaved();
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="w-96 shrink-0 flex flex-col h-full bg-[var(--card)] border-l border-[var(--border-soft)] text-xs">
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-3.5 px-4 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-[var(--fg)]">Talep Detayı #{requestId}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && <div className="py-8 text-center text-xs text-[var(--fg-muted)]">Detaylar yükleniyor...</div>}
        {error && <ErrorState text={error} />}

        {request && (
          <>
            {/* Sender Summary Card */}
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--fg)]">{request.name}</span>
                <TypeBadge type={request.sourceType} />
              </div>

              <div className="space-y-1 text-[11px] text-[var(--fg-muted)] font-mono">
                {request.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail size={12} className="shrink-0" />
                    <span>{request.email}</span>
                  </div>
                )}
                {request.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="shrink-0" />
                    <span>{request.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Globe size={12} className="shrink-0" />
                  <span>{request.siteName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="shrink-0" />
                  <span>{formatDateTime(request.receivedAt ?? request.importedAt)}</span>
                </div>
              </div>
            </div>

            {/* Requested Service / Product */}
            {request.service && (
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Talep Edilen Hizmet / Ürün
                </label>
                <div className="p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)] font-semibold text-[var(--fg)] text-xs">
                  {request.service}
                </div>
              </div>
            )}

            {/* Customer Message */}
            {request.message && (
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Müşteri Mesajı
                </label>
                <div className="p-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)] text-[var(--fg)] text-xs whitespace-pre-wrap leading-relaxed">
                  {request.message}
                </div>
              </div>
            )}

            {/* Extra Fields */}
            {Object.keys(extraFields).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-soft)]">
                <label className="block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Ek Form Bilgileri
                </label>
                <div className="space-y-1">
                  {Object.entries(extraFields).map(([k, v]) => (
                    <div key={k} className="p-1.5 px-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg)] flex items-center justify-between text-[11px]">
                      <span className="text-[var(--fg-muted)] font-medium">{k}:</span>
                      <span className="font-mono text-[var(--fg)]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status & Internal Note Form */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-soft)]">
              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Talep Durumu
                </label>
                <FilterSelect
                  value={String(status)}
                  onChange={(v) => setDraft((prev) => ({
                    requestId,
                    status: Number(v) as SiteRequestStatus,
                    note: prev?.note ?? note,
                  }))}
                  placeholder="Durum Seçin"
                  height="h-8"
                  options={STATUS_OPTIONS}
                />
              </div>

              <div>
                <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase">
                  Dahili Yönetici Notu
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setDraft((prev) => ({
                    requestId,
                    status: prev?.status ?? status,
                    note: e.target.value,
                  }))}
                  placeholder="Müşteriye teklif verildi, WhatsApp'tan arandı..."
                  rows={3}
                  className="w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-3 px-4 border-t border-[var(--border-soft)] bg-[var(--card)] flex items-center justify-end gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
        >
          Kapat
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="h-8 px-4 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40"
        >
          {saving ? 'Kaydediliyor...' : 'Durumu Güncelle'}
        </button>
      </div>
    </aside>
  );
}
