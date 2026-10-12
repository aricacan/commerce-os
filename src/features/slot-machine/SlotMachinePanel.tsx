'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

/* ══════════════════════════════════════════════════════════
   SLOT MAKİNESİ
══════════════════════════════════════════════════════════ */
const SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '💎', '🍀', '🎰', '7️⃣'];

const MACHINES = [
  { id: 1, name: 'Classic 7', accent: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  { id: 2, name: 'Diamond Rush', accent: '#818cf8', glow: 'rgba(129,140,248,0.5)' },
  { id: 3, name: 'Lucky Star', accent: '#34d399', glow: 'rgba(52,211,153,0.5)' },
];

type Reel = { syms: string[]; spinning: boolean; result: string };

function useSlot() {
  const init = (): Reel[] =>
    Array.from({ length: 3 }, () => ({
      syms: Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]),
      spinning: false,
      result: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    }));

  const [reels, setReels] = useState<Reel[]>(init);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<string | null>(null);
  const [credits, setCredits] = useState(200);
  // setInterval VE setTimeout kimlikleri burada birlikte tutulur — önceden yalnızca
  // setInterval'lar temizleniyordu, spin ortasında (900ms+ süren) bileşen kapatılırsa
  // izlenmeyen setTimeout'lar sonuna kadar çalışıp ölü bir bileşende state güncellemeye
  // devam ediyordu (zararsız ama gereksiz iş; aşağıdaki cleanup ikisini de temizler).
  const timers = useRef<(ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>)[]>([]);

  const spin = useCallback(() => {
    if (spinning || credits < 10) return;
    setCredits(c => c - 10);
    setWin(null);
    setSpinning(true);
    setReels(prev => prev.map(r => ({ ...r, spinning: true })));

    Array.from({ length: 3 }).forEach((_, i) => {
      const iv = setInterval(() => {
        setReels(prev => prev.map((r, idx) =>
          idx === i
            ? { ...r, syms: Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]) }
            : r
        ));
      }, 70);
      timers.current.push(iv);

      const reelStopTimeout = setTimeout(() => {
        clearInterval(iv);
        const final = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        setReels(prev => prev.map((r, idx) =>
          idx === i
            ? {
                spinning: false, result: final,
                syms: [SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)], final, SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]]
              }
            : r
        ));
        if (i === 2) {
          const finishTimeout = setTimeout(() => {
            setSpinning(false);
            setReels(prev => {
              const res = prev.map(r => r.result);
              const allSame = res.every(s => s === res[0]);
              const twoSame = res[0] === res[1] || res[1] === res[2] || res[0] === res[2];
              if (allSame) {
                const pay = res[0] === '💎' ? 500 : res[0] === '7️⃣' ? 300 : 150;
                setWin(`JACKPOT! +${pay}₡ 🎉`);
                setCredits(c => c + pay);
              } else if (twoSame) {
                setWin('+30₡ 😊');
                setCredits(c => c + 30);
              } else {
                setWin(null);
              }
              return prev;
            });
          }, 120);
          timers.current.push(finishTimeout);
        }
      }, 900 + i * 450);
      timers.current.push(reelStopTimeout);
    });
  }, [spinning, credits]);

  useEffect(() => () => {
    timers.current.forEach((t) => { clearInterval(t); clearTimeout(t); });
  }, []);
  return { reels, spinning, win, credits, spin };
}

function SlotMachine({ cfg }: { cfg: typeof MACHINES[0] }) {
  const { reels, spinning, win, credits, spin } = useSlot();
  return (
    <div style={{
      background: 'linear-gradient(160deg,#12122a,#0e0e22)',
      border: `1.5px solid ${cfg.accent}40`,
      borderRadius: 18,
      padding: '20px 18px 16px',
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', overflow: 'hidden',
      boxShadow: `0 0 32px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
      flex: 1, minWidth: 200,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${cfg.accent}, transparent)` }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: cfg.accent, letterSpacing: 1.5, textTransform: 'uppercase' }}>{cfg.name}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: credits < 20 ? '#ef4444' : '#94a3b8',
          background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 8 }}>₡{credits}</span>
      </div>

      {/* Reels */}
      <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '12px 10px',
        display: 'flex', gap: 8, justifyContent: 'center', position: 'relative',
        border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Win line */}
        <div style={{ position: 'absolute', top: '50%', left: 12, right: 12, height: 2,
          background: `linear-gradient(90deg, transparent, ${cfg.accent}66, transparent)`,
          transform: 'translateY(-50%)', pointerEvents: 'none' }} />

        {reels.map((reel, i) => (
          <div key={i} style={{ width: 64, height: 144, overflow: 'hidden', borderRadius: 10,
            background: 'linear-gradient(160deg,#0a0a18,#0f0f24)', position: 'relative',
            border: `1px solid ${cfg.accent}22`, flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '33%',
              background: 'linear-gradient(to bottom,rgba(5,5,15,0.9),transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '33%',
              background: 'linear-gradient(to top,rgba(5,5,15,0.9),transparent)', zIndex: 2, pointerEvents: 'none' }} />
            {reel.syms.map((sym, j) => (
              <div key={j} style={{
                height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: j === 1 ? 30 : 18,
                opacity: j === 1 ? 1 : 0.35,
                filter: j === 1 && !reel.spinning ? `drop-shadow(0 0 8px ${cfg.accent})` : 'none',
                animation: reel.spinning ? 'reelBlur 0.07s linear infinite' : 'none',
                transition: 'filter 0.3s',
              }}>{sym}</div>
            ))}
          </div>
        ))}
      </div>

      {/* Win */}
      <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {win && <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24',
          textShadow: '0 0 12px rgba(251,191,36,0.9)', animation: 'winPop 0.35s ease-out' }}>{win}</span>}
      </div>

      <button onClick={spin} disabled={spinning || credits < 10}
        className="casino-spin-btn"
        style={{
          background: spinning || credits < 10 ? 'rgba(255,255,255,0.04)'
            : `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}bb)`,
          color: spinning || credits < 10 ? '#475569' : '#000',
          border: 'none', borderRadius: 10, padding: '11px 0',
          fontSize: 12, fontWeight: 800, cursor: spinning || credits < 10 ? 'not-allowed' : 'pointer',
          letterSpacing: 0.8, width: '100%', textTransform: 'uppercase',
          boxShadow: spinning || credits < 10 ? 'none' : `0 6px 20px ${cfg.glow}`,
          transition: 'all 0.2s',
        }}>
        {spinning ? '● ● ●' : credits < 10 ? 'KREDİ YOK' : '▶  ÇEVİR  · 10₡'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ÇARK (FORTUNE WHEEL)
══════════════════════════════════════════════════════════ */
const WHEEL_SEGMENTS = [
  { label: '+50₡', color: '#f59e0b', textColor: '#000' },
  { label: 'KAZAN!', color: '#10b981', textColor: '#fff' },
  { label: '+10₡', color: '#6366f1', textColor: '#fff' },
  { label: 'TEKRAR', color: '#374151', textColor: '#9ca3af' },
  { label: '+100₡', color: '#ef4444', textColor: '#fff' },
  { label: '+25₡', color: '#8b5cf6', textColor: '#fff' },
  { label: 'BOMBA💣', color: '#1e293b', textColor: '#64748b' },
  { label: '+200₡', color: '#f97316', textColor: '#000' },
];

const SEG_COUNT = WHEEL_SEGMENTS.length;
const SEG_ANGLE = 360 / SEG_COUNT;

function WheelSegmentPath({ index, radius }: { index: number; radius: number }) {
  const start = (index * SEG_ANGLE - 90) * (Math.PI / 180);
  const end = ((index + 1) * SEG_ANGLE - 90) * (Math.PI / 180);
  const x1 = radius + radius * Math.cos(start);
  const y1 = radius + radius * Math.sin(start);
  const x2 = radius + radius * Math.cos(end);
  const y2 = radius + radius * Math.sin(end);
  const mid = (start + end) / 2;
  const tx = radius + (radius * 0.65) * Math.cos(mid);
  const ty = radius + (radius * 0.65) * Math.sin(mid);
  const seg = WHEEL_SEGMENTS[index];

  return (
    <g>
      <path
        d={`M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z`}
        fill={seg.color}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={1.5}
      />
      <text
        x={tx} y={ty}
        textAnchor="middle" dominantBaseline="middle"
        fill={seg.textColor}
        fontSize={radius * 0.1}
        fontWeight="800"
        transform={`rotate(${index * SEG_ANGLE + SEG_ANGLE / 2}, ${tx}, ${ty})`}
        style={{ userSelect: 'none' }}
      >
        {seg.label}
      </text>
    </g>
  );
}

function FortuneWheel() {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [credits, setCredits] = useState(200);
  const currentRot = useRef(0);

  const spinWheel = () => {
    if (spinning || credits < 20) return;
    setCredits(c => c - 20);
    setResult(null);
    setSpinning(true);

    const extraSpins = 5 + Math.floor(Math.random() * 5);
    const landingOffset = Math.floor(Math.random() * SEG_COUNT);
    const totalDeg = extraSpins * 360 + landingOffset * SEG_ANGLE + SEG_ANGLE / 2;

    currentRot.current += totalDeg;
    setRotation(currentRot.current);

    setTimeout(() => {
      setSpinning(false);
      const normalised = ((currentRot.current % 360) + 360) % 360;
      const segIndex = Math.floor(((360 - normalised + SEG_ANGLE / 2) % 360) / SEG_ANGLE) % SEG_COUNT;
      const seg = WHEEL_SEGMENTS[segIndex];
      setResult(seg.label);
      const match = seg.label.match(/\+(\d+)/);
      if (match) setCredits(c => c + parseInt(match[1]));
    }, 4200);
  };

  const R = 140;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      background: 'linear-gradient(160deg,#12122a,#0e0e22)',
      border: '1.5px solid rgba(249,115,22,0.35)',
      borderRadius: 18, padding: '24px 28px',
      boxShadow: '0 0 40px rgba(249,115,22,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
      flex: 1, minWidth: 340,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg,transparent,#f97316,transparent)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#f97316', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Fortune Wheel
        </span>
        <span style={{ fontSize: 12, fontWeight: 700,
          color: credits < 20 ? '#ef4444' : '#94a3b8',
          background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: 8 }}>
          ₡{credits}
        </span>
      </div>

      {/* Pointer */}
      <div style={{ position: 'relative', width: R * 2, height: R * 2 }}>
        <div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, zIndex: 10,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderTop: '22px solid #fbbf24',
          filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.8))',
        }} />

        <svg
          width={R * 2} height={R * 2}
          style={{
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.08)',
            boxShadow: '0 0 30px rgba(249,115,22,0.2)',
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform 4.2s cubic-bezier(0.17, 0.67, 0.21, 1.0)`
              : 'none',
          }}
        >
          {Array.from({ length: SEG_COUNT }).map((_, i) => (
            <WheelSegmentPath key={i} index={i} radius={R} />
          ))}
          {/* Center circle */}
          <circle cx={R} cy={R} r={18} fill="#0d0d1a" stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
          <text x={R} y={R} textAnchor="middle" dominantBaseline="middle" fontSize={16} fill="#f59e0b">★</text>
        </svg>
      </div>

      {/* Result */}
      <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {result && (
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24',
            textShadow: '0 0 12px rgba(251,191,36,0.9)', animation: 'winPop 0.4s ease-out' }}>
            {result}
          </span>
        )}
      </div>

      <button onClick={spinWheel} disabled={spinning || credits < 20}
        className="casino-spin-btn"
        style={{
          background: spinning || credits < 20
            ? 'rgba(255,255,255,0.04)'
            : 'linear-gradient(135deg, #f97316, #ea580c)',
          color: spinning || credits < 20 ? '#475569' : '#000',
          border: 'none', borderRadius: 10, padding: '11px 32px',
          fontSize: 12, fontWeight: 800, cursor: spinning || credits < 20 ? 'not-allowed' : 'pointer',
          letterSpacing: 0.8, textTransform: 'uppercase', width: '100%',
          boxShadow: spinning || credits < 20 ? 'none' : '0 6px 20px rgba(249,115,22,0.5)',
          transition: 'all 0.2s',
        }}>
        {spinning ? '● ● ●' : credits < 20 ? 'KREDİ YOK' : '🎡  ÇEVİR  · 20₡'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ANA PANEL
══════════════════════════════════════════════════════════ */
export function SlotMachinePanel({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleClose]);

  return (
    <>
      <style>{`
        @keyframes reelBlur {
          0%   { transform: translateY(-3px); }
          50%  { transform: translateY(3px); }
          100% { transform: translateY(-3px); }
        }
        @keyframes winPop {
          0%   { transform: scale(0.7); opacity: 0; }
          65%  { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes casinoPanelIn {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.90); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
        @keyframes casinoPanelOut {
          from { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          to   { opacity: 0; transform: translate(-50%,-50%) scale(0.90); }
        }
        @keyframes neonTitle {
          0%,100% { text-shadow: 0 0 6px #f59e0b, 0 0 14px #f59e0b88; }
          50%      { text-shadow: 0 0 18px #f59e0b, 0 0 36px #f59e0baa, 0 0 60px #f59e0b44; }
        }
        @keyframes floatBg {
          0%,100% { transform: translateY(0) scale(1); opacity: 0.18; }
          50%      { transform: translateY(-18px) scale(1.05); opacity: 0.28; }
        }
        .casino-spin-btn:hover:not(:disabled) { filter: brightness(1.12) !important; transform: translateY(-1px) !important; }
        .casino-spin-btn:active:not(:disabled) { transform: translateY(0) !important; }
        .casino-scroll::-webkit-scrollbar { width: 6px; }
        .casino-scroll::-webkit-scrollbar-track { background: transparent; }
        .casino-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
      `}</style>

      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 99000,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.28s ease',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        zIndex: 99001,
        width: 'min(1100px, 96vw)',
        maxHeight: '92vh',
        animation: visible
          ? 'casinoPanelIn 0.38s cubic-bezier(0.16,1,0.3,1) forwards'
          : 'casinoPanelOut 0.25s ease forwards',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(160deg, #09090f, #0d0d1e)',
        borderRadius: 24,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 60px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>

        {/* Animated background blobs */}
        {[
          { color: '#f59e0b', top: '-10%', left: '-5%', size: 350 },
          { color: '#6366f1', top: '60%', left: '70%', size: 280 },
          { color: '#10b981', top: '40%', left: '10%', size: 200 },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: b.top, left: b.left,
            width: b.size, height: b.size,
            borderRadius: '50%',
            background: b.color,
            filter: 'blur(80px)',
            animation: `floatBg ${4 + i * 1.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.8}s`,
            pointerEvents: 'none',
            zIndex: 0,
          }} />
        ))}

        {/* Header */}
        <div style={{
          padding: '22px 28px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 1, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(99,102,241,0.05))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Logo */}
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
              boxShadow: '0 8px 24px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}>🎰</div>
            <div>
              <div style={{
                fontSize: 26, fontWeight: 900, color: '#f59e0b',
                letterSpacing: '-0.5px', lineHeight: 1,
                animation: 'neonTitle 2.5s ease-in-out infinite',
              }}>
                Casino Royale
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 3, fontWeight: 500, letterSpacing: 0.5 }}>
                🃏 Şansını dene — Her çeviri bir macera
              </div>
            </div>
          </div>

          <button onClick={handleClose} style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748b',
            transition: 'all 0.15s', flexShrink: 0,
          }} title="Kapat (ESC)">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="casino-scroll" style={{
          overflowY: 'auto', padding: '24px 28px 28px',
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>
          {/* Top row: Slot Makineleri */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 2,
              textTransform: 'uppercase', marginBottom: 14 }}>
              🎰 Slot Makineleri
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {MACHINES.map(cfg => (
                <SlotMachine key={cfg.id} cfg={cfg} />
              ))}
            </div>
          </div>

          {/* Bottom row: Fortune Wheel */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 2,
              textTransform: 'uppercase', marginBottom: 14 }}>
              🎡 Şans Çarkı
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <FortuneWheel />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '10px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: '#1e293b', letterSpacing: 0.5 }}>
            ESC veya dışarıya tıklayarak kapatabilirsiniz
          </span>
        </div>
      </div>
    </>
  );
}
