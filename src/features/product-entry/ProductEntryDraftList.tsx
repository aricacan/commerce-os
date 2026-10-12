'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, Plus, Search, Upload } from 'lucide-react';
import { ProductDraftStatus, productDraftApi, type ProductDraft } from '../../lib/api/product-drafts';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { draftStatus, money } from './product-entry-ui';
import { excelReportApi } from '../../lib/api/excel-report';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import { useI18n } from '../../lib/i18n';

interface Props {
  drafts: ProductDraft[];
  selectedId: string | null;
  onSelect: (draft: ProductDraft) => void;
  onNew: () => void;
  onImported: () => void;
}

export function ProductEntryDraftList({ drafts, selectedId, onSelect, onNew, onImported }: Props) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filterOptions = useMemo(() => [
    { label: isTr ? 'Tüm Durumlar' : 'All Statuses', value: '' },
    { label: isTr ? 'Taslak' : 'Draft', value: String(ProductDraftStatus.Draft) },
    { label: isTr ? 'Onay bekleyen' : 'Awaiting approval', value: String(ProductDraftStatus.AwaitingApproval) },
    { label: isTr ? 'Onaylanan' : 'Approved', value: String(ProductDraftStatus.Approved) },
    { label: isTr ? 'Gönderime hazır' : 'Ready to dispatch', value: String(ProductDraftStatus.ReadyToDispatch) },
    { label: isTr ? 'Kuyruk' : 'Queued', value: String(ProductDraftStatus.Queued) },
    { label: isTr ? 'Reddedilen' : 'Rejected', value: String(ProductDraftStatus.Rejected) },
    { label: isTr ? 'İptal' : 'Cancelled', value: String(ProductDraftStatus.Cancelled) },
  ], [isTr]);

  async function handleImportFile(file: File) {
    setImporting(true);
    try {
      const result = await productDraftApi.importExcel(file);
      toast.success(`${result.created} taslak oluşturuldu, ${result.failed} satır hata.`);
      result.rows.filter((row) => !row.success).forEach((row) => toast.error(`Satır ${row.rowNumber}: ${row.error}`));
      onImported();
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const visibleDrafts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US');
    const targetStatus = statusFilter === '' ? null : Number(statusFilter);
    return drafts.filter((draft) =>
      (targetStatus == null || draft.status === targetStatus) &&
      (!query || `${draft.draftNumber} ${draft.name} ${draft.storeName}`.toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US').includes(query)));
  }, [drafts, search, statusFilter, isTr]);

  return (
    <aside style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480, minWidth: 0,
      overflow: 'hidden', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)',
    }}>
      {/* Üst Alan: Başlık & Eylemler */}
      <div style={{ padding: 12, borderBottom: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              {isTr ? 'Ürün Girişleri' : 'Product Entries'}
            </h2>
            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--fg-muted)' }}>
              {drafts.length} {isTr ? 'kayıt' : 'records'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNew}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px',
              borderRadius: 4, border: 'none', background: 'var(--fg)', color: 'var(--card)',
              fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> {isTr ? 'Yeni' : 'New'}
          </button>
        </div>

        {/* Excel Şablon ve Yükleme Butonları */}
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            disabled={importing}
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
            }}
          />
          <button
            type="button"
            onClick={() => void excelReportApi.downloadTemplate('productdrafts')}
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              height: 28, padding: '0 8px', borderRadius: 4,
              border: '1px solid var(--border)', background: 'var(--bg-subtle)',
              color: 'var(--fg)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={12} />
            <span>{isTr ? 'Şablon' : 'Template'}</span>
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              height: 28, padding: '0 8px', borderRadius: 4,
              border: '1px solid var(--border)', background: 'var(--bg-subtle)',
              color: 'var(--fg)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              opacity: importing ? 0.6 : 1,
            }}
          >
            <Upload size={12} />
            <span>{importing ? (isTr ? 'Yükleniyor…' : 'Uploading…') : (isTr ? 'Excel Yükle' : 'Import')}</span>
          </button>
        </div>

        {/* Arama */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTr ? 'No veya ürün adı ara…' : 'Search no or product…'}
            style={{
              width: '100%', height: 32, padding: '0 8px 0 28px', borderRadius: 4,
              border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)',
              fontSize: 11.5, outline: 'none',
            }}
          />
        </div>

        {/* Filtre Dropdown */}
        <div>
          <FilterSelect
            value={statusFilter}
            options={filterOptions}
            placeholder={isTr ? 'Tüm Durumlar' : 'All Statuses'}
            onChange={(v) => setStatusFilter(v)}
            minWidth={120}
          />
        </div>
      </div>

      {/* Liste */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleDrafts.length === 0 ? (
          <p style={{ padding: '32px 16px', textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>
            {isTr ? 'Bu görünümde kayıt yok.' : 'No records found.'}
          </p>
        ) : (
          visibleDrafts.map((draft) => {
            const status = draftStatus(draft.status);
            const isSelected = selectedId === draft.id;
            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => onSelect(draft)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 4,
                  border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
                  background: isSelected ? 'var(--bg-subtle)' : 'transparent',
                  textAlign: 'left', cursor: 'pointer', transition: 'all 0.12s',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-subtle)';
                    e.currentTarget.style.borderColor = 'var(--border-soft)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span className="font-mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg)' }}>
                    {draft.draftNumber}
                  </span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                  }} className={status.className}>
                    {status.label}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {draft.name || (isTr ? 'İsimsiz Ürün' : 'Untitled Product')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-muted)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {draft.supplierSku || '—'} · {draft.storeName}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--fg)', flexShrink: 0 }}>
                    {money(draft.price, draft.currency)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
