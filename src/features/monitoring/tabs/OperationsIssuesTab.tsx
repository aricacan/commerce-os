'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import {
  operationsApi,
  type OperationAssignee,
  type OperationIssue,
  type OperationSeverity,
  type OperationStatus,
  type UpdateOperationRequest,
} from '../../../lib/api/operations';
import { useAuthStore } from '../../../stores/auth';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FilterSelect, type FilterSelectOption } from '../../../components/ui/FilterSelect';

const severityLabels: Record<OperationSeverity, string> = {
  Critical: 'Kritik',
  High: 'Yüksek',
  Medium: 'Orta',
};

const domainLabels: Record<OperationIssue['domain'], string> = {
  Stock: 'Stok',
  Finance: 'Finans',
  Catalog: 'Katalog',
  Approval: 'Onay',
  Integration: 'Entegrasyon',
  Order: 'Sipariş',
  Logistics: 'Lojistik',
};

const statusLabels: Record<OperationStatus, string> = {
  Open: 'Açık',
  InProgress: 'İşlemde',
  Resolved: 'Çözüldü',
  Snoozed: 'Ertelendi',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

// Operasyon Merkezi'nin "iş listesi" görünümü. Onaylar ve Değişiklik Geçmişi artık
// Sistem İzleme'nin kendi sekmeleri; bu bileşen tek bir sorumluluk taşıyor.
export function OperationsIssuesTab() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('All');
  const [domain, setDomain] = useState('All');
  const [store, setStore] = useState('All');
  const [status, setStatus] = useState('Active');
  const [ownership, setOwnership] = useState('All');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<OperationIssue | null>(null);

  const query = useQuery({
    queryKey: ['operations-workspace'],
    queryFn: () => operationsApi.getWorkspace(),
    staleTime: 30_000,
  });

  useEffect(() => {
    const saved = window.localStorage.getItem('operations-view');
    if (!saved) return;
    try {
      const preferences = JSON.parse(saved) as {
        severity?: string;
        domain?: string;
        status?: string;
        ownership?: string;
        density?: 'comfortable' | 'compact';
      };
      if (preferences.severity) setSeverity(preferences.severity);
      if (preferences.domain) setDomain(preferences.domain);
      if (preferences.status) setStatus(preferences.status);
      if (preferences.ownership) setOwnership(preferences.ownership);
      if (preferences.density) setDensity(preferences.density);
    } catch {
      window.localStorage.removeItem('operations-view');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      'operations-view',
      JSON.stringify({ severity, domain, status, ownership, density })
    );
  }, [density, domain, ownership, severity, status]);

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateOperationRequest }) =>
      operationsApi.update(id, body),
    onSuccess: (updated) => {
      setSelectedIssue(updated);
      void queryClient.invalidateQueries({ queryKey: ['operations-workspace'] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (body: UpdateOperationRequest) =>
      operationsApi.bulkUpdate({ workItemIds: Array.from(selectedIds), ...body }),
    onSuccess: () => {
      setSelectedIds(new Set());
      void queryClient.invalidateQueries({ queryKey: ['operations-workspace'] });
    },
  });

  const issues = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');
    return (query.data?.issues ?? []).filter((issue) => {
      const matchesSearch =
        !normalizedSearch ||
        `${issue.title} ${issue.description} ${issue.storeCode ?? ''}`
          .toLocaleLowerCase('tr-TR')
          .includes(normalizedSearch);
      return (
        matchesSearch &&
        (severity === 'All' || issue.severity === severity) &&
        (domain === 'All' || issue.domain === domain) &&
        (store === 'All' || issue.storeCode === store) &&
        (status === 'All' ||
          (status === 'Active' ? issue.status !== 'Resolved' : issue.status === status)) &&
        (ownership === 'All' ||
          (ownership === 'Mine'
            ? issue.assigneeUserId === currentUser?.id
            : issue.assigneeUserId === null))
      );
    });
  }, [currentUser?.id, domain, ownership, query.data?.issues, search, severity, status, store]);

  const stores = useMemo(
    () =>
      Array.from(
        new Set(
          (query.data?.issues ?? [])
            .map((issue) => issue.storeCode)
            .filter((code): code is string => Boolean(code))
        )
      ).sort(),
    [query.data?.issues]
  );

  useEffect(() => {
    if (!selectedIssue || !query.data) return;
    const refreshed = query.data.issues.find((issue) => issue.workItemId === selectedIssue.workItemId);
    if (refreshed && refreshed !== selectedIssue) setSelectedIssue(refreshed);
  }, [query.data, selectedIssue]);

  const clearFilters = () => {
    setSearch('');
    setSeverity('All');
    setDomain('All');
    setStore('All');
    setStatus('Active');
    setOwnership('All');
  };

  // Dropdown Options
  const severityOptions: FilterSelectOption[] = [
    { value: 'All', label: 'Tüm Önemler' },
    { value: 'Critical', label: 'Kritik' },
    { value: 'High', label: 'Yüksek' },
    { value: 'Medium', label: 'Orta' },
  ];

  const domainOptions: FilterSelectOption[] = [
    { value: 'All', label: 'Tüm Alanlar' },
    ...Object.entries(domainLabels).map(([value, label]) => ({ value, label })),
  ];

  const storeOptions: FilterSelectOption[] = [
    { value: 'All', label: 'Tüm Mağazalar' },
    ...stores.map((storeCode) => ({ value: storeCode, label: storeCode })),
  ];

  const statusOptions: FilterSelectOption[] = [
    { value: 'Active', label: 'Aktif İşler' },
    { value: 'All', label: 'Tüm Durumlar' },
    ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
  ];

  const ownershipOptions: FilterSelectOption[] = [
    { value: 'All', label: 'Tüm Sorumlular' },
    { value: 'Mine', label: 'Bana Atananlar' },
    { value: 'Unassigned', label: 'Atanmamış' },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {/* Aksiyon Barı */}
      <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="inline-flex h-7 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-50"
          >
          {query.isFetching ? 'Yenileniyor…' : 'Yenile'}
        </button>
      </div>

      <main className="space-y-3.5">
        {/* Arama ve Filtreler Barı */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="İş, SKU veya mağaza ara..."
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <FilterSelect
            value={severity}
            onChange={setSeverity}
            placeholder="Önem"
            options={severityOptions}
            minWidth={120}
          />

          <FilterSelect
            value={domain}
            onChange={setDomain}
            placeholder="Alan"
            options={domainOptions}
            minWidth={120}
          />

          <FilterSelect
            value={store}
            onChange={setStore}
            placeholder="Mağaza"
            options={storeOptions}
            minWidth={130}
          />

          <FilterSelect
            value={status}
            onChange={setStatus}
            placeholder="Durum"
            options={statusOptions}
            minWidth={120}
          />

          <FilterSelect
            value={ownership}
            onChange={setOwnership}
            placeholder="Sorumlu"
            options={ownershipOptions}
            minWidth={130}
          />

          <button
            type="button"
            onClick={() => setDensity((value) => (value === 'compact' ? 'comfortable' : 'compact'))}
            className="h-8 px-2.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {density === 'compact' ? 'Geniş' : 'Sıkışık'}
          </button>
        </div>

        {/* Toplu İşlem Barı */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-xs">
            <span className="mr-auto text-xs font-semibold text-[var(--fg)]">
              {selectedIds.size} iş seçildi
            </span>
            <button
              type="button"
              onClick={() => bulkMutation.mutate({ status: 'InProgress' })}
              className="rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              İşleme Al
            </button>
            <button
              type="button"
              onClick={() => bulkMutation.mutate({ assigneeUserId: currentUser?.id })}
              disabled={!currentUser}
              className="rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
            >
              Bana Ata
            </button>
            <button
              type="button"
              onClick={() => bulkMutation.mutate({ status: 'Resolved' })}
              className="rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              Çözüldü
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-[3px] border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
            >
              Vazgeç
            </button>
          </div>
        )}

        {/* Tablo Kartı */}
        <section className="overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
          {query.isLoading ? (
            <LoadingRows />
          ) : query.isError ? (
            <ErrorState
              title="Operasyon işleri yüklenemedi"
              description="Sunucu bağlantısını kontrol edip tekrar deneyin."
              detail={query.error instanceof Error ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : issues.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={(query.data?.issues.length ?? 0) === 0 ? 'Açık operasyon işi yok' : 'Filtreye uyan iş yok'}
              description={
                (query.data?.issues.length ?? 0) === 0
                  ? 'Mevcut kontroller aksiyon gerektiren bir durum bulmadı.'
                  : 'Arama veya filtreleri temizleyerek tüm işleri görüntüleyin.'
              }
              action={
                (query.data?.issues.length ?? 0) > 0
                  ? { label: 'Filtreleri temizle', onClick: clearFilters }
                  : undefined
              }
            />
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        aria-label="Tüm işleri seç"
                        checked={issues.length > 0 && issues.every((issue) => selectedIds.has(issue.workItemId))}
                        onChange={(event) =>
                          setSelectedIds(
                            event.target.checked
                              ? new Set(issues.map((issue) => issue.workItemId))
                              : new Set()
                          )
                        }
                        className="rounded-[2px] accent-[var(--fg)] cursor-pointer"
                      />
                    </th>
                    <th className="w-24 px-3 py-2.5">Önem</th>
                    <th className="w-24 px-3 py-2.5">Durum</th>
                    <th className="px-4 py-2.5">İş / Açıklama</th>
                    <th className="w-36 px-4 py-2.5">Sorumlu</th>
                    <th className="w-36 px-4 py-2.5 text-right">Son Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)] text-[var(--fg)]">
                  {issues.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className={`group cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]/40 ${
                        density === 'compact' ? 'h-9' : 'h-12'
                      }`}
                    >
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`${issue.title} seç`}
                          checked={selectedIds.has(issue.workItemId)}
                          onChange={(event) =>
                            setSelectedIds((previous) => {
                              const next = new Set(previous);
                              if (event.target.checked) next.add(issue.workItemId);
                              else next.delete(issue.workItemId);
                              return next;
                            })
                          }
                          className="rounded-[2px] accent-[var(--fg)] cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <SeverityBadge severity={issue.severity} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <StatusBadge status={issue.status} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-[var(--fg)] line-clamp-1">{issue.title}</div>
                        <div className="text-[11px] text-[var(--fg-muted)] line-clamp-1">
                          {domainLabels[issue.domain]} · {issue.description}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-[var(--fg-muted)]">
                        {issue.assigneeName ?? 'Atanmamış'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-xs">
                        <span
                          className={
                            issue.isOverdue ? 'font-semibold text-[var(--danger)]' : 'text-[var(--fg-muted)]'
                          }
                        >
                          {issue.dueAt ? formatDate(issue.dueAt) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Detay Çekmecesi (IssueDrawer) */}
      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          assignees={query.data?.assignees ?? []}
          updating={updateMutation.isPending}
          onUpdate={(body) => updateMutation.mutate({ id: selectedIssue.workItemId, body })}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ['operations-workspace'] })}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: OperationSeverity }) {
  return (
    <span
      className={`inline-flex w-fit items-center text-xs font-semibold ${
        severity === 'Critical'
          ? 'text-[var(--danger)] font-bold'
          : severity === 'High'
          ? 'text-[var(--warning)] font-bold'
          : 'text-[var(--fg-muted)]'
      }`}
    >
      {severityLabels[severity]}
    </span>
  );
}

function StatusBadge({ status }: { status: OperationStatus }) {
  return (
    <span className="w-fit rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--fg-muted)]">
      {statusLabels[status]}
    </span>
  );
}

function IssueDrawer({
  issue,
  assignees,
  updating,
  onUpdate,
  onChanged,
  onClose,
}: {
  issue: OperationIssue;
  assignees: OperationAssignee[];
  updating: boolean;
  onUpdate: (body: UpdateOperationRequest) => void;
  onChanged: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const noteMutation = useMutation({
    mutationFn: () => operationsApi.addNote(issue.workItemId, note),
    onSuccess: () => {
      setNote('');
      onChanged();
    },
  });

  return (
    <div
      className="fixed inset-0 z-[99999] flex justify-end bg-black/40 backdrop-blur-xs text-left"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        aria-label="Operasyon iş detayı"
      >
        {/* Drawer Başlığı */}
        <div className="flex items-start justify-between border-b border-[var(--border-soft)] p-5">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <SeverityBadge severity={issue.severity} />
              <StatusBadge status={issue.status} />
            </div>
            <h2 className="mt-2 text-base font-bold text-[var(--fg)]">{issue.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--fg-muted)]">{issue.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            Kapat
          </button>
        </div>

        {/* Drawer Gövde */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5">
          {/* İş Yönetimi */}
          <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-3.5 space-y-2.5">
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              İş Durumu ve Atama
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={issue.status}
                disabled={updating}
                onChange={(event) => onUpdate({ status: event.target.value as OperationStatus })}
                className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-semibold text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none cursor-pointer"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={issue.assigneeUserId ?? ''}
                disabled={updating}
                onChange={(event) =>
                  onUpdate(
                    event.target.value
                      ? { assigneeUserId: Number(event.target.value) }
                      : { clearAssignee: true }
                  )
                }
                className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs font-semibold text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none cursor-pointer"
              >
                <option value="">Atanmamış</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name || assignee.email}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                defaultValue={issue.dueAt ? issue.dueAt.slice(0, 16) : ''}
                onBlur={(event) =>
                  event.target.value && onUpdate({ dueAt: new Date(event.target.value).toISOString() })
                }
                className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                aria-label="Son tarih"
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({ snoozedUntil: new Date(Date.now() + 86_400_000).toISOString() })
                  }
                  className="flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                >
                  1 Gün Ertele
                </button>
                {issue.snoozedUntil && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ clearSnooze: true })}
                    className="rounded-[4px] border border-[var(--border)] px-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
                  >
                    Aç
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Bağlam Detayları */}
          <section className="space-y-1.5">
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              Bağlam Detayları
            </h3>
            <dl className="grid grid-cols-2 gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
              <Detail label="Alan" value={domainLabels[issue.domain]} />
              <Detail label="Mağaza" value={issue.storeCode ?? 'Genel'} />
              <Detail label="Kayıt" value={`${issue.entityType} #${issue.entityId}`} />
              <Detail label="Tespit Tarihi" value={formatDate(issue.detectedAt)} />
            </dl>
          </section>

          {/* Ekip Notları */}
          <section className="space-y-2">
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              Ekip Notları
            </h3>
            <div className="flex gap-2">
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ekip için operasyonel not bırakın…"
                maxLength={2000}
                rows={2}
                className="flex-1 resize-none rounded-[4px] border border-[var(--border)] bg-[var(--bg)] p-2 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
              <button
                type="button"
                disabled={!note.trim() || noteMutation.isPending}
                onClick={() => noteMutation.mutate()}
                className="self-end rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 py-2 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-40"
              >
                Ekle
              </button>
            </div>
            <div className="space-y-2">
              {issue.notes.map((item) => (
                <div key={item.id} className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/20 p-2.5">
                  <div className="flex justify-between text-[10.5px] text-[var(--fg-muted)]">
                    <span className="font-semibold text-[var(--fg)]">{item.authorName}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--fg)] whitespace-pre-wrap">{item.body}</p>
                </div>
              ))}
              {issue.notes.length === 0 && (
                <p className="text-xs text-[var(--fg-muted)]">Henüz not eklenmemiş.</p>
              )}
            </div>
          </section>

          {/* İş Geçmişi */}
          <section className="space-y-1.5">
            <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              İş Geçmişi
            </h3>
            <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
              {issue.activities.map((activity) => (
                <div key={activity.id} className="py-2">
                  <p className="text-xs font-medium text-[var(--fg)]">{activity.description}</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--fg-muted)]">
                    {activity.actorName} · {formatDate(activity.createdAt)}
                  </p>
                </div>
              ))}
              {issue.activities.length === 0 && (
                <p className="py-2 text-xs text-[var(--fg-muted)]">Henüz bir hareket kaydı yok.</p>
              )}
            </div>
          </section>

          {/* Teknik Bulgular */}
          {Object.keys(issue.facts).length > 0 && (
            <section className="space-y-1.5">
              <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                Teknik Bulgular
              </h3>
              <dl className="divide-y divide-[var(--border-soft)] rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
                {Object.entries(issue.facts).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-3 py-2 text-xs">
                    <dt className="text-[var(--fg-muted)]">{label}</dt>
                    <dd className="font-semibold text-[var(--fg)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold text-[var(--fg-muted)]">{label}</dt>
      <dd className="mt-0.5 text-xs font-bold text-[var(--fg)]">{value}</dd>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-[var(--border-soft)] p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 py-2 animate-pulse">
          <div className="h-4 w-4 bg-[var(--bg-subtle)] rounded" />
          <div className="h-4 w-16 bg-[var(--bg-subtle)] rounded" />
          <div className="h-4 w-20 bg-[var(--bg-subtle)] rounded" />
          <div className="h-4 flex-1 bg-[var(--bg-subtle)] rounded" />
          <div className="h-4 w-24 bg-[var(--bg-subtle)] rounded" />
        </div>
      ))}
    </div>
  );
}
