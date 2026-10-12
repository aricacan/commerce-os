'use client';

import { useState } from 'react';
import { useBusinessEvents } from '../../../hooks/monitoring/useMonitoring';
import { cardStyle, statTileStyle, tdStyle } from '../shared';
import { formatDateTime } from '../../../lib/format';
import { parseRun } from '../parseRun';
import { CheckCircle2, XCircle, Terminal, Clock, Copy, Check, Play, type LucideIcon } from 'lucide-react';

function Tile({ label, value, color, icon: Icon }: { label: string; value: string | number; color?: string; icon?: LucideIcon }) {
  return (
    <div style={{
      ...statTileStyle,
      flex: '1 1 140px',
      minWidth: 140,
      padding: '16px 20px',
      // `${color}50` geçersiz CSS üretiyordu (var(--success)50) — kenarlık zaten hiç
      // uygulanmıyordu. Kutu nötr kenarlıkta kalır; durumu üstteki şerit taşır.
      borderColor: 'var(--border)',
      background: 'var(--card)',
    }}>
      {color && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: color,
        }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-ui-xs)', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        {Icon && <Icon size={12} style={{ color: color ?? 'var(--fg-muted)' }} />}
      </div>
      <span className="font-mono" style={{ fontSize: 'var(--text-ui-xl)', fontWeight: 700, color: 'var(--fg)', marginTop: 2 }}>{value}</span>
    </div>
  );
}

export function TestsTab() {
  const { data, isLoading, isError } = useBusinessEvents({ eventType: 'TestRunCompleted', pageSize: 10 });
  const [copied, setCopied] = useState(false);
  
  const latest = data?.items?.[0];
  const run = parseRun(latest?.payloadJson);

  const copyCmd = () => {
    navigator.clipboard.writeText('pwsh scripts/run-tests.ps1');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div style={{ ...tdStyle, border: 'none', color: 'var(--fg-muted)' }}>Yükleniyor…</div>;
  if (isError) return <div style={{ ...tdStyle, border: 'none', color: 'var(--danger)', fontWeight: 600 }}>Test raporları alınamadı.</div>;
  
  if (!latest || !run) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          ...cardStyle,
          padding: 30,
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
          }}>
            <Play size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--text-ui-lg)', fontWeight: 700, color: 'var(--fg)', margin: 0 }}>
              Henüz Test Koşusu Bulunmamaktadır
            </h3>
            <p style={{ fontSize: 'var(--text-ui-sm)', color: 'var(--fg-muted)', maxWidth: 400, margin: '6px 0 0', lineHeight: 1.5 }}>
              Sistem testlerini çalıştırıp panele canlı veri göndermek için terminalinizde aşağıdaki komutu koşturabilirsiniz:
            </p>
          </div>

          <div style={{
            width: '100%',
            maxWidth: 420,
            background: 'var(--code-bg-deep)',
            border: '1px solid var(--code-border)',
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--code-bg)' }}>
              {/* macOS trafik ışıkları kaldırıldı — dekorasyon için kırmızı/sarı/yeşili
                  harcıyorlardı; bu sekmede o üç renk "test geçti/kaldı" demek. */}
              <span className="font-mono" style={{ fontSize: 'var(--text-ui-2xs)', fontWeight: 700, color: 'var(--code-fg-muted, #64748b)' }}>powershell</span>
              <button
                onClick={copyCmd}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copied ? 'var(--success)' : 'var(--code-fg-muted, #64748b)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
            <div style={{ padding: 12, textAlign: 'left' }}>
              {/* Komut metni nötr: "yeşil terminal" estetiği, yeşilin bu sekmede taşıdığı
                  "testler geçti" anlamını sulandırıyordu. */}
              <code style={{ color: 'var(--code-fg, #cbd5e1)', fontSize: 'var(--text-ui-sm)' }}>
                pwsh scripts/run-tests.ps1
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ok = run.failed === 0;
  const passRate = run.total > 0 ? Math.round((run.passed / run.total) * 100) : 0;
  const maxSuiteDuration = Math.max(...run.suites.map((s) => s.durationMs), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      
      {/* CI/CD Özet Göstergesi */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }}>
        
        {/* Dairesel SVG İlerleme Halkası */}
        <div style={{
          ...statTileStyle,
          flex: '1 1 180px',
          minWidth: 180,
          padding: '14px 20px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderColor: ok ? 'rgba(var(--success-rgb), 0.3)' : 'rgba(var(--danger-rgb), 0.3)',
          boxShadow: ok ? '0 4px 12px rgba(var(--success-rgb), 0.05)' : '0 4px 12px rgba(var(--danger-rgb), 0.05)',
          background: 'var(--card)',
        }}>
          {ok && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'var(--success)',
              
            }} />
          )}
          {!ok && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'var(--danger)',
              
            }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-ui-xs)', fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Başarı Oranı
            </span>
            <span className="font-mono" style={{ fontSize: 'var(--text-ui-2xl)', fontWeight: 700, color: ok ? 'var(--success)' : 'var(--danger)' }}>
              {passRate}%
            </span>
          </div>

          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <svg style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
              <circle cx="22" cy="22" r="18" fill="transparent" stroke="var(--bg-subtle)" strokeWidth="4" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="transparent"
                stroke={ok ? 'var(--success)' : 'var(--danger)'}
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 18}
                strokeDashoffset={2 * Math.PI * 18 * (1 - passRate / 100)}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <Tile label="Toplam Test" value={run.total} color="var(--fg-muted)" icon={Terminal} />
        <Tile label="Geçen Test" value={run.passed} color="var(--success)" icon={CheckCircle2} />
        <Tile
          label="Başarısız (Fail)"
          value={run.failed}
          color={run.failed > 0 ? 'var(--danger)' : undefined}
          icon={XCircle}
        />
        <Tile label="Toplam Süre" value={`${Math.round(run.durationMs)} ms`} color="var(--fg-muted)" icon={Clock} />
      </div>

      <div style={{ fontSize: 'var(--text-ui-xs)', color: 'var(--fg-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
        <Clock size={12} />
        <span>
          Son test koşusu: <strong>{latest.createdAt ? formatDateTime(latest.createdAt) : '—'}</strong>
          {run.finishedAtUtc ? ` · Bitiş: ${formatDateTime(run.finishedAtUtc)}` : ''}
        </span>
      </div>

      {/* Süitlerin Koyu Şık Kart Listesi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {run.suites.map((s) => {
          const isSuiteOk = s.failed === 0;
          const durationPct = (s.durationMs / maxSuiteDuration) * 100;
          const statusColor = isSuiteOk ? 'var(--success)' : 'var(--danger)';

          return (
            <div
              key={s.name}
              style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                position: 'relative',
              }}
            >
              {/* Sol Kenar Durum Çizgisi */}
              <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: 4,
                background: statusColor,
                
              }} />

              {/* Sol: Süit adı ve durum simgesi */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 6 }}>
                {isSuiteOk ? (
                  <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
                ) : (
                  <XCircle size={16} style={{ color: 'var(--danger)' }} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 'var(--text-ui-md)', fontWeight: 700, color: 'var(--fg)' }}>
                    {s.name}
                  </span>
                  <span style={{ fontSize: 'var(--text-ui-2xs)', color: 'var(--fg-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Suite Execution
                  </span>
                </div>
              </div>

              {/* Orta: Sayılar */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-ui-2xs)', color: 'var(--fg-muted)', fontWeight: 700 }}>TOTAL</span>
                  <span className="font-mono" style={{ fontSize: 'var(--text-ui-md)', fontWeight: 700, color: 'var(--fg-muted)' }}>{s.total}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-ui-2xs)', color: 'var(--success)', fontWeight: 700 }}>PASSED</span>
                  <span className="font-mono" style={{ fontSize: 'var(--text-ui-md)', fontWeight: 700, color: 'var(--success)' }}>{s.passed}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--text-ui-2xs)', color: 'var(--danger)', fontWeight: 700 }}>FAILED</span>
                  <span className="font-mono" style={{ fontSize: 'var(--text-ui-md)', fontWeight: 700, color: s.failed > 0 ? 'var(--danger)' : 'var(--fg-muted)' }}>{s.failed}</span>
                </div>
              </div>

              {/* Sağ: Süre grafiği */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: 'var(--text-ui-sm)',
                    fontWeight: 700,
                    minWidth: 55,
                    textAlign: 'right',
                    color: 'var(--fg-muted)',
                  }}
                >
                  {Math.round(s.durationMs)} <span style={{ fontSize: 'var(--text-ui-2xs)', color: 'var(--fg-muted)' }}>ms</span>
                </span>
                
                {/* Süre Grafiği Waterfall */}
                <div style={{
                  width: 80,
                  height: 5,
                  borderRadius: 2.5,
                  background: 'var(--bg-subtle)',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: `${durationPct}%`,
                    height: '100%',
                    borderRadius: 2.5,
                    backgroundColor: 'var(--fg)',
                    boxShadow: '0 0 6px transparent',
                    transition: 'width 0.5s ease-out',
                  }} />
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
