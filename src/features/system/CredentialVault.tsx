'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, FileUp, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import type { UpsertCredentialBody, CredentialDto } from '../../lib/api';
import {
  useBulkCreateCredentials,
  useCreateCredential,
  useDeleteCredential,
  useRevealCredential,
  useReorderCredentials,
  useUpdateCredential,
  useCredentials,
} from '../../hooks/system/useCredentialVault';
import { thStyle, tdStyle } from './table-styles';
import {
  palette, icon, card, input, btnPrimary, btnGhost, errorText,
  pageShell, pageInner, pageHeading, pageSubtitle, sectionTitle,
} from '../shared/design';
import { useFeedback } from '../shared/Feedback';
import { downloadExcel, type ExportColumn } from '../../lib/export';

const TEMPLATE_COLUMNS: ExportColumn[] = [
  { key: 'Ana grup', header: 'Ana grup', type: 'text' },
  { key: 'Platform', header: 'Platform', type: 'text' },
  { key: 'Mail, kullanıcı adı', header: 'Mail, kullanıcı adı', type: 'text' },
  { key: 'Şifre', header: 'Şifre', type: 'text' },
  { key: 'URL', header: 'URL', type: 'text' },
];

const emptyDraft: UpsertCredentialBody = {
  mainGroup: '',
  platform: '',
  emailOrUsername: '',
  password: '',
  url: '',
  sortOrder: null,
};

const compactButton: CSSProperties = {
  ...btnGhost,
  width: 30,
  height: 30,
  padding: 0,
  justifyContent: 'center',
};

const btnDanger: CSSProperties = {
  ...btnGhost,
  borderColor: 'color-mix(in oklch, oklch(52% 0.14 25) 40%, transparent)',
  color: palette.danger,
};

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .replaceAll('ş', 's')
    .replaceAll('ğ', 'g')
    .replaceAll('ü', 'u')
    .replaceAll('ö', 'o')
    .replaceAll('ç', 'c')
    .replace(/\s+/g, ' ');
}

// Basit RFC4180 CSV ayrıştırıcı — tırnak içindeki virgülleri (ör. "mail,kullanıcı adı" tek
// başlık hücresi) ve kaçışlı çift tırnakları ("") doğru işler. Harici bir kütüphane yerine
// burada tutuluyor çünkü ihtiyaç küçük ve tek yerde kullanılıyor.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function fieldForHeader(header: string): keyof UpsertCredentialBody | null {
  const h = normalizeHeader(header);
  if (h === 'ana grup' || h === 'anagrup' || h === 'grup') return 'mainGroup';
  if (h === 'platform') return 'platform';
  if (h === 'mail,kullanici adi' || h === 'mail kullanici adi' || h === 'mail' || h === 'kullanici adi') return 'emailOrUsername';
  if (h === 'sifre' || h === 'password') return 'password';
  if (h === 'url' || h === 'link') return 'url';
  return null;
}

// Şifre alanı KASITLI OLARAK boş başlar — backend artık gerçek şifreyi hiç döndürmüyor
// (bkz. CredentialDto.password: sadece maskelenmiş gösterge). Boş bırakılırsa Save
// mevcut şifreyi korur; kullanıcı yeni bir şey yazarsa o değer kaydedilir.
function toDraft(row: CredentialDto): UpsertCredentialBody {
  return {
    mainGroup: row.mainGroup,
    platform: row.platform,
    emailOrUsername: row.emailOrUsername,
    password: '',
    url: row.url,
    sortOrder: row.sortOrder,
  };
}

// Şifre hücresi 3 moda sahip: maskeli (varsayılan, sabit uzunlukta •••• — gerçek uzunluk
// asla ele verilmez), açık (Göster'e basınca backend'den tek seferlik çekilir — HER açılış
// audit loglanır, bkz. useRevealCredential) ve düzenleme (kalem ikonuyla, yeni şifre
// yazmak için — mevcut şifreyi göstermez, satırın genel Kaydet'iyle birlikte kaydedilir).
function PasswordCell({
  row, draftPassword, onDraftChange,
}: {
  row: CredentialDto;
  draftPassword: string;
  onDraftChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<'masked' | 'revealed' | 'editing'>('masked');
  const reveal = useRevealCredential();
  const hasPassword = row.password.length > 0;

  function toggleReveal() {
    if (mode === 'revealed') {
      setMode('masked');
      return;
    }
    reveal.mutate(row.id, { onSuccess: () => setMode('revealed') });
  }

  function startEditing() {
    setMode('editing');
  }

  function cancelEditing() {
    onDraftChange('');
    setMode('masked');
  }

  if (mode === 'editing') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          value={draftPassword}
          type="password"
          placeholder="Yeni şifre"
          autoFocus
          onChange={(e) => onDraftChange(e.target.value)}
          style={{ ...input, minWidth: 150 }}
        />
        <button type="button" title="Vazgeç" onClick={cancelEditing} style={compactButton}>
          <X size={icon.sm} strokeWidth={icon.stroke} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        className="font-mono"
        style={{
          flex: 1, minWidth: 150, padding: '7px 10px', borderRadius: 8,
          background: palette.inputBg, border: `1px solid ${palette.borderFaint}`,
          fontSize: 13, letterSpacing: mode === 'masked' && hasPassword ? 2 : 0,
          color: hasPassword ? palette.text : palette.textFaint,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {mode === 'revealed' ? (reveal.data?.password || '(boş)') : hasPassword ? '••••••••' : 'Şifre yok'}
      </div>
      <button
        type="button"
        title={mode === 'revealed' ? 'Şifreyi gizle' : 'Mevcut şifreyi göster'}
        disabled={!hasPassword || reveal.isPending}
        onClick={toggleReveal}
        style={compactButton}
      >
        {reveal.isPending
          ? <Loader2 size={icon.sm} strokeWidth={icon.stroke} className="animate-spin" />
          : mode === 'revealed' ? <EyeOff size={icon.sm} strokeWidth={icon.stroke} /> : <Eye size={icon.sm} strokeWidth={icon.stroke} />}
      </button>
      <button type="button" title="Şifreyi değiştir" onClick={startEditing} style={compactButton}>
        <Pencil size={icon.sm} strokeWidth={icon.stroke} />
      </button>
    </div>
  );
}

function CredentialRow({
  row, index, total, onMove, onSave, onDelete, busy,
}: {
  row: CredentialDto;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onSave: (id: number, body: UpsertCredentialBody) => void;
  onDelete: (id: number) => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState<UpsertCredentialBody>(() => toDraft(row));
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(row));

  function patch<K extends keyof UpsertCredentialBody>(key: K, value: UpsertCredentialBody[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <tr>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" title="Yukarı taşı" disabled={busy || index === 0} onClick={() => onMove(index, index - 1)} style={compactButton}>
            <ArrowUp size={icon.sm} strokeWidth={icon.stroke} />
          </button>
          <button type="button" title="Aşağı taşı" disabled={busy || index === total - 1} onClick={() => onMove(index, index + 1)} style={compactButton}>
            <ArrowDown size={icon.sm} strokeWidth={icon.stroke} />
          </button>
        </div>
      </td>
      <td style={tdStyle}><input value={draft.mainGroup} onChange={(e) => patch('mainGroup', e.target.value)} style={{ ...input, minWidth: 140 }} /></td>
      <td style={tdStyle}><input value={draft.platform} onChange={(e) => patch('platform', e.target.value)} style={{ ...input, minWidth: 130 }} /></td>
      <td style={tdStyle}><input value={draft.emailOrUsername} onChange={(e) => patch('emailOrUsername', e.target.value)} style={{ ...input, minWidth: 180 }} /></td>
      <td style={tdStyle}>
        <PasswordCell row={row} draftPassword={draft.password} onDraftChange={(v) => patch('password', v)} />
      </td>
      <td style={tdStyle}><input value={draft.url} onChange={(e) => patch('url', e.target.value)} style={{ ...input, minWidth: 180 }} /></td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" disabled={busy || !dirty} onClick={() => onSave(row.id, draft)} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>
            <Save size={icon.sm} strokeWidth={icon.stroke} /> Kaydet
          </button>
          <button type="button" disabled={busy} onClick={() => onDelete(row.id)} style={{ ...btnDanger, padding: '6px 10px', fontSize: 12 }}>
            <Trash2 size={icon.sm} strokeWidth={icon.stroke} /> Sil
          </button>
        </div>
      </td>
    </tr>
  );
}

import { useMobile } from '../../hooks/useMobile';

export function CredentialVault() {
  const isMobile = useMobile();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<UpsertCredentialBody>(emptyDraft);
  const [importError, setImportError] = useState<string | null>(null);

  const { data = [], isLoading, isError } = useCredentials();
  const createCredential = useCreateCredential();
  const updateCredential = useUpdateCredential();
  const deleteCredential = useDeleteCredential();
  const reorderCredentials = useReorderCredentials();
  const bulkCreate = useBulkCreateCredentials();
  const { notify, feedback } = useFeedback();

  const rows = useMemo(() => [...data].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id), [data]);
  const busy = createCredential.isPending || updateCredential.isPending || deleteCredential.isPending || reorderCredentials.isPending || bulkCreate.isPending;

  function patch<K extends keyof UpsertCredentialBody>(key: K, value: UpsertCredentialBody[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function create() {
    createCredential.mutate(draft, {
      onSuccess: () => {
        setDraft(emptyDraft);
        notify.success('Kayıt eklendi.');
      },
      onError: (e) => notify.error(e instanceof Error ? e.message : 'Kayıt eklenemedi.'),
    });
  }

  function save(id: number, body: UpsertCredentialBody) {
    updateCredential.mutate({ id, body }, {
      onSuccess: () => notify.success('Kayıt güncellendi.'),
      onError: (e) => notify.error(e instanceof Error ? e.message : 'Kayıt güncellenemedi.'),
    });
  }

  function remove(id: number) {
    if (!window.confirm('Bu kayıt silinsin mi?')) return;
    deleteCredential.mutate(id, {
      onSuccess: () => notify.success('Kayıt silindi.'),
      onError: (e) => notify.error(e instanceof Error ? e.message : 'Kayıt silinemedi.'),
    });
  }

  function move(from: number, to: number) {
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    reorderCredentials.mutate(next.map((r) => r.id), {
      onError: (e) => notify.error(e instanceof Error ? e.message : 'Sıralama kaydedilemedi.'),
    });
  }

  async function handleExcel(file: File) {
    setImportError(null);

    if (/\.xls$/i.test(file.name)) {
      setImportError('Bu dosya eski Excel formatında (.xls). Lütfen Excel\'de "Farklı Kaydet" ile .xlsx formatına çevirip tekrar yükleyin.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      const isCsv = /\.csv$/i.test(file.name);
      let headerCells: string[];
      let dataRows: string[][];

      if (isCsv) {
        const text = await file.text();
        const parsed = parseCsv(text);
        if (parsed.length === 0) throw new Error('CSV dosyası boş.');
        [headerCells, ...dataRows] = parsed;
      } else {
        const ExcelJS = await import('exceljs');
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        try {
          await workbook.xlsx.load(buffer);
        } catch {
          throw new Error('Dosya okunamadı — geçerli bir .xlsx dosyası olduğundan emin olun (bozuk dosya veya desteklenmeyen format olabilir). CSV dosyalarını da kabul ediyoruz.');
        }
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error('Excel sayfası bulunamadı.');

        headerCells = [];
        sheet.getRow(1).eachCell((cell, colNumber) => { headerCells[colNumber - 1] = cell.value?.toString() ?? ''; });

        dataRows = [];
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const cells: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => { cells[colNumber - 1] = String(cell.value ?? '').trim(); });
          dataRows.push(cells);
        });
      }

      const columns = new Map<number, keyof UpsertCredentialBody>();
      headerCells.forEach((header, index) => {
        const field = fieldForHeader(header);
        if (field) columns.set(index, field);
      });

      const required: (keyof UpsertCredentialBody)[] = ['mainGroup', 'platform', 'emailOrUsername', 'password', 'url'];
      const missing = required.filter((field) => ![...columns.values()].includes(field));
      if (missing.length > 0) throw new Error('Başlıklar eksik. Beklenen: ana grup / platform / mail, kullanıcı adı / şifre / url');

      const payload: UpsertCredentialBody[] = [];
      for (const cells of dataRows) {
        const item: UpsertCredentialBody = { ...emptyDraft };
        columns.forEach((field, index) => {
          const value = (cells[index] ?? '').trim();
          if (field !== 'sortOrder') item[field] = value;
        });
        if (item.mainGroup || item.platform || item.emailOrUsername || item.password || item.url) payload.push(item);
      }

      if (payload.length === 0) throw new Error('Aktarılacak satır bulunamadı.');
      bulkCreate.mutate(payload, {
        onSuccess: () => notify.success(`${payload.length} kayıt içe aktarıldı.`),
        onError: (e) => notify.error(e instanceof Error ? e.message : 'Excel aktarımı başarısız.'),
      });
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Excel okunamadı.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div style={pageShell}>
      <div style={{ ...pageInner(1180), display: 'flex', flexDirection: 'column', gap: 16, padding: isMobile ? '12px 14px 48px' : undefined }}>
        <div>
          <h1 style={pageHeading}>Şifre Kasası</h1>
          <p style={pageSubtitle}>Ana grup, platform, kullanıcı bilgisi, şifre ve URL kayıtlarını yönetin.</p>
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
            <h2 style={sectionTitle}>Excel / CSV ile aktar</h2>
            <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
              <button
                type="button"
                style={{ ...btnGhost, flex: isMobile ? 1 : 'none' }}
                disabled={busy}
                onClick={() => void downloadExcel('sifre-kasasi-sablonu.xlsx', [], TEMPLATE_COLUMNS, 'Şifreler')}
              >
                <Download size={icon.sm} strokeWidth={icon.stroke} /> Şablon İndir
              </button>
              <button type="button" style={{ ...btnGhost, flex: isMobile ? 1 : 'none' }} disabled={busy} onClick={() => fileInputRef.current?.click()}>
                <FileUp size={icon.sm} strokeWidth={icon.stroke} /> Dosya Yükle
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleExcel(file);
              }}
            />
          </div>
          {importError && <div style={errorText}>{importError}</div>}
        </div>

        {/* Yeni Kayıt Ekleme */}
        <div style={{
          ...card,
          display: isMobile ? 'flex' : 'grid',
          flexDirection: isMobile ? 'column' : undefined,
          gridTemplateColumns: isMobile ? undefined : 'repeat(6, minmax(120px, 1fr)) auto',
          gap: 8,
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          <input placeholder="Ana grup" value={draft.mainGroup} onChange={(e) => patch('mainGroup', e.target.value)} style={input} />
          <input placeholder="Platform" value={draft.platform} onChange={(e) => patch('platform', e.target.value)} style={input} />
          <input placeholder="Mail, kullanıcı adı" value={draft.emailOrUsername} onChange={(e) => patch('emailOrUsername', e.target.value)} style={input} />
          <input placeholder="Şifre" type="password" value={draft.password} onChange={(e) => patch('password', e.target.value)} style={input} />
          <input placeholder="URL" value={draft.url} onChange={(e) => patch('url', e.target.value)} style={input} />
          <input placeholder="Sıra" type="number" value={draft.sortOrder ?? ''} onChange={(e) => patch('sortOrder', e.target.value ? Number(e.target.value) : null)} style={input} />
          <button type="button" style={{ ...btnPrimary, whiteSpace: 'nowrap', justifyContent: 'center' }} disabled={busy} onClick={create}>
            <Plus size={icon.sm} strokeWidth={icon.stroke} /> Ekle
          </button>
        </div>

        {/* Kayıtlar Listesi: Mobilde kart görünümü, masaüstünde tablo */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isLoading ? (
              <div style={{ ...card, padding: 20, textAlign: 'center', color: palette.textFaint }}>Yükleniyor...</div>
            ) : isError ? (
              <div style={{ ...card, padding: 20, textAlign: 'center', color: palette.danger }}>Kayıtlar yüklenemedi.</div>
            ) : rows.length === 0 ? (
              <div style={{ ...card, padding: 20, textAlign: 'center', color: palette.textFaint }}>Henüz kayıt yok.</div>
            ) : rows.map((row, index) => (
              <div key={row.id} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: palette.inputBg, color: palette.accent }}>
                      #{row.sortOrder ?? index + 1}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: palette.text }}>{row.platform || 'Platform yok'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" title="Yukarı taşı" disabled={busy || index === 0} onClick={() => move(index, index - 1)} style={compactButton}>
                      <ArrowUp size={icon.sm} strokeWidth={icon.stroke} />
                    </button>
                    <button type="button" title="Aşağı taşı" disabled={busy || index === rows.length - 1} onClick={() => move(index, index + 1)} style={compactButton}>
                      <ArrowDown size={icon.sm} strokeWidth={icon.stroke} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: palette.textFaint, display: 'block' }}>ANA GRUP</span>
                    <span style={{ color: palette.text, fontWeight: 600 }}>{row.mainGroup || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: palette.textFaint, display: 'block' }}>MAİL / KULLANICI ADI</span>
                    <span className="font-mono" style={{ color: palette.text }}>{row.emailOrUsername || '—'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10.5, color: palette.textFaint, display: 'block' }}>ŞİFRE</span>
                    <PasswordCell row={row} draftPassword="" onDraftChange={() => {}} />
                  </div>
                  {row.url && (
                    <div>
                      <span style={{ fontSize: 10.5, color: palette.textFaint, display: 'block' }}>URL</span>
                      <a href={row.url.startsWith('http') ? row.url : `https://${row.url}`} target="_blank" rel="noreferrer" style={{ color: palette.accent, textDecoration: 'none', wordBreak: 'break-all' }}>
                        {row.url}
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 6, borderTop: `1px solid ${palette.borderFaint}` }}>
                  <button type="button" disabled={busy} onClick={() => remove(row.id)} style={{ ...btnDanger, padding: '6px 12px', fontSize: 12 }}>
                    <Trash2 size={icon.sm} strokeWidth={icon.stroke} /> Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Sıra</th>
                  <th style={thStyle}>Ana grup</th>
                  <th style={thStyle}>Platform</th>
                  <th style={thStyle}>Mail, kullanıcı adı</th>
                  <th style={thStyle}>Şifre</th>
                  <th style={thStyle}>URL</th>
                  <th style={thStyle}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td style={tdStyle} colSpan={7}>Yükleniyor...</td></tr>
                ) : isError ? (
                  <tr><td style={{ ...tdStyle, ...errorText }} colSpan={7}>Kayıtlar yüklenemedi.</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td style={tdStyle} colSpan={7}>Henüz kayıt yok.</td></tr>
                ) : rows.map((row, index) => (
                  <CredentialRow
                    key={row.id}
                    row={row}
                    index={index}
                    total={rows.length}
                    busy={busy}
                    onMove={move}
                    onSave={save}
                    onDelete={remove}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {feedback}
      </div>
    </div>
  );
}

