'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw,
} from 'lucide-react';
import { intelligentApi, type IntelligentDocument } from '../../lib/api';
import { describeError } from '../../lib/errors';
import { useIntelligentDocuments } from '../../hooks/intelligent/useIntelligentDocuments';
import { palette, icon, btnPrimary, errorText } from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { useAuthStore } from '../../stores/auth';

// Belge yükleme/silme/tekrar deneme yetkisi — backend'deki DocumentManagerRoles ile aynı.
// Kontrol yalnız GÖRSEL: sunucu aynı kuralı 403 ile ayrıca uyguluyor.
const WRITE_ROLES = ['SuperAdmin', 'Admin'];

const ACCEPTED_EXTENSIONS = ['.txt', '.csv', '.xlsx', '.xls', '.pdf', '.docx'];
const MAX_FILE_BYTES = 20 * 1024 * 1024;

// "Belgeler" sekmesi: belge yükleme + yüklenen tüm belgelerin listesi (durum rozeti,
// chunk sayısı, göreli yükleme zamanı, silme, başarısız olanlar için tekrar dene).
export function IntelligentDocumentSidebar() {
  const { data: documents, isLoading } = useIntelligentDocuments();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const { notify, confirm, feedback } = useFeedback();
  const roles = useAuthStore((state) => state.user?.roles);
  const canWrite = roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['intelligent-documents'] }),
    [queryClient],
  );

  const processFile = useCallback(async (file: File) => {
    const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setUploadError('Desteklenmeyen dosya türü. Kabul edilenler: ' + ACCEPTED_EXTENSIONS.join(', '));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('Dosya 20 MB sınırını aşıyor.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      await intelligentApi.upload(file);
      await invalidate();
      notify.success('Belge yüklendi, işleniyor.');
    } catch (err) {
      setUploadError(describeError(err));
    } finally {
      setUploading(false);
    }
  }, [invalidate, notify]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const handleDelete = useCallback(async (doc: IntelligentDocument) => {
    const ok = await confirm({
      title: `"${doc.fileName}" silinsin mi?`,
      body: 'Belgenin vektör parçaları da silinir; asistan bu belgenin içeriğine artık cevap veremez. Bu işlem geri alınamaz.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    setDeletingId(doc.id);
    try {
      await intelligentApi.deleteDocument(doc.id);
      await invalidate();
      notify.success('Belge silindi.');
    } catch (err) {
      notify.error(describeError(err));
    } finally {
      setDeletingId(null);
    }
  }, [invalidate, confirm, notify]);

  const handleRetry = useCallback(async (doc: IntelligentDocument) => {
    setRetryingId(doc.id);
    try {
      await intelligentApi.retryDocument(doc.id);
      await invalidate();
      notify.info('Belge yeniden işleme alındı.');
    } catch (err) {
      notify.error(describeError(err));
    } finally {
      setRetryingId(null);
    }
  }, [invalidate, notify]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, background: palette.card }}>
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', rowGap: 10,
        borderBottom: `1px solid ${palette.borderFaint}`, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <FileText size={icon.lg} strokeWidth={icon.stroke} color={palette.accent} />
          <span style={{ fontSize: 12.5, color: palette.textMuted, fontWeight: 500 }}>
            {documents?.length ? `${documents.length} belge` : 'Henüz belge yok'}
          </span>
        </div>
        {canWrite && <div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ ...btnPrimary, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
          >
            {uploading
              ? <Loader2 size={icon.md} strokeWidth={icon.stroke} style={{ animation: 'intelligent-sidebar-spin 1s linear infinite' }} />
              : <Upload size={icon.md} strokeWidth={icon.stroke} />}
            {uploading ? 'Yükleniyor…' : 'Belge Yükle'}
          </button>
          <input ref={inputRef} type="file" accept={ACCEPTED_EXTENSIONS.join(',')} style={{ display: 'none' }} onChange={onFileChange} />
        </div>}
      </div>

      {canWrite && (
        <div style={{ padding: '10px 20px 0', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: palette.textFaint, fontWeight: 500 }}>
            {ACCEPTED_EXTENSIONS.join(' · ')} (maks. 20 MB)
          </div>
          {uploadError && <div style={errorText}>{uploadError}</div>}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px 24px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24, color: palette.textMuted }}>
            <Loader2 size={18} strokeWidth={icon.stroke} style={{ animation: 'intelligent-sidebar-spin 1.2s linear infinite' }} />
          </div>
        ) : !documents || documents.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: palette.textMuted }}>
            Henüz belge yüklenmedi.
          </div>
        ) : (
          documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              canWrite={canWrite}
              deleting={deletingId === doc.id}
              retrying={retryingId === doc.id}
              onDelete={() => handleDelete(doc)}
              onRetry={() => handleRetry(doc)}
            />
          ))
        )}
      </div>

      {feedback}

      <style>{`
        @keyframes intelligent-sidebar-spin { to { transform: rotate(360deg); } }
        .intelligent-doc-row { transition: background 0.12s ease; }
        .intelligent-doc-row:hover { background: ${palette.inputBg}; }
        .intelligent-doc-action { opacity: 0; transition: opacity 0.15s ease; }
        .intelligent-doc-row:hover .intelligent-doc-action { opacity: 1; }
      `}</style>
    </div>
  );
}

function DocumentRow({ doc, canWrite, deleting, retrying, onDelete, onRetry }: {
  doc: IntelligentDocument; canWrite: boolean; deleting: boolean; retrying: boolean;
  onDelete: () => void; onRetry: () => void;
}) {
  const badge = statusBadge(doc.status);

  return (
    <div
      className="intelligent-doc-row"
      style={{
        display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 10px',
        borderRadius: 8, marginBottom: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0, marginTop: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: palette.chipBg,
        }}>
          {badge.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 650, color: palette.textStrong,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {doc.fileName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: badge.color }}>{badge.label}</span>
            {doc.status === 'Ready' && (
              <span style={{ fontSize: 10, color: palette.textFaint, fontWeight: 500 }}>· {doc.chunkCount} parça</span>
            )}
            <span style={{ fontSize: 10, color: palette.textFaint, fontWeight: 500 }}>· {relativeTime(doc.uploadedAt)}</span>
          </div>
        </div>
        {canWrite && doc.status === 'Failed' && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="intelligent-doc-action"
            style={{
              background: 'none', border: 'none', color: palette.accent,
              cursor: retrying ? 'not-allowed' : 'pointer', padding: 3, flexShrink: 0, display: 'flex',
            }}
            title="Tekrar dene"
          >
            {retrying
              ? <Loader2 size={icon.sm} strokeWidth={icon.stroke} style={{ animation: 'intelligent-sidebar-spin 1s linear infinite' }} />
              : <RefreshCw size={icon.sm} strokeWidth={icon.stroke} />}
          </button>
        )}
        {canWrite && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="intelligent-doc-action"
            style={{
              background: 'none', border: 'none', color: palette.danger,
              cursor: deleting ? 'not-allowed' : 'pointer', padding: 3, flexShrink: 0, display: 'flex',
            }}
            title="Belgeyi sil"
          >
            {deleting
              ? <Loader2 size={icon.sm} strokeWidth={icon.stroke} style={{ animation: 'intelligent-sidebar-spin 1s linear infinite' }} />
              : <Trash2 size={icon.sm} strokeWidth={icon.stroke} />}
          </button>
        )}
      </div>
      {/* Hata mesajı doğrudan görünür (kullanıcı talebi: "hata diyor ne hatası
          onu da bilmiyorum") — hover tooltip'te saklı kalmıyor. */}
      {doc.status === 'Failed' && doc.errorMessage && (
        <div style={{
          marginLeft: 34, padding: '5px 8px', borderRadius: 6,
          background: palette.chipBg, border: `1px solid ${palette.border}`,
          fontSize: 11, color: palette.danger, lineHeight: 1.4, wordBreak: 'break-word',
        }}>
          {doc.errorMessage}
        </div>
      )}
    </div>
  );
}

function statusBadge(status: IntelligentDocument['status']) {
  switch (status) {
    case 'Ready':
      return {
        label: 'HAZIR', color: palette.success,
        icon: <CheckCircle2 size={icon.md} strokeWidth={icon.stroke} color={palette.success} />,
      };
    case 'Failed':
      return {
        label: 'HATA', color: palette.danger,
        icon: <AlertCircle size={icon.md} strokeWidth={icon.stroke} color={palette.danger} />,
      };
    default:
      return {
        label: 'İŞLENİYOR',
        color: palette.warningText,
        icon: (
          <Loader2
            size={icon.md}
            strokeWidth={icon.stroke}
            color={palette.warning}
            style={{ animation: 'intelligent-sidebar-spin 1.2s linear infinite' }}
          />
        ),
      };
  }
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}
