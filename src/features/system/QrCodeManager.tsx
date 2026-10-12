'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  QrCode, Plus, Upload, Trash2, ToggleLeft, ToggleRight,
  Download, Copy, Check, RefreshCw, BarChart2, X,
  Globe, Smartphone,
  ArrowLeft, AlertCircle,
} from 'lucide-react';
import {
  qrCodeApi,
  type QrCodeDto,
  type QrAnalyticsDto,
  type QrCodeType,
  QR_TYPE_LABELS,
} from '../../lib/api/qr-codes';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

// ─── Palette ───────────────────────────────────────────────────────────────────

const C = {
  accent: 'var(--accent)',
  bg: 'var(--bg)',
  bgSubtle: 'var(--bg-subtle)',
  card: 'var(--card)',
  border: 'var(--border)',
  borderFaint: 'var(--border-soft)',
  text: 'var(--fg)',
  textMuted: 'var(--fg-muted)',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const PIE_COLORS = ['#e52521', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
const QR_CODES_QUERY_KEY = ['qr-codes'] as const;

// ─── QR Type icons ─────────────────────────────────────────────────────────────

const QR_TYPES: { value: QrCodeType; label: string; placeholder: string }[] = [
  { value: 0, label: 'URL / Link', placeholder: 'https://example.com' },
  { value: 1, label: 'WhatsApp', placeholder: '905xxxxxxxxx (başında + olmadan)' },
  { value: 2, label: 'Telefon', placeholder: '905xxxxxxxxx' },
  { value: 3, label: 'E-posta', placeholder: 'info@example.com' },
  { value: 4, label: 'Özel İçerik', placeholder: 'Herhangi bir metin veya link' },
];

// ─── Helper: TargetUrl build ───────────────────────────────────────────────────

function buildTargetUrl(type: QrCodeType, value: string): string {
  switch (type) {
    case 1: return `https://wa.me/${value.replace(/\D/g, '')}`;
    case 2: return `tel:${value.replace(/\s/g, '')}`;
    case 3: return `mailto:${value}`;
    default: return value;
  }
}

// ─── Sub-views ─────────────────────────────────────────────────────────────────

type View = 'list' | 'create' | 'analytics';

// ─── Toast ─────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

// ─── Analytics Panel ───────────────────────────────────────────────────────────

function AnalyticsPanel({ qr, onBack }: { qr: QrCodeDto; onBack: () => void }) {
  const [days, setDays] = useState(30);
  const { data, isLoading: loading } = useQuery<QrAnalyticsDto>({
    queryKey: [...QR_CODES_QUERY_KEY, qr.id, 'analytics', days],
    queryFn: () => qrCodeApi.getAnalytics(qr.id, days),
    staleTime: 60_000,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex', padding: 4 }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{qr.title}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>{qr.targetUrl}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '4px 12px', borderRadius: 8, border: `1px solid ${days === d ? C.accent : C.border}`,
                background: days === d ? C.accent : 'transparent',
                color: days === d ? '#fff' : C.textMuted,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
              }}
            >
              {d}g
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: C.textMuted }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Toplam Tarama', value: data.totalScans, color: C.accent },
              { label: 'Son 7 Gün', value: data.last7DayScans, color: C.success },
              { label: 'Ülke / Bölge', value: data.uniqueCountries, color: '#3b82f6' },
            ].map((kpi) => (
              <div key={kpi.label} style={{
                background: C.bgSubtle, borderRadius: 12, padding: '14px 16px',
                border: `1px solid ${C.borderFaint}`,
              }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Daily Chart */}
          {data.dailyScans.length > 0 && (
            <div style={{ background: C.bgSubtle, borderRadius: 12, padding: 16, border: `1px solid ${C.borderFaint}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Günlük Tarama Trendi</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={data.dailyScans}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted }} />
                  <YAxis tick={{ fontSize: 10, fill: C.textMuted }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="count" stroke={C.accent} strokeWidth={2.5} dot={false} name="Tarama" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bottom Grid: Countries + Device + Browser */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Countries */}
            <div style={{ background: C.bgSubtle, borderRadius: 12, padding: 16, border: `1px solid ${C.borderFaint}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={14} /> Ülkeler
              </div>
              {data.topCountries.length === 0 ? (
                <div style={{ fontSize: 12, color: C.textMuted }}>Henüz veri yok</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.topCountries.slice(0, 6).map((c) => {
                    const pct = data.totalScans > 0 ? Math.round((c.count / data.totalScans) * 100) : 0;
                    return (
                      <div key={c.countryCode}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                          <span style={{ color: C.text }}>{c.country || 'Bilinmiyor'}</span>
                          <span style={{ color: C.textMuted }}>{c.count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 4, background: C.border }}>
                          <div style={{ height: 4, borderRadius: 4, width: `${pct}%`, background: C.accent }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device */}
            <div style={{ background: C.bgSubtle, borderRadius: 12, padding: 16, border: `1px solid ${C.borderFaint}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Smartphone size={14} /> Cihaz Türü
              </div>
              {data.deviceBreakdown.length === 0 ? (
                <div style={{ fontSize: 12, color: C.textMuted }}>Henüz veri yok</div>
              ) : (
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={data.deviceBreakdown}
                      dataKey="count"
                      nameKey="deviceType"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={48}
                    >
                      {data.deviceBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                    />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Browser bar */}
          {data.browserBreakdown.length > 0 && (
            <div style={{ background: C.bgSubtle, borderRadius: 12, padding: 16, border: `1px solid ${C.borderFaint}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Tarayıcı Dağılımı</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.browserBreakdown} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: C.textMuted }} allowDecimals={false} />
                  <YAxis type="category" dataKey="browser" width={80} tick={{ fontSize: 10, fill: C.textMuted }} />
                  <Tooltip
                    contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="count" fill={C.accent} radius={[0, 4, 4, 0]} name="Tarama" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      ) : (
        <div style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: 40 }}>
          İstatistik yüklenemedi.
        </div>
      )}
    </div>
  );
}

// ─── Create Form ───────────────────────────────────────────────────────────────

function CreateForm({ onCreated, onCancel }: { onCreated: (q: QrCodeDto) => void; onCancel: () => void }) {
  const [qrType, setQrType] = useState<QrCodeType>(0);
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast, show } = useToast();

  const placeholder = QR_TYPES.find(t => t.value === qrType)?.placeholder ?? '';

  const handleCreate = async () => {
    if (!title.trim() || !value.trim()) { setError('Başlık ve içerik zorunludur.'); return; }
    setError('');
    setLoading(true);
    try {
      const dto = await qrCodeApi.create({
        title: title.trim(),
        qrType,
        targetUrl: buildTargetUrl(qrType, value.trim()),
      });
      show('QR kodu oluşturuldu!');
      onCreated(dto);
    } catch {
      setError('Oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Yeni QR Kodu</span>
      </div>

      {/* Type Selector */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 6 }}>QR Tipi</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {QR_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => { setQrType(t.value); setValue(''); }}
              style={{
                padding: '8px 6px', borderRadius: 10, border: `1.5px solid ${qrType === t.value ? C.accent : C.border}`,
                background: qrType === t.value ? 'rgba(229,37,33,0.07)' : 'transparent',
                color: qrType === t.value ? C.accent : C.textMuted,
                cursor: 'pointer', fontSize: 11.5, fontWeight: 600, textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 6 }}>Başlık *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Örn: Ürün Sayfası QR, WhatsApp Destek"
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.bgSubtle,
            color: C.text, fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Value */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 6 }}>
          {QR_TYPES.find(t => t.value === qrType)?.label} *
        </label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.bgSubtle,
            color: C.text, fontSize: 13, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {qrType !== 0 && value && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Encode: <code style={{ color: C.text }}>{buildTargetUrl(qrType, value)}</code>
          </div>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.danger, fontSize: 12 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={loading}
        style={{
          padding: '10px 0', borderRadius: 10, border: 'none',
          background: loading ? C.border : C.accent,
          color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {loading ? 'Oluşturuluyor...' : 'QR Kodu Oluştur'}
      </button>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? C.success : C.danger,
          color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── QR Card ───────────────────────────────────────────────────────────────────

function QrCard({ qr, onDelete, onToggle, onAnalytics }: {
  qr: QrCodeDto;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAnalytics: (qr: QrCodeDto) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copySlug = () => {
    const url = `${window.location.origin}/qr/${qr.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadPng = () => {
    if (!qr.qrImageBase64) return;
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${qr.qrImageBase64}`;
    a.download = `qr-${qr.slug}.png`;
    a.click();
  };

  return (
    <div style={{
      background: C.card, borderRadius: 14, border: `1px solid ${C.borderFaint}`,
      overflow: 'hidden', transition: 'box-shadow 0.2s',
      opacity: qr.isActive ? 1 : 0.55,
    }}>
      {/* QR Image */}
      <div style={{
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, borderBottom: `1px solid ${C.borderFaint}`,
      }}>
        {qr.qrImageBase64 ? (
          <Image
            unoptimized
            src={`data:image/png;base64,${qr.qrImageBase64}`}
            alt={qr.title}
            width={100}
            height={100}
            style={{ width: 100, height: 100, objectFit: 'contain' }}
          />
        ) : (
          <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={48} style={{ color: '#ccc' }} />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {qr.title}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {QR_TYPE_LABELS[qr.qrType]} · {qr.targetUrl}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: qr.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
            color: qr.isActive ? C.success : C.danger,
          }}>
            {qr.isActive ? '● Aktif' : '○ Pasif'}
          </span>
          {qr.isUploaded && (
            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
              Yüklendi
            </span>
          )}
          {!qr.isUploaded && (
            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: 'rgba(107,114,128,0.1)', color: C.textMuted }}>
              {qr.scanCount} tarama
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          {qr.qrImageBase64 && (
            <ActionBtn onClick={downloadPng} title="PNG İndir"><Download size={13} /></ActionBtn>
          )}
          {!qr.isUploaded && (
            <ActionBtn onClick={copySlug} title="Redirect URL Kopyala">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </ActionBtn>
          )}
          {!qr.isUploaded && (
            <ActionBtn onClick={() => onAnalytics(qr)} title="İstatistik"><BarChart2 size={13} /></ActionBtn>
          )}
          <ActionBtn onClick={() => onToggle(qr.id)} title={qr.isActive ? 'Pasife Al' : 'Aktife Al'}>
            {qr.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
          </ActionBtn>
          <ActionBtn onClick={() => onDelete(qr.id)} title="Sil" danger>
            <Trash2 size={13} />
          </ActionBtn>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, title, danger = false, children }: {
  onClick: () => void;
  title?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        flex: 1, padding: '6px 0', borderRadius: 8,
        border: `1px solid ${danger ? 'rgba(239,68,68,0.25)' : C.borderFaint}`,
        background: danger ? 'rgba(239,68,68,0.07)' : C.bgSubtle,
        color: danger ? C.danger : C.textMuted,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── Upload Modal ──────────────────────────────────────────────────────────────

function UploadModal({ onUploaded, onClose }: { onUploaded: (q: QrCodeDto) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  };

  const handleUpload = async () => {
    if (!title.trim() || !file || !preview) { setError('Başlık ve görsel zorunludur.'); return; }
    setError('');
    setLoading(true);
    try {
      const base64 = preview.split(',')[1];
      const dto = await qrCodeApi.upload({ title: title.trim(), targetUrl: targetUrl.trim(), imageBase64: base64, mimeType: file.type });
      onUploaded(dto);
    } catch {
      setError('Yükleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: C.bg, borderRadius: 16, padding: 24, width: 400, maxWidth: '95vw',
        border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Mevcut QR Yükle</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>
            <X size={18} />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${preview ? C.success : C.border}`,
            borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer',
            transition: 'border-color 0.2s', background: C.bgSubtle,
          }}
        >
          {preview ? (
            <Image unoptimized src={preview} alt="QR Preview" width={120} height={120} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <>
              <Upload size={28} style={{ color: C.textMuted, margin: '0 auto 8px' }} />
              <div style={{ fontSize: 12, color: C.textMuted }}>PNG, JPG, SVG sürükle bırak veya tıkla</div>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık *"
          style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgSubtle, color: C.text, fontSize: 13, outline: 'none' }}
        />
        <input
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Hedef URL (bilgi amaçlı, opsiyonel)"
          style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bgSubtle, color: C.text, fontSize: 13, outline: 'none' }}
        />

        {error && <div style={{ color: C.danger, fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            Vazgeç
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: loading ? C.border : C.accent, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}
          >
            {loading ? 'Yükleniyor...' : 'Yükle'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function QrCodeManager() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('list');
  const [analyticsQr, setAnalyticsQr] = useState<QrCodeDto | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const { toast, show } = useToast();
  const { data: codes = [], isLoading: loading, isError } = useQuery({
    queryKey: QR_CODES_QUERY_KEY,
    queryFn: qrCodeApi.getAll,
    staleTime: 30_000,
  });
  const deleteMutation = useMutation({ mutationFn: qrCodeApi.delete });
  const toggleMutation = useMutation({ mutationFn: qrCodeApi.toggle });

  const updateCodes = (updater: (current: QrCodeDto[]) => QrCodeDto[]) => {
    queryClient.setQueryData<QrCodeDto[]>(QR_CODES_QUERY_KEY, (current = []) => updater(current));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu QR kodu silmek istediğinize emin misiniz?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      updateCodes((current) => current.filter((q) => q.id !== id));
      show('QR kodu silindi.');
    } catch { show('Silinemedi.', 'error'); }
  };

  const handleToggle = async (id: string) => {
    try {
      const { isActive } = await toggleMutation.mutateAsync(id);
      updateCodes((current) => current.map((q) => q.id === id ? { ...q, isActive } : q));
    } catch { show('Durum değiştirilemedi.', 'error'); }
  };

  const filtered = codes.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    q.targetUrl.toLowerCase().includes(search.toLowerCase())
  );

  // ── Analytics view
  if (view === 'analytics' && analyticsQr) {
    return (
      <div style={{ padding: '2px 0' }}>
        <AnalyticsPanel qr={analyticsQr} onBack={() => { setView('list'); setAnalyticsQr(null); }} />
      </div>
    );
  }

  // ── Create view
  if (view === 'create') {
    return (
      <div style={{ padding: '2px 0' }}>
        <CreateForm
          onCreated={(q) => {
            updateCodes((current) => [q, ...current]);
            setView('list');
            show('QR kodu oluşturuldu ve kütüphaneye eklendi!');
          }}
          onCancel={() => setView('list')}
        />
      </div>
    );
  }

  // ── List view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: C.bgSubtle, border: `1px solid ${C.borderFaint}`,
          borderRadius: 10, padding: '8px 12px',
        }}>
          <QrCode size={14} style={{ color: C.textMuted, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara..."
            style={{ background: 'none', border: 'none', color: C.text, fontSize: 13, outline: 'none', flex: 1 }}
          />
        </div>
        <button
          onClick={() => setShowUpload(true)}
          title="Mevcut QR yükle"
          style={{
            padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.border}`,
            background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
          }}
        >
          <Upload size={14} /> Yükle
        </button>
        <button
          onClick={() => setView('create')}
          style={{
            padding: '8px 14px', borderRadius: 10, border: 'none',
            background: C.accent, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
          }}
        >
          <Plus size={14} /> Yeni QR
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Toplam QR', value: codes.length },
          { label: 'Aktif', value: codes.filter(q => q.isActive).length, color: C.success },
          { label: 'Toplam Tarama', value: codes.filter(q => !q.isUploaded).reduce((a, q) => a + q.scanCount, 0), color: C.accent },
        ].map((s) => (
          <div key={s.label} style={{
            background: C.bgSubtle, border: `1px solid ${C.borderFaint}`,
            borderRadius: 10, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color ?? C.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <RefreshCw size={24} style={{ color: C.textMuted, animation: 'spin 1s linear infinite' }} />
        </div>
      ) : isError ? (
        <div style={{ padding: 32, textAlign: 'center', color: C.danger }}>Liste yüklenemedi.</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: C.textMuted }}>
          <QrCode size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <div style={{ fontWeight: 600, fontSize: 14 }}>Henüz QR kodu yok</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Yeni QR Kodu oluştur veya mevcut birini yükle.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {filtered.map((qr) => (
            <QrCard
              key={qr.id}
              qr={qr}
              onDelete={handleDelete}
              onToggle={handleToggle}
              onAnalytics={(q) => { setAnalyticsQr(q); setView('analytics'); }}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onUploaded={(q) => { updateCodes((current) => [q, ...current]); setShowUpload(false); show('QR eklendi!'); }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'success' ? C.success : C.danger,
          color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', animation: 'slide-down 0.2s ease',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
