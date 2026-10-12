'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Terminal, Copy, Check, Link2, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { formatDateTime } from '../../../lib/format';
import { useExceptionGroups, useExceptions } from '../../../hooks/monitoring/useMonitoring';
import type { AppEventDto } from '../../../lib/api';
import { cardStyle, thStyle, tdStyle, errorTdStyle, paginationBarStyle, pageBtnStyle, levelStyle, Badge, filterSelectStyle } from '../shared';

const PAGE_SIZE = 25;

const CATEGORIES = ['SqlException', 'Timeout', 'NullReference', 'FileSystem', 'Unhandled', 'HttpError'] as const;

function ExceptionRow({ item, lang, onCorrelationClick }: { item: AppEventDto; lang: 'tr' | 'en'; onCorrelationClick?: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const level = levelStyle(item.level);

  const copyStack = () => {
    if (!item.stackTrace) return;
    navigator.clipboard.writeText(item.stackTrace);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderStackTrace = (stack: string) => {
    const lines = stack.split('\n');
    return (
      <div
        className="font-mono"
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 'var(--text-ui-xs)',
          // Yığın izi NÖTR okunur. Önceden tüm gövde yeşildi ("terminal görünümü") ve
          // satırlar üç ayrı renge boyanıyordu — yeşil/kırmızı/mavi. Kod boyama, ekranın
          // asıl kırmızısıyla (gerçek hata) yarışıyordu. Artık yalnızca hata satırı
          // renklenir; kendi kodumuz KALINLIKLA ayrılır, ayrı bir renkle değil.
          color: 'var(--code-fg, #cbd5e1)',
          lineHeight: 1.6,
        }}
      >
        {lines.map((line, idx) => {
          const isErrorLine = line.toLowerCase().includes('exception') || line.toLowerCase().includes('error');
          const isUserCode = line.toLowerCase().includes('demo') || line.toLowerCase().includes('dashboard');
          
          const color = isErrorLine ? 'var(--danger)' : 'var(--code-fg, #cbd5e1)';
          const weight = isUserCode ? 700 : 400;

          return (
            <div key={idx} style={{ display: 'flex', gap: 14, padding: '2px 0' }}>
              <span style={{
                color: 'var(--code-fg-muted, #64748b)',
                userSelect: 'none',
                minWidth: 24,
                textAlign: 'right',
                fontWeight: 600,
                borderRight: '1px solid var(--code-border)',
                paddingRight: 8,
              }}>
                {idx + 1}
              </span>
              <span style={{ color, fontWeight: weight, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {line}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <tr
        style={{ transition: 'background 0.15s' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <td style={tdStyle}>
          <Badge
            bg={level.bg}
            color={level.color}
            label={level.label}
            pulse={item.level === 'Critical' || item.level === 'Error'}
          />
        </td>
        <td style={tdStyle}>
          <span style={{
            background: 'var(--bg-subtle)',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 'var(--text-ui-xs)',
            fontWeight: 700,
            color: 'var(--fg)',
          }}>
            {item.category}
          </span>
        </td>
        <td style={{ ...tdStyle, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }} title={item.message}>
          {item.message}
        </td>
        <td style={tdStyle}>
          {item.httpMethod && item.requestPath ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                className="font-mono"
                style={{
                  fontSize: 'var(--text-ui-2xs)',
                  fontWeight: 700,
                  // HTTP metodu bir DURUM değildir: GET "başarı", POST "bilgi" demek değil.
                  // Eskiden öyle renkleniyordu; nötr çipe alındı, metodu yazının kendisi söyler.
                  color: 'var(--fg-muted)',
                  background: 'var(--bg-subtle)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {item.httpMethod}
              </span>
              <code style={{ fontSize: 'var(--text-ui-xs)', color: 'var(--fg-muted)' }}>
                {item.requestPath}
              </code>
            </div>
          ) : (
            <span style={{ color: 'var(--fg-subtle)' }}>—</span>
          )}
        </td>
        <td style={tdStyle}>
          {item.correlationId ? (
            onCorrelationClick ? (
              <button
                onClick={() => onCorrelationClick(item.correlationId as string)}
                className="font-mono"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-soft)',
                  padding: '3px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: 'var(--fg)',
                  fontSize: 'var(--text-ui-xs)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border-soft)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                title="Bu correlation ID ile izleme yap"
              >
                <Link2 size={10} />
                {item.correlationId.substring(0, 8)}...
              </button>
            ) : (
              <code style={{ fontSize: 'var(--text-ui-xs)' }}>
                {item.correlationId}
              </code>
            )
          ) : (
            <span style={{ color: 'var(--fg-subtle)' }}>—</span>
          )}
        </td>
        <td style={{ ...tdStyle, color: 'var(--fg-muted)', fontSize: 'var(--text-ui-sm)' }}>
          {formatDateTime(item.occurredAtUtc, lang, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </td>
        <td style={tdStyle}>
          {item.stackTrace && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: expanded ? 'var(--border-soft)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                color: expanded ? 'var(--fg)' : 'var(--fg-muted)',
                fontSize: 'var(--text-ui-xs)',
                fontWeight: 700,
                padding: '4px 8px',
                transition: 'all 0.15s',
              }}
            >
              <Terminal size={12} />
              {expanded ? 'Gizle' : 'Teşhis Et'}
            </button>
          )}
        </td>
      </tr>

      {/* Terminal Stack Trace Box */}
      {expanded && item.stackTrace && (
        <tr>
          <td colSpan={7} style={{ padding: '10px 18px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
            
            <div style={{
              borderRadius: 12,
              background: 'var(--code-bg)',
              border: '1px solid var(--code-border)',

              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: 'var(--code-bg-deep)',
                borderBottom: '1px solid var(--code-border)',
              }}>
                {/* macOS "trafik ışığı" noktaları KALDIRILDI: saf dekorasyon için
                    kırmızı+sarı+yeşili, yani panonun anlam taşıyan üç rengini birden
                    harcıyorlardı — üstelik gerçek bir hatanın gösterildiği kutunun
                    başlığında. Başlık metni kutunun ne olduğunu zaten söylüyor. */}
                <span className="font-mono" style={{ fontSize: 'var(--text-ui-2xs)', fontWeight: 700, color: 'var(--code-fg-muted, #64748b)', letterSpacing: '0.5px' }}>
                  EXCEPTION_STACK_TRACE_INSPECTOR
                </span>
                
                <button
                  onClick={copyStack}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: copied ? 'var(--success)' : 'var(--fg-subtle)',
                    fontSize: 'var(--text-ui-xs)',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>

              <div style={{
                padding: 16,
                maxHeight: 280,
                overflowY: 'auto',
              }}>
                {renderStackTrace(item.stackTrace)}
              </div>

            </div>

          </td>
        </tr>
      )}
    </>
  );
}

interface Props {
  onCorrelationClick?: (correlationId: string) => void;
}

export function ExceptionsTab({ onCorrelationClick }: Props) {
  const { lang } = useI18n();
  const [page, setPage] = useState(1);
  // Önce GRUPLAR: "şu hata 342 kez oldu". Altındaki liste tek tek örnekleri gösterir.
  const { data: groups = [] } = useExceptionGroups(24, 20);
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const { data, isLoading, isError } = useExceptions({
    page,
    pageSize: PAGE_SIZE,
    level: (level || undefined) as 'Warning' | 'Error' | 'Critical' | undefined,
    category: category || undefined,
  });

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNextPage = page * PAGE_SIZE < totalCount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            Son 24 saat — en çok tekrarlayan hatalar
          </h3>
          <div className="flex flex-col gap-1.5">
            {groups.slice(0, 8).map((group) => (
              <div
                key={group.fingerprint ?? group.sampleMessage}
                className="flex items-start gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2"
              >
                <span className="shrink-0 rounded-[3px] bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {group.count}×
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-[var(--fg)]">{group.sampleMessage}</p>
                  <p className="truncate text-[10.5px] text-[var(--fg-muted)]">
                    {group.category ?? 'Kategori yok'}
                    {group.requestPath ? ` · ${group.requestPath}` : ''}
                    {` · son: ${formatDateTime(group.lastSeenUtc, lang)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtre Barı */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
        background: 'var(--card)',
        padding: 12,
        borderRadius: 12,
        border: '1px solid var(--border-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg-muted)', marginRight: 4 }}>
          <SlidersHorizontal size={14} />
          <span style={{ fontSize: 'var(--text-ui-xs)', fontWeight: 700 }}>Filtrele:</span>
        </div>
        
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }} style={{ ...filterSelectStyle, fontSize: 'var(--text-ui-sm)' }}>
          <option value="">{lang === 'tr' ? 'Tümü (Hata Seviyesi)' : 'All Levels'}</option>
          <option value="Warning">Warning</option>
          <option value="Error">Error</option>
          <option value="Critical">Critical</option>
        </select>
        
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={{ ...filterSelectStyle, fontSize: 'var(--text-ui-sm)' }}>
          <option value="">{lang === 'tr' ? 'Tümü (Kategori)' : 'All Categories'}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tablo Kartı */}
      <div style={{ ...cardStyle }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <th style={thStyle}>{lang === 'tr' ? 'Seviye' : 'Level'}</th>
                <th style={thStyle}>{lang === 'tr' ? 'Kategori' : 'Category'}</th>
                <th style={thStyle}>{lang === 'tr' ? 'Hata Mesajı' : 'Message'}</th>
                <th style={thStyle}>{lang === 'tr' ? 'İstek Bilgisi' : 'Request'}</th>
                <th style={thStyle}>Correlation ID</th>
                <th style={thStyle}>{lang === 'tr' ? 'Tarih' : 'Date'}</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }} colSpan={7}>
                    <span style={{ fontSize: 'var(--text-ui-md)', color: 'var(--fg-muted)' }}>Yükleniyor...</span>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td style={{ ...errorTdStyle, textAlign: 'center', padding: '40px 0' }} colSpan={7}>
                    Veriler yüklenemedi.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: '40px 0' }} colSpan={7}>
                    <span style={{ fontSize: 'var(--text-ui-md)', color: 'var(--fg-muted)' }}>Hata kaydı bulunamadı.</span>
                  </td>
                </tr>
              ) : (
                items.map((item) => <ExceptionRow key={item.id} item={item} lang={lang} onCorrelationClick={onCorrelationClick} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama Kontrolleri */}
        <div style={paginationBarStyle}>
          <span style={{ fontSize: 'var(--text-ui-sm)', fontWeight: 600, color: 'var(--fg-muted)', marginRight: 'auto' }}>
            Toplam <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{totalCount}</span> kayıt listeleniyor
          </span>
          <button
            style={{
              ...pageBtnStyle,
              opacity: page <= 1 ? 0.5 : 1,
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={13} /> {lang === 'tr' ? 'Önceki' : 'Prev'}
          </button>
          <button
            style={{
              ...pageBtnStyle,
              opacity: !hasNextPage ? 0.5 : 1,
              cursor: !hasNextPage ? 'not-allowed' : 'pointer',
            }}
            disabled={!hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            {lang === 'tr' ? 'Sonraki' : 'Next'} <ChevronRight size={13} />
          </button>
        </div>
      </div>

    </div>
  );
}
