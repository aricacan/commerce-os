'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, BrainCircuit, User, RefreshCw, ImagePlus } from 'lucide-react';
import { intelligentApi, type IntelligentSystemStatus } from '../../lib/api';
import { useAuthStore } from '../../stores/auth';
import { palette, icon, btnGhost, softTint } from '../shared/design';

const STATUS_POLL_MS = 45_000;

// "Sistem çalışıyor mu" göstergesi — Ollama (embedding) + Qdrant (vektör deposu) ayrı ayrı
// pinglenir. Panel açıkken periyodik tazelenir; kullanıcı hatayı deneyip görmek yerine
// önceden görür.
function StatusDot() {
  const [status, setStatus] = useState<IntelligentSystemStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      intelligentApi.getStatus()
        .then((s) => { if (!cancelled) setStatus(s); })
        .catch(() => { if (!cancelled) setStatus({ ollama: false, qdrant: false }); })
        .finally(() => { if (!cancelled) setChecking(false); });
    };
    check();
    const id = setInterval(check, STATUS_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (checking) {
    return <span style={{ fontSize: 11, color: palette.textFaint }}>Bağlantı kontrol ediliyor…</span>;
  }

  const allUp = status?.ollama && status?.qdrant;
  const color = allUp ? palette.success : palette.danger;
  const label = allUp
    ? 'Sistem hazır'
    : `Sorunlu: ${!status?.ollama ? 'Ollama' : ''}${!status?.ollama && !status?.qdrant ? ' + ' : ''}${!status?.qdrant ? 'Qdrant' : ''}`;

  return (
    <span
      title={allUp ? 'Ollama ve Qdrant erişilebilir.' : 'Belge yükleme/sohbet şu an başarısız olabilir.'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
        color, background: softTint(color), padding: '3px 9px', borderRadius: 999,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function generateSessionId(): string {
  return `demo-session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// sessionStorage anahtarı kullanıcı id'sine göre namespace'lenir — login/logout bu storage'ı
// TEMİZLEMEZ, bu yüzden namespace olmadan aynı tarayıcı sekmesinde bir hesap çıkış yapıp
// başka bir hesap giriş yaptığında önceki kullanıcının oturum id'si (ve dolayısıyla sohbet
// geçmişi) yanlışlıkla yeni kullanıcıya görünürdü. Backend de ayrıca UserId ile filtreliyor
// (bkz. IntelligentChatService.GetHistoryAsync) — bu client-taraflı önlem savunmanın ikinci
// katmanı.
function getOrCreateSessionId(userId: number): string {
  const key = `intelligent_session_id_${userId}`;
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const id = generateSessionId();
  sessionStorage.setItem(key, id);
  return id;
}

export function IntelligentChatPanel() {
  const userId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    const id = getOrCreateSessionId(userId);
    setSessionId(id);

    // Sayfa yenilendiğinde/workspace tekrar açıldığında aynı oturumun geçmişini backend'den
    // geri yükle — mesajlar artık sadece client state'te değil, DB'de de kalıcı (bkz.
    // IntelligentChatService.GetHistoryAsync).
    intelligentApi.getChatHistory(id)
      .then((history) => {
        if (history.length === 0) return;
        setMessages(history.map((m, i) => ({
          id: `history-${i}`,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        })));
      })
      .catch(() => { /* geçmiş yüklenemezse sessizce boş sohbetle devam edilir */ });
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetSession = () => {
    if (!userId) return;
    const id = generateSessionId();
    sessionStorage.setItem(`intelligent_session_id_${userId}`, id);
    setSessionId(id);
    setMessages([]);
  };

  // /image komutu (veya görsel butonu): metin araması YAPMAZ — görselle Qdrant'ta
  // (product-images koleksiyonu) SKU eşleştirir. Metin RAG'ıyla bilinçli olarak ayrı.
  const runImageSearch = async (file: File) => {
    if (loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `🖼️ Görsel ile SKU araması: ${file.name}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await intelligentApi.searchByImage(file);
      const matches = res.matches ?? [];
      const content = matches.length === 0
        ? 'Bu görsele benzer bir ürün bulunamadı.'
        : 'En yakın eşleşen ürünler:\n' + matches.slice(0, 5).map((m, i) =>
            `${i + 1}. %${Math.round(m.score * 100)} · ${m.sku} · ${m.productName}${m.storeCode ? ` (${m.storeCode})` : ''}`
          ).join('\n');
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: 'assistant', content, timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: `Görsel arama hatası: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // "/image" yazıp gönderince metin sorgusu değil, görsel seçici açılır.
    if (text.toLowerCase() === '/image' || text.toLowerCase().startsWith('/image ')) {
      setInput('');
      fileInputRef.current?.click();
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await intelligentApi.chat(text, sessionId);
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply || '(Boş yanıt alındı)',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Hata: ${err instanceof Error ? err.message : 'Bilinmeyen hata oluştu.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      background: palette.card,
    }}>
      {/* Başlık — modül adı kabuğun kendi başlığında zaten var, burada sadece
          hangi oturumda olunduğu ve oturumu sıfırlama duruyor. */}
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${palette.borderFaint}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <BrainCircuit size={icon.lg} strokeWidth={icon.stroke} color={palette.accent} />
          <span style={{ fontSize: 12, color: palette.textFaint, fontWeight: 500 }}>
            {sessionId ? `Oturum: ${sessionId.slice(-12)}` : 'Başlatılıyor…'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusDot />
          <button onClick={resetSession} title="Yeni oturum başlat" style={btnGhost}>
            <RefreshCw size={icon.md} strokeWidth={icon.stroke} />
            Yeni Oturum
          </button>
        </div>
      </div>

      {/* Mesaj akışı */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 24px 40px',
        background: palette.bg,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            paddingBottom: 60,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', background: palette.accentSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
            }}>
              <BrainCircuit size={24} strokeWidth={icon.stroke} color={palette.accent} />
            </div>
            <div style={{ textAlign: 'center', maxWidth: 320 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: palette.textStrong, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
                Belge Sorgulama Asistanı
              </p>
              <p style={{ fontSize: 12.5, color: palette.textMuted, margin: '0 0 12px', lineHeight: 1.6 }}>
                Belgeler sekmesinden dosya yükleyin (.txt, .csv, .xlsx, .xls, .pdf, .docx).
                Belge &quot;Hazır&quot; durumuna geçtikten sonra içeriğini sorgulayabilirsiniz.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: palette.accentSoft, borderRadius: 8,
                border: `1px solid ${palette.accentBorder}`,
                padding: '6px 12px',
              }}>
                <span style={{ fontSize: 11, color: palette.accent, fontWeight: 600 }}>
                  Önce belge yükleyin
                </span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: msg.role === 'user' ? palette.accent : palette.accentSoft,
              border: msg.role === 'assistant' ? `1px solid ${palette.borderFaint}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.role === 'user'
                ? <User size={icon.md} strokeWidth={icon.stroke} color={palette.card} />
                : <BrainCircuit size={icon.md} strokeWidth={icon.stroke} color={palette.accent} />
              }
            </div>

            {/* Balon */}
            <div style={{
              maxWidth: '74%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              background: msg.role === 'user' ? palette.accent : palette.card,
              border: msg.role === 'assistant' ? `1px solid ${palette.border}` : 'none',
              color: msg.role === 'user' ? palette.card : palette.text,
              fontSize: 13.5,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
              <div style={{
                marginTop: 4,
                fontSize: 10.5,
                opacity: 0.6,
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}>
                {msg.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: palette.accentSoft, border: `1px solid ${palette.borderFaint}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BrainCircuit size={icon.md} strokeWidth={icon.stroke} color={palette.accent} />
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '4px 14px 14px 14px',
              background: palette.card,
              border: `1px solid ${palette.border}`,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="intelligent-dot" style={{ animationDelay: '0ms' }} />
                <span className="intelligent-dot" style={{ animationDelay: '200ms' }} />
                <span className="intelligent-dot" style={{ animationDelay: '400ms' }} />
              </div>
              <span style={{ fontSize: 11, color: palette.textMuted, fontWeight: 500 }}>
                Vektör veri tabanından yanıt alınıyor… (30–90 sn sürebilir)
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mesaj yazma alanı */}
      <div style={{
        padding: '14px 24px 20px',
        borderTop: `1px solid ${palette.border}`,
        background: palette.card,
        flexShrink: 0,
      }}>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            background: palette.inputBg,
            border: `1px solid ${palette.borderSoft}`,
            borderRadius: 14,
            padding: '10px 10px 10px 16px',
            transition: 'border-color 0.15s',
          }}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = palette.accent; }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = palette.borderSoft; }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onTextareaChange}
            onKeyDown={onKeyDown}
            placeholder="Soru sorun… veya /image ile görselden SKU bulun (Enter: gönder)"
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: 13.5,
              color: palette.text,
              lineHeight: 1.6,
              fontFamily: 'inherit',
              overflow: 'hidden',
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void runImageSearch(f);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            aria-label="Görsel ile SKU bul"
            title="/image — görsel yükleyip SKU bul"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: palette.chipBg,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ImagePlus size={icon.md} strokeWidth={icon.stroke} color={palette.accent} />
          </button>
          <button
            onClick={send}
            disabled={!canSend}
            aria-label="Gönder"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: canSend ? palette.accent : palette.chipBg,
              border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            {loading
              ? <Loader2 size={icon.md} strokeWidth={icon.stroke} color={palette.card} style={{ animation: 'intelligent-spin 1s linear infinite' }} />
              : <Send size={icon.md} strokeWidth={icon.stroke} color={canSend ? palette.card : palette.textFaint} />
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes intelligent-spin { to { transform: rotate(360deg); } }
        @keyframes intelligent-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
        .intelligent-dot {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: ${palette.accent};
          animation: intelligent-bounce 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
