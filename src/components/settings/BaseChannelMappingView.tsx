'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { baseChannelMappingApi, type BaseChannelMappingRow } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

const STORE_OPTIONS = [
  { id: 1, label: 'StoreA' },
  { id: 2, label: 'StoreB' },
];

const EMPTY_CHANNELS: BaseChannelMappingRow[] = [];

export function BaseChannelMappingView({ embedded = false }: { embedded?: boolean }) {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editStoreId, setEditStoreId] = useState<number>(1);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['base-channel-mappings'],
    queryFn: baseChannelMappingApi.overview,
  });
  const channels = data?.channels ?? EMPTY_CHANNELS;

  const showMsg = (text: string, ok: boolean) => {
    setStatusMsg({ text, ok });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const createMutation = useMutation({
    meta: { successMessage: 'Kanal eşlemesi eklendi' } as const,
    mutationFn: baseChannelMappingApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-channel-mappings'] });
      showMsg(lang === 'tr' ? 'Kanal eşlendi.' : 'Channel mapped.', true);
      setEditingKey(null);
    },
    onError: (err: unknown) => showMsg((lang === 'tr' ? 'Eşleme başarısız: ' : 'Mapping failed: ') + (err instanceof Error ? err.message : String(err)), false),
  });

  const updateMutation = useMutation({
    meta: { successMessage: 'Kanal eşlemesi güncellendi' } as const,
    mutationFn: ({ id, storeId }: { id: number; storeId: number }) => baseChannelMappingApi.update(id, storeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-channel-mappings'] });
      showMsg(lang === 'tr' ? 'Eşleme güncellendi.' : 'Mapping updated.', true);
      setEditingKey(null);
    },
    onError: (err: unknown) => showMsg((lang === 'tr' ? 'Güncelleme başarısız: ' : 'Update failed: ') + (err instanceof Error ? err.message : String(err)), false),
  });

  const removeMutation = useMutation({
    meta: { successMessage: 'Kanal eşlemesi silindi' } as const,
    mutationFn: (id: number) => baseChannelMappingApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['base-channel-mappings'] });
      showMsg(lang === 'tr' ? 'Eşleme silindi.' : 'Mapping removed.', true);
    },
    onError: (err: unknown) => showMsg((lang === 'tr' ? 'Silme başarısız: ' : 'Delete failed: ') + (err instanceof Error ? err.message : String(err)), false),
  });

  const rowKey = (c: BaseChannelMappingRow) => `${c.orderSource}:${c.orderSourceId}`;

  const startEdit = (c: BaseChannelMappingRow) => {
    setEditingKey(rowKey(c));
    setEditStoreId(c.mapping?.storeId ?? 1);
  };

  const saveEdit = (c: BaseChannelMappingRow) => {
    if (c.mapping) {
      updateMutation.mutate({ id: c.mapping.id, storeId: editStoreId });
    } else {
      createMutation.mutate({ orderSource: c.orderSource, orderSourceId: c.orderSourceId, storeId: editStoreId });
    }
  };

  const handleDelete = (c: BaseChannelMappingRow) => {
    if (!c.mapping) return;
    if (!window.confirm(lang === 'tr' ? 'Bu eşlemeyi silmek istediğinize emin misiniz?' : 'Delete this mapping?')) return;
    removeMutation.mutate(c.mapping.id);
  };

  return (
    <div style={{ padding: embedded ? 0 : '24px', display: 'flex', flexDirection: 'column', gap: 20, height: embedded ? 'auto' : '100%', overflowY: embedded ? 'visible' : 'auto' }}>
      <style>{`
        .mapping-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .mapping-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 700;
          color: var(--fg-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-subtle);
        }
        .mapping-table td {
          padding: 14px 16px;
          color: var(--fg);
          vertical-align: middle;
        }
        .mapping-table tr {
          transition: background 0.15s ease;
        }
        .mapping-table tbody tr:hover {
          background: var(--bg-subtle);
        }
        .mapping-table tr:not(:last-child) td {
          border-bottom: 1px solid var(--border-soft);
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11.5px;
          font-weight: 700;
        }
        .status-mapped {
          background: rgba(16,185,129,0.12);
          color: #10b981;
        }
        .status-unmapped {
          background: rgba(245,158,11,0.12);
          color: #f59e0b;
        }
        .btn-action {
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-action-primary {
          background: var(--accent);
          color: #fff;
        }
        .btn-action-primary:hover {
          opacity: 0.9;
        }
        .btn-action-secondary {
          background: var(--bg-subtle);
          color: var(--fg);
          border: 1px solid var(--border-soft);
        }
        .btn-action-secondary:hover {
          background: var(--border-soft);
          border-color: var(--fg-subtle);
        }
        .btn-action-danger {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
        }
        .btn-action-danger:hover {
          background: rgba(239,68,68,0.18);
        }
        .mapping-select {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-soft);
          background: var(--bg);
          color: var(--fg);
          font-size: 12.5px;
          font-family: inherit;
          outline: none;
          cursor: pointer;
        }
        .mapping-select:focus {
          border-color: #e52521;
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-action btn-action-secondary"
          style={{ height: 38, gap: 6, flexShrink: 0 }}
        >
          {isFetching ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
          {lang === 'tr' ? 'Canlı Yenile' : 'Refresh Live'}
        </button>
      </div>

      {/* Görsel kanal haritası */}
      {!isLoading && channels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {STORE_OPTIONS.map((store) => {
            const mapped = channels.filter((c) => c.mapping?.storeId === store.id);
            return (
              <div key={store.id} style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--fg)' }}>{store.label}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: 'rgba(16,185,129,0.1)', color: 'var(--success)',
                  }}>{mapped.length}</span>
                </div>
                {mapped.length === 0 ? (
                  <span style={{ fontSize: 11.5, color: 'var(--fg-muted)', fontStyle: 'italic' }}>
                    {lang === 'tr' ? 'Kanal yok' : 'No channels'}
                  </span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {mapped.map((c) => (
                      <span key={`${c.orderSource}:${c.orderSourceId}`} className="font-mono" style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '3px 8px', borderRadius: 6, background: 'var(--bg-subtle)', color: 'var(--fg)',
                        border: '1px solid var(--border-soft)',
                      }}>
                        {c.accountName ?? `${c.orderSource}/${c.orderSourceId}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {(() => {
            const unmapped = channels.filter((c) => !c.isMapped);
            if (unmapped.length === 0) return null;
            return (
              <div style={{
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 14,
                padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <AlertTriangle size={13} color="#f59e0b" />
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--warning)' }}>
                    {lang === 'tr' ? 'Eşlenmemiş' : 'Unmapped'}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: 'rgba(245,158,11,0.15)', color: 'var(--warning)',
                  }}>{unmapped.length}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {unmapped.map((c) => (
                    <span key={`${c.orderSource}:${c.orderSourceId}`} className="font-mono" style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: 'var(--warning)',
                      border: '1px solid rgba(245,158,11,0.25)',
                    }}>
                      {c.accountName ?? `${c.orderSource}/${c.orderSourceId}`}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {statusMsg && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          background: statusMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: statusMsg.ok ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${statusMsg.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          animation: 'fadeIn 0.2s ease',
        }}>
          {statusMsg.text}
        </div>
      )}

      {data && data.unmappedCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
          fontSize: 13, fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: 'var(--warning)',
          border: '1px solid rgba(245,158,11,0.2)',
          animation: 'pulse 2s infinite',
        }}>
          <AlertTriangle size={15} />
          {lang === 'tr'
            ? `${data.unmappedCount} kanal henüz eşlenmemiş — siparişleri geçici kovaya düşüyor.`
            : `${data.unmappedCount} channel(s) not mapped yet — their orders fall into the fallback bucket.`}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-muted)', padding: 24 }}>
          <Loader2 className="animate-spin" size={20} />
          <span>Eşlemeler Yükleniyor...</span>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 16, background: 'var(--card)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="mapping-table">
            <thead>
              <tr>
                <th>{lang === 'tr' ? 'Kanal' : 'Channel'}</th>
                <th>{lang === 'tr' ? 'Hesap' : 'Account'}</th>
                <th>{lang === 'tr' ? 'Canlı Sipariş' : 'Live Orders'}</th>
                <th>{lang === 'tr' ? 'Mağaza' : 'Store'}</th>
                <th style={{ width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => {
                const key = rowKey(c);
                const isEditing = editingKey === key;
                return (
                  <tr key={key}>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{c.orderSource}/{c.orderSourceId}</td>
                    <td style={{ fontWeight: 500 }}>{c.accountName ?? '—'}</td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{c.liveOrderCount}</td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editStoreId}
                          onChange={(e) => setEditStoreId(Number(e.target.value))}
                          className="mapping-select"
                        >
                          {STORE_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      ) : c.isMapped ? (
                        <span className="status-badge status-mapped">
                          <CheckCircle2 size={13} /> {c.mapping?.storeName}
                        </span>
                      ) : (
                        <span className="status-badge status-unmapped">
                          <AlertTriangle size={13} /> {lang === 'tr' ? 'Eşlenmemiş' : 'Unmapped'}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => saveEdit(c)} className="btn-action btn-action-primary">
                            {lang === 'tr' ? 'Kaydet' : 'Save'}
                          </button>
                          <button onClick={() => setEditingKey(null)} className="btn-action btn-action-secondary">
                            {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => startEdit(c)} className="btn-action btn-action-secondary">
                            {c.isMapped ? (lang === 'tr' ? 'Düzenle' : 'Edit') : (lang === 'tr' ? 'Eşle' : 'Map')}
                          </button>
                          {c.mapping && (
                            <button onClick={() => handleDelete(c)} className="btn-action btn-action-danger">
                              {lang === 'tr' ? 'Sil' : 'Delete'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {channels.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--fg-muted)', padding: 32 }}>
                    {lang === 'tr' ? 'Henüz kanal bulunamadı.' : 'No channels found yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
