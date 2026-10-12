'use client';

import React, { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { formatDateTime } from '../../lib/format';import { useAuditLog } from '../../hooks/monitoring/useMonitoring';

const PAGE_SIZE = 25;

const SETTINGS_ENTITY_LABELS: Record<string, string> = {
  SystemSetting: 'Sistem Ayarı',
  PlatformApiCredential: 'Pazaryeri Entegrasyonu',
  Platform: 'Platform',
  PlatformStoreSetting: 'Platform Mağaza Ayarı',
  ShippingRate: 'Kargo Ücreti',
  ShippingExtraFee: 'Ek Kargo Ücreti',
  CategoryRule: 'Kategori Kuralı',
  ErpCredential: 'ERP Bağlantısı',
  ErpConnectorTypeCatalog: 'ERP Bağlayıcı Türü',
  NotificationRoute: 'Bildirim Yönlendirme',
  PagePermission: 'Sayfa Yetkisi',
  ModuleAccess: 'Modül Erişimi',
  User: 'Kullanıcı / Yetki',
};

const SETTINGS_ENTITY_TYPES = Object.keys(SETTINGS_ENTITY_LABELS);

const ACTION_LABELS: Record<string, string> = {
  EF_Added: 'Oluşturuldu',
  EF_Modified: 'Güncellendi',
  EF_Deleted: 'Silindi',
  SetModuleAccess: 'Erişim Listesi Güncellendi',
  UpdatePagePermission: 'Yetki Güncellendi',
  CreateUser: 'Kullanıcı Oluşturuldu',
  UpdateUser: 'Kullanıcı Güncellendi',
  DeleteUser: 'Kullanıcı Silindi',
  AssignRole: 'Rol Atandı',
  RemoveRole: 'Rol Kaldırıldı',
  ChangePassword: 'Şifre Değiştirildi',
  ToggleActive: 'Aktiflik Değiştirildi',
  LoginSucceeded: 'Giriş Yapıldı',
  LoginFailed: 'Başarısız Giriş',
  Logout: 'Çıkış Yapıldı',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.length > 60 ? `${value.slice(0, 60)}…` : value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface ParsedChange {
  key: string;
  oldValue?: unknown;
  newValue?: unknown;
  value?: unknown;
  isDiff: boolean;
}

function parseDetails(details: string | null): { changes: ParsedChange[]; raw: string } | { raw: string } | null {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      const changes: ParsedChange[] = entries.map(([key, val]) => {
        if (
          val &&
          typeof val === 'object' &&
          !Array.isArray(val) &&
          ('Old' in (val as object) || 'New' in (val as object))
        ) {
          const v = val as { Old?: unknown; New?: unknown };
          return { key, oldValue: v.Old, newValue: v.New, isDiff: true };
        }
        return { key, value: val, isDiff: false };
      });
      return { changes, raw: JSON.stringify(parsed, null, 2) };
    }
  } catch {
    // JSON değil — ham metin
  }
  return { raw: details };
}

function ChangeSummary({ details }: { details: string | null }) {
  const parsed = parseDetails(details);
  if (!parsed) return <span className="text-[var(--fg-subtle)]">—</span>;

  if (!('changes' in parsed)) {
    const truncated = parsed.raw.length > 140 ? `${parsed.raw.slice(0, 140)}…` : parsed.raw;
    return (
      <div className="flex flex-col gap-1 text-left">
        <span className="text-xs text-[var(--fg-muted)]">{truncated}</span>
        {parsed.raw.length > 140 && <RawDetail raw={parsed.raw} />}
      </div>
    );
  }

  const shown = parsed.changes.slice(0, 3);
  const more = parsed.changes.length - shown.length;

  return (
    <div className="flex flex-col gap-1 text-left">
      {shown.map((c) => (
        <div key={c.key} className="text-xs text-[var(--fg-muted)]">
          <span className="font-semibold text-[var(--fg)]">{c.key}</span>
          {c.isDiff ? (
            <>
              : {formatValue(c.oldValue)} <span className="text-[var(--fg-subtle)]">→</span>{' '}
              {formatValue(c.newValue)}
            </>
          ) : (
            <>: {formatValue(c.value)}</>
          )}
        </div>
      ))}
      {more > 0 && <span className="text-[11px] text-[var(--fg-subtle)]">+{more} alan daha</span>}
      <RawDetail raw={parsed.raw} />
    </div>
  );
}

function RawDetail({ raw }: { raw: string }) {
  return (
    <details className="mt-1">
      <summary className="cursor-pointer select-none text-[10.5px] font-semibold text-[var(--fg-subtle)] hover:text-[var(--fg)]">
        Ham JSON
      </summary>
      <pre className="mt-1.5 max-w-lg overflow-x-auto rounded-lg bg-[var(--bg-subtle)] p-2 font-mono text-[10.5px] text-[var(--fg-muted)] whitespace-pre-wrap break-all border border-[var(--border-soft)]">
        {raw}
      </pre>
    </details>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fg)] whitespace-nowrap">
      {actionLabel(action)}
    </span>
  );
}

export function ChangeHistory() {
  const { lang } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');

  const { data, isLoading, isError } = useAuditLog({
    page,
    pageSize: PAGE_SIZE,
    action: search || undefined,
    entityTypes: entityType || SETTINGS_ENTITY_TYPES.join(','),
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNextPage = page * PAGE_SIZE < totalCount;

  return (
    <div className="flex w-full flex-col gap-4 p-4 lg:p-6 text-left">
      {/* Filtre Barı */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={lang === 'tr' ? 'İşlem veya kullanıcı ara...' : 'Search action or user...'}
          className="h-9 w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--fg)] outline-none placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg)]"
        />

        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
        >
          <option value="">{lang === 'tr' ? 'Tüm Ayar Türleri' : 'All Setting Types'}</option>
          {SETTINGS_ENTITY_TYPES.map((et) => (
            <option key={et} value={et}>
              {SETTINGS_ENTITY_LABELS[et]}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs font-semibold text-[var(--fg-muted)]">
          Toplam <span className="font-bold text-[var(--fg)]">{totalCount}</span> kayıt
        </span>
      </div>

      {/* Tablo Kartı */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-[var(--border)] bg-[var(--card)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-subtle)]">
              <tr>
                <th className="px-4 py-3">{lang === 'tr' ? 'Kullanıcı' : 'User'}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'Ayar / Nesne' : 'Setting / Entity'}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'İşlem' : 'Action'}</th>
                <th className="px-4 py-3">{lang === 'tr' ? 'Değişiklik Özeti' : 'Changes'}</th>
                <th className="px-4 py-3 text-right">{lang === 'tr' ? 'Tarih' : 'Timestamp'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)] text-[var(--fg)]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-xs text-[var(--fg-muted)]">
                    {lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-xs font-semibold text-red-600">
                    {lang === 'tr' ? 'Değişiklik geçmişi yüklenemedi.' : 'Failed to load change history.'}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-xs text-[var(--fg-muted)]">
                    {lang === 'tr' ? 'Kayıt bulunamadı.' : 'No records found.'}
                  </td>
                </tr>
              ) : (
                items.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3 font-semibold text-[var(--fg)] whitespace-nowrap">
                      {entry.userEmail ?? 'Sistem'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="rounded bg-[var(--bg-subtle)] px-2 py-0.5 font-semibold text-[var(--fg-muted)] border border-[var(--border-soft)]">
                        {SETTINGS_ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                        {entry.entityId ? ` #${entry.entityId}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionBadge action={entry.action} />
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <ChangeSummary details={entry.details} />
                    </td>
                    <td className="px-4 py-3 text-right text-[11px] text-[var(--fg-muted)] whitespace-nowrap">
                      {formatDateTime(entry.createdAt, lang, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5 bg-[var(--card)]">
          <span className="text-xs text-[var(--fg-muted)]">
            Sayfa {page} / {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card-hover)] disabled:opacity-40"
            >
              {lang === 'tr' ? 'Önceki' : 'Previous'}
            </button>
            <button
              disabled={!hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card-hover)] disabled:opacity-40"
            >
              {lang === 'tr' ? 'Sonraki' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
